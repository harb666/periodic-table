// Decorative scene-kid stickers drawn as tiny inline SVGs (no image assets). All aria-hidden and kept out of text areas.
import type { CSSProperties } from 'react';

type Kind = 'heart' | 'star' | 'bolt' | 'butterfly' | 'skull' | 'sparkle';

const PIXEL_HEART = ['01100110', '11111111', '11111111', '11111111', '01111110', '00111100', '00011000'];

export function Sticker({ kind, size = 32, color, style, anim }: { kind: Kind; size?: number; color?: string; style?: CSSProperties; anim?: 'spin' | 'float' }) {
  const c = color ?? { heart: '#ff1493', star: '#b6ff00', bolt: '#00f5ff', butterfly: '#c266ff', skull: '#fff', sparkle: '#ff8a00' }[kind];
  let body: React.ReactNode;
  switch (kind) {
    case 'heart':
      body = (
        <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges">
          {PIXEL_HEART.flatMap((row, y) => [...row].map((b, x) => (b === '1' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={c} /> : null)))}
        </svg>
      );
      break;
    case 'star':
      body = (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path d="M12 1l3.2 7.1 7.8.8-5.9 5.2 1.7 7.7L12 17.8 5.2 21.8l1.7-7.7L1 8.9l7.8-.8z" fill={c} stroke="#000" strokeWidth="1" />
        </svg>
      );
      break;
    case 'bolt':
      body = (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path d="M13 1L3 14h7l-2 9 11-14h-7z" fill={c} stroke="#000" strokeWidth="1" />
        </svg>
      );
      break;
    case 'butterfly':
      body = (
        <svg width={size} height={size} viewBox="0 0 32 32">
          <path d="M16 16C12 6 2 4 3 12s8 6 13 4zM16 16c4-10 14-12 13-4s-8 6-13 4zM16 17c-4 2-11 6-8 10s7-4 8-10zM16 17c4 2 11 6 8 10s-7-4-8-10z" fill={c} opacity="0.9" stroke="#00f5ff" strokeWidth="0.8" />
          <rect x="15.2" y="9" width="1.6" height="16" rx="0.8" fill="#000" />
        </svg>
      );
      break;
    case 'skull':
      body = (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path d="M12 2C6.5 2 3 5.6 3 10.5c0 3 1.5 5 3.5 6V20h11v-3.5c2-1 3.5-3 3.5-6C21 5.6 17.5 2 12 2z" fill={c} stroke="#ff1493" strokeWidth="1.2" />
          <circle cx="8.5" cy="11" r="2.4" fill="#000" />
          <circle cx="15.5" cy="11" r="2.4" fill="#000" />
          <circle cx="9.2" cy="10.3" r="0.8" fill="#fff" />
          <circle cx="16.2" cy="10.3" r="0.8" fill="#fff" />
          <path d="M10 15.5h4M10.5 20v-2M13.5 20v-2" stroke="#000" strokeWidth="1.2" />
          <path d="M18 4l2-2 1 3z" fill="#ff1493" />
        </svg>
      );
      break;
    case 'sparkle':
      body = (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path d="M12 0l2 10 10 2-10 2-2 10-2-10L0 12l10-2z" fill={c} />
        </svg>
      );
      break;
  }
  return (
    <span className={`decor ${anim ?? ''}`} style={style} aria-hidden="true">
      {body}
    </span>
  );
}
