// Zap's voice: text → (worker) eSpeak with a custom voice → Web Audio character
// stage (pitch movement, resonance, brightness) → speakers. Sentence by
// sentence, so the first words start quickly and speech can be interrupted.
// Only a browser that cannot run the engine at all gets the browser's own speech voice instead.
import { hashText, rateCurve } from './contour';
import { CURVE_HZ, EMOTIONS, PHRASE_GAP, type Emotion } from './profile';
import { planSpeech, type Phrase } from './text';

export interface SpeakOptions {
  /** Mood for sentences that carry none of their own. */
  emotion?: Emotion;
  /** Unprompted chatter: only speak if audio is already unlocked, and never interrupt. */
  passive?: boolean;
}

type AudioCtx = AudioContext | OfflineAudioContext;

const BUZZ_HZ = 86;
const BUZZ_DEPTH = 0.21;

/** The character stage. Shared by live playback and offline rendering (tests). */
export function buildVoiceChain(ctx: AudioCtx): { input: AudioNode; output: AudioNode } {
  const input = ctx.createGain();
  // Rumble out: nothing in this voice lives below ~200 Hz.
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 170;
  // Short feedback delay = a small metallic "tin robot" resonance.
  const dry = ctx.createGain();
  dry.gain.value = 0.82;
  const delay = ctx.createDelay(0.05);
  delay.delayTime.value = 0.0023;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.3;
  const wet = ctx.createGain();
  wet.gain.value = 0.18;
  // Tone matched to the pooled reference clips: a little less body around 500 Hz,
  // and much more air above 4.5 kHz (the references are very bright up there).
  const body = ctx.createBiquadFilter();
  body.type = 'peaking';
  body.frequency.value = 510;
  body.Q.value = 1.6;
  body.gain.value = -2.5;
  const shelf = ctx.createBiquadFilter();
  shelf.type = 'highshelf';
  shelf.frequency.value = 4400;
  shelf.gain.value = 11;
  // Presence: lifts the 2–4 kHz band where consonants live, so words stay distinct at this pitch.
  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 3000;
  presence.Q.value = 0.9;
  presence.gain.value = 1.5;
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.ratio.value = 4;
  const output = ctx.createGain();
  output.gain.value = 0.85;

  // A fast tremolo adds sidebands around every harmonic: the buzzy, slightly broken-robot edge
  // the reference has (it carries energy below its own fundamental and a low harmonic-to-noise ratio).
  const buzz = ctx.createGain();
  buzz.gain.value = 1 - BUZZ_DEPTH;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = BUZZ_HZ;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = BUZZ_DEPTH;
  lfo.connect(lfoDepth).connect(buzz.gain);
  lfo.start();

  input.connect(highpass).connect(buzz);
  buzz.connect(dry).connect(body);
  buzz.connect(delay);
  delay.connect(feedback).connect(delay);
  delay.connect(wet).connect(body);
  body.connect(presence).connect(shelf).connect(compressor).connect(output);
  return { input, output };
}

/** Schedule one synthesised phrase through the pitch curve. Returns the source and how long it will sound. */
export function schedulePhrase(ctx: AudioCtx, pcm: Float32Array, sampleRate: number, emotion: Emotion, seed: number, destination: AudioNode, when: number) {
  const buffer = ctx.createBuffer(1, pcm.length, sampleRate);
  buffer.getChannelData(0).set(pcm);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const curve = rateCurve(buffer.duration, emotion, seed);
  source.playbackRate.value = curve.values[0];
  source.playbackRate.setValueCurveAtTime(curve.values, when, Math.max(0.02, (curve.values.length - 1) / CURVE_HZ));
  source.connect(destination);
  source.start(when);
  return { source, duration: curve.duration };
}

interface Pending {
  resolve: (r: { pcm: Float32Array; sampleRate: number }) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface Engine {
  worker: Worker;
  calls: number;
  /** Resolves once the worker has downloaded, started and loaded the voice. */
  ready: Promise<void>;
  isReady: boolean;
}

// The eSpeak build leaks a little state per call and eventually fails, so each worker is retired early.
const WORKER_LIFETIME_CALLS = 40;
// First use has to download and start the engine (about 0.7 MB); slow phones and headsets need time.
const COLD_START_TIMEOUT_MS = 60000;
const SYNTH_TIMEOUT_MS = 12000;
// How long a sentence will wait for an engine that is still starting before it is skipped.
const ENGINE_WAIT_MS = 8000;
// Consecutive hard failures (after retries) before giving up on the engine for this visit.
const MAX_FAILURES = 3;

class ZapVoice {
  private ctx: AudioContext | null = null;
  private chain: { input: AudioNode; output: AudioNode } | null = null;
  private engine: Promise<Engine> | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;
  private failures = 0;
  private generation = 0;
  private current: AudioBufferSourceNode | null = null;
  private speaking = false;
  private listeners = new Set<(speaking: boolean) => void>();

