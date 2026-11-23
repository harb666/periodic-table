// Pitch movement. eSpeak supplies ordinary sentence intonation; this adds the
// character: restless steps between registers, sudden jumps, vibrato and an
// emotional shape, expressed as a playback-rate curve for Web Audio.
import { CURVE_HZ, EMOTIONS, type Emotion } from './profile';

/** Small deterministic generator, so a given sentence always sounds the same. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export interface RateCurve {
  /** Playback-rate values, CURVE_HZ per second of output. */
  values: Float32Array;
  /** How long the phrase lasts once played through this curve, seconds. */
  duration: number;
}

const MAX_CENTS = 1100;

/**
 * Build the playback-rate curve for one phrase.
 * @param sourceSeconds length of the synthesised audio at rate 1
 */
export function rateCurve(sourceSeconds: number, emotion: Emotion, seed: number): RateCurve {
  const p = EMOTIONS[emotion];
  const rand = seededRandom(seed);
  const dt = 1 / CURVE_HZ;
  // Upper bound on output length: never slower than 0.6 × nominal.
  const maxSteps = Math.max(2, Math.ceil((sourceSeconds / (p.rate * 0.6)) * CURVE_HZ) + 1);
  const nominal = sourceSeconds / p.rate;

  const values: number[] = [];
  let consumed = 0; // seconds of source audio used so far
  let target = 0;
  let level = 0;
  let nextStep = 0;
  let duration = maxSteps * dt;
  const vibratoHz = 6.5 + rand() * 1.5;
  // Now and then a whole phrase sits up in the squeal register, as the reference clips do.
  const register = rand() < p.squeal ? 280 + rand() * 220 : 0;
  for (let i = 0; i < maxSteps; i++) {
    const t = i * dt;
    if (t >= nextStep) {
      // A new note roughly every syllable or two; sometimes a leap to another register.
      const leap = rand() < p.jump;
      target = leap ? (rand() < 0.7 ? 1 : -0.6) * (450 + rand() * 500) : (rand() * 2 - 1) * p.wobble;
      nextStep = t + 0.14 + rand() * 0.22;
    }
    level += (target - level) * 0.45; // ≈ 40 ms glide between notes
    const u = Math.min(1, t / nominal);
    const shape = p.startLift * Math.exp(-t / 0.22) + p.endRise * Math.max(0, (u - 0.66) / 0.34) ** 1.5;
    const vibrato = p.vibrato * Math.sin(2 * Math.PI * vibratoHz * t);
    const cents = Math.max(-MAX_CENTS, Math.min(MAX_CENTS, register + level + shape + vibrato));
    const rate = p.rate * 2 ** (cents / 1200);
    values.push(rate);
    consumed += rate * dt;
    if (consumed >= sourceSeconds) {
      duration = t + dt - (consumed - sourceSeconds) / rate;
      break;
    }
  }
  if (values.length < 2) values.push(values[0] ?? p.rate);
  return { values: Float32Array.from(values), duration };
}
