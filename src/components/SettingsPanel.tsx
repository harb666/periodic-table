import { useEffect, useRef } from 'react';
import { settingsStore, useSettings, type Settings } from '../state/store';

const ROWS: { key: keyof Settings; label: string; help: string }[] = [
  { key: 'sound', label: 'Sound effects', help: 'Little beeps and boops' },
  { key: 'reducedMotion', label: 'Reduce motion', help: 'Stops floating, spinning and sliding' },
  { key: 'lowEffects', label: 'Low effects mode', help: 'Faster on older phones and tablets' },
  { key: 'highContrast', label: 'High contrast', help: 'Solid colours and plain text' },
  { key: 'largeText', label: 'Bigger text', help: 'Makes words easier to read' },
  { key: 'mascot', label: 'Show Zap the mascot', help: 'The little helper who lives in the corner and sometimes runs around' },
  { key: 'voice', label: "Zap's voice", help: 'Zap says his tips and answers out loud in his squeaky robot voice' },
  { key: 'onlineTutor', label: 'Online AI tutor (grown-ups)', help: 'Only works if a grown-up set up the server. Questions are sent without any personal info.' },
];

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const s = useSettings();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('input')?.focus();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" ref={ref} role="dialog" aria-modal="true" aria-labelledby="settings-h" style={{ maxWidth: 520 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 id="settings-h">Settings</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </div>
        <div className="settings-list">
          {ROWS.map((r) => (
            <label key={r.key} className="toggle">
              <span>
                <strong>{r.label}</strong>
                <br />
                <span className="muted" style={{ fontSize: '0.85rem' }}>
                  {r.help}
                </span>
              </span>
              <input type="checkbox" checked={Boolean(s[r.key])} onChange={(e) => settingsStore.set({ [r.key]: e.target.checked } as Partial<Settings>)} />
            </label>
          ))}
        </div>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          ATOMIC.EXE has no ads, no accounts, no chat with strangers and no sharing. Progress stays on this device.
        </p>
        <button className="btn primary" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
