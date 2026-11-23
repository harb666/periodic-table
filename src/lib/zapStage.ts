// Bridge between the 3D periodic table and Gir the mascot, so he can visit and
// poke tiles that live inside the WebGL canvas rather than in the DOM.
import type { Box } from './mascot';

export interface ZapStage {
  /** Atomic numbers he may visit right now (not dimmed by a filter or search). */
  visitable(): number[];
  /** On-screen box of a tile in viewport pixels, or null if it is outside the canvas. */
  tileBox(z: number): Box | null;
  /** Make the tile dip and pop up as if something landed on it. */
  poke(z: number): void;
}

let stage: ZapStage | null = null;

export function setZapStage(s: ZapStage | null) {
  stage = s;
}
export function getZapStage(): ZapStage | null {
  return stage;
}
