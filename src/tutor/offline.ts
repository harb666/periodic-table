import { ELEMENTS, BY_Z, getContent, searchElements } from '../data';
import { CATEGORY_BY_ID } from '../data/categories';
import type { ElementData } from '../data/types';
import { cluesFor } from '../lib/hunt';

export interface TutorReply {
  text: string;
  /** Element the reply is about, so the UI can offer "open card" */
  z?: number;
  suggestions?: string[];
  source: 'offline' | 'online' | 'safety';
}

const DANGER = [
  /\b(explo(de|sion|sive)s?|bomb|blow (it|something|up)|fire ?work|set .* on fire|burn (it|something|down)|light (a|it) .*fire)\b/i,
  /\b(mix|combine|make|cook|brew)\b.*\b(at home|myself|in my|kitchen|bathroom|garage|bleach|chemicals?)\b/i,
  /\b(make|build|create|get|use)\b.*\b(poison|toxic gas|weapon)\b/i,
  /\b(hurt|kill|poison)\b.*\b(someone|somebody|people|person|my (brother|sister|friend|mum|mom|dad|teacher)|him|her|them|animals?|cat|dog)\b/i,
  /\b(eat|drink|taste|swallow|lick|sniff|smell)\b.*\b(element|chemical|metal|mercury|lead|battery|bleach|acid)\b/i,
  /\bhow (do|can) i (make|get|buy)\b.*\b(uranium|plutonium|sodium|potassium|mercury|acid|chlorine|radioactive)\b/i,
];

const PERSONAL = [
  /\b[\w.+-]+@[\w-]+\.[\w.]+\b/, // email
  /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/, // phone-ish
  /\bmy (name|address|school|phone|password|email) is\b/i,
  /\bi live (at|in|on)\b/i,
];

export const SAFETY_REPLY =
  "That sounds like it could be dangerous, so I can't help with that one. Real chemistry experiments need a trained grown-up, safety gear and a proper lab. Never mix, heat, taste or sniff chemicals at home! Want to see a safe simulation in the Chemistry Lab instead?";

export const PRIVACY_REPLY =
  "Thanks for trusting me! But please keep personal things like your name, address, school or passwords private – I don't need them to talk chemistry. What element shall we explore?";

export function isDangerous(text: string): boolean {
  return DANGER.some((r) => r.test(text));
}

export function hasPersonalInfo(text: string): boolean {
  return PERSONAL.some((r) => r.test(text));
}

