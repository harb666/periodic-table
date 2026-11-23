import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ZapActor, ZapClip } from '../three/ZapActor';
import { TARGET_SELECTORS, anchorFor, isReachable, lineFor, pickKind, stepToward, type Anchor, type Box, type Point, type TargetKind } from '../lib/mascot';
import { getZapStage } from '../lib/zapStage';
import { zapSay } from '../lib/speech';
import { zapVoice } from '../voice/zapVoice';
import portraitUrl from '../assets/zap-portrait.png';

const TIPS = [
  'Tap any element to open its card!',
  'Same column = same family. They act alike!',
  'The atomic number is the number of protons.',
  'Try the Quiz Arcade to earn holo cards!',
  'Never taste or touch chemicals – science is for looking and learning!',
  'Elements in the bottom two rows belong in rows 6 and 7.',
];

/** Still picture of Gir, for avatars and for when WebGL is unavailable. */
export function ZapPortrait() {
  return <img className="zap-portrait" src={portraitUrl} alt="" draggable={false} />;
}

/** Something Gir can run to: a DOM element, or a tile inside the 3D table. */
interface Trip {
  kind: TargetKind;
  /** Current on-screen box, or null once it is gone. Re-read every frame so he follows scrolling. */
  box(): Box | null;
  /** A little physical reaction from the thing he just landed on / poked. */
  react(onTop: boolean, delayMs: number): void;
  z?: number;
  label?: string;
}

const FIRST_TRIP_MS = 5000;
const TRIP_GAP_MS: [number, number] = [14000, 30000];
const MARGIN = 10;

