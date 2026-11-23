import { ELEMENTS } from '../src/data';
import { getContent } from '../src/data';
import { hashText, rateCurve } from '../src/voice/contour';
import { CURVE_HZ, EMOTIONS, type Emotion } from '../src/voice/profile';
import { PRONUNCIATIONS, detectEmotion, planSpeech } from '../src/voice/text';

const spoken = (t: string) => planSpeech(t).map((p) => p.spoken).join(' | ');

describe('speech text planning', () => {
  it('lower-cases words (the engine spells out some capitalised ones, e.g. "Zinc")', () => {
    expect(spoken('Zinc and Zirconium are metals.')).toBe('zinc and zirconium are metals.');
  });

  it('uses the pronunciation dictionary for element names the engine gets wrong, including plurals', () => {
    expect(spoken('Bromine is next to chlorine.')).toBe("[[br'oUmi:n]] is next to chlorine.");
    expect(spoken('Two praseodymiums')).toBe("two [[pr,eIzi;oUd'Imi@mz]]");
    for (const name of Object.keys(PRONUNCIATIONS)) expect(spoken(`${name}!`)).toContain(`[[${PRONUNCIATIONS[name]}]]`);
  });

  it('says the metal lead as "led" but leaves the verb alone', () => {
    expect(spoken('Lead is heavy.')).toBe("[[l'Ed]] is heavy.");
    expect(spoken('These clues lead to gold.')).toBe('these clues lead to gold.');
  });

  it('spells out formulas and symbols, but not ordinary words that look like symbols', () => {
    expect(spoken('Water is H2O.')).toBe("water is [['eItS]] two [['oU]].");
    expect(spoken('NaCl is salt')).toBe("[['En]] [['eI]] [['si:]] [['El]] is salt".replace("[['si:]]", "[[s'i:]]"));
    expect(spoken('Fe is Iron – atomic number 26!')).toBe("[['Ef]] [['i:]] is iron, atomic number 26!");
    expect(spoken('Gold (Au) is element 79.')).toBe("gold [['eI]] [[j'u:]], is element 79.");
    expect(spoken('He is in. I am at home. No, be as you are.')).toBe('he is in. | i am at home. | no, be as you are.');
  });

  it('cleans symbols the engine would read out or choke on', () => {
    expect(spoken('2 H2 + O2 → 2 H2O ♥')).toBe("2 [['eItS]] two plus [['oU]] two makes 2 [['eItS]] two [['oU]]");
    expect(spoken('Carbon-14 is 50% gone ≈ 5730 years')).toBe('carbon 14 is 50 percent gone about 5730 years');
    expect(spoken('Try [[danger]] this')).not.toContain('[[');
    expect(planSpeech('♥ ✦ …')).toEqual([]);
  });

  it('splits into sentences without breaking decimals, and breaks very long sentences at commas', () => {
    expect(planSpeech('Iron weighs 55.845 u. It rusts! Why?').map((p) => p.text)).toEqual(['Iron weighs 55.845 u.', 'It rusts!', 'Why?']);
    const long = planSpeech(`${'this clause is fairly long, '.repeat(9)}the end.`);
    expect(long.length).toBeGreaterThan(1);
    for (const p of long) expect(p.text.length).toBeLessThanOrEqual(160);
  });

  it('reads the mood from wording and punctuation', () => {
    expect(detectEmotion('Whoa! Look at that!')).toBe('surprised');
    expect(detectEmotion("Hmm, I'm not sure about that one.")).toBe('confused');
    expect(detectEmotion('Do you want to see gold?')).toBe('curious');
    expect(detectEmotion('Great pick!')).toBe('excited');
    expect(detectEmotion('Gold is a metal.', 'teaching')).toBe('teaching');
    expect(detectEmotion('Gold is a metal.')).toBe('neutral');
  });

  it('can speak the name and description of all 118 elements', () => {
    for (const e of ELEMENTS) {
      const phrases = planSpeech(`${e.name}. ${getContent(e.z)?.simple ?? ''}`, 'teaching');
      expect(phrases.length).toBeGreaterThan(0);
      for (const p of phrases) {
        expect(p.spoken).toMatch(/[a-z]/);
        // only characters the engine understands: words, numbers, basic punctuation and phoneme blocks
        expect(p.spoken.replace(/\[\[[^\]]+\]\]/g, '')).toMatch(/^[\p{Ll}\p{N}\s.,;:!?'-]*$/u);
      }
    }
  });
});

describe('pitch contour', () => {
  const emotions = Object.keys(EMOTIONS) as Emotion[];

  it('is deterministic for a given sentence', () => {
    const a = rateCurve(2.4, 'excited', hashText('ooh, shiny!'));
    const b = rateCurve(2.4, 'excited', hashText('ooh, shiny!'));
    expect([...a.values]).toEqual([...b.values]);
    expect([...rateCurve(2.4, 'excited', hashText('other')).values]).not.toEqual([...a.values]);
  });

  it('plays exactly the whole phrase: the curve integrates to the source length', () => {
    for (const emotion of emotions) {
      for (const seconds of [0.3, 1.7, 6]) {
        const { values, duration } = rateCurve(seconds, emotion, 1234);
        let consumed = 0;
        for (let i = 0; i < values.length; i++) consumed += values[i] * Math.min(1 / CURVE_HZ, Math.max(0, duration - i / CURVE_HZ));
        expect(consumed).toBeCloseTo(seconds, 1);
        expect(duration).toBeGreaterThan(0);
      }
    }
  });

  it('stays within a sane pitch range and gives each emotion its shape', () => {
    for (const emotion of emotions) {
      const { values } = rateCurve(3, emotion, 99);
      const base = EMOTIONS[emotion].rate;
      for (const v of values) {
        expect(v).toBeGreaterThan(base * 0.59);
        expect(v).toBeLessThan(base * 1.69);
      }
    }
    const mean = (xs: Float32Array, from: number, to: number) => xs.slice(Math.floor(xs.length * from), Math.floor(xs.length * to)).reduce((s, v) => s + v, 0) / (Math.floor(xs.length * to) - Math.floor(xs.length * from));
    // averaged over many sentences: questions rise at the end, surprise starts high
    let rise = 0;
    let drop = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const q = rateCurve(3, 'curious', seed).values;
      rise += mean(q, 0.85, 1) - mean(q, 0.2, 0.6);
      const s = rateCurve(3, 'surprised', seed).values;
      drop += mean(s, 0, 0.04) - mean(s, 0.3, 0.9);
    }
    expect(rise / 40).toBeGreaterThan(0.1);
    expect(drop / 40).toBeGreaterThan(0.15);
    // teaching is the calmest delivery, excited the liveliest
    const spread = (e: Emotion) => {
      let s = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const v = rateCurve(4, e, seed).values;
        s += (Math.max(...v) - Math.min(...v)) / EMOTIONS[e].rate;
      }
      return s / 20;
    };
    expect(spread('teaching')).toBeLessThan(spread('neutral'));
    expect(spread('neutral')).toBeLessThan(spread('excited'));
  });
});
