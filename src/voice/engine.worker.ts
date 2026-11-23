// Speech synthesis worker: eSpeak (via meSpeak, GPL) with Gir's custom voice
// definition. Runs off the main thread so a sentence never stalls rendering.
// In: { warm } | { id, text, speed, pitch, wordgap }   Out: { ready } | { id, pcm, sampleRate } | { id, error }
import meSpeak from 'mespeak';
import config from 'mespeak/src/mespeak_config.json';
import enUS from 'mespeak/voices/en/en-us.json';
import { VOICE_LINES } from './profile';

interface Request {
  warm?: boolean;
  id: number;
  text: string;
  speed: number;
  pitch: number;
  wordgap: number;
}

const scope = self as unknown as { postMessage(msg: unknown, transfer?: Transferable[]): void; onmessage: ((e: MessageEvent<Request>) => void) | null };

const VOICE_ID = 'en/zap';
let ready = false;
function init() {
  if (ready) return;
  meSpeak.loadConfig(config);
  const stock = atob(enUS.voice);
  meSpeak.loadVoice({
    voice_id: VOICE_ID,
    dict_id: enUS.dict_id,
    dict: enUS.dict,
    voice: `${stock.replace(/^name .*$/m, 'name zap')}\n${VOICE_LINES.join('\n')}\n`,
    voice_encoding: 'text',
  });
  ready = true;
}

/** 16-bit PCM WAV → Float32 samples. */
function decodeWav(buf: ArrayBuffer): { pcm: Float32Array; sampleRate: number } {
  const view = new DataView(buf);
  const sampleRate = view.getUint32(24, true);
  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const id = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
    const size = view.getUint32(offset + 4, true);
    if (id === 'data') {
      const n = Math.floor(Math.min(size, view.byteLength - offset - 8) / 2);
      const pcm = new Float32Array(n);
      for (let i = 0; i < n; i++) pcm[i] = view.getInt16(offset + 8 + i * 2, true) / 32768;
      return { pcm, sampleRate };
    }
    offset += 8 + size + (size & 1);
  }
  throw new Error('no audio data');
}

scope.onmessage = (e) => {
  if (e.data.warm) {
    init();
    scope.postMessage({ ready: true });
    return;
  }
  const { id, text, speed, pitch, wordgap } = e.data;
  try {
    init();
    const wav = meSpeak.speak(text, { voice: VOICE_ID, speed, pitch, wordgap, amplitude: 100, rawdata: true });
    if (!(wav instanceof ArrayBuffer) || wav.byteLength < 100) throw new Error('engine returned no audio');
    const { pcm, sampleRate } = decodeWav(wav);
    if (pcm.length < 200) throw new Error('engine returned no audio');
    scope.postMessage({ id, pcm, sampleRate }, [pcm.buffer]);
  } catch (err) {
    scope.postMessage({ id, error: String((err as Error)?.message ?? err) });
  }
};
