import { useState } from 'react';
import { REACTIONS, reactionsForPair, type Reaction } from '../data/reactions';
import { countSide, prettyFormula, parseFormula, type Term } from '../lib/chemistry';
import { BY_SYMBOL, BY_Z } from '../data';
import { ElementPicker } from '../components/ElementPicker';
import { progressStore, checkStickers, useSettings } from '../state/store';
import { sfx } from '../lib/sound';

const ATOM_COLORS: Record<string, string> = { H: '#ffffff', O: '#ff4d4d', C: '#8a8a8a', N: '#4d7dff', Na: '#c266ff', Cl: '#5cff7a', Fe: '#ff8a00', Mg: '#d8d8e8' };

function Molecules({ terms }: { terms: Term[] }) {
  return (
    <div className="row" style={{ justifyContent: 'center' }}>
      {terms.flatMap((t, ti) =>
        Array.from({ length: Math.min(t.coeff, 6) }, (_, k) => {
          const atoms = Object.entries(parseFormula(t.formula)).flatMap(([el, n]) => Array.from({ length: n }, () => el));
          return (
            <span key={`${ti}-${k}`} title={t.name} style={{ display: 'inline-flex', flexWrap: 'wrap', maxWidth: 70, gap: 1, padding: 4, borderRadius: 12, background: 'rgba(255,255,255,.06)' }}>
              {atoms.map((a, i) => (
                <span key={i} aria-hidden="true" style={{ width: 13, height: 13, borderRadius: '50%', background: ATOM_COLORS[a] ?? '#ccc', boxShadow: '0 0 6px rgba(255,255,255,.4)' }} />
              ))}
            </span>
          );
        }),
      )}
    </div>
  );
}

function Side({ terms }: { terms: Term[] }) {
  return (
    <>
      {terms.map((t, i) => (
        <span key={i} className="row" style={{ gap: 8 }}>
          {i > 0 && <span aria-hidden="true">+</span>}
          <span className="eq-term" title={t.name}>
            {t.coeff > 1 ? t.coeff : ''}
            {prettyFormula(t.formula)}
          </span>
        </span>
      ))}
    </>
  );
}

