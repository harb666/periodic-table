import { ELEMENTS, BY_Z, getContent } from '../data';
import { CATEGORY_BY_ID } from '../data/categories';
import type { ElementData } from '../data/types';
import { makeRng, pick } from './rng';
import { STARTER_Z } from './quiz';

export interface Hunt {
  z: number;
  clues: string[];
}

export function cluesFor(e: ElementData): string[] {
  const clues: string[] = [];
  const cat = CATEGORY_BY_ID[e.category];
  clues.push(`I belong to the ${cat.label.toLowerCase()} family.`);
  if (e.phase !== 'unknown') clues.push(`At room temperature I am a ${e.phase}.`);
  if (e.group) clues.push(`I live in period ${e.period}, group ${e.group}.`);
  else clues.push(`I live in one of the two separate rows at the bottom of the table (period ${e.period}).`);
  const use = getContent(e.z)?.uses[0];
  if (use) clues.push(`People use me for: ${use}.`);
  clues.push(`My atomic number is between ${Math.max(1, e.z - 5)} and ${Math.min(118, e.z + 5)}.`);
  clues.push(`My symbol starts with the letter "${e.symbol[0]}".`);
  return clues;
}

export function makeHunt(difficulty: 'easy' | 'hard', seed?: number, avoid: number[] = []): Hunt {
  const rng = makeRng(seed ?? Math.floor(Math.random() * 2 ** 31));
  const pool = difficulty === 'easy' ? STARTER_Z : ELEMENTS.filter((e) => e.z <= 100).map((e) => e.z);
  let z = pick(rng, pool);
  for (let i = 0; i < 10 && avoid.includes(z); i++) z = pick(rng, pool);
  return { z, clues: cluesFor(BY_Z[z]) };
}

/** Kind feedback that nudges toward the answer without giving it away. */
export function huntFeedback(target: ElementData, guess: ElementData): string {
  if (guess.z === target.z) return `YES! It's ${target.name}!`;
  const parts: string[] = [];
  if (guess.category === target.category) parts.push('Right family!');
  if (guess.period === target.period) parts.push('Right row!');
  else parts.push(guess.period < target.period ? 'Try a row further down.' : 'Try a row further up.');
  if (guess.group && target.group && guess.group === target.group) parts.push('Right column!');
  return `Not ${guess.name} – but nice try! ${parts.join(' ')}`;
}
