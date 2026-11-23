export type CategoryId =
  | 'alkali-metal'
  | 'alkaline-earth-metal'
  | 'transition-metal'
  | 'post-transition-metal'
  | 'metalloid'
  | 'reactive-nonmetal'
  | 'noble-gas'
  | 'lanthanide'
  | 'actinide'
  | 'unknown';

export interface ElementData {
  z: number;
  symbol: string;
  name: string;
  altNames: string[];
  /** Standard atomic weight, or (if massIsMassNumber) the mass number of a long-lived isotope. */
  mass: number;
  massText: string;
  massIsMassNumber: boolean;
  category: CategoryId;
  period: number;
  /** IUPAC group 1–18. null for elements shown in the separate f-block rows. */
  group: number | null;
  block: string;
  /** Grid column 1–18 */
  col: number;
  /** Grid row: 1–7 main table, 9 = lanthanides, 10 = actinides */
  row: number;
  shells: number[];
  config: string;
  configPredicted: boolean;
  phase: 'solid' | 'liquid' | 'gas' | 'unknown';
  meltK: number | null;
  boilK: number | null;
  discoveredBy: string | null;
  namedBy: string | null;
  year: number | null;
  yearText: string | null;
}

export interface ElementContent {
  /** One or two short sentences for a 9-year-old */
  simple: string;
  /** Exactly three short, verifiable facts */
  facts: [string, string, string];
  /** Everyday examples / uses */
  uses: string[];
  /** Pronunciation hint, e.g. "HY-druh-jen" */
  say: string;
  /** Optional safety note */
  safety?: string;
  /** Optional longer "tell me more" text */
  more?: string;
}
