import type { Term } from '../lib/chemistry';

export interface Reaction {
  id: string;
  title: string;
  /** Element symbols involved (for the "pick two elements" lab bench) */
  elements: string[];
  left: Term[];
  right: Term[];
  /** What happens, for a 9-year-old */
  story: string;
  /** Where you see this in real life */
  realLife: string;
  safety: string;
  visual: 'flame' | 'spark' | 'bubbles' | 'rust' | 'leaf' | 'glow';
}

// All equations are standard, balanced textbook reactions. They are shown as simulations only.
export const REACTIONS: Reaction[] = [
  {
    id: 'water',
    title: 'Making water',
    elements: ['H', 'O'],
    left: [
      { coeff: 2, formula: 'H2', name: 'hydrogen gas' },
      { coeff: 1, formula: 'O2', name: 'oxygen gas' },
    ],
    right: [{ coeff: 2, formula: 'H2O', name: 'water' }],
    story: 'Hydrogen and oxygen atoms swap partners and join up into water molecules. It releases lots of energy!',
    realLife: 'Some rockets use hydrogen and oxygen as fuel, and their "exhaust" is mostly water vapour.',
    safety: 'Hydrogen is very flammable. This is a simulation – never try it.',
    visual: 'flame',
  },
  {
    id: 'salt',
    title: 'Making table salt',
    elements: ['Na', 'Cl'],
    left: [
      { coeff: 2, formula: 'Na', name: 'sodium metal' },
      { coeff: 1, formula: 'Cl2', name: 'chlorine gas' },
    ],
    right: [{ coeff: 2, formula: 'NaCl', name: 'sodium chloride (table salt)' }],
    story: 'A super-reactive metal and a poisonous gas join together to make… the salt you sprinkle on chips! Each sodium gives one electron to a chlorine.',
    realLife: 'Salt is made from sodium and chlorine – but in real life we get it from the sea or from salt mines.',
    safety: 'Sodium metal and chlorine gas are both dangerous. Simulation only!',
    visual: 'spark',
  },
  {
    id: 'co2',
    title: 'Burning charcoal',
    elements: ['C', 'O'],
    left: [
      { coeff: 1, formula: 'C', name: 'carbon' },
      { coeff: 1, formula: 'O2', name: 'oxygen gas' },
    ],
    right: [{ coeff: 1, formula: 'CO2', name: 'carbon dioxide' }],
    story: 'When carbon burns, each carbon atom grabs two oxygen atoms and becomes carbon dioxide gas.',
    realLife: 'This happens when charcoal burns on a barbecue.',
    safety: 'Fire is hot and dangerous. Only grown-ups light fires.',
    visual: 'flame',
  },
  {
    id: 'rust',
    title: 'Iron rusting',
    elements: ['Fe', 'O'],
    left: [
      { coeff: 4, formula: 'Fe', name: 'iron' },
      { coeff: 3, formula: 'O2', name: 'oxygen gas' },
    ],
    right: [{ coeff: 2, formula: 'Fe2O3', name: 'iron oxide (rust)' }],
    story: 'Iron slowly joins with oxygen from the air to make reddish-brown rust. Water helps it happen faster – this equation is a simplified version.',
    realLife: 'Old bikes, nails and gates left outside in the rain get rusty.',
    safety: 'Rusty metal can be sharp – ask a grown-up before touching.',
    visual: 'rust',
  },
  {
    id: 'mgo',
    title: 'Burning magnesium',
    elements: ['Mg', 'O'],
    left: [
      { coeff: 2, formula: 'Mg', name: 'magnesium' },
      { coeff: 1, formula: 'O2', name: 'oxygen gas' },
    ],
    right: [{ coeff: 2, formula: 'MgO', name: 'magnesium oxide' }],
    story: 'Magnesium burns with a super-bright white light and turns into a white powder called magnesium oxide.',
    realLife: 'Magnesium is used in some fireworks and flares for bright white sparkles.',
    safety: 'Burning magnesium is bright enough to hurt your eyes. Simulation only!',
    visual: 'glow',
  },
  {
    id: 'ammonia',
    title: 'Making ammonia',
    elements: ['N', 'H'],
    left: [
      { coeff: 1, formula: 'N2', name: 'nitrogen gas' },
      { coeff: 3, formula: 'H2', name: 'hydrogen gas' },
    ],
    right: [{ coeff: 2, formula: 'NH3', name: 'ammonia' }],
    story: 'Nitrogen from the air joins with hydrogen to make ammonia. Factories need high pressure and heat to make it work.',
    realLife: 'Ammonia is used to make fertilisers that help farmers grow lots of food.',
    safety: 'Ammonia has a very strong smell and is harmful to breathe. Simulation only!',
    visual: 'bubbles',
  },
  {
    id: 'methane',
    title: 'Burning natural gas',
    elements: ['C', 'H', 'O'],
    left: [
      { coeff: 1, formula: 'CH4', name: 'methane (natural gas)' },
      { coeff: 2, formula: 'O2', name: 'oxygen gas' },
    ],
    right: [
      { coeff: 1, formula: 'CO2', name: 'carbon dioxide' },
      { coeff: 2, formula: 'H2O', name: 'water' },
    ],
    story: 'Methane burns to make carbon dioxide and water, and gives out heat. The atoms are just rearranged!',
    realLife: 'This is what happens in a gas cooker flame.',
    safety: 'Gas and flames are only for grown-ups.',
    visual: 'flame',
  },
  {
    id: 'photosynthesis',
    title: 'Photosynthesis',
    elements: ['C', 'H', 'O'],
    left: [
      { coeff: 6, formula: 'CO2', name: 'carbon dioxide' },
      { coeff: 6, formula: 'H2O', name: 'water' },
    ],
    right: [
      { coeff: 1, formula: 'C6H12O6', name: 'glucose (sugar)' },
      { coeff: 6, formula: 'O2', name: 'oxygen gas' },
    ],
    story: 'Plants use sunlight to turn carbon dioxide and water into sugar for food – and they give out the oxygen we breathe!',
    realLife: 'Every green leaf on every tree is doing this right now in the sunshine.',
    safety: 'Totally safe – go hug a tree (gently)!',
    visual: 'leaf',
  },
  {
    id: 'fizz',
    title: 'Baking soda + vinegar fizz',
    elements: ['Na', 'C', 'H', 'O'],
    left: [
      { coeff: 1, formula: 'NaHCO3', name: 'baking soda (sodium bicarbonate)' },
      { coeff: 1, formula: 'CH3COOH', name: 'vinegar (acetic acid)' },
    ],
    right: [
      { coeff: 1, formula: 'CH3COONa', name: 'sodium acetate' },
      { coeff: 1, formula: 'H2O', name: 'water' },
      { coeff: 1, formula: 'CO2', name: 'carbon dioxide gas (the bubbles!)' },
    ],
    story: 'Baking soda and vinegar react to make carbon dioxide gas – that is what makes all the fizzy bubbles.',
    realLife: 'This kind of reaction helps some cakes rise, because bubbles of gas puff up the batter.',
    safety: 'Even kitchen experiments need a grown-up helping. Keep it away from eyes.',
    visual: 'bubbles',
  },
];

/** Find predefined reactions that use exactly these two elements (in any order) as their key ingredients. */
export function reactionsForPair(a: string, b: string): Reaction[] {
  return REACTIONS.filter((r) => r.elements.length === 2 && r.elements.includes(a) && r.elements.includes(b) && a !== b);
}
