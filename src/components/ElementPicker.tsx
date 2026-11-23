import { useState } from 'react';
import { searchElements } from '../data';
import { CATEGORY_BY_ID } from '../data/categories';

/** Searchable compact element chooser used by Hunt and Lab. */
export function ElementPicker({ onPick, selected = [], label, limit }: { onPick: (z: number) => void; selected?: number[]; label: string; limit?: number }) {
  const [q, setQ] = useState('');
  const items = searchElements(q).slice(0, limit ?? 118);
  return (
    <div>
      <label className="sr-only" htmlFor={`pick-${label}`}>
        {label}
      </label>
      <input id={`pick-${label}`} className="input" placeholder="Search name, symbol or number…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="picker" role="group" aria-label={label} style={{ marginTop: 8 }}>
        {items.map((e) => (
          <button
            key={e.z}
            style={{ ['--c' as string]: CATEGORY_BY_ID[e.category].color }}
            aria-pressed={selected.includes(e.z)}
            onClick={() => onPick(e.z)}
            aria-label={`${e.name} (${e.symbol})`}
            title={e.name}
          >
            {e.symbol}
          </button>
        ))}
      </div>
    </div>
  );
}
