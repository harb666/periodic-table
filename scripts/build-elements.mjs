// Builds src/data/elements.generated.ts from the vendored, openly licensed sources in data-sources/.
// Run with: npm run data:build
// Sources (see DATA_SOURCES.md):
//   pubchem-elements.csv              – PubChem Periodic Table (NCBI, public domain): names, year discovered, phase, melt/boil
//   andrejewski-periodic-table.json   – "periodic-table" npm package (ISC): IUPAC standard atomic weights with uncertainty
//   bowserinator-PeriodicTableJSON.json – Periodic-Table-JSON (CC BY-SA): shells, configuration, layout, discoverers
import { readFileSync, writeFileSync } from 'node:fs';

const bow = JSON.parse(readFileSync('data-sources/bowserinator-PeriodicTableJSON.json', 'utf8')).elements.slice(0, 118);
const andre = JSON.parse(readFileSync('data-sources/andrejewski-periodic-table.json', 'utf8'));

function parseCsv(text) {
  const rows = [];
  for (const line of text.trim().split(/\r?\n/)) {
    const cells = [];
    let cur = '', q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === ',' && !q) { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    rows.push(cells);
  }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const pub = parseCsv(readFileSync('data-sources/pubchem-elements.csv', 'utf8'));

const CATEGORY = {
  'alkali metal': 'alkali-metal',
  'alkaline earth metal': 'alkaline-earth-metal',
  'transition metal': 'transition-metal',
  'post-transition metal': 'post-transition-metal',
  metalloid: 'metalloid',
  'diatomic nonmetal': 'reactive-nonmetal',
  'polyatomic nonmetal': 'reactive-nonmetal',
  'noble gas': 'noble-gas',
  lanthanide: 'lanthanide',
  actinide: 'actinide',
};

const out = [];
const updated = [];
// Isolation dates for elements PubChem lists as 'Ancient' only because their compounds were known.
const DISCOVERY_OVERRIDES = {
  13: { year: 1825, by: 'Hans Christian Ørsted' },
  20: { year: 1808, by: 'Humphry Davy' },
  // Corrections where the source dataset mixes up who named vs. who isolated an element, or lists a wrong year.
  2: { year: 1868, by: 'Pierre Janssen and Norman Lockyer' },
  8: { year: 1774, by: 'Carl Wilhelm Scheele and Joseph Priestley' },
  9: { year: 1886, by: 'Henri Moissan' },
  10: { year: 1898, by: 'William Ramsay and Morris Travers' },
  12: { year: 1755, by: 'Joseph Black' },
  14: { year: 1824, by: 'Jöns Jacob Berzelius' },
  18: { year: 1894, by: 'Lord Rayleigh and William Ramsay' },
  25: { year: 1774, by: 'Johan Gottlieb Gahn' },
  30: { year: 1746, by: 'Andreas Marggraf (zinc was also known much earlier in India)' },
  36: { year: 1898, by: 'William Ramsay and Morris Travers' },
  38: { year: 1790, by: 'Adair Crawford and William Cruickshank' },
  37: { year: 1861, by: 'Robert Bunsen and Gustav Kirchhoff' },
  44: { year: 1844, by: 'Karl Ernst Claus' },
  48: { year: 1817, by: 'Friedrich Stromeyer' },
  49: { year: 1863, by: 'Ferdinand Reich and Hieronymus Theodor Richter' },
  54: { year: 1898, by: 'William Ramsay and Morris Travers' },
  55: { year: 1860, by: 'Robert Bunsen and Gustav Kirchhoff' },
  56: { year: 1774, by: 'Carl Wilhelm Scheele' },
  61: { year: 1945, by: 'Jacob Marinsky, Lawrence Glendenin and Charles Coryell' },
  72: { year: 1923, by: 'Dirk Coster and George de Hevesy' },
  74: { year: 1783, by: 'Juan José and Fausto Elhuyar' },
  75: { year: 1925, by: 'Walter Noddack, Ida Tacke and Otto Berg' },
  84: { year: 1898, by: 'Marie and Pierre Curie' },
  85: { year: 1940, by: 'Dale Corson, Kenneth MacKenzie and Emilio Segrè' },
  88: { year: 1898, by: 'Marie and Pierre Curie' },
  89: { year: 1899, by: 'André-Louis Debierne' },
  91: { year: 1913, by: 'Kasimir Fajans and Oswald Göhring' },
  93: { year: 1940, by: 'Edwin McMillan and Philip Abelson' },
  102: { year: 1966, by: 'Joint Institute for Nuclear Research (Dubna, Russia)' },
  107: { year: 1981, by: 'GSI Helmholtz Centre (Darmstadt, Germany)' },
};
// Make lab names friendlier / consistent.
const LAB_NAMES = {
  'Gesellschaft für Schwerionenforschung': 'GSI Helmholtz Centre (Darmstadt, Germany)',
  'Joint Institute for Nuclear Research': 'Joint Institute for Nuclear Research (Dubna, Russia)',
  'Lawrence Berkeley National Laboratory': 'Lawrence Berkeley National Laboratory (California, USA)',
  RIKEN: 'RIKEN (Japan)',
};
for (let i = 0; i < 118; i++) {
  const b = bow[i], a = andre[i], p = pub[i];
  const z = i + 1;
  if (b.number !== z || a.atomicNumber !== z || Number(p.AtomicNumber) !== z) throw new Error(`order mismatch at ${z}`);
  if (b.symbol !== a.symbol || b.symbol !== p.Symbol) throw new Error(`symbol mismatch at ${z}`);

  // Atomic mass: standard atomic weight where one exists, otherwise mass number of a long-lived isotope.
  let mass, massText, massIsMassNumber = false;
  const am = Array.isArray(a.atomicMass) ? `[${a.atomicMass[0]}]` : String(a.atomicMass);
  if (am.startsWith('[')) {
    massIsMassNumber = true;
    // For Z >= 103 the andrejewski values are older; use the (newer) PubChem isotope mass rounded to a mass number.
    mass = z >= 103 ? Math.round(Number(p.AtomicMass)) : Number(am.slice(1, -1));
    // Oganesson: only Og-294 has been observed; PubChem lists 295.
    if (z === 118) mass = 294;
    massText = `[${mass}]`;
  } else {
    const v = am.replace(/\(.*\)/, '');
    mass = Number(v);
    const decimals = (v.split('.')[1] ?? '').length;
    massText = mass.toFixed(Math.min(decimals, 3));
    // Prefer the newer PubChem (IUPAC) value when it is precise enough and disagrees beyond rounding.
    const pv = String(p.AtomicMass);
    const pDec = (pv.split('.')[1] ?? '').length;
    if (pDec >= 2 && Math.abs(Number(pv) - mass) > 0.5 * 10 ** -pDec + 1e-9) {
      updated.push(`${b.symbol}: ${massText} -> ${pv}`);
      mass = Number(pv);
      massText = mass.toFixed(Math.min(pDec, 3));
    }
  }
  if (!Number.isFinite(mass)) throw new Error(`bad mass ${z}`);
  const pubMass = Number(p.AtomicMass);
  if (Math.abs(pubMass - mass) > 1.5) throw new Error(`mass disagreement ${z}: ${mass} vs ${pubMass}`);

  let category = CATEGORY[b.category];
  if (z >= 109) category = 'unknown';
  if (!category) throw new Error(`unknown category ${b.category} for ${z}`);

  const fBlockRow = b.ypos >= 9;
  const config = b.electron_configuration_semantic.replace(/^\*/, '');
  const yearRaw = p.YearDiscovered;
  const ov = DISCOVERY_OVERRIDES[z];
  const ancient = !ov && yearRaw === 'Ancient';
  const year = ov ? ov.year : /^\d+$/.test(yearRaw) ? Number(yearRaw) : null;
  const rawBy = (b.discovered_by || '').replace(/ \(chemist\)$/, '');
  const discoveredBy = ov ? ov.by : ancient ? null : LAB_NAMES[rawBy] ?? (rawBy || null);
  const num = (s) => (s === '' || s == null || Number.isNaN(Number(s)) ? null : Number(s));
  const name = p.Name;

  out.push({
    z,
    symbol: b.symbol,
    name,
    altNames: b.name !== name ? [b.name] : [],
    mass,
    massText,
    massIsMassNumber,
    category,
    period: b.period,
    group: fBlockRow ? null : b.group,
    block: b.block,
    col: b.xpos,
    row: b.ypos,
    shells: b.shells,
    config,
    configPredicted: z >= 104 || /predicted|calculated/.test(p.ElectronConfiguration),
    phase: z >= 100 ? 'unknown' : p.StandardState.toLowerCase(),
    meltK: z >= 100 ? null : num(p.MeltingPoint),
    boilK: z >= 100 ? null : num(p.BoilingPoint),
    discoveredBy,
    namedBy: b.named_by || null,
    year,
    yearText: ancient ? 'Known since ancient times' : year ? String(year) : null,
  });
}

const header = `// AUTO-GENERATED by scripts/build-elements.mjs – do not edit by hand.\n// Data sources and licences: see DATA_SOURCES.md\nimport type { ElementData } from './types';\n\n`;
writeFileSync('src/data/elements.generated.ts', header + `export const ELEMENTS: ElementData[] = ${JSON.stringify(out, null, 1)};\n`);
console.log('mass updates from PubChem:', updated.join('; '));
console.log(`wrote ${out.length} elements`);
