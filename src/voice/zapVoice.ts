// Zap's voice: text → (worker) eSpeak with a custom voice → Web Audio character
// stage (pitch movement, resonance, brightness) → speakers. Sentence by
// sentence, so the first words start quickly and speech can be interrupted.
// If any part is unavailable it falls back to the browser's own speech voice.
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
const BUZZ_DEPTH = 0.3;

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
  feedback.gain.value = 0.36;
  const wet = ctx.createGain();
  wet.gain.value = 0.26;
  // The reference is bright around 3–5 kHz.
  const shelf = ctx.createBiquadFilter();
  shelf.type = 'highshelf';
  shelf.frequency.value = 2800;
  shelf.gain.value = 3.5;
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
  buzz.connect(dry).connect(shelf);
  buzz.connect(delay);
  delay.connect(feedback).connect(delay);
  delay.connect(wet).connect(shelf);
  shelf.connect(compressor).connect(output);
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

// The eSpeak build leaks a little state per call and eventually fails, so each worker is retired early.
const WORKER_LIFETIME_CALLS = 40;
const SYNTH_TIMEOUT_MS = 8000;

class ZapVoice {
  private ctx: AudioContext | null = null;
  private chain: { input: AudioNode; output: AudioNode } | null = null;
  private worker: Worker | null = null;
  private workerCalls = 0;
  private pending = new Map<number, Pending>();
  private nextId = 1;
  private failures = 0;
  private generation = 0;
  private current: AudioBufferSourceNode | null = null;
  private speaking = false;
  private listeners = new Set<(speaking: boolean) => void>();

  /** Can the custom voice run here at all? */
  get supported(): boolean {
    return this.failures < 2 && typeof Worker !== 'undefined' && typeof window !== 'undefined' && !!(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);
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

  /** Call from a user gesture (browsers only allow audio after one). Also warms the engine up. */
  unlock() {
    if (!this.supported) return;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC({ latencyHint: 'interactive' });
        this.chain = buildVoiceChain(this.ctx);
        this.chain.output.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      this.ensureWorker();
    } catch {
      this.failures = 2;
    }
  }

  private ensureWorker(): Worker {
    if (this.worker && this.workerCalls < WORKER_LIFETIME_CALLS) return this.worker;
    const old = this.worker;
    const worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; pcm?: Float32Array; sampleRate?: number; error?: string }>) => {
      const p = this.pending.get(e.data.id);
      if (!p) return;
      this.pending.delete(e.data.id);
      clearTimeout(p.timer);
      if (e.data.pcm && e.data.sampleRate) p.resolve({ pcm: e.data.pcm, sampleRate: e.data.sampleRate });
      else p.reject(new Error(e.data.error ?? 'synthesis failed'));
    };
    worker.onerror = () => this.dropWorker(worker, new Error('speech worker crashed'));
    this.worker = worker;
    this.workerCalls = 0;
    // Let the retiring worker finish what it was asked, then let it go.
    if (old) setTimeout(() => old.terminate(), SYNTH_TIMEOUT_MS);
    return worker;
  }

  private dropWorker(worker: Worker, err: Error) {
    worker.terminate();
    if (this.worker === worker) this.worker = null;
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(err);
      this.pending.delete(id);
    }
  }

  private synth(phrase: Phrase): Promise<{ pcm: Float32Array; sampleRate: number }> {
    const worker = this.ensureWorker();
    this.workerCalls++;
    const id = this.nextId++;
    const preset = EMOTIONS[phrase.emotion];
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.delete(id)) {
          reject(new Error('synthesis timed out'));
          this.dropWorker(worker, new Error('speech worker stalled'));
        }
      }, SYNTH_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      worker.postMessage({ id, text: phrase.spoken, speed: preset.speed, pitch: preset.pitch });
    });
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

  /**
   * Say something. Resolves to which voice was used, or false if nothing could speak.
   * A new call interrupts whatever was being said (unless it is `passive`).
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
    this.setSpeaking(true);
    try {
      // Always one sentence ahead: the next one is synthesised while the current one plays.
      let ahead = this.synth(phrases[0]);
      for (let i = 0; i < phrases.length; i++) {
        const audio = await ahead;
        if (gen !== this.generation) return 'zap';
        if (i + 1 < phrases.length) {
          ahead = this.synth(phrases[i + 1]);
          ahead.catch(() => {}); // handled when awaited
        }
        const { source } = schedulePhrase(ctx, audio.pcm, audio.sampleRate, phrases[i].emotion, hashText(phrases[i].spoken), this.chain.input, ctx.currentTime + 0.02);
        this.current = source;
        await new Promise<void>((done) => {
          source.onended = () => done();
        });
        if (gen !== this.generation) return 'zap';
        if (i + 1 < phrases.length) await new Promise((r) => setTimeout(r, PHRASE_GAP * 1000));
      }
      this.failures = 0;
      return 'zap';
    } catch {
      this.failures++;
      if (gen !== this.generation) return false;
      return this.speakFallback(phrases);
    } finally {
      if (gen === this.generation) {
        this.current = null;
        this.setSpeaking(false);
      }
    }
  }

  /** The browser's own voice, pushed as high and quick as it will go. Used only when the custom voice cannot run. */
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
