import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ELEMENTS, BY_Z } from '../data';
import { CATEGORY_BY_ID } from '../data/categories';
import type { CategoryId, ElementData } from '../data/types';
import { useProgress } from '../state/store';

/** Display row in the CSS grid: rows 1–7, a spacer at 8, then lanthanides 9 and actinides 10. Row 0 = group labels. */
const gridRow = (e: ElementData) => e.row + 1;

function neighbour(e: ElementData, key: string): ElementData | undefined {
  if (key === 'ArrowRight') return BY_Z[e.z + 1];
  if (key === 'ArrowLeft') return BY_Z[e.z - 1];
  const rows = [1, 2, 3, 4, 5, 6, 7, 9, 10];
  const idx = rows.indexOf(e.row) + (key === 'ArrowDown' ? 1 : -1);
  for (let i = idx; i >= 0 && i < rows.length; i += key === 'ArrowDown' ? 1 : -1) {
    const inRow = ELEMENTS.filter((x) => x.row === rows[i]);
    if (!inRow.length) continue;
    return inRow.reduce((best, x) => (Math.abs(x.col - e.col) < Math.abs(best.col - e.col) ? x : best));
  }
  return undefined;
}

export function PeriodicTable2D({
  onSelect,
  highlight,
  selectedZ,
  matches,
}: {
  onSelect: (z: number) => void;
  highlight: CategoryId | null;
  selectedZ?: number | null;
  matches?: Set<number> | null;
}) {
  const progress = useProgress();
  const seen = useMemo(() => new Set(progress.seen), [progress.seen]);
  const [focusZ, setFocusZ] = useState<number>(selectedZ ?? 1);
  const refs = useRef<Record<number, HTMLButtonElement | null>>({});

  function onKey(ev: KeyboardEvent<HTMLButtonElement>, e: ElementData) {
    let target: ElementData | undefined;
    if (ev.key.startsWith('Arrow')) target = neighbour(e, ev.key);
    else if (ev.key === 'Home') target = BY_Z[1];
    else if (ev.key === 'End') target = BY_Z[118];
    if (target) {
      ev.preventDefault();
      setFocusZ(target.z);
      refs.current[target.z]?.focus();
    }
  }

  return (
    <div className="table-scroll">
      <div className="ptable" role="grid" aria-label="Periodic table of the 118 elements. Use arrow keys to move, Enter to open.">
        {Array.from({ length: 18 }, (_, i) => (
          <div key={`g${i}`} className="group-label" style={{ gridColumn: i + 1, gridRow: 1 }} aria-hidden="true">
            {i + 1}
          </div>
        ))}
        <div className="ptile placeholder" style={{ gridColumn: 3, gridRow: 7, ['--c' as string]: CATEGORY_BY_ID.lanthanide.color }} aria-hidden="true">
          57–71
          <br />↓
        </div>
        <div className="ptile placeholder" style={{ gridColumn: 3, gridRow: 8, ['--c' as string]: CATEGORY_BY_ID.actinide.color }} aria-hidden="true">
          89–103
          <br />↓
        </div>
        <div className="fgap" style={{ gridRow: 9 }} aria-hidden="true" />
        <div className="f-label" style={{ gridRow: 10 }}>Lanthanides →</div>
        <div className="f-label" style={{ gridRow: 11 }}>Actinides →</div>
        {ELEMENTS.map((e) => {
          const cat = CATEGORY_BY_ID[e.category];
          const dim = (highlight && e.category !== highlight) || (matches && !matches.has(e.z));
          return (
            <button
              key={e.z}
              ref={(el) => {
                refs.current[e.z] = el;
              }}
              role="gridcell"
              data-z={e.z}
              tabIndex={e.z === focusZ ? 0 : -1}
              className={`ptile${dim ? ' dim' : ''}${selectedZ === e.z ? ' selected' : ''}`}
              style={{ gridColumn: e.col, gridRow: gridRow(e), ['--c' as string]: cat.color }}
              onClick={() => onSelect(e.z)}
              onFocus={() => setFocusZ(e.z)}
              onKeyDown={(ev) => onKey(ev, e)}
              aria-label={`${e.name}, symbol ${e.symbol}, atomic number ${e.z}, ${cat.label}${seen.has(e.z) ? ', explored' : ''}`}
            >
              <span className="z" aria-hidden="true">{e.z}</span>
              <span className="sym" aria-hidden="true">{e.symbol}</span>
              <span className="nm" aria-hidden="true">{e.name}</span>
              {seen.has(e.z) && <span className="seen-dot" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
