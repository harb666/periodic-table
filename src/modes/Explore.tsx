import { lazy, Suspense, useMemo, useState } from 'react';
import { searchElements, BY_Z } from '../data';
import { CATEGORY_BY_ID } from '../data/categories';
import type { CategoryId } from '../data/types';
import { Legend } from '../components/Legend';
import { PeriodicTable2D } from '../components/PeriodicTable2D';
import { ElementList } from '../components/ElementList';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { settingsStore, useSettings, type ViewMode } from '../state/store';
import { useApp } from '../state/appContext';

const TableScene = lazy(() => import('../three/TableScene'));

export function Explore({ detailOpen }: { detailOpen: boolean }) {
  const { openElement, selectedZ, webgl, toast } = useApp();
  const settings = useSettings();
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState<CategoryId | null>(null);
  const [locked, setLocked] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [hoverZ, setHoverZ] = useState<number | null>(null);
  const [failed3d, setFailed3d] = useState(false);

  const results = useMemo(() => searchElements(query), [query]);
  const matches = useMemo(() => (query.trim() ? new Set(results.map((e) => e.z)) : null), [query, results]);
  const view: ViewMode = settings.view === '3d' && (!webgl || failed3d) ? '2d' : settings.view;
  const setView = (v: ViewMode) => settingsStore.set({ view: v });

  const fail3d = () => {
    setFailed3d(true);
    toast('3D had a hiccup, so we switched to the 2D table.');
  };

  const listItems = highlight ? results.filter((e) => e.category === highlight) : results;
  const hover = hoverZ ? BY_Z[hoverZ] : null;

  return (
    <section aria-labelledby="explore-h">
      <h2 id="explore-h" className="sr-only">
        Explore the elements
      </h2>
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Choose a view">
          <button aria-pressed={view === '3d'} onClick={() => setView('3d')} disabled={!webgl || failed3d} title={!webgl ? '3D is not available on this device' : undefined}>
            3D
          </button>
          <button aria-pressed={view === '2d'} onClick={() => setView('2d')}>
            Table
          </button>
          <button aria-pressed={view === 'list'} onClick={() => setView('list')}>
            Cards
          </button>
        </div>
        <div className="grow" style={{ minWidth: 200 }}>
          <label htmlFor="search" className="sr-only">
            Search elements
          </label>
          <input
            id="search"
            className="input"
            type="search"
            placeholder="🔍 Search: gold, Fe, 26…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results.length && query.trim()) openElement(results[0].z);
            }}
          />
        </div>
      </div>
      {query.trim() && (
        <p className="muted" role="status" style={{ margin: '0 0 6px' }}>
          {results.length} match{results.length === 1 ? '' : 'es'}
          {results.length > 0 && ' – press Enter to open the first one'}
        </p>
      )}
      <Legend active={highlight} onToggle={setHighlight} />
      {highlight && <p className="note">{CATEGORY_BY_ID[highlight].blurb}</p>}

      {view === '3d' && (
        <div className="row" style={{ marginBottom: 8 }}>
          <button className="icon-btn" aria-pressed={locked} onClick={() => setLocked((l) => !l)} title="Lock a straight-on view">
            {locked ? '🔒 Straight view' : '🔓 Free spin'}
          </button>
          <button className="icon-btn" onClick={() => setResetKey((k) => k + 1)}>
            ⟲ Reset camera
          </button>
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            {locked ? 'Pinch or scroll to zoom · drag to slide · tap a tile' : 'Drag to spin · pinch or scroll to zoom · tap a tile'}
          </span>
        </div>
      )}
      {view === '3d' && (
        <div className="stage">
          <ErrorBoundary
            onError={fail3d}
            fallback={
              <div className="loading">
                3D isn't working here. <button className="btn" onClick={() => setView('2d')}>Use the table</button>
              </div>
            }
          >
            <Suspense
              fallback={
                <div className="loading">
                  <div className="spinner" />
                  Booting ATOMIC.EXE 3D…
                </div>
              }
            >
              <TableScene
                onSelect={openElement}
                onHover={setHoverZ}
                highlight={highlight}
                matches={matches}
                selectedZ={selectedZ}
                motion={!settings.reducedMotion}
                low={settings.lowEffects}
                highContrast={settings.highContrast}
                locked={locked}
                resetKey={resetKey}
                paused={detailOpen}
                onContextLost={fail3d}
              />
            </Suspense>
          </ErrorBoundary>
          {hover && (
            <div className="stage-hover" style={{ ['--c' as string]: CATEGORY_BY_ID[hover.category].color }} aria-hidden="true">
              {hover.z}. {hover.name}
            </div>
          )}
          <button className="sr-only" onClick={() => setView('2d')} style={{ position: 'absolute' }}>
            The 3D view is visual only. Switch to the keyboard-friendly table view.
          </button>
        </div>
      )}
      {view === '2d' && <PeriodicTable2D onSelect={openElement} highlight={highlight} selectedZ={selectedZ} matches={matches} />}
      {view === 'list' && <ElementList items={listItems} onSelect={openElement} />}
    </section>
  );
}