function domTrip(kind: TargetKind, el: Element): Trip {
  return {
    kind,
    box: () => (el.isConnected ? el.getBoundingClientRect() : null),
    react(onTop, delayMs) {
      if (typeof el.animate !== 'function') return;
      if (kind === 'decor') {
        el.animate([{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(360deg) scale(1.5)' }, { transform: 'rotate(720deg) scale(1)' }], { duration: 1100, delay: delayMs, easing: 'ease-in-out' });
        return;
      }
      const glow = { filter: 'brightness(1.6)' };
      const frames = onTop
        ? [{ transform: 'none', transformOrigin: '50% 100%' }, { transform: 'scale(1.12, 0.72)', transformOrigin: '50% 100%', ...glow }, { transform: 'scale(0.95, 1.1)', transformOrigin: '50% 100%' }, { transform: 'none', transformOrigin: '50% 100%' }]
        : [{ transform: 'none' }, { transform: 'rotate(-4deg) scale(1.08)', ...glow }, { transform: 'rotate(4deg) scale(1.08)', ...glow }, { transform: 'rotate(-2deg)' }, { transform: 'none' }];
      el.animate(frames, { duration: onTop ? 420 : 700, delay: delayMs, easing: 'ease-out' });
    },
    z: Number((el as HTMLElement).dataset.z) || undefined,
    label: kind === 'mode' ? el.textContent?.replace(/^\W+/, '').trim() : undefined,
  };
}

function findTrip(view: { w: number; h: number }): Trip | null {
  const byKind = new Map<TargetKind, Trip[]>();
  for (const kind of Object.keys(TARGET_SELECTORS) as TargetKind[]) {
    const trips = [...document.querySelectorAll(TARGET_SELECTORS[kind])].filter((el) => isReachable(el.getBoundingClientRect(), view)).map((el) => domTrip(kind, el));
    if (trips.length) byKind.set(kind, trips);
  }
  // Tiles of the 3D table are not DOM elements; ask the scene where they are.
  const stage = getZapStage();
  if (stage) {
    const zs = stage.visitable();
    const tiles: Trip[] = [];
    for (let tries = 0; tries < 12 && zs.length && tiles.length < 4; tries++) {
      const z = zs[Math.floor(Math.random() * zs.length)];
      const box = stage.tileBox(z);
      if (box && isReachable(box, view)) tiles.push({ kind: 'tile', z, box: () => getZapStage()?.tileBox(z) ?? null, react: (_onTop, delayMs) => void setTimeout(() => getZapStage()?.poke(z), delayMs) });
    }
    if (tiles.length) byKind.set('tile', [...(byKind.get('tile') ?? []), ...tiles]);
  }
  const kind = pickKind([...byKind.keys()], Math.random);
  if (!kind) return null;
  const trips = byKind.get(kind)!;
  return trips[Math.floor(Math.random() * trips.length)];
}

export function Mascot({ message, hidden = false, webgl, reducedMotion }: { message?: string | null; hidden?: boolean; webgl: boolean; reducedMotion: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [actor, setActor] = useState<ZapActor | null>(null);
  const [tip, setTip] = useState(0);
  const [bubble, setBubble] = useState<{ text: string; n: number; flipX: boolean; below: boolean } | null>(null);
  // Gir's feet, in viewport pixels. Mutated by the animation loop, never by React.
  const pos = useRef<Point>({ x: 0, y: 0 });
  const away = useRef(false);

  const place = useCallback(() => {
    const el = rootRef.current;
    if (el) el.style.transform = `translate3d(${Math.round(pos.current.x - el.offsetWidth / 2)}px, ${Math.round(pos.current.y - el.offsetHeight)}px, 0)`;
  }, []);
  const home = useCallback((): Point => {
    const el = rootRef.current;
    const w = el?.offsetWidth ?? 120;
    return { x: window.innerWidth - MARGIN - w / 2, y: window.innerHeight - MARGIN };
  }, []);

  // `voice`: 'ask' = the user just tapped (may interrupt), 'chatter' = his own idea (only if audio is already on).
  const say = useCallback((text: string, voice: 'ask' | 'chatter' | 'silent' = 'chatter') => {
    if (voice !== 'silent') zapSay(text, { passive: voice === 'chatter' });
    const el = rootRef.current;
    const h = el?.offsetHeight ?? 150;
    setBubble((b) => ({ text, n: (b?.n ?? 0) + 1, flipX: pos.current.x < 280, below: pos.current.y - h < 110 }));
  }, []);

  // Load the 3D character only where it can be drawn.
  useEffect(() => {
    if (!webgl || !canvasRef.current) return;
    let live = true;
    let made: ZapActor | null = null;
    import('../three/ZapActor')
      .then((m) => m.ZapActor.create(canvasRef.current!))
      .then((a) => {
        made = a;
        if (live) setActor(a);
        else a.dispose();
      })
      .catch(() => {
        /* keep the portrait */
      });
    return () => {
      live = false;
      made?.dispose();
      setActor(null);
    };
  }, [webgl]);

  // Park at home, and stay there through resizes while he is not out on a trip.
  useLayoutEffect(() => {
    const park = () => {
      actor?.resize();
      if (!away.current) {
        pos.current = home();
        place();
      }
    };
    park();
    window.addEventListener('resize', park);
    return () => window.removeEventListener('resize', park);
  }, [actor, home, place]);

  // Speech: app messages and tips. The bubble tucks itself away so it never covers the table for long.
  useEffect(() => {
    if (message) say(message, 'ask');
  }, [message, say]);
  useEffect(() => {
    say(TIPS[0], 'silent');
  }, [say]);
  useEffect(() => {
    if (!bubble) return;
    const t = setTimeout(() => setBubble(null), 6000);
    return () => clearTimeout(t);
  }, [bubble]);

  // His tongue and head bob while he is talking.
  useEffect(() => {
    if (!actor) return;
    actor.setTalking(zapVoice.isSpeaking);
    return zapVoice.subscribe((speaking) => actor.setTalking(speaking));
  }, [actor]);

  const cheered = useRef(message);
  useEffect(() => {
    if (hidden || !actor || !message || cheered.current === message) return;
    cheered.current = message;
    if (!reducedMotion) actor.playOnce('Cheer');
  }, [actor, hidden, message, reducedMotion]);

  // The brain: idle at home, now and then run to something on screen, play with it, run back.
  useEffect(() => {
    if (!actor) return;
    if (hidden || reducedMotion) {
      away.current = false;
      pos.current = home();
      place();
      actor.face(0);
      actor.lookAt(0, 0);
      actor.loop('Idle');
      actor.update(reducedMotion ? 0 : 1 / 60);
      return;
    }
    // (Re)park: while hidden he has no size, so the hidden-time home position is not usable.
    away.current = false;
    pos.current = home();
    place();
    type Mode = 'home' | 'going' | 'acting' | 'returning';
    let mode: Mode = 'home';
    let trip: Trip | null = null;
    let anchor: Anchor | null = null;
    let actUntil = 0;
    let extraStops = 0;
    let nextTrip = performance.now() + FIRST_TRIP_MS + Math.random() * 3000;
    let pointer: Point | null = null;
    let raf = 0;
    let last = performance.now();

    const size = () => ({ w: rootRef.current?.offsetWidth ?? 120, h: rootRef.current?.offsetHeight ?? 150 });
    const view = () => ({ w: window.innerWidth, h: window.innerHeight });
    const typing = () => /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? '');

    const goHome = () => {
      mode = 'returning';
      trip = null;
      actor.loop('Run');
    };
    const depart = () => {
      trip = findTrip(view());
      if (!trip) return false;
      mode = 'going';
      away.current = true;
      actor.lookAt(0, 0);
      actor.loop('Run');
      return true;
    };
    const arrive = (now: number, a: Anchor) => {
      if (!trip) return;
      mode = 'acting';
      actor.loop('Idle');
      actor.face(a.side * -0.55);
      const { kind } = trip;
      let clip: ZapClip = 'Point';
      let reps = 1;
      let reactAt = 500;
      if (kind === 'title') [clip, reps, reactAt] = ['Dance', 2, 300];
      else if (kind === 'decor') [clip, reactAt] = ['Cheer', 250];
      else if (a.onTop) [clip, reactAt] = ['Jump', 640];
      const seconds = actor.playOnce(clip, reps);
      trip.react(a.onTop && clip === 'Jump', reactAt);
      say(lineFor(kind, { z: trip.z, label: trip.label, rand: Math.random }));
      actUntil = now + seconds * 1000 + 900;
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const z = size();
      const speed = z.h * 2.9;

      if (mode === 'home') {
        if (pointer) actor.lookAt((pointer.x - pos.current.x) / 500, (pointer.y - (pos.current.y - z.h * 0.6)) / 500);
        if (now > nextTrip) {
          if (typing() || !depart()) nextTrip = now + 6000;
          else extraStops = Math.random() < 0.35 ? 1 : 0;
        }
      } else if (mode === 'going' || mode === 'acting') {
        const box = trip?.box() ?? null;
        if (!box || !isReachable(box, view(), 0)) goHome();
        else {
          // Re-read the target every frame so he follows it if the page scrolls.
          anchor = anchorFor(box, z, view());
          if (mode === 'going') {
            const step = stepToward(pos.current, anchor, speed * dt);
            actor.face(Math.sign(anchor.x - pos.current.x) * 1.15);
            pos.current = step;
            if (step.arrived) arrive(now, anchor);
          } else {
            pos.current = { x: anchor.x, y: anchor.y };
            if (now > actUntil) {
              if (extraStops-- > 0 && !typing() && depart()) {
                /* on to the next thing */
              } else goHome();
            }
          }
        }
      } else {
        const dest = home();
        const step = stepToward(pos.current, dest, speed * dt);
        actor.face(Math.sign(dest.x - pos.current.x) * 1.15);
        pos.current = step;
        if (step.arrived) {
          mode = 'home';
          away.current = false;
          actor.face(0);
          actor.loop('Idle');
          nextTrip = now + TRIP_GAP_MS[0] + Math.random() * (TRIP_GAP_MS[1] - TRIP_GAP_MS[0]);
        }
      }
      place();
      actor.update(dt);
    };

    const onPointer = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (document.visibilityState === 'visible') {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [actor, hidden, reducedMotion, home, place, say]);

  const onTap = () => {
    const next = (tip + 1) % TIPS.length;
    setTip(next);
    say(TIPS[next], 'ask');
    if (actor) {
      actor.playOnce('Wave');
      if (reducedMotion) actor.update(0.9); // no loop running: show a single waving frame
    }
  };

  return (
    <div ref={rootRef} className={`mascot${actor ? ' live' : ''}`} hidden={hidden}>
      {bubble && (
        <div key={bubble.n} className={`bubble${bubble.flipX ? ' flip-x' : ''}${bubble.below ? ' below' : ''}`} role="status" aria-live="polite">
          {bubble.text}
        </div>
      )}
      <canvas ref={canvasRef} aria-hidden="true" />
      <button className="bot" onClick={onTap} aria-label="Gir the chemistry helper: show another tip" title="Tap me for a tip">
        {!actor && <ZapPortrait />}
      </button>
    </div>
  );
}
