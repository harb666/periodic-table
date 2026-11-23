/** 2D shell diagram – used as the no-WebGL fallback and in the Atom Builder. Educational illustration only. */
export function BohrSVG({ protons, neutrons, shells, size = 260, label }: { protons: number; neutrons: number; shells: number[]; size?: number; label?: string }) {
  const c = size / 2;
  const maxR = c - 12;
  const n = Math.max(shells.length, 1);
  const nucleusR = Math.min(26, 10 + Math.sqrt(protons + neutrons) * 1.6);
  const step = (maxR - nucleusR - 6) / n;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" role="img" aria-label={label ?? `Atom diagram: ${protons} protons, ${neutrons} neutrons, electron shells ${shells.join(', ') || 'none'}`}>
      <defs>
        <radialGradient id="nuc" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="40%" stopColor="#ff1493" />
          <stop offset="100%" stopColor="#5a0040" />
        </radialGradient>
      </defs>
      {shells.map((count, i) => {
        const r = nucleusR + 6 + step * (i + 1);
        return (
          <g key={i}>
            <circle cx={c} cy={c} r={r} fill="none" stroke="#00f5ff" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="4 4" />
            {Array.from({ length: count }, (_, k) => {
              const a = (k / count) * Math.PI * 2 - Math.PI / 2 + i * 0.3;
              return <circle key={k} cx={c + r * Math.cos(a)} cy={c + r * Math.sin(a)} r={count > 18 ? 2.2 : 3.4} fill="#b6ff00" />;
            })}
          </g>
        );
      })}
      <circle cx={c} cy={c} r={nucleusR} fill="url(#nuc)" />
      <text x={c} y={c + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" fontFamily="Nunito, sans-serif">
        {protons}p {neutrons}n
      </text>
    </svg>
  );
}
