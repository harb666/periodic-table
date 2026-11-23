import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppContext, type AppApi, type ModeId } from './state/appContext';
import { useSettings, settingsStore, markSeen, onStickerEarned } from './state/store';
import { hasWebGL } from './three/webgl';
import { sfx } from './lib/sound';
import { Explore } from './modes/Explore';
import { AtomBuilder } from './modes/AtomBuilder';
import { Hunt } from './modes/Hunt';
import { Quiz } from './modes/Quiz';
import { Lab } from './modes/Lab';
import { Collection } from './modes/Collection';
import { Tutor } from './modes/Tutor';
import { ElementDetail } from './components/ElementDetail';
import { SettingsPanel } from './components/SettingsPanel';
import { Mascot } from './components/Mascot';
import { Sticker } from './components/Decor';
import { BY_Z } from './data';

const MODES: { id: ModeId; label: string; glyph: string }[] = [
  { id: 'explore', label: 'Explore', glyph: '✦' },
  { id: 'builder', label: 'Atom Builder', glyph: '⚛' },
  { id: 'hunt', label: 'Element Hunt', glyph: '⌕' },
  { id: 'quiz', label: 'Quiz Arcade', glyph: '♥' },
  { id: 'lab', label: 'Chem Lab', glyph: '⚗' },
  { id: 'collection', label: 'Collection', glyph: '◈' },
  { id: 'tutor', label: 'Ask Zap', glyph: '☺' },
];

function initialMode(): ModeId {
  const h = window.location.hash.replace('#', '') as ModeId;
  return MODES.some((m) => m.id === h) ? h : 'explore';
}

export default function App() {
  const settings = useSettings();
  const [mode, setModeState] = useState<ModeId>(initialMode);
  const [detailZ, setDetailZ] = useState<number | null>(null);
  const [selectedZ, setSelectedZ] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [tutorSeed, setTutorSeed] = useState<{ z: number; n: number } | null>(null);
  const [mascotMsg, setMascotMsg] = useState<string | null>(null);
  const webgl = useMemo(() => hasWebGL(), []);

  // Reflect settings on <html> for CSS
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    root.dataset.largeText = String(settings.largeText);
    root.classList.toggle('motion', !settings.reducedMotion);
    root.classList.toggle('no-motion', settings.reducedMotion);
  }, [settings.highContrast, settings.largeText, settings.reducedMotion]);

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  useEffect(() => {
    onStickerEarned((s) => {
      sfx.sticker();
      toast(`Sticker unlocked: ${s.emoji} ${s.label}!`);
    });
    return () => onStickerEarned(null);
  }, [toast]);

  const setMode = useCallback((m: ModeId) => {
    sfx.tap();
    setModeState(m);
    try {
      history.replaceState(null, '', `#${m}`);
    } catch {
      /* ignore */
    }
  }, []);

  const openElement = useCallback((z: number) => {
    if (!BY_Z[z]) return;
    sfx.open();
    setSelectedZ(z);
    setDetailZ(z);
    markSeen(z);
    setMascotMsg(`${BY_Z[z].name}! Great pick!`);
  }, []);

  const askTutorAbout = useCallback(
    (z: number) => {
      setDetailZ(null);
      setTutorSeed({ z, n: Date.now() });
      setMode('tutor');
    },
    [setMode],
  );

  const api: AppApi = { mode, setMode, openElement, selectedZ, toast, webgl, askTutorAbout, tutorSeed };

  return (
    <AppContext.Provider value={api}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="app">
        <header className="header">
          <Sticker kind="heart" size={22} style={{ left: -6, top: 4 }} anim="float" />
          <Sticker kind="star" size={20} style={{ left: '42%', top: 2 }} anim="spin" />
          <div>
            <h1 className="title">
              ATOMIC<span className="dot">.</span>EXE
            </h1>
            <p className="tagline">♥ 118 ELEMENTS ♥ NEON CHEMISTRY PLAYGROUND ♥</p>
          </div>
          <div className="header-actions">
            <button className="icon-btn" aria-pressed={settings.sound} onClick={() => settingsStore.set({ sound: !settings.sound })} aria-label={settings.sound ? 'Mute sounds' : 'Turn sounds on'}>
              {settings.sound ? '🔊' : '🔇'}
            </button>
            <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Settings">
              ⚙
            </button>
          </div>
        </header>
        <nav className="modes" aria-label="Learning modes">
          {MODES.map((m) => (
            <button key={m.id} className="mode-btn" aria-current={mode === m.id ? 'page' : undefined} onClick={() => setMode(m.id)}>
              <span className="glyph" aria-hidden="true">
                {m.glyph}
              </span>
              {m.label}
            </button>
          ))}
        </nav>

        <main id="main" tabIndex={-1}>
          {mode === 'explore' && <Explore detailOpen={detailZ !== null || showSettings} />}
          {mode === 'builder' && <AtomBuilder />}
          {mode === 'hunt' && <Hunt />}
          {mode === 'quiz' && <Quiz />}
          {mode === 'lab' && <Lab />}
          {mode === 'collection' && <Collection />}
          {mode === 'tutor' && <Tutor />}
        </main>

        <footer className="footer">
          <div style={{ position: 'relative', display: 'inline-block', padding: '0 34px' }}>
            <Sticker kind="skull" size={24} style={{ left: 0, top: -4 }} />
            <Sticker kind="butterfly" size={26} style={{ right: 0, top: -4 }} anim="float" />
            Element data: PubChem (NIH), IUPAC standard atomic weights and the open Periodic-Table-JSON project. Atom models are illustrations.
            <br />
            No ads · no accounts · progress saved only on this device.
          </div>
        </footer>
      </div>

      {detailZ !== null && (
        <ElementDetail
          z={detailZ}
          webgl={webgl}
          onClose={() => setDetailZ(null)}
          onNavigate={(z) => openElement(z)}
          onAskTutor={askTutorAbout}
        />
      )}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {settings.mascot && <Mascot message={mascotMsg} hidden={detailZ !== null || showSettings} webgl={webgl} reducedMotion={settings.reducedMotion} />}
      <div className="toasts" aria-live="assertive">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.text}
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}
