// Pure helpers for Gir's wandering: what he can visit, where he stands, what he says.
// Kept free of DOM/three so it can be unit-tested.
import { BY_Z } from '../data';
import { CATEGORY_BY_ID } from '../data/categories';

export type TargetKind = 'tile' | 'mode' | 'title' | 'decor';

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
export interface Size {
  w: number;
  h: number;
}
export interface Point {
  x: number;
  y: number;
}

/** CSS selectors for the things Gir may run up to, by kind. */
export const TARGET_SELECTORS: Record<TargetKind, string> = {
  tile: '.ptile[data-z]:not(.dim), .ecard[data-z]',
  mode: '.mode-btn:not([aria-current])',
  title: '.title',
  decor: '.header .decor, .footer .decor',
};

/** How often each kind is chosen when several are on screen. */
const KIND_WEIGHT: Record<TargetKind, number> = { tile: 6, mode: 2, title: 1, decor: 1 };

export function pickKind(available: TargetKind[], rand: () => number): TargetKind | null {
  const total = available.reduce((s, k) => s + KIND_WEIGHT[k], 0);
  if (!total) return null;
  let r = rand() * total;
  for (const k of available) {
    r -= KIND_WEIGHT[k];
    if (r < 0) return k;
  }
  return available[available.length - 1];
}

/** True when the box is comfortably on screen (so he never runs off to something half scrolled away). */
export function isReachable(box: Box, view: Size, margin = 8): boolean {
  return box.right - box.left > 4 && box.left >= margin && box.right <= view.w - margin && box.top >= margin && box.bottom <= view.h - margin;
}

export interface Anchor extends Point {
  /** Standing on top of the thing (true) or next to it (false). */
  onTop: boolean;
  /** When standing next to it: -1 if the thing is to his left, +1 if to his right. */
  side: -1 | 0 | 1;
}

/**
 * Where Gir's feet go for a target. He hops on top when there is headroom;
 * near the top of the screen he stands beside it instead, so he is never cut off.
 */
export function anchorFor(box: Box, zap: Size, view: Size): Anchor {
  const cx = (box.left + box.right) / 2;
  const half = zap.w / 2;
  const clampX = (x: number) => Math.min(view.w - half, Math.max(half, x));
  if (box.top + 4 >= zap.h * 0.92) return { x: clampX(cx), y: box.top + 4, onTop: true, side: 0 };
  const y = Math.min(view.h, Math.max(box.bottom, zap.h * 0.92));
  const gap = half * 0.55;
  const roomRight = box.right + gap + half <= view.w;
  return roomRight ? { x: box.right + gap, y, onTop: false, side: -1 } : { x: clampX(box.left - gap), y, onTop: false, side: 1 };
}

/** Move `from` toward `to` by at most `maxStep`; reports arrival. */
export function stepToward(from: Point, to: Point, maxStep: number): Point & { arrived: boolean } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy);
  if (d <= maxStep || d < 0.5) return { x: to.x, y: to.y, arrived: true };
  return { x: from.x + (dx / d) * maxStep, y: from.y + (dy / d) * maxStep, arrived: false };
}

const TITLE_LINES = ['118 elements – and I like every single one!', 'Welcome to ATOMIC.EXE! Dance break!'];
const DECOR_LINES = ['Ooh, shiny!', 'Mine! …okay, just looking.'];

/** What Gir says when he reaches something. `label` is the visible text of a mode button. */
export function lineFor(kind: TargetKind, opts: { z?: number; label?: string; rand: () => number }): string {
  const pick = (xs: string[]) => xs[Math.floor(opts.rand() * xs.length) % xs.length];
  switch (kind) {
    case 'tile': {
      const e = opts.z ? BY_Z[opts.z] : undefined;
      if (!e) return 'Boing!';
      const cat = CATEGORY_BY_ID[e.category]?.label.toLowerCase();
      return pick([
        `${e.symbol} is ${e.name} – atomic number ${e.z}!`,
        `Boing! ${e.name} has ${e.z} proton${e.z === 1 ? '' : 's'}.`,
        cat ? `${e.name} belongs with the ${cat}. Tap it!` : `This one is ${e.name}. Tap it!`,
      ]);
    }
    case 'mode':
      return opts.label ? `Psst… try ${opts.label}!` : 'Psst… try this one!';
    case 'title':
      return pick(TITLE_LINES);
    case 'decor':
      return pick(DECOR_LINES);
  }
}