  /** Can this browser run the engine at all? */
  private get capable(): boolean {
    return typeof Worker !== 'undefined' && typeof window !== 'undefined' && !!(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);
  }
  /** Can the custom voice run here? */
  get supported(): boolean {
    return this.capable && this.failures < MAX_FAILURES;
  }
  get fallbackSupported(): boolean {
    try {
      return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
    } catch {
      return false;
    }
  }
  get isSpeaking(): boolean {
    return this.speaking;
  }
  /** True once a tap or key press has allowed audio to play. */
  get unlocked(): boolean {
    return this.ctx?.state === 'running';
  }

  subscribe(fn: (speaking: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private setSpeaking(v: boolean) {
    if (this.speaking === v) return;
    this.speaking = v;
    this.listeners.forEach((l) => l(v));
  }

  /** Download and start the engine ahead of time, so the first sentence is not kept waiting. Needs no user gesture. */
  warm() {
    if (this.supported) void this.getEngine().catch(() => {});
  }

  /** Call from a user gesture (browsers only allow audio after one). */
  unlock() {
    if (!this.supported) return;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC({ latencyHint: 'interactive' });
        this.chain = buildVoiceChain(this.ctx);
        this.chain.output.connect(this.ctx.destination);
      }
      if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => {});
      this.warm();
    } catch {
      this.failures = MAX_FAILURES;
    }
  }

  private getEngine(): Promise<Engine> {
    if (!this.engine) this.engine = this.startEngine();
    return this.engine;
  }

  private async startEngine(): Promise<Engine> {
    // `?worker` lets the bundler ship a classic (non-module) worker, which every browser with workers can run.
    const { default: EngineWorker } = await import('./engine.worker?worker');
    const worker: Worker = new EngineWorker();
    let markReady!: () => void;
    let failReady!: (e: Error) => void;
    const engine: Engine = {
      worker,
      calls: 0,
      isReady: false,
      ready: new Promise<void>((res, rej) => {
        markReady = res;
        failReady = rej;
      }),
    };
    engine.ready.catch(() => {});
    const coldTimer = setTimeout(() => this.dropEngine(engine, new Error('speech engine did not start')), COLD_START_TIMEOUT_MS);
    worker.onmessage = (e: MessageEvent<{ ready?: boolean; id?: number; pcm?: Float32Array; sampleRate?: number; error?: string }>) => {
      if (e.data.ready) {
        clearTimeout(coldTimer);
        engine.isReady = true;
        markReady();
        return;
      }
      const p = this.pending.get(e.data.id ?? -1);
      if (!p) return;
      this.pending.delete(e.data.id!);
      clearTimeout(p.timer);
      if (e.data.pcm && e.data.sampleRate) p.resolve({ pcm: e.data.pcm, sampleRate: e.data.sampleRate });
      else p.reject(new Error(e.data.error ?? 'synthesis failed'));
    };
    worker.onerror = () => {
      clearTimeout(coldTimer);
      failReady(new Error('speech engine failed to start'));
      this.dropEngine(engine, new Error('speech worker crashed'));
    };
    worker.postMessage({ warm: true });
    return engine;
  }

