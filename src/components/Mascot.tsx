import { useEffect, useState } from 'react';

const TIPS = [
  'Tap any element to open its card!',
  'Same column = same family. They act alike!',
  'The atomic number is the number of protons.',
  'Try the Quiz Arcade to earn holo cards!',
  'Never taste or touch chemicals – science is for looking and learning!',
  'Elements in the bottom two rows belong in rows 6 and 7.',
];

export function MascotSvg() {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="Zap the chemistry bot">
      {/* cat-ear antennae */}
      <path d="M22 30 L30 6 L42 26Z" fill="#ff1493" stroke="#fff" strokeWidth="2" />
      <path d="M78 30 L70 6 L58 26Z" fill="#ff1493" stroke="#fff" strokeWidth="2" />
      {/* side-swept scene fringe */}
      <rect x="16" y="22" width="68" height="60" rx="22" fill="#14061f" stroke="#00f5ff" strokeWidth="3" />
      <path d="M18 40 Q30 14 82 26 L82 34 Q52 26 34 46Z" fill="#9d00ff" stroke="#ff1493" strokeWidth="2" />
      {/* visor eyes */}
      <rect x="28" y="44" width="44" height="20" rx="10" fill="#000" />
      <circle cx="40" cy="54" r="5" fill="#b6ff00" />
      <circle cx="60" cy="54" r="5" fill="#b6ff00" />
      <circle cx="42" cy="52" r="1.6" fill="#fff" />
      <circle cx="62" cy="52" r="1.6" fill="#fff" />
      <path d="M44 70 Q50 75 56 70" stroke="#ff1493" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="30" cy="68" r="3" fill="#ff1493" opacity="0.6" />
      <circle cx="70" cy="68" r="3" fill="#ff1493" opacity="0.6" />
      {/* orbiting electron ring */}
      <ellipse cx="50" cy="88" rx="30" ry="6" fill="none" stroke="#00f5ff" strokeWidth="2" />
      <circle cx="78" cy="88" r="3" fill="#b6ff00" />
    </svg>
  );
}

export function Mascot({ message }: { message?: string | null }) {
  const [tip, setTip] = useState(0);
  const [hidden, setHidden] = useState(false);
  useEffect(() => setHidden(false), [message]);
  return (
    <div className="mascot">
      {!hidden && (
        <div className="bubble" role="status" aria-live="polite">
          {message ?? TIPS[tip]}
        </div>
      )}
      <button
        className="bot"
        onClick={() => {
          setHidden(false);
          setTip((t) => (t + 1) % TIPS.length);
        }}
        aria-label="Zap the chemistry bot: show another tip"
        title="Tap me for a tip"
      >
        <MascotSvg />
      </button>
    </div>
  );
}