function ReactionView({ r }: { r: Reaction }) {
  const settings = useSettings();
  const [ran, setRan] = useState(false);
  const left = countSide(r.left);
  const right = countSide(r.right);
  const symbols = [...new Set([...Object.keys(left), ...Object.keys(right)])];
  const run = () => {
    sfx.pop();
    setRan(true);
    const p = progressStore.get();
    if (!p.reactionsRun.includes(r.id)) progressStore.set({ reactionsRun: [...p.reactionsRun, r.id] });
    checkStickers();
  };
  const glow = { flame: '#ff8a00', spark: '#ffe45c', bubbles: '#00f5ff', rust: '#b5502a', leaf: '#5cff7a', glow: '#ffffff' }[r.visual];
  return (
    <div className="panel" aria-labelledby={`rx-${r.id}`}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 id={`rx-${r.id}`} style={{ margin: 0 }}>
          {r.title}
        </h3>
        <span className="badge-sim">SIMULATION</span>
      </div>
      <p className="equation" aria-label="Chemical equation">
        <Side terms={r.left} /> <span aria-hidden="true">→</span>
        <span className="sr-only">makes</span> <Side terms={r.right} />
      </p>
      <p className="muted" style={{ fontSize: '0.9rem' }}>
        {r.left.map((t) => t.name).join(' + ')} → {r.right.map((t) => t.name).join(' + ')}
      </p>
      <div className="lab-visual" aria-hidden="true" style={{ boxShadow: ran ? `inset 0 0 40px ${glow}` : undefined }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            opacity: ran ? 0 : 1,
            transform: ran && !settings.reducedMotion ? 'scale(0.6)' : 'none',
            transition: settings.reducedMotion ? 'none' : 'all 0.8s ease',
          }}
        >
          <Molecules terms={r.left} />
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            opacity: ran ? 1 : 0,
            transform: ran || settings.reducedMotion ? 'none' : 'scale(1.3)',
            transition: settings.reducedMotion ? 'none' : 'all 0.8s ease 0.5s',
          }}
        >
          <Molecules terms={r.right} />
        </div>
      </div>
      <div className="row" style={{ margin: '10px 0' }}>
        <button className="btn primary" onClick={run} disabled={ran}>
          ▶ Run simulation
        </button>
        <button className="btn" onClick={() => setRan(false)} disabled={!ran}>
          ⟲ Reset
        </button>
      </div>
      <p>{r.story}</p>
      <h4>Count the atoms – nothing disappears!</h4>
      <table className="atom-table">
        <thead>
          <tr>
            <th scope="col">Atom</th>
            <th scope="col">Before</th>
            <th scope="col">After</th>
          </tr>
        </thead>
        <tbody>
          {symbols.map((s) => (
            <tr key={s}>
              <th scope="row">
                {BY_SYMBOL[s].name} ({s})
              </th>
              <td>{left[s] ?? 0}</td>
              <td>
                {right[s] ?? 0} {left[s] === right[s] ? '✓' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">Atoms are never made or destroyed in a chemical reaction – they just swap partners. That's called conservation of mass!</p>
      <p>
        <strong>In real life:</strong> {r.realLife}
      </p>
      <p className="warn">⚠ {r.safety}</p>
    </div>
  );
}

export function Lab() {
  const [selected, setSelected] = useState<Reaction>(REACTIONS[0]);
  const [pair, setPair] = useState<number[]>([]);
  const pairSymbols = pair.map((z) => BY_Z[z].symbol);
  const pairResults = pair.length === 2 ? reactionsForPair(pairSymbols[0], pairSymbols[1]) : [];

  const pickPair = (z: number) => setPair((p) => (p.includes(z) ? p.filter((x) => x !== z) : [...p, z].slice(-2)));

  return (
    <section aria-labelledby="lab-h" className="mode-grid two">
      <div>
        <div className="panel">
          <h2 id="lab-h" className="h-neon">
            ⚗ Chemistry Lab
          </h2>
          <p>
            Watch real, famous reactions as safe <strong>simulations</strong>. These are pictures of what happens – please never try them yourself.
          </p>
          <div className="row" role="group" aria-label="Choose a reaction">
            {REACTIONS.map((r) => (
              <button key={r.id} className="btn small" aria-pressed={selected.id === r.id} onClick={() => setSelected(r)} style={selected.id === r.id ? { background: 'var(--pink)' } : undefined}>
                {r.title}
              </button>
            ))}
          </div>
        </div>
        <div className="panel" style={{ marginTop: 16 }}>
          <h3>Mixing bench</h3>
          <p className="muted">Pick two elements to see if we have a real reaction for them in our lab book.</p>
          <ElementPicker label="Pick two elements" onPick={pickPair} selected={pair} />
          <div role="status" style={{ marginTop: 10 }}>
            {pair.length < 2 && <p>Picked: {pairSymbols.join(' + ') || 'nothing yet'}</p>}
            {pair.length === 2 && pairResults.length > 0 && (
              <div className="note">
                {pairSymbols.join(' + ')}: found {pairResults.length === 1 ? 'a reaction' : 'reactions'}!{' '}
                {pairResults.map((r) => (
                  <button key={r.id} className="btn small" style={{ marginLeft: 6 }} onClick={() => setSelected(r)}>
                    Show “{r.title}”
                  </button>
                ))}
              </div>
            )}
            {pair.length === 2 && pairResults.length === 0 && (
              <p className="warn">
                {pairSymbols.join(' + ')}: that combo isn't in our lab book. Real chemistry is complicated – some pairs don't react at all, and others need special
                conditions – so we don't guess!
                {pairSymbols.some((s) => ['He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn'].includes(s)) && ' (Noble gases almost never react with anything.)'}
              </p>
            )}
          </div>
        </div>
      </div>
      <ReactionView key={selected.id} r={selected} />
    </section>
  );
}
