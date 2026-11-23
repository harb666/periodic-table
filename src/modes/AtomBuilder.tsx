import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { analyseAtom, type AtomState } from '../lib/atom';
import { BohrSVG } from '../components/BohrSVG';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useApp } from '../state/appContext';
import { progressStore, checkStickers, useSettings } from '../state/store';
import { sfx } from '../lib/sound';
import { BY_Z } from '../data';
import { CATEGORY_BY_ID } from '../data/categories';

const AtomModel3D = lazy(() => import('../three/AtomModel3D'));

const PRESETS: { label: string; atom: AtomState }[] = [
  { label: 'Hydrogen', atom: { protons: 1, neutrons: 0, electrons: 1 } },
  { label: 'Helium-4', atom: { protons: 2, neutrons: 2, electrons: 2 } },
  { label: 'Carbon-12', atom: { protons: 6, neutrons: 6, electrons: 6 } },
  { label: 'Carbon-14', atom: { protons: 6, neutrons: 8, electrons: 6 } },
  { label: 'Sodium ion Na⁺', atom: { protons: 11, neutrons: 12, electrons: 10 } },
  { label: 'Chloride ion Cl⁻', atom: { protons: 17, neutrons: 18, electrons: 18 } },
  { label: 'Oxide ion O²⁻', atom: { protons: 8, neutrons: 8, electrons: 10 } },
];

const LIMITS = { protons: 118, neutrons: 180, electrons: 121 };

function Counter({ label, value, color, onChange, max, help }: { label: string; value: number; color: string; onChange: (v: number) => void; max: number; help: string }) {
  return (
    <div className="counter" style={{ ['--c' as string]: color }}>
      <div>
        <div className="lbl" style={{ color }}>
          {label}
        </div>
        <div className="muted" style={{ fontSize: '0.8rem' }}>
          {help}
        </div>
      </div>
      <button className="round" onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} aria-label={`Remove one ${label.toLowerCase().replace(/s$/, '')}`}>
        −
      </button>
      <output className="num" aria-live="polite" aria-label={`${label}: ${value}`}>
        {value}
      </output>
      <button className="round" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Add one ${label.toLowerCase().replace(/s$/, '')}`}>
        +
      </button>
    </div>
  );
}

export function AtomBuilder() {
  const { webgl, openElement } = useApp();
  const settings = useSettings();
  const [atom, setAtom] = useState<AtomState>({ protons: 1, neutrons: 0, electrons: 1 });
  const a = useMemo(() => analyseAtom(atom), [atom]);
  const counted = useRef(new Set<string>());
  const el = BY_Z[atom.protons];

  useEffect(() => {
    if (a.stability.kind === 'stable' && a.charge === 0) {
      const key = `${atom.protons}-${atom.neutrons}`;
      if (!counted.current.has(key)) {
        counted.current.add(key);
        progressStore.set((p) => ({ atomsBuilt: p.atomsBuilt + 1 }));
        checkStickers();
      }
    }
  }, [a, atom]);

  const set = (k: keyof AtomState) => (v: number) => {
    sfx.pop();
    setAtom((s) => ({ ...s, [k]: v }));
  };

  const visual = <BohrSVG protons={atom.protons} neutrons={atom.neutrons} shells={a.shells} />;

  return (
    <section aria-labelledby="builder-h" className="mode-grid two">
      <div className="panel">
        <h2 id="builder-h" className="h-neon">
          ⚛ Atom Builder
        </h2>
        <p className="muted">Add particles and watch your atom change! Protons decide the element. Neutrons make isotopes. Electrons change the charge.</p>
        <Counter label="Protons" help="+ charge, in the nucleus" value={atom.protons} color="#ff1493" onChange={set('protons')} max={LIMITS.protons} />
        <Counter label="Neutrons" help="no charge, in the nucleus" value={atom.neutrons} color="#7fd8ff" onChange={set('neutrons')} max={LIMITS.neutrons} />
        <Counter label="Electrons" help="− charge, in shells" value={atom.electrons} color="#b6ff00" onChange={set('electrons')} max={LIMITS.electrons} />
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn small" onClick={() => setAtom((s) => ({ ...s, electrons: s.protons }))}>
            Make it neutral
          </button>
          <button className="btn small" onClick={() => setAtom({ protons: 1, neutrons: 0, electrons: 1 })}>
            Start again
          </button>
        </div>
        <h3 style={{ marginTop: 16 }}>Try these</h3>
        <div className="row">
          {PRESETS.map((p) => (
            <button key={p.label} className="btn small" onClick={() => setAtom(p.atom)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel" style={el ? { borderColor: CATEGORY_BY_ID[el.category].color } : undefined}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }} aria-live="polite">
            {a.name ? (
              <>
                <span className="shimmer">{a.isotopeLabel}</span> {a.charge !== 0 && <span className="chip">ion {a.chargeText}</span>}
              </>
            ) : (
              'No element yet'
            )}
          </h3>
          {el && (
            <button className="btn small" onClick={() => openElement(el.z)}>
              Open {el.symbol} card
            </button>
          )}
        </div>
        <div className="atom-box" style={{ marginTop: 10 }}>
          {webgl && atom.protons > 0 ? (
            <ErrorBoundary fallback={visual}>
              <Suspense fallback={visual}>
                <AtomModel3D protons={atom.protons} neutrons={atom.neutrons} shells={a.shells} motion={!settings.reducedMotion} low={settings.lowEffects} />
              </Suspense>
            </ErrorBoundary>
          ) : (
            visual
          )}
        </div>
        <p className="note" style={{ marginTop: 8 }}>
          Model, not a photo: real electrons form fuzzy clouds, not neat circles. The shells shown are a simplified picture
          {atom.protons + atom.neutrons > (settings.lowEffects ? 60 : 120) ? ', and big nuclei are drawn with fewer balls' : ''}.
        </p>
        <table className="atom-table" aria-label="Atom summary">
          <tbody>
            <tr>
              <th scope="row">Element</th>
              <td>{a.name ? `${a.name} (${a.symbol})` : '—'}</td>
            </tr>
            <tr>
              <th scope="row">Mass number</th>
              <td>{a.massNumber}</td>
            </tr>
            <tr>
              <th scope="row">Charge</th>
              <td>{a.chargeText}</td>
            </tr>
            <tr>
              <th scope="row">Shells</th>
              <td>{a.shells.join(', ') || '—'}</td>
            </tr>
          </tbody>
        </table>
        <ul aria-live="polite">
          {a.messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
        {a.isotopeName && <p className="note">This isotope has a special name: {a.isotopeName}.</p>}
        {a.stability.text && <p className={a.stability.kind === 'stable' ? 'note' : 'warn'}>{a.stability.text}</p>}
        {a.famous && <p className="note">⭐ {a.famous}</p>}
      </div>
    </section>
  );
}
