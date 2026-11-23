import { ELEMENTS } from './elements.generated';
import type { ElementData, ElementContent } from './types';
import { CONTENT } from './content';

export { ELEMENTS };
export type { ElementData, ElementContent };

export const BY_Z: Record<number, ElementData> = Object.fromEntries(ELEMENTS.map((e) => [e.z, e]));
export const BY_SYMBOL: Record<string, ElementData> = Object.fromEntries(ELEMENTS.map((e) => [e.symbol, e]));

export function getElement(z: number): ElementData | undefined {
  return BY_Z[z];
}

export function getContent(z: number): ElementContent | undefined {
  return CONTENT[z];
}

/** Case-insensitive search by name, alternate name, symbol or atomic number. */
export function searchElements(query: string): ElementData[] {
  const q = query.trim().toLowerCase();
  if (!q) return ELEMENTS;
  if (/^\d+$/.test(q)) {
    const n = Number(q);
    return ELEMENTS.filter((e) => String(e.z).startsWith(q) || e.z === n);
  }
  const exactSymbol = ELEMENTS.filter((e) => e.symbol.toLowerCase() === q);
  const rest = ELEMENTS.filter(
    (e) =>
      e.symbol.toLowerCase() !== q &&
      (e.name.toLowerCase().includes(q) ||
        e.altNames.some((a) => a.toLowerCase().includes(q)) ||
        e.symbol.toLowerCase().startsWith(q)),
  );
  return [...exactSymbol, ...rest];
}

const NOBLE_CORES: Record<string, number> = { He: 2, Ne: 10, Ar: 18, Kr: 36, Xe: 54, Rn: 86 };

/** Count electrons in a configuration like "[Ar] 3d10 4s2 4p1". */
export function countConfigElectrons(config: string): number {
  let total = 0;
  const core = config.match(/\[([A-Z][a-z]?)\]/);
  if (core) total += NOBLE_CORES[core[1]] ?? NaN;
  for (const m of config.replace(/\[[^\]]*\]/, '').matchAll(/(\d)([spdf])(\d+)/g)) total += Number(m[3]);
  return total;
}

/** Turn "3d10" into "3d¹⁰" for display. */
export function prettyConfig(config: string): string {
  const sup: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  return config.replace(/(\d)([spdf])(\d+)/g, (_, n, l, c: string) => `${n}${l}${c.split('').map((d) => sup[d]).join('')}`);
}

export function isRadioactiveOnly(e: ElementData): boolean {
  // Elements with no stable isotopes: Tc (43), Pm (61) and everything from Po (84) up.
  return e.z === 43 || e.z === 61 || e.z >= 84;
}

export function isSynthetic(e: ElementData): boolean {
  // Americium (95) and heavier are only made in labs / reactors, not found in nature.
  return e.z >= 95;
}
