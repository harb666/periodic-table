import { ELEMENTS, BY_SYMBOL, getContent, countConfigElectrons, searchElements } from '../src/data';
import { CATEGORIES } from '../src/data/categories';

// Independent reference list (IUPAC symbols in atomic-number order) – not derived from the dataset.
const SYMBOLS = `H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr
Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu
Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs
Mt Ds Rg Cn Nh Fl Mc Lv Ts Og`.split(/\s+/);

describe('element dataset', () => {
  it('has exactly 118 elements in atomic-number order', () => {
    expect(ELEMENTS).toHaveLength(118);
    ELEMENTS.forEach((e, i) => expect(e.z).toBe(i + 1));
  });

  it('matches the independent IUPAC symbol list', () => {
    expect(SYMBOLS).toHaveLength(118);
    expect(ELEMENTS.map((e) => e.symbol)).toEqual(SYMBOLS);
    expect(new Set(ELEMENTS.map((e) => e.symbol)).size).toBe(118);
  });

  it('electron shells and configurations both sum to Z', () => {
    for (const e of ELEMENTS) {
      expect(e.shells.reduce((a, b) => a + b, 0), e.symbol).toBe(e.z);
      expect(countConfigElectrons(e.config), e.symbol).toBe(e.z);
      // Palladium ([Kr] 4d10) is the famous exception: no 5s electron, so only 4 occupied shells.
      expect(e.shells.length, e.symbol).toBe(e.symbol === 'Pd' ? 4 : e.period);
    }
  });

  it('places every element in a unique grid cell', () => {
    const cells = new Set(ELEMENTS.map((e) => `${e.col},${e.row}`));
    expect(cells.size).toBe(118);
  });

  it('puts lanthanides (57–71) and actinides (89–103) in the separate f-block rows', () => {
    for (const e of ELEMENTS) {
      if (e.z >= 57 && e.z <= 71) {
        expect(e.row).toBe(9);
        expect(e.col).toBe(e.z - 57 + 3);
        expect(e.period).toBe(6);
        expect(e.group).toBeNull();
      } else if (e.z >= 89 && e.z <= 103) {
        expect(e.row).toBe(10);
        expect(e.col).toBe(e.z - 89 + 3);
        expect(e.period).toBe(7);
      } else {
        expect(e.row).toBe(e.period);
        expect(e.col).toBe(e.group);
      }
    }
  });

  it.each([
    ['H', 1, 1, 1],
    ['He', 2, 1, 18],
    ['Li', 3, 2, 1],
    ['C', 6, 2, 14],
    ['O', 8, 2, 16],
    ['Ne', 10, 2, 18],
    ['Na', 11, 3, 1],
    ['Cl', 17, 3, 17],
    ['K', 19, 4, 1],
    ['Fe', 26, 4, 8],
    ['Cu', 29, 4, 11],
    ['Ag', 47, 5, 11],
    ['Ba', 56, 6, 2],
    ['Hf', 72, 6, 4],
    ['Au', 79, 6, 11],
    ['Pb', 82, 6, 14],
    ['Rn', 86, 6, 18],
    ['Fr', 87, 7, 1],
    ['Rf', 104, 7, 4],
    ['Og', 118, 7, 18],
  ])('anchor: %s is Z=%i in period %i group %i', (sym, z, period, group) => {
    const e = BY_SYMBOL[sym as string];
    expect(e.z).toBe(z);
    expect(e.period).toBe(period);
    expect(e.group).toBe(group);
  });

  it('has sensible masses (increasing overall, known anchors)', () => {
    expect(BY_SYMBOL.H.massText).toBe('1.008');
    expect(BY_SYMBOL.C.massText).toBe('12.011');
    expect(BY_SYMBOL.O.massText).toBe('15.999');
    expect(BY_SYMBOL.Fe.massText).toBe('55.845');
    expect(BY_SYMBOL.Au.massText).toBe('196.967');
    expect(BY_SYMBOL.U.massText).toBe('238.029');
    expect(BY_SYMBOL.Tc.massIsMassNumber).toBe(true);
    for (const e of ELEMENTS) {
      expect(e.mass).toBeGreaterThan(e.z); // mass number always exceeds Z (except H≈1.008 > 1)
      expect(e.mass).toBeLessThan(e.z * 2.7);
    }
  });

  it('every category used has a legend entry', () => {
    const ids = new Set(CATEGORIES.map((c) => c.id));
    ELEMENTS.forEach((e) => expect(ids.has(e.category)).toBe(true));
    expect(BY_SYMBOL.He.category).toBe('noble-gas');
    expect(BY_SYMBOL.Na.category).toBe('alkali-metal');
    expect(BY_SYMBOL.Si.category).toBe('metalloid');
  });
});

describe('curated content', () => {
  it('exists for all 118 elements with exactly 3 facts and at least one use', () => {
    for (const e of ELEMENTS) {
      const c = getContent(e.z);
      expect(c, e.name).toBeDefined();
      expect(c!.facts, e.name).toHaveLength(3);
      c!.facts.forEach((f) => expect(f.length).toBeGreaterThan(10));
      expect(c!.uses.length, e.name).toBeGreaterThan(0);
      expect(c!.simple.length, e.name).toBeGreaterThan(10);
      expect(c!.say.length).toBeGreaterThan(0);
    }
  });

  it('includes safety notes for radioactive elements (Z ≥ 84, Tc, Pm)', () => {
    for (const e of ELEMENTS.filter((x) => x.z >= 84 || x.z === 43 || x.z === 61)) {
      expect(getContent(e.z)!.safety, e.name).toBeTruthy();
    }
  });
});

describe('search', () => {
  it('finds by name, symbol, number and alternate spelling', () => {
    expect(searchElements('gold')[0].symbol).toBe('Au');
    expect(searchElements('fe')[0].symbol).toBe('Fe');
    expect(searchElements('26')[0].symbol).toBe('Fe');
    expect(searchElements('aluminium')[0].symbol).toBe('Al');
    expect(searchElements('')).toHaveLength(118);
  });
});