  private dropEngine(engine: Engine, err: Error) {
    engine.worker.terminate();
    void this.engine?.then((current) => {
      if (current === engine) this.engine = null;
    });
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(err);
      this.pending.delete(id);
    }
  }

  private async synthOnce(phrase: Phrase): Promise<{ pcm: Float32Array; sampleRate: number }> {
    let engine = await this.getEngine();
    if (engine.calls >= WORKER_LIFETIME_CALLS) {
      // Retire: let it finish what it was asked, then let it go. The replacement starts now.
      const old = engine;
      setTimeout(() => old.worker.terminate(), SYNTH_TIMEOUT_MS);
      this.engine = this.startEngine();
      engine = await this.engine;
    }
    await engine.ready;
    engine.calls++;
    const id = this.nextId++;
    const preset = EMOTIONS[phrase.emotion];
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.delete(id)) {
          reject(new Error('synthesis timed out'));
          this.dropEngine(engine, new Error('speech worker stalled'));
        }
      }, SYNTH_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      engine.worker.postMessage({ id, text: phrase.spoken, speed: preset.speed, pitch: preset.pitch, wordgap: preset.wordgap });
    });
  }

  /** Synthesise one phrase; a failure gets one more try on a fresh engine. */
  private async synth(phrase: Phrase): Promise<{ pcm: Float32Array; sampleRate: number }> {
    try {
      return await this.synthOnce(phrase);
    } catch {
      this.engine = null;
      return this.synthOnce(phrase);
    }
  }

  /** Stop talking now. */
  stop() {
    this.generation++;
    try {
      this.current?.stop();
    } catch {
      /* already stopped */
    }
    this.current = null;
    try {
      if (this.fallbackSupported) window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
    this.setSpeaking(false);
  }

  /** Wait (briefly) for the browser to let audio run; false if it will not. */
  private async audioRunning(ctx: AudioContext): Promise<boolean> {
    for (let i = 0; i < 15 && ctx.state !== 'running'; i++) {
      void ctx.resume().catch(() => {});
      await new Promise((r) => setTimeout(r, 100));
    }
    return ctx.state === 'running';
  }

  /**
   * Say something. Resolves to which voice was used, or false if nothing was spoken.
   * A new call interrupts whatever was being said (unless it is `passive`).
   * Where the engine can run, only Zap's voice is ever used: if a sentence cannot
   * be synthesised he stays quiet (the words are on screen) rather than switching voices.
   */
  async speak(text: string, opts: SpeakOptions = {}): Promise<'zap' | 'fallback' | false> {
    const phrases = planSpeech(text, opts.emotion);
    if (!phrases.length) return false;
    if (opts.passive) {
      if (this.speaking || !this.supported || !this.unlocked) return false;
    } else {
      this.stop();
      this.unlock();
    }
    if (!this.supported || !this.ctx || !this.chain) return opts.passive ? false : this.speakFallback(phrases);

    const gen = ++this.generation;
    const ctx = this.ctx;
    try {
      // On a slow connection the engine may still be downloading. Words arriving half a minute
      // late would only confuse, so skip this one (it is on screen) and be ready for the next.
      const ready = await Promise.race([
        this.getEngine().then((e) => e.ready).then(() => true),
        new Promise<boolean>((r) => setTimeout(() => r(false), ENGINE_WAIT_MS)),
      ]);
      if (!ready || gen !== this.generation) return false;
      this.setSpeaking(true);
      // Always one sentence ahead: the next one is synthesised while the current one plays.
      let ahead = this.synth(phrases[0]);
      ahead.catch(() => {});
      if (!(await this.audioRunning(ctx))) return false;
      for (let i = 0; i < phrases.length; i++) {
        const audio = await ahead;
        if (gen !== this.generation) return 'zap';
        if (i + 1 < phrases.length) {
          ahead = this.synth(phrases[i + 1]);
          ahead.catch(() => {}); // handled when awaited
        }
        const { source, duration } = schedulePhrase(ctx, audio.pcm, audio.sampleRate, phrases[i].emotion, hashText(phrases[i].spoken), this.chain.input, ctx.currentTime + 0.02);
        this.current = source;
        await new Promise<void>((done) => {
          source.onended = () => done();
          // Belt and braces: never wait forever on a browser that drops the event.
          setTimeout(done, (duration + 1.5) * 1000);
        });
        if (gen !== this.generation) return 'zap';
        if (i + 1 < phrases.length) await new Promise((r) => setTimeout(r, PHRASE_GAP * 1000));
      }
      this.failures = 0;
      return 'zap';
    } catch {
      this.failures++;
      return false;
    } finally {
      if (gen === this.generation) {
        this.current = null;
        this.setSpeaking(false);
      }
    }
  }

  /** The browser's own voice. Used only where the engine cannot run at all (no Web Workers or no Web Audio). */
  private speakFallback(phrases: Phrase[]): 'fallback' | false {
    if (!this.fallbackSupported) return false;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(phrases.map((p) => p.text).join(' '));
      u.lang = 'en-US';
      u.pitch = 2;
      u.rate = 1.05;
      u.onstart = () => this.setSpeaking(true);
      u.onend = u.onerror = () => this.setSpeaking(false);
      window.speechSynthesis.speak(u);
      return 'fallback';
    } catch {
      return false;
    }
  }
}

export const zapVoice = new ZapVoice();
