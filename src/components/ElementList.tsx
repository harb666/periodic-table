import { CATEGORY_BY_ID } from '../data/categories';
import type { ElementData } from '../data/types';

export function ElementList({ items, onSelect }: { items: ElementData[]; onSelect: (z: number) => void }) {
  if (!items.length) return <p className="muted">No elements match – try another name, symbol or number!</p>;
  return (
    <ul className="elist" aria-label="Elements">
      {items.map((e) => {
        const cat = CATEGORY_BY_ID[e.category];
        return (
          <li key={e.z}>
            <button className="ecard" style={{ ['--c' as string]: cat.color }} onClick={() => onSelect(e.z)} aria-label={`${e.name}, ${e.symbol}, number ${e.z}, ${cat.label}`}>
              <span className="sym" aria-hidden="true">{e.symbol}</span>
              <span className="nm" aria-hidden="true">
                {e.z}. {e.name}
              </span>
              <span className="meta" aria-hidden="true">{cat.short}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
