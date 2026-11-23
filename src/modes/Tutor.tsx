import { useEffect, useRef, useState } from 'react';
import { askTutor, checkOnlineTutor, type ChatTurn } from '../tutor/client';
import type { TutorReply } from '../tutor/offline';
import { settingsStore, useSettings } from '../state/store';
import { canSpeak, stopSpeaking, zapSay } from '../lib/speech';
import { useApp } from '../state/appContext';
import { BY_Z } from '../data';
import { ZapPortrait } from '../components/Mascot';

interface Msg extends ChatTurn {
  source?: TutorReply['source'];
  z?: number;
}

export function Tutor() {
  const settings = useSettings();
  const { openElement, tutorSeed, selectedZ } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', text: "Hi! I'm Zap, a chemistry helper program. Ask me about any element, what things are made of, how reactions work – or say “quiz me”!", source: 'offline' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(['What is water made of?', 'Tell me about gold', 'Quiz me']);
  const [online, setOnline] = useState<boolean | null>(null);
  const [contextZ, setContextZ] = useState<number | undefined>(selectedZ ?? undefined);
  const listRef = useRef<HTMLDivElement>(null);
  const seeded = useRef<number>(0);

  useEffect(() => {
    if (settings.onlineTutor) checkOnlineTutor().then(setOnline);
    else setOnline(false);
  }, [settings.onlineTutor]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: settings.reducedMotion ? 'auto' : 'smooth' });
  }, [msgs, settings.reducedMotion]);

  const send = async (text: string) => {
    const t = text.trim().slice(0, 400);
    if (!t || busy) return;
    setInput('');
    const history = msgs.map(({ role, text }) => ({ role, text }));
    setMsgs((m) => [...m, { role: 'user', text: t }]);
    setBusy(true);
    const r = await askTutor(t, { online: settings.onlineTutor, contextZ, history });
    if (r.z) setContextZ(r.z);
    setMsgs((m) => [...m, { role: 'assistant', text: r.text, source: r.source, z: r.z }]);
    zapSay(r.text, { emotion: 'teaching' });
    setSuggestions(r.suggestions ?? []);
    setBusy(false);
  };

  // Leaving the tutor cuts off an answer in progress.
  useEffect(() => stopSpeaking, []);

  useEffect(() => {
    if (tutorSeed && tutorSeed.n !== seeded.current) {
      seeded.current = tutorSeed.n;
      setContextZ(tutorSeed.z);
      void send(`Tell me about ${BY_Z[tutorSeed.z].name}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorSeed]);

  return (
    <section aria-labelledby="tutor-h" className="panel">
      <div className="row" style={{ alignItems: 'center' }}>
        <div style={{ width: 64, height: 64 }} aria-hidden="true">
          <ZapPortrait />
        </div>
        <div className="grow">
          <h2 id="tutor-h" className="h-neon" style={{ margin: 0 }}>
            Zap · Chemistry Helper
          </h2>
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            {online ? 'Online AI helper is on (set up by a grown-up).' : 'Offline helper – answers come from our checked chemistry library.'} Zap is a computer program, not a person.
          </p>
        </div>
        {canSpeak() && (
          <button
            className="btn small"
            aria-pressed={settings.voice && settings.sound}
            onClick={() => {
              const on = !(settings.voice && settings.sound);
              settingsStore.set(on ? { voice: true, sound: true } : { voice: false });
            }}
          >
            {settings.voice && settings.sound ? '🔊 Voice on' : '🔇 Voice off'}
          </button>
        )}
      </div>
      <div className="chat" ref={listRef} role="log" aria-live="polite" aria-label="Chat with Zap" style={{ marginTop: 12 }}>
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role === 'user' ? 'user' : 'bot'}${m.source === 'safety' ? ' safety' : ''}`}>
            <span className="sr-only">{m.role === 'user' ? 'You said: ' : 'Zap said: '}</span>
            {m.text}
            {m.z && m.role === 'assistant' && (
              <div>
                <button className="btn small" style={{ marginTop: 6, color: '#1a0420', borderColor: '#9d00ff' }} onClick={() => openElement(m.z!)}>
                  Open {BY_Z[m.z].name} card
                </button>
              </div>
            )}
          </div>
        ))}
        {busy && <div className="msg bot">Zap is thinking…</div>}
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        {suggestions.map((s) => (
          <button key={s} className="btn small" onClick={() => send(s)}>
            {s}
          </button>
        ))}
      </div>
      <form
        className="row"
        style={{ marginTop: 10 }}
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <label htmlFor="tutor-input" className="sr-only">
          Ask Zap a question
        </label>
        <input id="tutor-input" className="input grow" style={{ flex: 1, width: 'auto' }} maxLength={400} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about any element…" autoComplete="off" />
        <button className="btn primary" type="submit" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
      <p className="muted" style={{ fontSize: '0.8rem', marginTop: 10 }}>
        Please don't share your name, address, school or other personal details. Zap will never tell you to do experiments – real chemistry needs a trained grown-up.
      </p>
    </section>
  );
}
