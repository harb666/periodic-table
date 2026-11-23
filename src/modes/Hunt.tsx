import { useState } from 'react';
import { BY_Z } from '../data';
import { makeHunt, huntFeedback, type Hunt as HuntT } from '../lib/hunt';
import { ElementPicker } from '../components/ElementPicker';
import { markHolo, progressStore, checkStickers } from '../state/store';
import { sfx } from '../lib/sound';
import { useApp } from '../state/appContext';

export function Hunt() {
  const { openElement } = useApp();
  const [difficulty, setDifficulty] = useState<'easy' | 'hard'>('easy');
  const [hunt, setHunt] = useState<HuntT>(() => makeHunt('easy'));
  const [shown, setShown] = useState(2);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const [guesses, setGuesses] = useState<number[]>([]);
  const target = BY_Z[hunt.z];

  const next = (d = difficulty) => {
    setHunt(makeHunt(d, undefined, [hunt.z]));
    setShown(2);
    setFeedback(null);
    setSolved(false);
    setGuesses([]);
  };

  const guess = (z: number) => {
    if (solved) return;
    const g = BY_Z[z];
    setGuesses((list) => [...list, z]);
    setFeedback(huntFeedback(target, g));
    if (z === target.z) {
      sfx.correct();
      setSolved(true);
      markHolo(z);
      progressStore.set((p) => ({ huntsSolved: p.huntsSolved + 1 }));
      checkStickers();
    } else {
      sfx.wrong();
      setShown((s) => Math.min(hunt.clues.length, s + 1));
    }
  };

  return (
    <section aria-labelledby="hunt-h" className="mode-grid two">
      <div className="panel">
        <h2 id="hunt-h" className="h-neon">
          ⌕ Element Hunt
        </h2>
        <div className="seg" role="group" aria-label="Difficulty">
          <button
            aria-pressed={difficulty === 'easy'}
            onClick={() => {
              setDifficulty('easy');
              next('easy');
            }}
          >
            Easy
          </button>
          <button
            aria-pressed={difficulty === 'hard'}
            onClick={() => {
              setDifficulty('hard');
              next('hard');
            }}
          >
            Tricky
          </button>
        </div>
        <p>I'm thinking of a secret element… Read the clues and tap your guess!</p>
        <ol aria-live="polite">
          {hunt.clues.slice(0, shown).map((c, i) => (
            <li key={i} style={{ marginBottom: 6, fontWeight: 700 }}>
              {c}
            </li>
          ))}
        </ol>
        <div className="row">
          <button className="btn small" disabled={shown >= hunt.clues.length || solved} onClick={() => setShown((s) => s + 1)}>
            💡 Another hint
          </button>
          <button className="btn small" onClick={() => next()}>
            New hunt
          </button>
          {!solved && (
            <button
              className="btn small"
              onClick={() => {
                setSolved(true);
                setFeedback(`It was ${target.name} (${target.symbol}). You'll get the next one!`);
              }}
            >
              Show answer
            </button>
          )}
        </div>
        {feedback && (
          <p className={solved && guesses.includes(target.z) ? 'note' : 'warn'} role="status" style={{ marginTop: 12, fontWeight: 800 }}>
            {feedback}
            {solved && guesses.includes(target.z) && ' You earned a holo card! ◈'}
          </p>
        )}
        {solved && (
          <div className="row">
            <button className="btn primary" onClick={() => next()}>
              Next hunt →
            </button>
            <button className="btn" onClick={() => openElement(target.z)}>
              Open {target.name}
            </button>
          </div>
        )}
      </div>
      <div className="panel">
        <h3>Your guess</h3>
        <ElementPicker label="Pick an element to guess" onPick={guess} selected={guesses} />
      </div>
    </section>
  );
}
