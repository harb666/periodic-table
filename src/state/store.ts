import { useSyncExternalStore } from 'react';
import { loadJSON, saveJSON } from '../lib/storage';

export type ViewMode = '3d' | '2d' | 'list';

export interface Settings {
  sound: boolean;
  reducedMotion: boolean;
  lowEffects: boolean;
  highContrast: boolean;
  mascot: boolean;
  view: ViewMode;
  /** Grown-up opt-in for the online AI tutor (only used if a server proxy exists). */
  onlineTutor: boolean;
  largeText: boolean;
}

export interface Progress {
  /** Elements whose detail card has been opened */
  seen: number[];
  /** Elements earned as shiny "holo" cards via quizzes / hunts */
  holo: number[];
  quizBest: number;
  quizAnswered: number;
  quizCorrect: number;
  bestStreak: number;
  huntsSolved: number;
  atomsBuilt: number;
  reactionsRun: string[];
  stickers: string[];
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function isSmallScreen(): boolean {
  try {
    return window.matchMedia('(max-width: 760px)').matches;
  } catch {
    return false;
  }
}

function isLowPowerDevice(): boolean {
  try {
    const cores = navigator.hardwareConcurrency ?? 4;
    return isSmallScreen() || cores <= 4;
  } catch {
    return true;
  }
}

export const DEFAULT_SETTINGS = (): Settings => ({
  sound: true,
  reducedMotion: prefersReducedMotion(),
  lowEffects: isLowPowerDevice(),
  highContrast: false,
  mascot: true,
  view: isSmallScreen() ? 'list' : '3d',
  onlineTutor: false,
  largeText: false,
});

export const DEFAULT_PROGRESS = (): Progress => ({
  seen: [],
  holo: [],
  quizBest: 0,
  quizAnswered: 0,
  quizCorrect: 0,
  bestStreak: 0,
  huntsSolved: 0,
  atomsBuilt: 0,
  reactionsRun: [],
  stickers: [],
});

type Listener = () => void;

function createStore<T extends object>(key: string, initial: () => T) {
  let state: T = loadJSON(key, initial());
  const listeners = new Set<Listener>();
  return {
    get: () => state,
    set(update: Partial<T> | ((s: T) => Partial<T>)) {
      const patch = typeof update === 'function' ? update(state) : update;
      state = { ...state, ...patch };
      saveJSON(key, state);
      listeners.forEach((l) => l());
    },
    reset() {
      state = initial();
      saveJSON(key, state);
      listeners.forEach((l) => l());
    },
    subscribe(l: Listener) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

export const settingsStore = createStore<Settings>('settings', DEFAULT_SETTINGS);
export const progressStore = createStore<Progress>('progress', DEFAULT_PROGRESS);

export function useSettings(): Settings {
  return useSyncExternalStore(settingsStore.subscribe, settingsStore.get, settingsStore.get);
}

export function useProgress(): Progress {
  return useSyncExternalStore(progressStore.subscribe, progressStore.get, progressStore.get);
}

// ---------- progress helpers ----------
const addUnique = (arr: number[], v: number) => (arr.includes(v) ? arr : [...arr, v]);

export function markSeen(z: number) {
  progressStore.set((p) => ({ seen: addUnique(p.seen, z) }));
  checkStickers();
}

export function markHolo(z: number) {
  progressStore.set((p) => ({ holo: addUnique(p.holo, z), seen: addUnique(p.seen, z) }));
  checkStickers();
}

export interface StickerDef {
  id: string;
  label: string;
  emoji: string; // decorative glyph only (aria-hidden)
  desc: string;
  test: (p: Progress) => boolean;
}

export const STICKERS: StickerDef[] = [
  { id: 'first-look', label: 'First Look', emoji: '★', desc: 'Open your first element card', test: (p) => p.seen.length >= 1 },
  { id: 'explorer-10', label: 'Explorer', emoji: '✦', desc: 'Open 10 element cards', test: (p) => p.seen.length >= 10 },
  { id: 'explorer-50', label: 'Super Explorer', emoji: '✧', desc: 'Open 50 element cards', test: (p) => p.seen.length >= 50 },
  { id: 'all-118', label: 'Table Master', emoji: '♛', desc: 'Open all 118 element cards', test: (p) => p.seen.length >= 118 },
  { id: 'quiz-1', label: 'Quiz Rookie', emoji: '♥', desc: 'Answer a quiz question correctly', test: (p) => p.quizCorrect >= 1 },
  { id: 'quiz-25', label: 'Quiz Champ', emoji: '♥♥', desc: 'Answer 25 quiz questions correctly', test: (p) => p.quizCorrect >= 25 },
  { id: 'streak-5', label: 'On Fire', emoji: 'ϟ', desc: 'Get a streak of 5', test: (p) => p.bestStreak >= 5 },
  { id: 'streak-10', label: 'Lightning Brain', emoji: 'ϟϟ', desc: 'Get a streak of 10', test: (p) => p.bestStreak >= 10 },
  { id: 'hunter-1', label: 'Detective', emoji: '⌕', desc: 'Solve an Element Hunt', test: (p) => p.huntsSolved >= 1 },
  { id: 'hunter-10', label: 'Master Detective', emoji: '⌕⌕', desc: 'Solve 10 Element Hunts', test: (p) => p.huntsSolved >= 10 },
  { id: 'builder-1', label: 'Atom Builder', emoji: '⚛', desc: 'Build an atom in the Atom Builder', test: (p) => p.atomsBuilt >= 1 },
  { id: 'lab-3', label: 'Lab Partner', emoji: '⚗', desc: 'Run 3 different lab simulations', test: (p) => p.reactionsRun.length >= 3 },
  { id: 'holo-10', label: 'Holo Collector', emoji: '◈', desc: 'Earn 10 holo cards', test: (p) => p.holo.length >= 10 },
];

let stickerListener: ((s: StickerDef) => void) | null = null;
export function onStickerEarned(fn: ((s: StickerDef) => void) | null) {
  stickerListener = fn;
}

export function checkStickers() {
  const p = progressStore.get();
  const newly = STICKERS.filter((s) => !p.stickers.includes(s.id) && s.test(p));
  if (newly.length) {
    progressStore.set({ stickers: [...p.stickers, ...newly.map((s) => s.id)] });
    newly.forEach((s) => stickerListener?.(s));
  }
}
