import { useState } from 'react';
import { makeQuestion, scoreAnswer, NEW_QUIZ, levelForScore, type QuizQuestion, type QuizState } from '../lib/quiz';
import { markHolo, progressStore, checkStickers } from '../state/store';
import { sfx } from '../lib/sound';
import { useApp } from '../state/appContext';

const ROUND = 12;
const CHEERS = ['Awesome!', 'You rock!', 'Brain power!', 'Super-charged!', 'Element-ary!', 'Nailed it!'];
const LEVEL_NAMES = { 1: 'Level 1 · Starter', 2: 'Level 2 · Explorer', 3: 'Level 3 · Expert' };

export function Quiz() {
  const { openElement } = useApp();
  const [state, setState] = useState<QuizState>(NEW_QUIZ);
  const [q, setQ] = useState<QuizQuestion>(() => makeQuestion(1));
  const [picked, setPicked] = useState<string | null>(null);
  const [lastPoints, setLastPoints] = useState(0);
  const [recent, setRecent] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);

  const answer = (choice: string) => {
    if (picked) return;
    const r = scoreAnswer(state, q, choice);
    setPicked(choice);
    setState(r.state);
    setLastPoints(r.points);
    if (r.correct) {
      sfx.correct();
      markHolo(q.z);
    } else sfx.wrong();
    progressStore.set((p) => ({
      quizAnswered: p.quizAnswered + 1,
      quizCorrect: p.quizCorrect + (r.correct ? 1 : 0),
      bestStreak: Math.max(p.bestStreak, r.state.bestStreak),
      quizBest: Math.max(p.quizBest, r.state.score),
    }));
    checkStickers();
  };

  const next = () => {
    if (state.answered >= ROUND) {
      setFinished(true);
      return;
    }
    const level = levelForScore(state.correct);
    const avoid = [...recent, q.z].slice(-6);
    setRecent(avoid);
    setQ(makeQuestion(level, undefined, avoid));
    setPicked(null);
  };

  const restart = () => {
    setState(NEW_QUIZ);
    setQ(makeQuestion(1));
    setPicked(null);
    setRecent([]);
    setFinished(false);
  };

  const correct = picked === q.answer;

  return (
    <section aria-labelledby="quiz-h" className="panel">
      <h2 id="quiz-h" className="h-neon">
        ♥ Quiz Arcade
      </h2>
      <div className="scorebar" aria-live="polite">
        <div className="stat">
          <div className="k">Score</div>
          <div className="v">{state.score}</div>
        </div>
        <div className="stat">
          <div className="k">Streak</div>
          <div className="v">{state.streak} ϟ</div>
        </div>
        <div className="stat">
          <div className="k">Question</div>
          <div className="v">
            {Math.min(state.answered + (picked || finished ? 0 : 1), ROUND)} / {ROUND}
          </div>
        </div>
        <div className="stat">
          <div className="k">Best ever</div>
          <div className="v">{Math.max(progressStore.get().quizBest, state.score)}</div>
        </div>
      </div>

      {finished ? (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: '1.3rem', fontWeight: 800 }}>
            Round complete! You got {state.correct} of {ROUND} right and scored {state.score} points.
          </p>
          <p className="muted">{state.correct >= 9 ? 'You are a chemistry superstar!' : state.correct >= 5 ? 'Great work – keep exploring!' : 'Every scientist learns by trying. Play again!'}</p>
          <div className="row">
            <button className="btn primary" onClick={restart}>
              Play again
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          <p className="chip">{LEVEL_NAMES[q.level]}</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 800 }} id="q-prompt">
            {q.prompt}
          </p>
          <div className="choices" role="group" aria-labelledby="q-prompt">
            {q.choices.map((c) => (
              <button
                key={c}
                className={`choice${picked && c === q.answer ? ' right' : ''}${picked === c && c !== q.answer ? ' wrong' : ''}`}
                onClick={() => answer(c)}
                aria-disabled={!!picked}
              >
                {c}
              </button>
            ))}
          </div>
          {picked && (
            <div role="status">
              <p className={correct ? 'note' : 'warn'} style={{ fontWeight: 800 }}>
                {correct ? `${CHEERS[(state.correct + q.z) % CHEERS.length]} +${lastPoints} points${state.streak >= 3 ? ' (streak bonus!)' : ''}. Holo card unlocked ◈` : `Good try! The answer is ${q.answer}.`}{' '}
                {q.explain}
              </p>
              <button className="btn primary" onClick={next} autoFocus>
                {state.answered >= ROUND ? 'See results' : 'Next question →'}
              </button>
              <button className="btn" style={{ marginLeft: 8 }} onClick={() => openElement(q.z)}>
                Open card
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
