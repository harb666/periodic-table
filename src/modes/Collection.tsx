import { ELEMENTS } from '../data';
import { CATEGORY_BY_ID } from '../data/categories';
import { STICKERS, useProgress, progressStore } from '../state/store';
import { useApp } from '../state/appContext';
import { clearAll } from '../lib/storage';

export function Collection() {
  const p = useProgress();
  const { openElement } = useApp();
  const seen = new Set(p.seen);
  const holo = new Set(p.holo);
  return (
    <section aria-labelledby="col-h" className="mode-grid">
      <div className="panel">
        <h2 id="col-h" className="h-neon">
          ◈ Element Collection
        </h2>
        <p>
          Open an element card to collect it. Answer quiz questions or solve hunts to make it a shiny <strong>holo</strong> card! No shop, no money – just learning.
        </p>
        <div className="scorebar">
          <div className="stat">
            <div className="k">Collected</div>
            <div className="v">{seen.size} / 118</div>
          </div>
          <div className="stat">
            <div className="k">Holo cards</div>
            <div className="v">{holo.size}</div>
          </div>
          <div className="stat">
            <div className="k">Stickers</div>
            <div className="v">
              {p.stickers.length} / {STICKERS.length}
            </div>
          </div>
          <div className="stat">
            <div className="k">Quiz best</div>
            <div className="v">{p.quizBest}</div>
          </div>
        </div>
      </div>
      <div className="panel">
        <h3>Achievement stickers</h3>
        <ul className="sticker-list">
          {STICKERS.map((s) => {
            const earned = p.stickers.includes(s.id);
            return (
              <li key={s.id} className={`sticker${earned ? ' earned' : ''}`}>
                <span className="g" aria-hidden="true">
                  {earned ? s.emoji : '?'}
                </span>
                <strong>{s.label}</strong>
                <div style={{ fontSize: '0.8rem' }}>
                  {s.desc}
                  <span className="sr-only">{earned ? ' – earned' : ' – not yet earned'}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="panel">
        <h3>Cards</h3>
        <ul className="cards">
          {ELEMENTS.map((e) => {
            const got = seen.has(e.z);
            const shiny = holo.has(e.z);
            return (
              <li key={e.z}>
                <button
                  className={`ccard${got ? '' : ' locked'}${shiny ? ' holo' : ''}`}
                  style={{ ['--c' as string]: CATEGORY_BY_ID[e.category].color }}
                  onClick={() => openElement(e.z)}
                  aria-label={`${e.name}: ${shiny ? 'holo card' : got ? 'collected' : 'not collected yet – open to collect'}`}
                >
                  <span style={{ fontSize: '0.7rem' }}>{e.z}</span>
                  <span className="sym">{got ? e.symbol : '?'}</span>
                  <span className="nm">{got ? e.name : '???'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="panel">
        <h3>Grown-ups</h3>
        <p className="muted">Progress is saved only in this browser on this device. Nothing is sent anywhere and there are no accounts.</p>
        <button
          className="btn"
          onClick={() => {
            if (window.confirm('Reset all progress, cards and stickers on this device?')) {
              clearAll();
              progressStore.reset();
            }
          }}
        >
          Reset progress
        </button>
      </div>
    </section>
  );
}
