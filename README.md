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
  * "Hear it" read-aloud in Zap's voice, a "Tell me more" section, and previous/next navigation.
* **Atom Builder**: add protons, neutrons and electrons. Shows the element, mass number, isotope, ion type and charge. It flags
  isotopes that aren't in its curated stable list, without claiming anything is physically stable.
* **Element Hunt**: clues are revealed step by step, with directional, encouraging feedback.
* **Quiz Arcade**: 12-question rounds that get harder as you go, with points, streak bonuses and achievement stickers.
* **Chemistry Lab**: nine balanced textbook reactions shown as labelled simulations, each with an atom-conservation table. A
  "mixing bench" refuses to invent reactions.
* **Collection**: cards unlock by exploring and turn holo through quizzes and hunts. There are 13 stickers and no monetisation.
* **Ask Zap**: a tutor that works fully offline, using rule-based answers from the curated content. An optional server-side AI
  mode is available (see below).
* **Zap, the mascot**: a rigged 3D character who lives in the corner. Every so often he runs across the screen to an element
  tile (2D or 3D), a mode button, the title or a sticker, bounces on it or points at it, says something true about it and runs
  home. He glances toward the pointer, waves when tapped, and hides while a dialog is open. With reduced motion on he stays put.
* **Zap's voice**: a custom squeaky robot voice, synthesised in the browser. Zap speaks tutor answers, his tips and reactions,
  and the "Hear it" read-aloud on every element card. Switch it off in Settings or in the tutor; the mute button silences it too.
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
  lib/         pure logic: atom builder, chemistry (formula parsing/balance), quiz, hunt, rng, storage, sound, speech,
               mascot (where Zap may go and what he says), zapStage (bridge to tiles inside the 3D table)
  assets/      zap.glb (generated, rigged mascot) and zap-portrait.png
  tutor/       offline rule-based tutor + client for the optional proxy
  voice/       Zap's voice: text planning, pitch contour, eSpeak worker, Web Audio pipeline
  state/       tiny external stores (settings, progress, stickers) + app context
  components/  2D table, card list, element detail dialog, legend, pickers, mascot, decor
  three/       lazy-loaded 3D: TableScene (instanced tiles + canvas label atlas), AtomModel3D, ZapActor, WebGL detection
  modes/       Explore, AtomBuilder, Hunt, Quiz, Lab, Collection, Tutor
server/        tutor-proxy.mjs (Node http, @anthropic-ai/sdk)
scripts/       build-elements.mjs (dataset merge + validation), rig-character.mjs (mascot rig + clips)
assets-src/    zap-character.glb (the unrigged source model)
tests/         data, logic, UI, mascot rig and voice tests
```

### Performance notes

* **Tiles**: three instanced meshes in total (bodies, back-face "anime" outlines and labels), each a single draw call.
* **Labels**: drawn once into one canvas texture atlas. They are crisp, and no per-tile text objects are created.
* **Lazy loading**: Three.js loads in its own chunk, after first paint, for the 3D view, atom models and the mascot (never
  when WebGL is unavailable). The first load is about 120 KB gzipped of JS.
* **Mascot**: one small transparent canvas (4 draw calls, ~3.8k vertices) moved with a compositor transform; its loop stops
  in hidden tabs, while a dialog is open and under reduced motion.
* **Rendering**: the 3D view renders on demand when motion is off or a dialog covers it. Browsers already pause animation frames in hidden tabs.
* **Device pixel ratio**: capped at 1.5 in low-effects mode, otherwise 2. Low-effects mode also drops sparkles and antialiasing.
* **Fallbacks**: if WebGL is unavailable or the context is lost, the app falls back to the 2D table and SVG atom diagrams.

### The mascot rig

The source model (`assets-src/zap-character.glb`) is four static meshes with no skeleton. `npm run rig:build` turns it into
`src/assets/zap.glb`:

* bakes the node transforms and normalises the character (feet on y = 0, one unit tall, facing +Z);
* builds a 13-joint skeleton: `Root › Hips › Chest › Head`, two-bone ears, tongue, arms and legs, all axis-aligned at bind;
* paints skin weights: the body and its outline hull blend smoothly through the waist and neck, ears stiffen toward the base,
  and the limbs, face and zip follow single bones (at most four influences per vertex, normalised);
* bakes seven clips at 30 fps: `Idle`, `Run`, `Wave`, `Jump`, `Point`, `Dance`, `Cheer`.

The output passes the Khronos glTF validator with no errors or warnings, and `tests/mascot.test.ts` re-checks the joint
hierarchy, inverse bind matrices, weights and clips on every test run. Where WebGL is unavailable the mascot is a still image.

### Zap's voice

Everything runs on the device: no server, no account, no per-use cost, and it works offline once loaded.

```
text ─► src/voice/text.ts      sentences + mood per sentence; chemistry pronunciations; symbols and formulas spelled out
     ─► engine.worker.ts       eSpeak (via meSpeak) in a Web Worker, with Zap's own voice definition (pitch range, formants)
     ─► contour.ts             pitch movement per sentence: register jumps, vibrato, mood shape (as a playback-rate curve)
     ─► zapVoice.ts            Web Audio: buzz, metallic resonance, brightness, compressor ─► speakers
```

* **Profile** (`src/voice/profile.ts`): measured from three short reference clips (about 10 s of clear voice once background
  noise is gated out). Target: median pitch about 650 Hz, the middle half between about 525 and 833 Hz, peaks near 1090 Hz,
  very bright above 4.5 kHz. Rendered output measures a median of 659 Hz, the middle half between 570 and 804 Hz, peaks near
  1000 Hz, and a tone within about 4 dB of the target from 315 Hz to 8 kHz. Ten seconds cannot train or clone a voice, so
  this is a designed voice with the same measurable character, not a copy of the recordings.
* **Moods**: excited, curious, confused, surprised, teaching and neutral, chosen per sentence from wording and punctuation.
* **Pronunciation**: all 118 element names and the app's science vocabulary were transcribed through the engine; the ones it
  got wrong are fixed in a phoneme dictionary (`PRONUNCIATIONS` in `text.ts`).
* **Latency**: sentences are synthesised one ahead of playback. Measured in Chromium: about 0.9 s to first sound on first use
  (worker download and start), then roughly 10–90 ms of synthesis per sentence.
* **Size**: the worker is about 1.9 MB (0.7 MB gzipped) and is fetched only after the first tap with the voice switched on.
* **Fallback**: without Web Workers or Web Audio, or if the engine fails twice, the browser's built-in speech voice is used.
* **Reliability**: this eSpeak build fails after roughly 80 calls, so each worker is retired after 40 and replaced.
* **Licence**: meSpeak / eSpeak are GPL. Shipping them means the app's source must stay available under GPL-compatible terms.
* **Quest / mobile**: uses only Web Workers and Web Audio, which the Meta Quest browser and mobile browsers support. Audio
  starts after the first tap, as browsers require. It has not been run on a headset.

To go further than a designed voice (a neural clone of a specific voice), you would need a server with a GPU, an open model
such as OpenVoice or GPT-SoVITS (check each model's licence), at least 10–30 minutes of clean, varied speech for fine-tuning
(or 30–60 seconds for a rough zero-shot attempt), and the right to use that voice. Expect roughly 1–3 s per sentence and the
cost of keeping a GPU machine running.

See [DATA_SOURCES.md](DATA_SOURCES.md) for data provenance, licences and validation.
