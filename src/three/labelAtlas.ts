import * as THREE from 'three';
import { ELEMENTS } from '../data';

export const ATLAS_COLS = 11;
export const ATLAS_SIZE = 2048;
export const CELL = Math.floor(ATLAS_SIZE / ATLAS_COLS);
/** Atlas indices: 0..117 = elements, 118 = "57–71", 119 = "89–103" */
export const PLACEHOLDER_LA = 118;
export const PLACEHOLDER_AC = 119;

export function atlasOffset(index: number): [number, number] {
  const cx = index % ATLAS_COLS;
  const cy = Math.floor(index / ATLAS_COLS);
  // UV origin is bottom-left; canvas origin top-left (flipY=true handles orientation).
  return [cx / ATLAS_COLS, 1 - (cy + 1) / ATLAS_COLS];
}

/** Draws crisp tile labels (number, symbol, name) into one texture. Text is drawn once, never per-frame. */
export function drawAtlas(highContrast: boolean, maxSize = ATLAS_SIZE): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const size = Math.min(ATLAS_SIZE, maxSize);
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const scale = size / ATLAS_SIZE;
  ctx.scale(scale, scale);
  const fg = highContrast ? '#000' : '#fff';
  const stroke = highContrast ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0.85)';
  const draw = (i: number, top: string, mid: string, bottom: string, midSize = 78) => {
    const x = (i % ATLAS_COLS) * CELL;
    const y = Math.floor(i / ATLAS_COLS) * CELL;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';
    ctx.fillStyle = fg;
    ctx.strokeStyle = stroke;
    ctx.textBaseline = 'middle';
    // atomic number
    ctx.textAlign = 'left';
    ctx.font = `800 30px Nunito, system-ui, sans-serif`;
    ctx.lineWidth = 6;
    ctx.strokeText(top, 14, 28);
    ctx.fillText(top, 14, 28);
    // symbol
    ctx.textAlign = 'center';
    ctx.font = `900 ${midSize}px Orbitron, Nunito, system-ui, sans-serif`;
    ctx.lineWidth = 10;
    ctx.strokeText(mid, CELL / 2, CELL / 2 + 4);
    ctx.fillText(mid, CELL / 2, CELL / 2 + 4);
    // name (shrink to fit)
    let fs = 26;
    ctx.font = `800 ${fs}px Nunito, system-ui, sans-serif`;
    while (ctx.measureText(bottom).width > CELL - 16 && fs > 14) {
      fs -= 1;
      ctx.font = `800 ${fs}px Nunito, system-ui, sans-serif`;
    }
    ctx.lineWidth = 5;
    ctx.strokeText(bottom, CELL / 2, CELL - 26);
    ctx.fillText(bottom, CELL / 2, CELL - 26);
    ctx.restore();
  };
  ELEMENTS.forEach((e, i) => draw(i, String(e.z), e.symbol, e.name));
  draw(PLACEHOLDER_LA, '', '57–71', 'Lanthanides ↓', 44);
  draw(PLACEHOLDER_AC, '', '89–103', 'Actinides ↓', 40);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}
