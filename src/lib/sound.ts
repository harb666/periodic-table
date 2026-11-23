import { settingsStore } from '../state/store';

// Tiny synthesized sound effects – no audio files. AudioContext is created lazily on a user gesture (iOS requirement).
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (!settingsStore.get().sound) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.06) {
  const a = audio();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = a.currentTime + start;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  tap: () => tone(880, 0, 0.07, 'triangle', 0.04),
  open: () => {
    tone(660, 0, 0.09, 'triangle');
    tone(990, 0.07, 0.12, 'triangle');
  },
  correct: () => {
    tone(784, 0, 0.1, 'square', 0.035);
    tone(1047, 0.09, 0.1, 'square', 0.035);
    tone(1319, 0.18, 0.18, 'square', 0.035);
  },
  wrong: () => tone(220, 0, 0.18, 'sawtooth', 0.03),
  sticker: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.14, 'triangle', 0.05)),
  pop: () => tone(520 + Math.random() * 200, 0, 0.06, 'sine', 0.05),
};