/** Find an element mentioned by name, symbol (case-sensitive, standalone) or "element 26". */
export function findElementInText(text: string): ElementData | undefined {
  const lower = text.toLowerCase();
  const byName = [...ELEMENTS]
    .sort((a, b) => b.name.length - a.name.length)
    .find((e) => new RegExp(`\\b(${[e.name, ...e.altNames].map((n) => n.toLowerCase()).join('|')})\\b`).test(lower));
  if (byName) return byName;
  const num = text.match(/\b(?:element|number|no\.?|#)\s*(\d{1,3})\b/i);
  if (num && BY_Z[Number(num[1])]) return BY_Z[Number(num[1])];
  // Symbols: only multi-letter symbols or a quoted single letter, to avoid matching "I" or "a".
  const sym = text.match(/(?:^|[\s"'(])([A-Z][a-z])(?=$|[\s"'),.?!])/);
  if (sym && ELEMENTS.some((e) => e.symbol === sym[1])) return ELEMENTS.find((e) => e.symbol === sym[1]);
  const quoted = text.match(/["']([A-Z][a-z]?)["']|symbol\s+([A-Z][a-z]?)\b/);
  const s = quoted?.[1] ?? quoted?.[2];
  if (s) return ELEMENTS.find((e) => e.symbol === s);
  return undefined;
}

const CONCEPTS: { re: RegExp; text: string }[] = [
  { re: /\bwhat('?s| is| are)? (an? )?atoms?\b/i, text: "An atom is the tiniest piece of an element. Everything around you – your chair, the air, even you – is made of atoms! In the middle is the nucleus (protons and neutrons), and electrons zoom around it." },
  { re: /\bprotons?\b/i, text: "Protons are tiny particles with a positive (+) charge in the nucleus. The number of protons decides which element an atom is: 1 proton = hydrogen, 6 = carbon, 79 = gold!" },
  { re: /\bneutrons?\b/i, text: "Neutrons sit in the nucleus with the protons. They have no charge. Changing the number of neutrons makes a different isotope of the same element." },
  { re: /\belectrons?\b/i, text: "Electrons are super-light particles with a negative (−) charge. They live around the nucleus in 'shells'. The electrons in the outer shell decide how an element reacts with others." },
  { re: /\bisotopes?\b/i, text: "Isotopes are versions of the same element with different numbers of neutrons. Carbon-12 and carbon-14 are both carbon (6 protons), but carbon-14 has 2 extra neutrons." },
  { re: /\bions?\b/i, text: "An ion is an atom that has gained or lost electrons, so it has a charge. Lose electrons → positive ion. Gain electrons → negative ion." },
  { re: /\b(periodic table|why .*table|how .*table (work|organi))/i, text: "The periodic table lines up all 118 elements in order of how many protons they have. Rows are called periods and columns are called groups. Elements in the same group often behave in similar ways – like a family!" },
  { re: /\bmolecules?\b/i, text: "A molecule is two or more atoms joined together. Water (H₂O) is a molecule made of 2 hydrogen atoms and 1 oxygen atom." },
  { re: /\bmetals?\b.*\bnon-?metals?\b|\bnon-?metals?\b/i, text: "Metals are usually shiny, bendy and good at carrying heat and electricity (like copper wires). Nonmetals are often gases or crumbly solids and don't carry electricity well (like oxygen or sulfur). Metalloids are in between!" },
  { re: /\bradioactiv/i, text: "Radioactive atoms have an unstable nucleus that slowly breaks apart and gives off energy (radiation). Scientists use it for power, medicine and dating old things – but it can be harmful, so only trained experts handle it." },
  { re: /\bnoble gas/i, text: "Noble gases (helium, neon, argon, krypton, xenon, radon) have full outer electron shells, so they hardly ever react. That makes them calm and 'noble'!" },
  { re: /\b(group|column)s?\b/i, text: "Groups are the columns of the periodic table (1 to 18). Elements in the same group have the same number of outer electrons, so they often act alike." },
  { re: /\b(period|row)s?\b/i, text: "Periods are the rows of the periodic table. The period number tells you how many electron shells an element's atoms have." },
];

const HELLO = /^(hi|hey|hello|yo|hiya|sup|good (morning|afternoon|evening))\b/i;

let lastHuntZ: number | undefined;
let hintIndex = 0;

export function offlineReply(message: string, contextZ?: number): TutorReply {
  const text = message.trim();
  if (!text) return { text: 'Ask me anything about elements!', source: 'offline' };
  if (isDangerous(text)) return { text: SAFETY_REPLY, source: 'safety', suggestions: ['Show me a safe lab simulation', 'Tell me a fun fact'] };
  if (hasPersonalInfo(text)) return { text: PRIVACY_REPLY, source: 'safety' };

  if (HELLO.test(text))
    return {
      text: "Hi! I'm Zap, your chemistry helper bot (I'm a computer program, not a person). Ask me about any element, or say 'quiz me'!",
      source: 'offline',
      suggestions: ['Quiz me', 'What is an atom?', 'Tell me about gold'],
    };

  if (/\b(are you (a )?(real|human|person|alive)|who are you|your name)\b/i.test(text))
    return { text: "I'm Zap, a chemistry helper program. I'm not a person or a friend like the people in your life – but I love helping you learn about elements!", source: 'offline' };

  if (/\b(quiz|test|question for) me\b|\bask me\b/i.test(text)) {
    const e = BY_Z[[1, 2, 6, 8, 11, 26, 29, 47, 79, 80, 82][Math.floor(Math.random() * 11)]];
    lastHuntZ = e.z;
    hintIndex = 0;
    return { text: `Okay! Which element has the symbol "${e.symbol}"? Type your answer – or say "hint"!`, source: 'offline', z: undefined, suggestions: ['hint'] };
  }

  if (/\bhint\b/i.test(text) && lastHuntZ) {
    const clues = cluesFor(BY_Z[lastHuntZ]);
    const clue = clues[Math.min(hintIndex++, clues.length - 1)];
    return { text: `Hint: ${clue}`, source: 'offline', suggestions: ['hint', 'I give up'] };
  }

  if (/\b(give up|tell me the answer)\b/i.test(text) && lastHuntZ) {
    const e = BY_Z[lastHuntZ];
    lastHuntZ = undefined;
    return { text: `It was ${e.name} (${e.symbol})! You'll get the next one.`, z: e.z, source: 'offline', suggestions: ['Quiz me'] };
  }

  const mentioned = findElementInText(text);
  if (lastHuntZ && mentioned) {
    if (mentioned.z === lastHuntZ) {
      lastHuntZ = undefined;
      return { text: `YES! ${mentioned.name} is right! Amazing brain power!`, z: mentioned.z, source: 'offline', suggestions: ['Quiz me', `Tell me about ${mentioned.name}`] };
    }
    return { text: `Not quite – that's ${mentioned.name}. Try again, or say "hint"!`, source: 'offline', suggestions: ['hint'] };
  }

  const el = mentioned ?? (contextZ && /\b(it|this|that)\b/i.test(text) ? BY_Z[contextZ] : undefined);
  if (el) return elementReply(el, text);

  for (const c of CONCEPTS) if (c.re.test(text)) return { text: c.text, source: 'offline', suggestions: ['Quiz me', 'What is an isotope?'] };

  const guess = searchElements(text.replace(/[^a-z]/gi, ''))[0];
  if (guess && text.length >= 3 && text.length < 14) return elementReply(guess, text);

  return {
    text: "Hmm, I'm not sure about that one. I know lots about the 118 elements, atoms, protons, neutrons, electrons, isotopes and ions. Try asking 'What is neon used for?'",
    source: 'offline',
    suggestions: ['What is an atom?', 'Tell me about neon', 'Quiz me'],
  };
}

function elementReply(e: ElementData, text: string): TutorReply {
  const c = getContent(e.z);
  const cat = CATEGORY_BY_ID[e.category];
  const t = text.toLowerCase();
  let reply: string;
  if (/\b(danger|safe|toxic|poison|harm|hurt|kill)/.test(t)) reply = c?.safety ?? `${e.name} isn't known as especially dangerous, but remember: never touch or taste chemicals – ask a grown-up!`;
  else if (/\b(use|used|for|everyday|where)\b/.test(t)) reply = `${e.name} is used for: ${c?.uses.join(', ') ?? 'scientific research'}.`;
  else if (/\b(fact|cool|fun|interesting)\b/.test(t)) reply = c?.facts[Math.floor(Math.random() * 3)] ?? `${e.name} is element ${e.z}.`;
  else if (/\bsymbol\b/.test(t)) reply = `The symbol for ${e.name} is ${e.symbol}.`;
  else if (/\b(protons?|atomic number|number)\b/.test(t)) reply = `${e.name} is element number ${e.z}, so every ${e.name} atom has ${e.z} protons.`;
  else if (/\b(electrons?|shells?)\b/.test(t)) reply = `A neutral ${e.name} atom has ${e.z} electrons arranged in shells like this: ${e.shells.join(', ')}.`;
  else if (/\b(discover|found|who)\b/.test(t))
    reply = e.discoveredBy ? `${e.name} was discovered by ${e.discoveredBy}${e.year ? ` in ${e.year}` : ''}.` : e.yearText ?? `We don't have reliable discovery info for ${e.name}.`;
  else reply = `${e.name} (${e.symbol}) is element ${e.z}, one of the ${cat.label.toLowerCase()}. ${c?.simple ?? ''}`;
  return {
    text: reply.trim(),
    z: e.z,
    source: 'offline',
    suggestions: [`Fun fact about ${e.name}`, `What is ${e.name} used for?`, `Is ${e.name} dangerous?`],
  };
}
