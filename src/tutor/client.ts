import { offlineReply, isDangerous, hasPersonalInfo, SAFETY_REPLY, PRIVACY_REPLY, type TutorReply } from './offline';
import { getElement } from '../data';

const ENDPOINT = (import.meta.env.VITE_TUTOR_URL as string | undefined) ?? './api/tutor';
let available: boolean | null = null;

/** Probe once for the optional backend proxy. Static hosting simply returns 404 → offline mode. */
export async function checkOnlineTutor(): Promise<boolean> {
  if (available !== null) return available;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`${ENDPOINT}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    available = res.ok && (await res.json()).ok === true;
  } catch {
    available = false;
  }
  return available;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export async function askTutor(message: string, opts: { online: boolean; contextZ?: number; history: ChatTurn[] }): Promise<TutorReply> {
  // Safety and privacy checks always run locally first – those messages are never sent anywhere.
  if (isDangerous(message)) return { text: SAFETY_REPLY, source: 'safety' };
  if (hasPersonalInfo(message)) return { text: PRIVACY_REPLY, source: 'safety' };
  if (!opts.online || !(await checkOnlineTutor())) return offlineReply(message, opts.contextZ);
  try {
    const el = opts.contextZ ? getElement(opts.contextZ) : undefined;
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message.slice(0, 400),
        element: el ? { z: el.z, name: el.name, symbol: el.symbol } : null,
        // Only the last few turns of chemistry chat – no identifiers of any kind.
        history: opts.history.slice(-6).map((t) => ({ role: t.role, text: t.text.slice(0, 600) })),
      }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { text?: string };
    if (!data.text) throw new Error('empty');
    return { text: data.text, source: 'online', z: opts.contextZ };
  } catch {
    const r = offlineReply(message, opts.contextZ);
    return { ...r, text: r.text };
  }
}
