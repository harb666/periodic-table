import { ELEMENTS, BY_Z, getContent, searchElements, isRadioactiveOnly, isSynthetic } from '../data';
import { REACTIONS, type Reaction } from '../data/reactions';
import { SUBSTANCES, TOPICS, type Substance, type Topic } from './knowledge';
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
  /\b(bombs?|blow (it|something|up)|set .* on fire|burn (it|something|down)|light (a|it) .*fire)\b/i,
  /\b(make|build|create|buy|light|set off)\b.*\b(explo(de|sion|sive)s?|fire ?works?|fire|flames?)\b/i,
  /\bhow (do|can|to)\b.*\b(explode|blow up)\b/i,
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

/** Every element named in the text (by name or alternate name), in order of appearance. */
export function findElementsInText(text: string): ElementData[] {
  const lower = text.toLowerCase();
  const found: { e: ElementData; at: number }[] = [];
  for (const e of ELEMENTS) {
    const m = new RegExp(`\\b(${[e.name, ...e.altNames].map((n) => n.toLowerCase()).join('|')})s?\\b`).exec(lower);
    if (m) found.push({ e, at: m.index });
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.e);
}

/** Lower-case words only, so "What's H₂O made of?" and "whats h2o made of" look the same. */
export function normalise(text: string): string {
  const SUB = '₀₁₂₃₄₅₆₇₈₉';
  return ` ${text
    .toLowerCase()
    .replace(/[₀-₉]/g, (d) => String(SUB.indexOf(d)))
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;
}

const words = (s: string) => s.trim().split(/\s+/).length;

function findSubstance(norm: string): { s: Substance; name: string } | undefined {
  let best: { s: Substance; name: string } | undefined;
  for (const s of SUBSTANCES)
    for (const name of s.names) if (norm.includes(` ${name} `) && (!best || name.length > best.name.length)) best = { s, name };
  return best;
}

function bestTopic(norm: string): { topic: Topic; score: number } | undefined {
  let best: { topic: Topic; score: number } | undefined;
  for (const topic of TOPICS)
    for (const key of topic.keys) {
      if (!norm.includes(` ${normalise(key).trim()} `)) continue;
      const score = words(key) * 2;
      if (!best || score > best.score) best = { topic, score };
    }
  return best;
}

type SubstanceIntent = 'classify' | 'forms' | 'made' | null;
function substanceIntent(norm: string): SubstanceIntent {
  if (/ (an element|a compound|a mixture|an alloy|element or|compound or|mixture or) /.test(norm)) return 'classify';
  if (/ (made|make up|makes up) (of|from|up of) | formula | (which|what) elements | contains? | what is in | whats in /.test(norm)) return 'made';
  if (/ how (do|does|did|can|could|would|is|are|was|were|to) .*(make|made|makes|making|form|forms|formed|create|created|get|produce|produced) | where (do|does|did) .* come from | (make|making|create) /.test(norm)) return 'forms';
  return null;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function substanceReply(s: Substance, intent: SubstanceIntent): TutorReply {
  const name = cap(s.names[0]);
  const label = s.formula ? `${name} (${s.formula})` : name;
  const kind = { compound: 'a compound, not an element', mixture: 'a mixture, not an element or a single compound', alloy: 'an alloy – a mixture of metals – not an element', element: 'a form of a single element, not a compound' }[s.kind];
  let text: string;
  if (intent === 'forms') text = s.forms;
  else if (intent === 'made') text = `${label}: ${s.made} ${s.about}`;
  else if (intent === 'classify') text = `${name} is ${kind}. ${s.made}`;
  else text = `${label}: ${s.made} ${s.about}`;
  if (s.safety) text += ` ${s.safety}`;
  return {
    text,
    source: 'offline',
    suggestions: intent === 'forms' ? [`What is ${s.names[0]} made of?`, 'What is a compound?'] : [`How is ${s.names[0]} made?`, 'What is a chemical reaction?'],
  };
}

const sub = (formula: string) => formula.replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]);
const side = (terms: Reaction['left']) => terms.map((t) => `${t.coeff > 1 ? `${t.coeff} ` : ''}${sub(t.formula)}`).join(' + ');

/** A checked reaction from the Chem Lab that involves exactly (or nearly) the named elements. */
function reactionReply(els: ElementData[]): TutorReply {
  const want = new Set(els.map((e) => e.symbol));
  const fits = (r: Reaction) => [...want].every((s) => r.elements.includes(s));
  const r = REACTIONS.find((x) => fits(x) && x.elements.length === want.size) ?? REACTIONS.find((x) => fits(x) && x.elements.length === want.size + 1);
  const names = els.map((e) => e.name.toLowerCase()).join(' and ');
  if (!r)
    return {
      text: `I don't have a checked reaction for ${names} in my library, and I won't guess. Elements join in set amounts to make compounds – have a look at the reactions in the Chem Lab.`,
      source: 'offline',
      suggestions: ['What is a chemical reaction?', 'What is a compound?'],
    };
  return {
    text: `${r.title}: ${side(r.left)} → ${side(r.right)}. ${r.story} ${r.safety}`,
    source: 'offline',
    suggestions: ['What is a chemical reaction?', 'What is a balanced equation?'],
  };
}

const REACTS = / (react|reacts|reaction|mix|mixed|mixing|combine|combined|combining|join|joins|joined|plus|make|makes|form|forms|burn|burns|meets?|added|add) /;
// Questions that are about one particular element's own properties.
const ELEMENT_INTENT =
  /\b(danger|safe|toxic|poison|harm|hurt|kill|use|used|uses|for|everyday|fact|facts|cool|fun|interesting|symbol|protons?|neutrons?|electrons?|shells?|atomic number|number|discover|discovered|found|who|melt|melts|melting|boil|boils|boiling|freeze|freezes|temperature|state|phase|solid|liquid|gas|mass|weigh|weighs|weight|heavy|group|period|row|column|where|config|configuration|made of|make|metal|nonmetal|non-metal|metalloid|noble|halogen|alkali|alkaline|transition|lanthanide|actinide|radioactive|synthetic|natural|element|compound|mixture|kind|type|category|family)\b/i;

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
      text: "Hi! I'm Gir, your chemistry helper bot (I'm a computer program, not a person). Ask me about any element, or say 'quiz me'!",
      source: 'offline',
      suggestions: ['Quiz me', 'What is an atom?', 'Tell me about gold'],
    };

  if (/\b(are you (a )?(real|human|person|alive)|who are you|your name)\b/i.test(text))
    return { text: "I'm Gir, a chemistry helper program. I'm not a person or a friend like the people in your life – but I love helping you learn about elements!", source: 'offline' };

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

  const norm = normalise(text);
  const substance = findSubstance(norm);
  // "sodium chloride" is about salt, not about sodium: look for elements outside the substance's name.
  const outside = substance ? norm.replace(` ${substance.name} `, ' ') : norm;
  const named = findElementsInText(outside);
  if (named.length >= 2 && REACTS.test(norm)) return reactionReply(named.slice(0, 4));

  const first = substance ? named[0] : mentioned ?? named[0];
  const el = first ?? (contextZ && /\b(it|this|that|its)\b/i.test(text) && !substance ? BY_Z[contextZ] : undefined);
  if (el && ELEMENT_INTENT.test(text) && !(substance && substanceIntent(norm))) return elementReply(el, text);

  const topic = bestTopic(norm);
  const intent = substance ? substanceIntent(norm) : null;
  if (substance) {
    const score = words(substance.name) * 2 + (intent ? 3 : 0);
    if (!topic || score > topic.score) return substanceReply(substance.s, intent);
  }
  if (topic) return { text: topic.topic.text, source: 'offline', suggestions: topic.topic.next ?? ['Quiz me', 'What is a chemical reaction?'] };
  if (el) return elementReply(el, text);

  const guess = searchElements(text.replace(/[^a-z]/gi, ''))[0];
  if (guess && text.length >= 3 && text.length < 14) return elementReply(guess, text);

  return {
    text: "Hmm, that one isn't in my library yet. I know the 118 elements, everyday stuff like water, salt, air and rust, and ideas like atoms, reactions, acids and states of matter. Try 'What is water made of?' or 'Why does iron rust?'",
    source: 'offline',
    suggestions: ['What is water made of?', 'Why does iron rust?', 'Quiz me'],
  };
}

const celsius = (k: number) => `${Math.round(k - 273.15).toLocaleString('en-US')} °C`;

function elementReply(e: ElementData, text: string): TutorReply {
  const c = getContent(e.z);
  const cat = CATEGORY_BY_ID[e.category];
  const t = text.toLowerCase();
  let reply: string;
  const kindWord = cat.label.toLowerCase().replace(/s$/, '');
  const an = /^[aeiou]/.test(kindWord) ? 'an' : 'a';
  const phase = e.phase === 'unknown' ? 'expected to be a solid, but too little has ever been made to be sure' : `a ${e.phase} at room temperature`;
  if (/\b(danger|safe|toxic|poison|harm|hurt|kill)/.test(t)) reply = c?.safety ?? `${e.name} isn't known as especially dangerous, but remember: never touch or taste chemicals – ask a grown-up!`;
  else if (/\bhow (do|can|could|would|to)\b.*\b(make|create|get)\b/.test(t))
    reply = `You can't make ${e.name.toLowerCase()} by mixing things together. It is an element, and the only way to turn one element into another is to change the protons in its atoms – that takes a star, a nuclear reactor or a giant atom-smashing machine. ${isSynthetic(e) ? `${e.name} is one of the elements scientists do make that way, a few atoms at a time.` : `${e.name} is found in nature.`}`;
  else if (/\b(melt|melts|melting|freeze|freezes|boil|boils|boiling|temperature)\b/.test(t))
    reply =
      e.meltK || e.boilK
        ? `${e.name} ${e.meltK ? `melts at about ${celsius(e.meltK)}` : ''}${e.meltK && e.boilK ? ' and ' : ''}${e.boilK ? `boils at about ${celsius(e.boilK)}` : ''}. It is ${phase}.`
        : `Nobody has measured that for ${e.name} yet – too little of it has ever been made.`;
  else if (/\b(is|are|what)\b.*\b(metal|nonmetal|non-metal|metalloid|noble|halogen|alkali|alkaline|transition|lanthanide|actinide|radioactive|synthetic|natural|compound|mixture|kind|type|category|family)\b|\ban element\b/.test(t))
    reply = `${e.name} is an element – ${an} ${kindWord}. It is ${phase}.${isRadioactiveOnly(e) ? ` Every kind of ${e.name} atom is radioactive.` : ''}${isSynthetic(e) ? ' It is not found in nature; scientists make it.' : ''}`;
  else if (/\b(solid|liquid|gas|state|phase)\b/.test(t)) reply = `${e.name} is ${phase}.`;
  else if (/\bmade (of|from|up of)\b/.test(t)) reply = `${e.name} is an element, so it is made of only one kind of atom: ${e.name} atoms. Each one has ${e.z} proton${e.z === 1 ? '' : 's'}.`;
  else if (/\b(use|used|uses|for|everyday)\b/.test(t)) reply = `${e.name} is used for: ${c?.uses.join(', ') ?? 'scientific research'}.`;
  else if (/\b(fact|cool|fun|interesting)\b/.test(t)) reply = c?.facts[Math.floor(Math.random() * 3)] ?? `${e.name} is element ${e.z}.`;
  else if (/\bsymbol\b/.test(t)) reply = `The symbol for ${e.name} is ${e.symbol}.`;
  else if (/\bneutrons?\b/.test(t)) reply = `${e.name} atoms have ${e.z} protons, and typically about ${Math.max(0, Math.round(e.mass) - e.z)} neutrons. The number of neutrons can vary – those are its isotopes.`;
  else if (/\b(mass|weigh|weighs|weight|heavy)\b/.test(t)) reply = `${e.name} has an atomic mass of about ${e.massText}. That is roughly its protons plus its neutrons.`;
  else if (/\b(group|period|row|column|where)\b/.test(t)) reply = `${e.name} is in period ${e.period}${e.group ? `, group ${e.group}` : ''} of the periodic table, with the ${cat.label.toLowerCase()}.`;
  else if (/\b(protons?|atomic number|number)\b/.test(t)) reply = `${e.name} is element number ${e.z}, so every ${e.name} atom has ${e.z} protons.`;
  else if (/\b(electrons?|shells?|config|configuration)\b/.test(t)) reply = `A neutral ${e.name} atom has ${e.z} electrons arranged in shells like this: ${e.shells.join(', ')}.`;
  else if (/\b(discover|discovered|found|who)\b/.test(t))
    reply = e.discoveredBy ? `${e.name} was discovered by ${e.discoveredBy}${e.year ? ` in ${e.year}` : ''}.` : e.yearText ?? `We don't have reliable discovery info for ${e.name}.`;
  else reply = `${e.name} (${e.symbol}) is element ${e.z}, one of the ${cat.label.toLowerCase()}. ${c?.simple ?? ''}`;
  return {
    text: reply.trim(),
    z: e.z,
    source: 'offline',
    suggestions: [`Fun fact about ${e.name}`, `What is ${e.name} used for?`, `Is ${e.name} dangerous?`],
  };
}
