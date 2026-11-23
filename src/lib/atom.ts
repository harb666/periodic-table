import { BY_Z } from '../data';

/**
 * Stable isotopes (mass numbers) of the first 20 elements – standard textbook / IUPAC values.
 * We deliberately only make stability statements for this curated list.
 */
export const STABLE_ISOTOPES: Record<number, number[]> = {
  1: [1, 2],
  2: [3, 4],
  3: [6, 7],
  4: [9],
  5: [10, 11],
  6: [12, 13],
  7: [14, 15],
  8: [16, 17, 18],
  9: [19],
  10: [20, 21, 22],
  11: [23],
  12: [24, 25, 26],
  13: [27],
  14: [28, 29, 30],
  15: [31],
  16: [32, 33, 34, 36],
  17: [35, 37],
  18: [36, 38, 40],
  19: [39, 41],
  20: [40, 42, 43, 44, 46],
};

/** A few famous radioactive isotopes with kid-friendly notes. */
export const FAMOUS_ISOTOPES: Record<string, string> = {
  '1-3': 'Tritium – a radioactive kind of hydrogen used in some glowing exit signs.',
  '6-14': 'Carbon-14 – radioactive carbon that scientists use to find out how old ancient things are.',
  '19-40': 'Potassium-40 – a naturally radioactive kind of potassium found in tiny amounts in bananas and in you!',
  '92-235': 'Uranium-235 – the kind of uranium used as fuel in nuclear power plants.',
  '92-238': 'Uranium-238 – the most common kind of uranium found in nature.',
};

export const ISOTOPE_NAMES: Record<string, string> = {
  '1-1': 'Protium (ordinary hydrogen)',
  '1-2': 'Deuterium (heavy hydrogen)',
  '1-3': 'Tritium',
};

/** Elements with no stable isotopes at all. */
export function hasNoStableIsotopes(z: number): boolean {
  return z === 43 || z === 61 || z > 82;
}

export type StabilityNote =
  | { kind: 'stable'; text: string }
  | { kind: 'not-in-list'; text: string }
  | { kind: 'radioactive-element'; text: string }
  | { kind: 'no-data'; text: string };

export interface AtomState {
  protons: number;
  neutrons: number;
  electrons: number;
}

export interface AtomAnalysis {
  symbol: string | null;
  name: string | null;
  massNumber: number;
  charge: number;
  chargeText: string;
  isIon: boolean;
  ionType: 'cation' | 'anion' | null;
  isotopeLabel: string | null;
  isotopeName: string | null;
  stability: StabilityNote;
  famous: string | null;
  shells: number[];
  messages: string[];
}

export function chargeText(charge: number): string {
  if (charge === 0) return '0 (neutral)';
  return `${charge > 0 ? '+' : '−'}${Math.abs(charge)}`;
}

/**
 * Simplified shell picture for the built atom: start from the neutral element's ground-state
 * shells, then remove electrons from the outermost shell first (cations) or add to the
 * outermost shell (anions). This is an educational simplification.
 */
export function shellsFor(protons: number, electrons: number): number[] {
  const el = BY_Z[protons];
  if (!el || electrons <= 0) return [];
  const shells = [...el.shells];
  let diff = electrons - protons;
  while (diff < 0 && shells.length) {
    const last = shells.length - 1;
    shells[last] -= 1;
    if (shells[last] === 0) shells.pop();
    diff++;
  }
  // Extra electrons go into the outer shell; once it is full (2 for the first shell, 8 otherwise in this simple model) they start a new shell.
  while (diff > 0) {
    const last = shells.length - 1;
    const cap = last === 0 ? 2 : 8;
    if (last < 0 || shells[last] >= Math.max(cap, shells[last])) shells.push(0);
    const i = shells.length - 1;
    const room = (i === 0 ? 2 : 8) - shells[i];
    const add = room > 0 ? Math.min(room, diff) : diff;
    shells[i] += add;
    diff -= add;
  }
  return shells;
}

export function analyseAtom({ protons, neutrons, electrons }: AtomState): AtomAnalysis {
  const el = BY_Z[protons];
  const massNumber = protons + neutrons;
  const charge = protons - electrons;
  const messages: string[] = [];
  const base: AtomAnalysis = {
    symbol: el?.symbol ?? null,
    name: el?.name ?? null,
    massNumber,
    charge,
    chargeText: chargeText(charge),
    isIon: charge !== 0,
    ionType: charge > 0 ? 'cation' : charge < 0 ? 'anion' : null,
    isotopeLabel: el ? `${el.name}-${massNumber}` : null,
    isotopeName: ISOTOPE_NAMES[`${protons}-${massNumber}`] ?? null,
    stability: { kind: 'no-data', text: '' },
    famous: FAMOUS_ISOTOPES[`${protons}-${massNumber}`] ?? null,
    shells: shellsFor(protons, electrons),
    messages,
  };

  if (!el) {
    base.stability = { kind: 'no-data', text: 'Add at least one proton – protons decide which element you have!' };
    messages.push('No protons yet: an atom needs protons in its nucleus.');
    return base;
  }

  messages.push(`${protons} proton${protons === 1 ? '' : 's'} means this is ${el.name} (${el.symbol}). The number of protons is the atomic number.`);

  if (charge === 0) messages.push('Protons and electrons are equal, so the atom is neutral (no overall charge).');
  else if (charge > 0)
    messages.push(`It has ${charge} fewer electron${charge === 1 ? '' : 's'} than protons, so it is a positive ion (a cation) with charge ${chargeText(charge)}.`);
  else
    messages.push(`It has ${-charge} more electron${charge === -1 ? '' : 's'} than protons, so it is a negative ion (an anion) with charge ${chargeText(charge)}.`);

  if (charge < -3 || charge > 8)
    messages.push('Real atoms very rarely have a charge this big – this is a pretend arrangement for exploring.');

  messages.push(`Protons + neutrons = ${massNumber}. That is the mass number, so this isotope is ${el.name}-${massNumber}.`);

  if (hasNoStableIsotopes(protons)) {
    base.stability = {
      kind: 'radioactive-element',
      text: `${el.name} has no stable isotopes at all – every kind of ${el.name} atom is radioactive and eventually breaks apart.`,
    };
  } else if (STABLE_ISOTOPES[protons]) {
    const list = STABLE_ISOTOPES[protons];
    if (list.includes(massNumber)) {
      base.stability = { kind: 'stable', text: `${el.name}-${massNumber} is one of the stable isotopes in our list.` };
    } else {
      base.stability = {
        kind: 'not-in-list',
        text: `${el.name}-${massNumber} is not one of the stable isotopes we know about (${list
          .map((m) => `${el.name}-${m}`)
          .join(', ')}). An atom like this is unstable (radioactive) – or may not exist at all.`,
      };
    }
  } else {
    base.stability = {
      kind: 'no-data',
      text: `Our isotope list only covers the first 20 elements, so we can't say whether ${el.name}-${massNumber} is stable.`,
    };
  }
  return base;
}
