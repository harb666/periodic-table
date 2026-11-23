// Turns display text into what the speech engine should say:
// sentences with an emotion each, chemistry words pronounced properly,
// symbols and formulas spelled out. Pure – no audio, no DOM.
import { ELEMENTS } from '../data';
import type { Emotion } from './profile';

export interface Phrase {
  /** The sentence as written. */
  text: string;
  /** Engine input: lower-case words, with `[[...]]` eSpeak phoneme strings where spelling would mislead it. */
  spoken: string;
  emotion: Emotion;
}

/**
 * Words the engine gets wrong from spelling alone, as eSpeak phonemes.
 * Found by transcribing all 118 element names and the app's science vocabulary
 * through the engine and reading the result; everything not listed came out right.
 */
export const PRONUNCIATIONS: Record<string, string> = {
  bromine: "br'oUmi:n",
  niobium: "n,aI'oUbi@m",
  molybdenum: "m@l'Ibd@n@m",
  indium: "'Indi@m",
  antimony: "'antIm,oUni",
  praseodymium: "pr,eIzi;oUd'Imi@m",
  ytterbium: "It'3:bi@m",
  astatine: "'ast@t,i:n",
  berkelium: "b'3:kli@m",
  nobelium: "noUb'Eli@m",
  seaborgium: "si:b'O@gi@m",
  meitnerium: "maItn'i@ri@m",
  roentgenium: "r,Entg'Eni@m",
  tennessine: "t'En@s,i:n",
  oganesson: ",oUg@n'Es0n",
  technetium: "tEkn'i:Si@m",
  lutetium: "lu:t'i:Si@m",
  fluorine: "fl'O@ri:n",
  xenon: "z'i:n0n",
  zap: "z'ap",
};
// The metal is "led"; the verb ("lead to…") is left alone.
const LEAD_METAL = "l'Ed";
const LEAD_VERB_NEXT = /^(to|into|us|you|them|the way)\b/;

const LETTERS: Record<string, string> = {
  a: "'eI", b: "b'i:", c: "s'i:", d: "d'i:", e: "'i:", f: "'Ef", g: "dZ'i:", h: "'eItS", i: "'aI", j: "dZ'eI", k: "k'eI", l: "'El", m: "'Em",
  n: "'En", o: "'oU", p: "p'i:", q: "kj'u:", r: "'A@", s: "'Es", t: "t'i:", u: "j'u:", v: "v'i:", w: "d'Vb@Lju:", x: "'Eks", y: "w'aI", z: "z'i:",
};
const DIGITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

const SYMBOLS = new Set(ELEMENTS.map((e) => e.symbol));
const NAME_BY_SYMBOL = new Map(ELEMENTS.map((e) => [e.symbol, e.name.toLowerCase()]));
const FORMULA = /^(?:[A-Z][a-z]?\d*)+$/;

function spell(token: string): string {
  return [...token].map((ch) => (/\d/.test(ch) ? DIGITS[Number(ch)] : `[[${LETTERS[ch.toLowerCase()] ?? ''}]]`)).join(' ');
}

/** Is this token a chemical symbol or formula that should be read letter by letter? */
function isFormula(token: string, prev: string, next: string, nextNext: string): boolean {
  if (!FORMULA.test(token)) return false;
  const parts = token.match(/[A-Z][a-z]?/g) ?? [];
  if (!parts.every((s) => SYMBOLS.has(s))) return false;
  if (/\d/.test(token) || parts.length > 1) return true; // H2O, CO2, NaCl
  // A lone symbol is ambiguous with ordinary words (He, In, As, At, Be, No, I…): require context.
  if (/^symbols?:?$/.test(prev)) return true;
  return next === 'is' && nextNext.toLowerCase() === NAME_BY_SYMBOL.get(token); // "Fe is Iron"
}

function sayWord(word: string, next: string): string {
  const w = word.toLowerCase();
  if (w === 'lead' || w === 'leads') return LEAD_VERB_NEXT.test(next.toLowerCase()) ? w : `[[${LEAD_METAL}${w === 'leads' ? 'z' : ''}]]`;
  if (PRONUNCIATIONS[w]) return `[[${PRONUNCIATIONS[w]}]]`;
  if (w.endsWith("'s") && PRONUNCIATIONS[w.slice(0, -2)]) return `[[${PRONUNCIATIONS[w.slice(0, -2)]}z]]`;
  if (w.endsWith('s') && PRONUNCIATIONS[w.slice(0, -1)]) return `[[${PRONUNCIATIONS[w.slice(0, -1)]}z]]`;
  // Lower-case everything: the engine's dictionary mis-reads some capitalised words (it spells out "Zinc").
  return w;
}

