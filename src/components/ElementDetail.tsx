import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { BY_Z, getContent, prettyConfig } from '../data';
import { CATEGORY_BY_ID } from '../data/categories';
import { canSpeak, speak } from '../lib/speech';
import { sfx } from '../lib/sound';
import { useSettings, useProgress } from '../state/store';
import { BohrSVG } from './BohrSVG';
import { ErrorBoundary } from './ErrorBoundary';

const AtomModel3D = lazy(() => import('../three/AtomModel3D'));

const PHASE_LABEL = { solid: 'Solid', liquid: 'Liquid', gas: 'Gas', unknown: 'Unknown (only tiny amounts made)' };

export function ElementDetail({ z, onClose, onNavigate, onAskTutor, webgl }: { z: number; onClose: () => void; onNavigate: (z: number) => void; onAskTutor: (z: number) => void; webgl: boolean }) {
  const e = BY_Z[z];
  const c = getContent(z);
  const cat = CATEGORY_BY_ID[e.category];
  const settings = useSettings();
  const progress = useProgress();
  const [more, setMore] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<Element | null>(null);
  const neutrons = Math.max(0, Math.round(e.mass) - e.z);
  const holo = progress.holo.includes(z);

  useEffect(() => {
    prevFocus.current = document.activeElement;
    return () => {
      (prevFocus.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  useEffect(() => {
    setMore(false);
    dialogRef.current?.querySelector<HTMLElement>('h2')?.focus();
  }, [z]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
      if (ev.key === 'Tab' && dialogRef.current) {
        const f = dialogRef.current.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (ev.shiftKey && document.activeElement === first) {
          ev.preventDefault();
          last.focus();
        } else if (!ev.shiftKey && document.activeElement === last) {
          ev.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const sayIt = () => {
    sfx.tap();
    speak(`${e.name}. ${c?.simple ?? ''}`);
  };

  const fallback = <BohrSVG protons={e.z} neutrons={neutrons} shells={e.shells} label={`Shell diagram of ${e.name}`} />;

  return (
    <div className="overlay" onClick={(ev) => ev.target === ev.currentTarget && onClose()}>
      <div ref={dialogRef} className="dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title" style={{ ['--c' as string]: cat.color }}>
        <div className="dialog-head">
          <div className="big-tile" aria-hidden="true">
            <span className="z">{e.z}</span>
            <span className="sym">{e.symbol}</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{e.massText}</span>
          </div>
          <div className="grow">
            <h2 id="detail-title" tabIndex={-1}>
              <span className="shimmer">{e.name}</span>
            </h2>
            <p className="muted" style={{ margin: '4px 0' }}>
              Say it: <strong style={{ color: '#fff' }}>{c?.say}</strong>
            </p>
            <div className="row">
              <span className="chip" style={{ borderColor: cat.color }}>
                <span className="sw" style={{ width: 10, height: 10, borderRadius: 3, background: cat.color, display: 'inline-block' }} aria-hidden="true" />
                {cat.label}
              </span>
              {holo && <span className="chip" style={{ borderColor: 'var(--acid)' }}>◈ Holo card earned</span>}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close element card">
            ✕
          </button>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          {canSpeak() && (
            <button className="btn small" onClick={sayIt}>
              🔊 Hear it
            </button>
          )}
          <button className="btn small" onClick={() => onAskTutor(z)}>
            Ask Zap about {e.name}
          </button>
        </div>

        <p style={{ fontSize: '1.08rem', marginTop: 14 }}>{c?.simple}</p>

        <div className="facts-grid">
          <div className="stat">
            <div className="k">Atomic number</div>
            <div className="v">{e.z} protons</div>
          </div>
          <div className="stat">
            <div className="k">{e.massIsMassNumber ? 'Mass number*' : 'Atomic mass'}</div>
            <div className="v">{e.massText}</div>
          </div>
          <div className="stat">
            <div className="k">Room temp</div>
            <div className="v">{PHASE_LABEL[e.phase]}</div>
          </div>
          <div className="stat">
            <div className="k">Position</div>
            <div className="v">
              Period {e.period}
              {e.group ? `, group ${e.group}` : ', f-block row'}
            </div>
          </div>
          <div className="stat" style={{ gridColumn: 'span 2' }}>
            <div className="k">Electron configuration{e.configPredicted ? ' (predicted)' : ''}</div>
            <div className="v">{prettyConfig(e.config)}</div>
          </div>
        </div>
        {e.massIsMassNumber && (
          <p className="muted" style={{ fontSize: '0.82rem', marginTop: -6 }}>
            * {e.name} has no stable form, so we show the mass number of a long-lived kind (isotope) in brackets.
          </p>
        )}

        <div className="detail-cols">
          <section aria-labelledby="atom-h">
            <h3 id="atom-h" className="h-neon">
              Atom model
            </h3>
            <div className="atom-box">
              {webgl ? (
                <ErrorBoundary fallback={fallback}>
                  <Suspense
                    fallback={
                      <div className="loading">
                        <div className="spinner" />
                        Loading atom…
                      </div>
                    }
                  >
                    <AtomModel3D protons={e.z} neutrons={neutrons} shells={e.shells} motion={!settings.reducedMotion} low={settings.lowEffects} />
                  </Suspense>
                </ErrorBoundary>
              ) : (
                fallback
              )}
            </div>
            <p className="note" style={{ marginTop: 8 }}>
              This is a picture to help you learn, not a real photo! Real electrons don't travel in neat circles – they are spread out in fuzzy
              "clouds". {webgl && 'Drag to spin it.'}
            </p>
            <div>
              <strong>Electrons in each shell:</strong>
              <div className="shells" style={{ marginTop: 6 }}>
                {e.shells.map((s, i) => (
                  <span key={i} className="chip">
                    Shell {i + 1}: {s}
                  </span>
                ))}
              </div>
              {e.configPredicted && <p className="muted" style={{ fontSize: '0.85rem' }}>For super-heavy elements, scientists predict this arrangement – it hasn't been measured yet.</p>}
            </div>
          </section>

          <section aria-labelledby="facts-h">
            <h3 id="facts-h" className="h-neon">
              3 cool facts
            </h3>
            <ul className="facts-list">{c?.facts.map((f, i) => <li key={i}>{f}</li>)}</ul>
            <h3 className="h-neon">Where you find it</h3>
            <ul>{c?.uses.map((u, i) => <li key={i}>{u}</li>)}</ul>
            {c?.safety && (
              <div className="warn" role="note">
                <strong>⚠ Safety:</strong> {c.safety}
              </div>
            )}
          </section>
        </div>

        <div style={{ marginTop: 14 }}>
          <button className="btn primary" aria-expanded={more} aria-controls="more-panel" onClick={() => setMore((m) => !m)}>
            {more ? 'Show less' : 'Tell me more ✦'}
          </button>
          {more && (
            <div id="more-panel" className="panel" style={{ marginTop: 10 }}>
              {c?.more && <p>{c.more}</p>}
              <h4>Discovery</h4>
              <p>
                {e.yearText === 'Known since ancient times'
                  ? 'People have known about it since ancient times, so nobody knows who found it first.'
                  : e.discoveredBy
                    ? `Discovered by ${e.discoveredBy}${e.year ? ` in ${e.year}` : ''}.`
                    : 'We don’t have reliable discovery information.'}
                {e.namedBy && e.namedBy !== e.discoveredBy ? ` Named by ${e.namedBy}.` : ''}
              </p>
              <h4>Science corner</h4>
              <ul>
                <li>Block: {e.block}-block</li>
                {e.meltK != null && <li>Melts at about {Math.round(e.meltK - 273.15)} °C</li>}
                {e.boilK != null && <li>Boils at about {Math.round(e.boilK - 273.15)} °C</li>}
                <li>
                  A typical atom has {e.z} protons, {e.z} electrons and about {neutrons} neutrons.
                </li>
                <li>Family: {cat.blurb}</li>
              </ul>
            </div>
          )}
        </div>

        <nav className="dialog-nav" aria-label="Element navigation">
          <button className="btn" disabled={z <= 1} onClick={() => onNavigate(z - 1)}>
            ← {z > 1 ? BY_Z[z - 1].name : ''}
          </button>
          <button className="btn" disabled={z >= 118} onClick={() => onNavigate(z + 1)}>
            {z < 118 ? BY_Z[z + 1].name : ''} →
          </button>
        </nav>
      </div>
    </div>
  );
}
