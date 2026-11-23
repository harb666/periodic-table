import { analyseAtom, shellsFor, chargeText } from '../src/lib/atom';
import { parseFormula, isBalanced } from '../src/lib/chemistry';
import { REACTIONS, reactionsForPair } from '../src/data/reactions';
import { makeQuestion, scoreAnswer, NEW_QUIZ, levelForScore } from '../src/lib/quiz';
import { makeHunt, huntFeedback } from '../src/lib/hunt';
import { BY_SYMBOL } from '../src/data';
import { offlineReply, isDangerous, hasPersonalInfo, findElementInText } from '../src/tutor/offline';

describe('atom builder', () => {
  it('identifies the element from protons', () => {
    expect(analyseAtom({ protons: 6, neutrons: 6, electrons: 6 }).name).toBe('Carbon');
    expect(analyseAtom({ protons: 0, neutrons: 1, electrons: 0 }).name).toBeNull();
  });
  it('computes mass number, isotope and stability from the curated list', () => {
    const c12 = analyseAtom({ protons: 6, neutrons: 6, electrons: 6 });
    expect(c12.massNumber).toBe(12);
    expect(c12.isotopeLabel).toBe('Carbon-12');
    expect(c12.stability.kind).toBe('stable');
    const c14 = analyseAtom({ protons: 6, neutrons: 8, electrons: 6 });
    expect(c14.stability.kind).toBe('not-in-list');
    expect(c14.famous).toMatch(/Carbon-14/);
    expect(analyseAtom({ protons: 92, neutrons: 146, electrons: 92 }).stability.kind).toBe('radioactive-element');
    expect(analyseAtom({ protons: 26, neutrons: 30, electrons: 26 }).stability.kind).toBe('no-data');
  });
  it('detects ions and charge', () => {
    const na = analyseAtom({ protons: 11, neutrons: 12, electrons: 10 });
    expect(na.charge).toBe(1);
    expect(na.ionType).toBe('cation');
    expect(na.chargeText).toBe('+1');
    const o = analyseAtom({ protons: 8, neutrons: 8, electrons: 10 });
    expect(o.ionType).toBe('anion');
    expect(o.chargeText).toBe('−2');
    expect(chargeText(0)).toMatch(/neutral/);
  });
  it('builds simplified shells for ions', () => {
    expect(shellsFor(11, 11)).toEqual([2, 8, 1]);
    expect(shellsFor(11, 10)).toEqual([2, 8]);
    expect(shellsFor(17, 18)).toEqual([2, 8, 8]);
    expect(shellsFor(26, 24)).toEqual([2, 8, 14]); // Fe2+ loses its 4s electrons first
  });
});

describe('chemistry lab', () => {
  it('parses formulas', () => {
    expect(parseFormula('C6H12O6')).toEqual({ C: 6, H: 12, O: 6 });
    expect(parseFormula('CH3COOH')).toEqual({ C: 2, H: 4, O: 2 });
    expect(parseFormula('Ca(OH)2')).toEqual({ Ca: 1, O: 2, H: 2 });
    expect(() => parseFormula('xyz')).toThrow();
  });
  it.each(REACTIONS.map((r) => [r.id, r]))('reaction %s conserves atoms', (_id, r) => {
    expect(isBalanced(r.left, r.right)).toBe(true);
  });
  it('only uses real element symbols', () => {
    for (const r of REACTIONS) {
      for (const t of [...r.left, ...r.right]) Object.keys(parseFormula(t.formula)).forEach((s) => expect(BY_SYMBOL[s]).toBeDefined());
      r.elements.forEach((s) => expect(BY_SYMBOL[s]).toBeDefined());
    }
  });
  it('finds pair reactions in either order and nothing for unknown pairs', () => {
    expect(reactionsForPair('O', 'H').map((r) => r.id)).toContain('water');
    expect(reactionsForPair('Na', 'Cl')[0].id).toBe('salt');
    expect(reactionsForPair('He', 'Au')).toHaveLength(0);
  });
});

describe('quiz arcade', () => {
  it('generates valid questions at every level', () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 1; seed < 60; seed++) {
        const q = makeQuestion(level, seed);
        expect(q.choices).toContain(q.answer);
        expect(new Set(q.choices).size).toBe(q.choices.length);
        expect(q.choices.length).toBeGreaterThanOrEqual(3);
      }
    }
  });
  it('is deterministic for a seed', () => {
    expect(makeQuestion(2, 42)).toEqual(makeQuestion(2, 42));
  });
  it('scores correct answers with level points and streak bonuses', () => {
    const q = { ...makeQuestion(1, 7), level: 1 as const };
    let s = NEW_QUIZ;
    let r = scoreAnswer(s, q, q.answer);
    expect(r.correct).toBe(true);
    expect(r.points).toBe(10);
    s = r.state;
    s = scoreAnswer(s, q, q.answer).state;
    r = scoreAnswer(s, q, q.answer); // streak 3 → +5 bonus
    expect(r.points).toBe(15);
    expect(r.state.streak).toBe(3);
    const wrong = q.choices.find((c) => c !== q.answer)!;
    const w = scoreAnswer(r.state, q, wrong);
    expect(w.correct).toBe(false);
    expect(w.state.streak).toBe(0);
    expect(w.state.bestStreak).toBe(3);
    expect(w.state.score).toBe(r.state.score);
    expect(w.state.answered).toBe(4);
  });
  it('increases difficulty with correct answers', () => {
    expect(levelForScore(0)).toBe(1);
    expect(levelForScore(4)).toBe(2);
    expect(levelForScore(9)).toBe(3);
  });
});

describe('element hunt', () => {
  it('creates hunts with several clues', () => {
    const h = makeHunt('easy', 3);
    expect(h.clues.length).toBeGreaterThanOrEqual(4);
  });
  it('gives positive, directional feedback', () => {
    expect(huntFeedback(BY_SYMBOL.Fe, BY_SYMBOL.Fe)).toMatch(/YES/);
    expect(huntFeedback(BY_SYMBOL.Fe, BY_SYMBOL.Na)).toMatch(/nice try/i);
    expect(huntFeedback(BY_SYMBOL.Fe, BY_SYMBOL.Na)).toMatch(/further down/);
  });
});

describe('offline tutor', () => {
  it('refuses hazardous requests', () => {
    expect(isDangerous('how do I make an explosion at home')).toBe(true);
    expect(isDangerous('can I mix bleach and vinegar in my kitchen')).toBe(true);
    expect(offlineReply('how do i make a bomb').source).toBe('safety');
    expect(isDangerous('what is gold used for')).toBe(false);
  });
  it('detects personal information', () => {
    expect(hasPersonalInfo('my name is Sam')).toBe(true);
    expect(hasPersonalInfo('email me at kid@example.com')).toBe(true);
    expect(hasPersonalInfo('tell me about neon')).toBe(false);
  });
  it('answers element questions from curated content', () => {
    const r = offlineReply('What is neon used for?');
    expect(r.z).toBe(10);
    expect(r.text).toMatch(/Neon is used for/);
    expect(findElementInText('tell me about element 79')?.symbol).toBe('Au');
    expect(findElementInText('what is Fe?')?.symbol).toBe('Fe');
  });
  it('says it is a program, not a person', () => {
    expect(offlineReply('are you a real person?').text).toMatch(/not a person/);
  });
  it('explains concepts', () => {
    expect(offlineReply('what is an isotope?').text).toMatch(/neutrons/);
  });
});