function toSpoken(sentence: string): string {
  const cleaned = sentence
    .replace(/\[\[|\]\]/g, ' ') // never let text smuggle in phoneme input
    .replace(/[₀-₉]/g, (d) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(d))) // H₂O → H2O
    .replace(/(\d),(?=\d{3}\b)/g, '$1') // 1,538 → 1538
    .replace(/−(?=\d)|(?<=^|\s)-(?=\d)/g, ' minus ') // −273 (but not carbon-14)
    .replace(/[“”"«»*_#`~^|<>{}]/g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/→|⟶|->/g, ' makes ')
    .replace(/\s\+\s/g, ' plus ')
    .replace(/=/g, ' equals ')
    .replace(/≈/g, ' about ')
    .replace(/°\s?C\b/g, ' degrees celsius')
    .replace(/°\s?F\b/g, ' degrees fahrenheit')
    .replace(/%/g, ' percent')
    .replace(/&/g, ' and ')
    .replace(/[–—]/g, ', ')
    .replace(/…/g, '...')
    .replace(/(\p{L})-(\d)/gu, '$1 $2') // carbon-14
    .replace(/[^\p{L}\p{N}\s.,;:!?'()/-]/gu, ' '); // emoji, hearts, arrows…
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const bare = tokens.map((t) => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''));
  return tokens
    .map((tok, i) => {
      const core = bare[i];
      if (!core) return tok.replace(/[()/]/g, ' ');
      const lead = tok.slice(0, tok.indexOf(core)).replace(/[()/]/g, '');
      const tail = tok.slice(tok.indexOf(core) + core.length).replace(/[()/]/g, ',');
      const inBrackets = tok.startsWith('(') && tok.includes(')') && SYMBOLS.has(core);
      const said =
        inBrackets || isFormula(core, (bare[i - 1] ?? '').toLowerCase(), (bare[i + 1] ?? '').toLowerCase(), bare[i + 2] ?? '')
          ? spell(core)
          : core
              .split(/(?<=\p{L})\/(?=\p{L})/u)
              .map((w) => sayWord(w, bare[i + 1] ?? ''))
              .join(' ');
      return lead + said + tail;
    })
    .join(' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/,+([.!?;:])/g, '$1')
    .replace(/,{2,}/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

const SURPRISED = /\b(whoa|wow|boing|woah|oh!|yikes|no way)\b/i;
const CONFUSED = /\b(hmm+|uh[- ]oh|oops|not sure|don't know|do not know|can't find|couldn't find|confus\w*|puzzl\w*)\b/i;
const EXCITED = /\b(yay|hooray|ooh|great|awesome|amazing|shiny|love|nice|correct|well done|you got it)\b/i;

/** Read the mood of a sentence from its punctuation and wording. */
export function detectEmotion(sentence: string, hint?: Emotion): Emotion {
  if (SURPRISED.test(sentence)) return 'surprised';
  if (CONFUSED.test(sentence)) return 'confused';
  if (/\?\s*$/.test(sentence)) return 'curious';
  if (/!\s*$/.test(sentence) || EXCITED.test(sentence)) return 'excited';
  if (hint) return hint;
  return sentence.length > 60 ? 'teaching' : 'neutral';
}

const MAX_PHRASE = 150;

function splitSentences(text: string): string[] {
  // End of sentence = . ! ? (possibly repeated) followed by whitespace; "55.845" and "e.g." stay whole enough.
  const sentences = text.replace(/\s+/g, ' ').match(/[^.!?]+(?:[.!?]+(?=\s|$)|[.!?](?=\S)[^.!?]*)*[.!?]*/g) ?? [text];
  const out: string[] = [];
  for (const s of sentences.map((x) => x.trim()).filter(Boolean)) {
    if (s.length <= MAX_PHRASE) {
      out.push(s);
      continue;
    }
    // Long sentence: break at clause boundaries so speech can start (and be interrupted) sooner.
    let current = '';
    for (const clause of s.split(/(?<=[,;:])\s+/)) {
      if (current && (current + ' ' + clause).length > MAX_PHRASE) {
        out.push(current);
        current = clause;
      } else current = current ? `${current} ${clause}` : clause;
    }
    if (current) out.push(current);
  }
  return out;
}

/** Split text into speakable phrases. `hint` sets the mood for sentences that carry none of their own. */
export function planSpeech(text: string, hint?: Emotion): Phrase[] {
  return splitSentences(text)
    .map((sentence) => ({ text: sentence, spoken: toSpoken(sentence), emotion: detectEmotion(sentence, hint) }))
    .filter((p) => /[\p{L}\p{N}]/u.test(p.spoken));
}
