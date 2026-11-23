import { CATEGORIES } from '../data/categories';
import type { CategoryId } from '../data/types';

export function Legend({ active, onToggle }: { active: CategoryId | null; onToggle: (c: CategoryId | null) => void }) {
  return (
    <ul className="legend" aria-label="Element families – tap to highlight">
      {CATEGORIES.map((c) => (
        <li key={c.id}>
          <button
            style={{ ['--c' as string]: c.color }}
            aria-pressed={active === c.id}
            onClick={() => onToggle(active === c.id ? null : c.id)}
            title={c.blurb}
          >
            <span className="sw" aria-hidden="true" />
            {c.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
