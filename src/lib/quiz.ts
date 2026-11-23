import { ELEMENTS, BY_Z, getContent } from '../data';
import { CATEGORY_BY_ID } from '../data/categories';
import type { ElementData } from '../data/types';
import { makeRng, pick, shuffle } from './rng';

export interface QuizQuestion {
  id: string;
  level: 1 | 2 | 3;
  prompt: string;
  choices: string[];
  answer: string;
  /** Element this question is about (for holo cards) */
  z: number;
  explain: string;
}

/** Well-known elements kids meet first. */
export const STARTER_Z = [1, 2, 3, 6, 7, 8, 10, 11, 12, 13, 14, 17, 18, 19, 20, 26, 29, 30, 47, 50, 79, 80, 82, 92];
/** Symbols that don't match the English name – great for harder questions. */
export const TRICKY_SYMBOL_Z = [11, 19, 26, 29, 47, 50, 51, 74, 79, 80, 82];

function distinct(rng: () => number, correct: string, pool: string[], n = 3): string[] {
  const others = shuffle(rng, [...new Set(pool.filter((p) => p !== correct))]).slice(0, n);
  return shuffle(rng, [correct, ...others]);
}

type Gen = (rng: () => number, e: ElementData) => Omit<QuizQuestion, 'id' | 'level' | 'z'> | null;

const symbolToName: Gen = (rng, e) => ({
  prompt: `Which element has the symbol ${e.symbol}?`,
  answer: e.name,
  choices: distinct(rng, e.name, ELEMENTS.filter((o) => Math.abs(o.z - e.z) < 25).map((o) => o.name)),
  explain: `${e.symbol} stands for ${e.name}.`,
});

const nameToSymbol: Gen = (rng, e) => ({
  prompt: `What is the symbol for ${e.name}?`,
  answer: e.symbol,
  choices: distinct(rng, e.symbol, ELEMENTS.filter((o) => o.symbol[0] === e.symbol[0] || Math.abs(o.z - e.z) < 6).map((o) => o.symbol)),
  explain: `${e.name}'s symbol is ${e.symbol}.`,
});

const phaseQ: Gen = (rng, e) => {
  if (e.phase === 'unknown') return null;
  const label = { solid: 'Solid', liquid: 'Liquid', gas: 'Gas' }[e.phase];
  return {
    prompt: `At room temperature, is ${e.name} a solid, a liquid or a gas?`,
    answer: label,
    choices: shuffle(rng, ['Solid', 'Liquid', 'Gas']),
    explain: `${e.name} is a ${label.toLowerCase()} at room temperature.`,
  };
};

const numberQ: Gen = (rng, e) => {
  const opts = new Set<number>([e.z]);
  while (opts.size < 4) {
    const d = Math.floor(rng() * 9) - 4;
    const v = e.z + d;
    if (v >= 1 && v <= 118) opts.add(v);
  }
  return {
    prompt: `How many protons does every ${e.name} atom have?`,
    answer: String(e.z),
    choices: shuffle(rng, [...opts].map(String)),
    explain: `${e.name} is element number ${e.z}, so it has ${e.z} protons. The atomic number = the number of protons!`,
  };
};

const categoryQ: Gen = (rng, e) => {
  const cat = CATEGORY_BY_ID[e.category].label;
  const pool = Object.values(CATEGORY_BY_ID).map((c) => c.label);
  return {
    prompt: `Which family does ${e.name} belong to?`,
    answer: cat,
    choices: distinct(rng, cat, pool),
    explain: `${e.name} is in the ${cat.toLowerCase()} family. ${CATEGORY_BY_ID[e.category].blurb}`,
  };
};

const periodQ: Gen = (rng, e) => {
  const opts = shuffle(rng, [1, 2, 3, 4, 5, 6, 7].filter((p) => p !== e.period)).slice(0, 3);
  return {
    prompt: `Which row (period) of the table is ${e.name} in?`,
    answer: `Period ${e.period}`,
    choices: shuffle(rng, [e.period, ...opts].map((p) => `Period ${p}`)),
    explain: `${e.name} sits in row (period) ${e.period}. The period number matches how many electron shells most atoms in that row have.`,
  };
};

const usesQ: Gen = (rng, e) => {
  const c = getContent(e.z);
  if (!c || !c.uses.length) return null;
  const use = c.uses[0];
  const candidates = STARTER_Z.filter((z) => z !== e.z).map((z) => BY_Z[z].name);
  return {
    prompt: `Which element is used for: "${use}"?`,
    answer: e.name,
    choices: distinct(rng, e.name, candidates),
    explain: `${e.name} is used for ${use.toLowerCase()}.`,
  };
};

const LEVEL_GENS: Record<1 | 2 | 3, Gen[]> = {
  1: [symbolToName, nameToSymbol, phaseQ],
  2: [numberQ, categoryQ, phaseQ, usesQ, symbolToName],
  3: [periodQ, categoryQ, numberQ, nameToSymbol],
};

function poolFor(level: 1 | 2 | 3): number[] {
  if (level === 1) return STARTER_Z;
  if (level === 2) return ELEMENTS.filter((e) => e.z <= 56 || [78, 79, 80, 82, 86, 92, 94].includes(e.z)).map((e) => e.z);
  return ELEMENTS.filter((e) => e.z <= 103).map((e) => e.z);
}

export function levelForScore(correctInRound: number): 1 | 2 | 3 {
  if (correctInRound >= 8) return 3;
  if (correctInRound >= 4) return 2;
  return 1;
}

export function makeQuestion(level: 1 | 2 | 3, seed?: number, avoid: number[] = []): QuizQuestion {
  const rng = makeRng(seed ?? Math.floor(Math.random() * 2 ** 31));
  const gens = LEVEL_GENS[level];
  for (let tries = 0; tries < 40; tries++) {
    let z = pick(rng, poolFor(level));
    if (level === 3 && rng() < 0.3) z = pick(rng, TRICKY_SYMBOL_Z);
    if (avoid.includes(z) && tries < 30) continue;
    const q = pick(rng, gens)(rng, BY_Z[z]);
    if (q && new Set(q.choices).size === q.choices.length && q.choices.includes(q.answer)) {
      return { ...q, id: `${level}-${z}-${q.prompt}`, level, z };
    }
  }
  const e = BY_Z[1];
  return { ...symbolToName(rng, e)!, id: 'fallback', level, z: 1 };
}

export interface QuizState {
  score: number;
  streak: number;
  bestStreak: number;
  correct: number;
  answered: number;
}

export const NEW_QUIZ: QuizState = { score: 0, streak: 0, bestStreak: 0, correct: 0, answered: 0 };

/** Pure scoring rule: 10 points × level, +5 bonus per streak step from 3 onwards. */
export function scoreAnswer(state: QuizState, q: QuizQuestion, choice: string): { state: QuizState; correct: boolean; points: number } {
  const correct = choice === q.answer;
  if (!correct) return { correct, points: 0, state: { ...state, streak: 0, answered: state.answered + 1 } };
  const streak = state.streak + 1;
  const points = 10 * q.level + (streak >= 3 ? 5 * (streak - 2) : 0);
  return {
    correct,
    points,
    state: {
      score: state.score + points,
      streak,
      bestStreak: Math.max(state.bestStreak, streak),
      correct: state.correct + 1,
      answered: state.answered + 1,
    },
  };
}
