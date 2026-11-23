# ATOMIC.EXE ⚛︎ ♥

A neon, 3D, interactive periodic table for curious 9-year-olds, in a 2007 scene-queen-meets-cyber-kawaii style. It covers all
118 elements with curated, kid-friendly content, plus learning games, a safe chemistry lab simulator and an optional AI tutor.

Built with **React 19, TypeScript, Vite, Three.js, React Three Fiber and Drei**.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm test` | Unit + component tests (Vitest, jsdom) |
| `npm run typecheck` | TypeScript project check |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run data:build` | Regenerate `src/data/elements.generated.ts` from `data-sources/` |
| `npm run tutor-server` | Optional AI tutor proxy (and static host for `dist/`) |

Requires Node 20+.

## Features

* **Explore**
  * The 3D table: floating glossy tiles, pink/cyan rim light and a checkerboard floor. Drag to orbit, pinch or scroll to zoom,
    tap to select. You can reset the camera or lock a straight-on view.
  * A keyboard-accessible **2D table** (arrow keys, Enter) and a searchable **card list**. The card list is the default on phones.
  * Category legend with highlight filtering, and search by name, symbol or number.
* **Element card**
  * Mass, category, period and group, electron configuration, and electron shells.
  * A rotatable 3D atom model, clearly labelled as an illustration.
  * A simple explanation, three facts, everyday uses, discovery information and safety notes.
  * Pronunciation through browser speech, a "Tell me more" section, and previous/next navigation.
* **Atom Builder**: add protons, neutrons and electrons. Shows the element, mass number, isotope, ion type and charge. It flags
  isotopes that aren't in its curated stable list, without claiming anything is physically stable.
* **Element Hunt**: clues are revealed step by step, with directional, encouraging feedback.
* **Quiz Arcade**: 12-question rounds that get harder as you go, with points, streak bonuses and achievement stickers.
* **Chemistry Lab**: nine balanced textbook reactions shown as labelled simulations, each with an atom-conservation table. A
  "mixing bench" refuses to invent reactions.
* **Collection**: cards unlock by exploring and turn holo through quizzes and hunts. There are 13 stickers and no monetisation.
* **Ask Zap**: a tutor that works fully offline, using rule-based answers from the curated content. An optional server-side AI
  mode is available (see below).
* **Settings**: sound, reduced motion (follows the OS setting), low-effects mode (default on phones and low-core devices), high
  contrast, bigger text and a mascot toggle. Progress is saved in `localStorage` only.

## Privacy & safety

* No accounts, ads, analytics, social sharing or public chat. The app makes no third-party requests: fonts are self-hosted and
  3D lighting is generated locally.
* The tutor checks for hazardous requests ("make an explosion", "mix chemicals at home"…) and personal information *before*
  anything leaves the device. Those messages are answered locally and never sent anywhere.
* The online tutor is **off by default**. A grown-up has to enable it in Settings, and it is only used if the proxy server is
  running. It receives only the question, the element being viewed and the last six chat turns. The server strips email and
  phone patterns, caps input length and rate-limits requests. It also holds the system prompt, which says Zap is a program and
  not a friend, must never give experiment instructions, and must not collect personal data.

## Optional AI tutor (server-side)

The API key lives only on the server. Never put it in a `VITE_*` variable, which would bundle it into the browser code.

```bash
npm run build
ANTHROPIC_API_KEY=sk-ant-... npm run tutor-server   # serves dist/ + /api/tutor on http://localhost:8787
```

* Optional variables: `PORT` (default 8787), `TUTOR_MODEL` (default `claude-opus-5-5`) and `DIST_DIR` (default `dist`).
* The proxy uses the official `@anthropic-ai/sdk` at low effort, with server-side refusal fallback enabled.
* In development, `npm run dev` proxies `/api` to `localhost:8787`, so you can run both.
* If the proxy is unreachable (for example on static hosting), the app silently stays in offline mode.

## Deployment

**Static only (no AI):** the build uses relative paths (`base: './'`), so `dist/` works from any folder or sub-path. Upload it to
Netlify, Vercel, GitHub Pages, S3 or similar:

```bash
npm ci && npm run build   # upload the dist/ folder
```

**With the AI tutor:** run `server/tutor-proxy.mjs` on any Node 20+ host (Render, Fly.io, a VM, etc.). Set `ANTHROPIC_API_KEY` in
the host's secret settings. The same process serves `dist/` and `/api/tutor`. If you host the frontend elsewhere, build it with
`VITE_TUTOR_URL=https://your-proxy.example.com/api/tutor` and add CORS on the proxy.

## Architecture

```
src/
  data/        elements.generated.ts (118 validated elements), categories, reactions, content/ (curated kid text)
  lib/         pure logic: atom builder, chemistry (formula parsing/balance), quiz, hunt, rng, storage, sound, speech
  tutor/       offline rule-based tutor + client for the optional proxy
  state/       tiny external stores (settings, progress, stickers) + app context
  components/  2D table, card list, element detail dialog, legend, pickers, mascot, decor
  three/       lazy-loaded 3D: TableScene (instanced tiles + canvas label atlas), AtomModel3D, WebGL detection
  modes/       Explore, AtomBuilder, Hunt, Quiz, Lab, Collection, Tutor
server/        tutor-proxy.mjs (Node http, @anthropic-ai/sdk)
scripts/       build-elements.mjs (dataset merge + validation)
tests/         data, logic and UI tests
```

### Performance notes

* **Tiles**: three instanced meshes in total (bodies, back-face "anime" outlines and labels), each a single draw call.
* **Labels**: drawn once into one canvas texture atlas. They are crisp, and no per-tile text objects are created.
* **Lazy loading**: Three.js loads in its own chunk, only when the 3D view or an atom model is shown. The first load is about
  120 KB gzipped of JS.
* **Rendering**: the 3D view renders on demand when motion is off or a dialog covers it. Browsers already pause animation frames in hidden tabs.
* **Device pixel ratio**: capped at 1.5 in low-effects mode, otherwise 2. Low-effects mode also drops sparkles and antialiasing.
* **Fallbacks**: if WebGL is unavailable or the context is lost, the app falls back to the 2D table and SVG atom diagrams.

See [DATA_SOURCES.md](DATA_SOURCES.md) for data provenance, licences and validation.
