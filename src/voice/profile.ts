// Gir's voice profile.
//
// The numbers come from measuring three short reference clips (about 10 s of
// clear voice once background noise is gated out): median pitch ≈ 650 Hz, the
// middle half between ≈ 525 and 833 Hz, peaks near 1090 Hz, frequent leaps
// between registers, and a very bright tone above 4.5 kHz. That is far too
// little to train or clone a voice from, so this is a designed synthetic voice
// with the same measurable character – not a copy of the recordings.

export type Emotion = 'neutral' | 'excited' | 'curious' | 'confused' | 'surprised' | 'teaching';

/**
 * eSpeak voice definition lines, appended to the stock en-US voice.
 * `pitch` is the base and top of the pitch range in Hz (before the playback
 * rate lifts it further); `formant` lines scale frequency / strength / width
 * of each resonance, giving the small-creature, slightly synthetic timbre.
 */
export const VOICE_LINES = [
  'pitch 255 670',
  // Formants are raised only modestly: pushed further, vowels start to sound alike and words blur.
  'formant 1 106 100 100',
  'formant 2 108 100 100',
  'formant 3 108 108 100',
  'formant 4 105 115 100',
  'formant 5 105 115 100',
  'consonants 140 140',
  'flutter 5',
  'roughness 2',
  'stressAdd 15 15 15 15 0 0 40 60',
];

export interface EmotionPreset {
  /** eSpeak words per minute, before playback rate. */
  speed: number;
  /** Extra pause between words, in 10 ms units. */
  wordgap: number;
  /** eSpeak pitch setting, 0–99, within the voice's pitch range. */
  pitch: number;
  /** Playback rate: raises pitch and formants together (the "small" in small and squeaky). */
  rate: number;
  /** Size of the wandering pitch steps, in cents. */
  wobble: number;
  /** Chance that a step is a sudden jump to another register. */
  jump: number;
  /** Chance that the whole phrase sits up in the squeal register. */
  squeal: number;
  /** Vibrato depth in cents. */
  vibrato: number;
  /** Pitch offset at the start of the phrase, decaying away (cents). */
  startLift: number;
  /** Pitch rise over the last third of the phrase (cents). */
  endRise: number;
}

// Explaining voices (neutral, teaching) are slower, steadier and a little lower, so long
// sentences stay easy to follow; the short exclamations carry the wild pitch acrobatics.
export const EMOTIONS: Record<Emotion, EmotionPreset> = {
  neutral: { speed: 104, wordgap: 1, pitch: 46, rate: 1.14, wobble: 120, jump: 0.09, squeal: 0.1, vibrato: 20, startLift: 0, endRise: 0 },
  excited: { speed: 118, wordgap: 0, pitch: 62, rate: 1.18, wobble: 230, jump: 0.3, squeal: 0.45, vibrato: 32, startLift: 150, endRise: 120 },
  curious: { speed: 104, wordgap: 1, pitch: 54, rate: 1.14, wobble: 140, jump: 0.12, squeal: 0.25, vibrato: 24, startLift: 0, endRise: 480 },
  confused: { speed: 94, wordgap: 2, pitch: 42, rate: 1.1, wobble: 220, jump: 0.08, squeal: 0, vibrato: 50, startLift: -120, endRise: 200 },
  surprised: { speed: 118, wordgap: 0, pitch: 70, rate: 1.2, wobble: 190, jump: 0.3, squeal: 0.5, vibrato: 30, startLift: 620, endRise: 0 },
  teaching: { speed: 98, wordgap: 1, pitch: 44, rate: 1.12, wobble: 60, jump: 0.03, squeal: 0, vibrato: 12, startLift: 0, endRise: 0 },
};

/** Sample rate of the pitch curve handed to Web Audio (points per second). */
export const CURVE_HZ = 50;
/** Silence between sentences, seconds. */
export const PHRASE_GAP = 0.09;
