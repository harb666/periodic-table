// Zap's voice profile.
//
// The numbers come from measuring the supplied reference clip (12 s): median
// pitch ≈ 627 Hz, middle half of the pitch between ≈ 520 and 730 Hz, peaks near
// 890 Hz, constant fast pitch jumps, about 4 syllables a second, and most energy
// between 500 and 1500 Hz with a bright band at 3–5 kHz. The clip is far too
// short to train or clone a voice from, so this is a designed synthetic voice
// with the same measurable character – not a copy of the recording.

export type Emotion = 'neutral' | 'excited' | 'curious' | 'confused' | 'surprised' | 'teaching';

/**
 * eSpeak voice definition lines, appended to the stock en-US voice.
 * `pitch` is the base and top of the pitch range in Hz (before the playback
 * rate lifts it further); `formant` lines scale frequency / strength / width
 * of each resonance, giving the small-creature, slightly synthetic timbre.
 */
export const VOICE_LINES = [
  'pitch 330 620',
  'formant 1 112 100 100',
  'formant 2 115 100 100',
  'formant 3 115 108 100',
  'formant 4 110 118 100',
  'formant 5 110 118 100',
  'flutter 8',
  'roughness 5',
  'stressAdd 15 15 15 15 0 0 40 60',
];

export interface EmotionPreset {
  /** eSpeak words per minute, before playback rate. */
  speed: number;
  /** eSpeak pitch setting, 0–99, within the voice's pitch range. */
  pitch: number;
  /** Playback rate: raises pitch and formants together (the "small" in small and squeaky). */
  rate: number;
  /** Size of the wandering pitch steps, in cents. */
  wobble: number;
  /** Chance that a step is a sudden jump to another register. */
  jump: number;
  /** Vibrato depth in cents. */
  vibrato: number;
  /** Pitch offset at the start of the phrase, decaying away (cents). */
  startLift: number;
  /** Pitch rise over the last third of the phrase (cents). */
  endRise: number;
}

export const EMOTIONS: Record<Emotion, EmotionPreset> = {
  neutral: { speed: 112, pitch: 50, rate: 1.18, wobble: 170, jump: 0.16, vibrato: 22, startLift: 0, endRise: 0 },
  excited: { speed: 126, pitch: 62, rate: 1.22, wobble: 240, jump: 0.32, vibrato: 32, startLift: 150, endRise: 120 },
  curious: { speed: 112, pitch: 55, rate: 1.18, wobble: 150, jump: 0.14, vibrato: 24, startLift: 0, endRise: 480 },
  confused: { speed: 98, pitch: 42, rate: 1.13, wobble: 240, jump: 0.08, vibrato: 55, startLift: -120, endRise: 200 },
  surprised: { speed: 126, pitch: 70, rate: 1.24, wobble: 190, jump: 0.3, vibrato: 30, startLift: 620, endRise: 0 },
  teaching: { speed: 108, pitch: 48, rate: 1.16, wobble: 85, jump: 0.05, vibrato: 14, startLift: 0, endRise: 0 },
};

/** Sample rate of the pitch curve handed to Web Audio (points per second). */
export const CURVE_HZ = 50;
/** Silence between sentences, seconds. */
export const PHRASE_GAP = 0.09;
