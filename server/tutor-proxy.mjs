// ATOMIC.EXE optional AI tutor proxy.
// - Keeps ANTHROPIC_API_KEY on the server; the browser never sees it.
// - Holds the system prompt and safety rules server-side.
// - Accepts only a short question, an optional element reference and a few prior chat turns.
// - Optionally serves the built app from ./dist so one process can host everything.
//
// Run:  ANTHROPIC_API_KEY=sk-... npm run tutor-server      (listens on PORT, default 8787)
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const PORT = Number(process.env.PORT ?? 8787);
const MODEL = process.env.TUTOR_MODEL ?? 'claude-opus-5-5';
const DIST = resolve(process.env.DIST_DIR ?? 'dist');
const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = hasKey ? new Anthropic() : null;

const SYSTEM = `You are "Zap", a friendly chemistry helper inside ATOMIC.EXE, an educational periodic table app for children around 9 years old.
Rules you must always follow:
- You are a computer program, not a person or a friend. If asked, say so kindly. Never claim feelings, a body, or a life.
- Explain with short sentences and simple words (2-5 sentences). Be encouraging and positive. Use at most one exclamation mark per reply.
- Stay on science topics (elements, atoms, chemistry, everyday science). Gently steer other topics back to chemistry.
- Only state well-established facts. If you are not sure, say "I'm not sure" rather than guessing.
- Never give instructions for experiments, mixing, heating, burning, tasting or sniffing substances, making dangerous things, or obtaining chemicals. If asked, say it is dangerous, that real experiments need trained adults and proper labs, and suggest the app's safe Chemistry Lab simulations instead.
- Never ask for or repeat personal information (names, ages, addresses, schools, contact details). If the child shares any, remind them to keep it private.
- Give hints instead of answers when the child is solving a quiz or hunt, unless they ask for the answer.
- No links, no social media, no advertising, no requests to sign up for anything.`;

const PII = [/[\w.+-]+@[\w-]+\.[\w.]+/g, /\+?\d[\d\s().-]{7,}\d/g];
const scrub = (s) => PII.reduce((t, r) => t.replace(r, '[removed]'), String(s ?? '')).slice(0, 600);

// Tiny in-memory rate limiter: 20 requests / 5 minutes per client address.
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 5 * 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 20;
}

async function readBody(req, max = 8_000) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > max) throw new Error('too large');
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function handleTutor(req, res) {
  if (!client) return json(res, 503, { error: 'Tutor not configured' });
  if (limited(req.socket.remoteAddress ?? 'x')) return json(res, 429, { error: 'Slow down a little!' });
  let body;
  try {
    body = await readBody(req);
  } catch {
    return json(res, 400, { error: 'Bad request' });
  }
  const message = scrub(body.message).slice(0, 400);
  if (!message.trim()) return json(res, 400, { error: 'Empty message' });
  const el = body.element && Number.isInteger(body.element.z) ? body.element : null;
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];

  /** @type {import('@anthropic-ai/sdk').default.Beta.BetaMessageParam[]} */
  const messages = [];
  for (const t of history) {
    const role = t.role === 'assistant' ? 'assistant' : 'user';
    const text = scrub(t.text);
    if (!text) continue;
    if (!messages.length && role === 'assistant') continue; // must start with user
    const prev = messages[messages.length - 1];
    if (prev && prev.role === role) prev.content += `\n${text}`;
    else messages.push({ role, content: text });
  }
  const ctx = el ? `(The child is currently looking at element ${el.z}: ${String(el.name).slice(0, 20)} (${String(el.symbol).slice(0, 3)}).)\n` : '';
  if (messages.length && messages[messages.length - 1].role === 'user') messages.push({ role: 'assistant', content: 'Okay!' });
  messages.push({ role: 'user', content: ctx + message });

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages,
    });
    if (response.stop_reason === 'refusal') {
      return json(res, 200, { text: "Let's talk about something else in chemistry! Which element should we explore?" });
    }
    if (response.stop_reason === 'max_tokens') console.warn('Tutor reply hit max_tokens');
    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return json(res, 200, { text: text || "I'm not sure – try asking another way!" });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json(res, 429, { error: 'Busy' });
    if (err instanceof Anthropic.APIError) {
      console.error('Anthropic API error', err.status, err.message);
      return json(res, 502, { error: 'Upstream error' });
    }
    console.error(err);
    return json(res, 500, { error: 'Server error' });
  }
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

async function serveStatic(req, res) {
  const url = new URL(req.url ?? '/', 'http://x');
  let p = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  let file = join(DIST, p || 'index.html');
  if (!file.startsWith(DIST)) return json(res, 403, { error: 'Forbidden' });
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(DIST, 'index.html');
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
}

http
  .createServer(async (req, res) => {
    const path = (req.url ?? '').split('?')[0];
    if (path.endsWith('/api/tutor/health')) return json(res, 200, { ok: Boolean(client) });
    if (path.endsWith('/api/tutor') && req.method === 'POST') return handleTutor(req, res);
    if (req.method === 'GET') return serveStatic(req, res);
    res.writeHead(405).end();
  })
  .listen(PORT, () => {
    console.log(`ATOMIC.EXE tutor proxy on http://localhost:${PORT} (AI ${client ? 'enabled' : 'disabled – no API key, app uses offline tutor'})`);
  });
