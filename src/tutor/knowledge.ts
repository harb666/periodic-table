// Gir's offline chemistry library: everyday substances and general chemistry ideas,
// written for a 9-year-old. Every entry is standard school-level chemistry.
// Answers explain the science; they never give steps for doing anything at home.

export interface Substance {
  /** Names people use, lower-case. The first is how Gir refers to it. */
  names: string[];
  formula?: string;
  /** element | compound | mixture | alloy */
  kind: 'compound' | 'mixture' | 'alloy' | 'element';
  /** What it is made of. */
  made: string;
  /** How it comes to exist (the science, not a recipe). */
  forms: string;
  /** Something worth knowing about it. */
  about: string;
  safety?: string;
}

export const SUBSTANCES: Substance[] = [
  {
    names: ['water', 'h2o', 'ice', 'steam', 'water vapour', 'water vapor'],
    formula: 'H₂O',
    kind: 'compound',
    made: 'Each water molecule is two hydrogen atoms joined to one oxygen atom.',
    forms:
      'Water is made when hydrogen and oxygen join together: 2 H₂ + O₂ → 2 H₂O. That reaction gives off a burst of energy, so only scientists do it, in a lab. You can watch it safely in the Chem Lab – pick "Making water". The water you drink was made long ago and has been travelling round the water cycle ever since.',
    about: 'Water is the only everyday substance you meet as a solid (ice), a liquid and a gas (steam). It covers about 71% of Earth.',
  },
  {
    names: ['salt', 'table salt', 'sodium chloride', 'nacl'],
    formula: 'NaCl',
    kind: 'compound',
    made: 'Salt is sodium and chlorine joined together, one of each, packed into tiny cube-shaped crystals.',
    forms:
      'Salt forms when sodium atoms give an electron to chlorine atoms: 2 Na + Cl₂ → 2 NaCl. The salt in your kitchen is not made that way, though – it is dug out of the ground or left behind when sea water dries up.',
    about: 'Sodium is a metal that fizzes in water and chlorine is a poisonous gas, yet together they make something you sprinkle on chips. Compounds can be very different from the elements inside them!',
  },
  {
    names: ['carbon dioxide', 'co2', 'dry ice'],
    formula: 'CO₂',
    kind: 'compound',
    made: 'One carbon atom joined to two oxygen atoms.',
    forms: 'Carbon dioxide forms whenever something containing carbon burns, and when living things turn food into energy. You breathe it out with every breath: C + O₂ → CO₂.',
    about: 'Plants take in carbon dioxide to make their food. It is the fizz in fizzy drinks, and frozen carbon dioxide is called dry ice.',
  },
  {
    names: ['carbon monoxide'],
    formula: 'CO',
    kind: 'compound',
    made: 'One carbon atom joined to one oxygen atom.',
    forms: 'Carbon monoxide forms when fuel burns without enough air.',
    about: 'It has no colour and no smell.',
    safety: 'Carbon monoxide is poisonous, which is why homes have carbon monoxide alarms.',
  },
  {
    names: ['methane', 'natural gas', 'ch4'],
    formula: 'CH₄',
    kind: 'compound',
    made: 'One carbon atom joined to four hydrogen atoms.',
    forms: 'Methane forms when plants and animals rot without air, deep underground or in swamps. Cows burp it out too!',
    about: 'It is the main part of natural gas, which is burned in cookers and boilers. When it burns it makes carbon dioxide and water.',
    safety: 'Methane catches fire easily, so gas is only handled by trained people.',
  },
  {
    names: ['ammonia', 'nh3'],
    formula: 'NH₃',
    kind: 'compound',
    made: 'One nitrogen atom joined to three hydrogen atoms.',
    forms: 'Factories make ammonia by squeezing nitrogen and hydrogen together at high pressure with a catalyst: N₂ + 3 H₂ → 2 NH₃.',
    about: 'Most ammonia becomes fertiliser, which helps grow food for billions of people.',
    safety: 'Ammonia has a sharp smell and can hurt your eyes and lungs.',
  },
  {
    names: ['sugar', 'table sugar', 'sucrose', 'glucose'],
    formula: 'C₁₂H₂₂O₁₁',
    kind: 'compound',
    made: 'Sugar is made of carbon, hydrogen and oxygen. One molecule of table sugar has 12 carbon, 22 hydrogen and 11 oxygen atoms.',
    forms: 'Plants make sugar. Using sunlight, they join carbon dioxide and water into a simple sugar called glucose (C₆H₁₂O₆). That is photosynthesis. Table sugar comes from sugar cane and sugar beet.',
    about: 'Sugar is how plants store the energy of sunlight – and it is the fuel your body runs on.',
  },
  {
    names: ['baking soda', 'bicarbonate of soda', 'sodium bicarbonate', 'bicarb'],
    formula: 'NaHCO₃',
    kind: 'compound',
    made: 'Sodium, hydrogen, carbon and oxygen.',
    forms: 'Baking soda is made in factories from salt, or dug up as a mineral.',
    about: 'It is a mild base. When it meets an acid it gives off carbon dioxide bubbles, and those bubbles make cakes rise. See the fizz in the Chem Lab!',
  },
  {
    names: ['vinegar', 'acetic acid'],
    formula: 'CH₃COOH',
    kind: 'mixture',
    made: 'Vinegar is mostly water with a little acetic acid, which is made of carbon, hydrogen and oxygen.',
    forms: 'Tiny living things called bacteria make vinegar by turning the alcohol in old wine or cider into acetic acid.',
    about: 'Vinegar is a weak acid. That is why it tastes sour.',
  },
  {
    names: ['rust', 'iron oxide'],
    formula: 'Fe₂O₃',
    kind: 'compound',
    made: 'Iron joined to oxygen: two iron atoms for every three oxygen atoms.',
    forms: 'Rust forms slowly when iron meets oxygen and water: 4 Fe + 3 O₂ → 2 Fe₂O₃. Salt water makes it happen faster, which is why ships and seaside cars rust quickly.',
    about: 'Rust is flaky and weak, so it crumbles away and lets more iron rust underneath. Paint keeps the air and water out. Rust is also why Mars looks red!',
  },
  {
    names: ['chalk', 'limestone', 'marble', 'calcium carbonate', 'eggshell', 'seashell', 'sea shell'],
    formula: 'CaCO₃',
    kind: 'compound',
    made: 'Calcium, carbon and oxygen.',
    forms: 'Sea creatures build their shells from calcium carbonate. Over millions of years, piles of old shells get squashed into limestone and chalk.',
    about: 'Chalk cliffs, marble statues, eggshells and seashells are all the same compound.',
  },
  {
    names: ['sand', 'quartz', 'silicon dioxide', 'silica', 'glass'],
    formula: 'SiO₂',
    kind: 'compound',
    made: 'One silicon atom for every two oxygen atoms.',
    forms: 'Sand is rock that wind and water have ground into tiny grains over a very long time. Glass is made by melting sand in a very hot furnace and letting it cool.',
    about: 'Silicon and oxygen are the two most common elements in the rocks under your feet.',
  },
  {
    names: ['hydrogen peroxide', 'h2o2'],
    formula: 'H₂O₂',
    kind: 'compound',
    made: 'Two hydrogen atoms and two oxygen atoms – one more oxygen than water.',
    forms: 'Hydrogen peroxide is made in factories. It slowly breaks down into water and oxygen.',
    about: 'Weak hydrogen peroxide is used to clean cuts and to bleach hair.',
    safety: 'Strong hydrogen peroxide can burn skin, so it is only for trained grown-ups.',
  },
  {
    names: ['bleach'],
    formula: 'NaClO',
    kind: 'mixture',
    made: 'Household bleach is water with a compound of sodium, chlorine and oxygen dissolved in it.',
    forms: 'Bleach is made in factories by trained chemists.',
    about: 'It kills germs and takes the colour out of stains.',
    safety: 'Bleach is dangerous. It must never be touched, tasted or mixed with anything – mixing it can make poisonous gas.',
  },
  {
    names: ['ozone', 'o3'],
    formula: 'O₃',
    kind: 'element',
    made: 'Three oxygen atoms joined together. (The oxygen you breathe is two.)',
    forms: 'High in the sky, sunlight splits oxygen molecules and the loose atoms join on to others to make ozone. Lightning makes a little too.',
    about: 'The ozone layer, high above us, soaks up harmful rays from the Sun.',
  },
  {
    names: ['air', 'atmosphere'],
    kind: 'mixture',
    made: 'Air is a mixture of gases: about 78% nitrogen, 21% oxygen, nearly 1% argon and a tiny bit of carbon dioxide and others.',
    forms: 'Air is not made by a reaction – its gases are simply mixed. The oxygen in it was put there by plants and tiny sea creatures over billions of years.',
    about: 'Most of the air is nitrogen, not oxygen!',
  },
  {
    names: ['steel', 'stainless steel'],
    kind: 'alloy',
    made: 'Steel is iron with a little carbon mixed in. Stainless steel also has chromium, which stops it rusting.',
    forms: 'Steel is made by melting iron in a huge furnace and controlling how much carbon stays in it.',
    about: 'A tiny amount of carbon makes iron much stronger. Steel is used for bridges, cars, tools and cutlery.',
  },
  {
    names: ['bronze'],
    kind: 'alloy',
    made: 'Bronze is mostly copper with some tin.',
    forms: 'Bronze is made by melting copper and tin together.',
    about: 'People made bronze tools thousands of years ago – that time is called the Bronze Age. Medals for third place are bronze.',
  },
  {
    names: ['brass'],
    kind: 'alloy',
    made: 'Brass is copper mixed with zinc.',
    forms: 'Brass is made by melting copper and zinc together.',
    about: 'Brass looks golden and makes a bright sound, so trumpets and trombones are made of it.',
  },
  {
    names: ['plastic', 'plastics', 'polymer', 'polymers'],
    kind: 'compound',
    made: 'Plastics are polymers: very long chains of atoms, mostly carbon and hydrogen, like a string of thousands of beads.',
    forms: 'Most plastic is made in factories from oil, by linking lots of small molecules into long chains.',
    about: 'Plastic is light and does not rot, which is useful – and also why it must be recycled and not dropped as litter.',
  },
  {
    names: ['petrol', 'gasoline', 'oil', 'crude oil', 'diesel', 'fossil fuel', 'fossil fuels', 'coal'],
    kind: 'mixture',
    made: 'Fossil fuels are mostly carbon and hydrogen. Coal is mainly carbon; oil and petrol are mixtures of molecules called hydrocarbons.',
    forms: 'They formed from plants and tiny sea creatures that were buried and squashed for millions of years.',
    about: 'Burning them gives energy, and also makes carbon dioxide, which warms the planet.',
    safety: 'Fuels catch fire very easily.',
  },
  {
    names: ['diamond', 'diamonds', 'graphite', 'pencil lead'],
    formula: 'C',
    kind: 'element',
    made: 'Diamond and graphite are both pure carbon. Only the way the atoms are arranged is different.',
    forms: 'Diamonds form deep inside the Earth, where carbon is squeezed and heated for a very long time.',
    about: 'In diamond every atom is locked to four others, making it the hardest natural material. In graphite the atoms sit in sheets that slide, which is why a pencil leaves a mark.',
  },
  {
    names: ['alcohol', 'ethanol'],
    formula: 'C₂H₅OH',
    kind: 'compound',
    made: 'Carbon, hydrogen and oxygen.',
    forms: 'Yeast, a tiny living thing, makes ethanol from sugar. That is called fermentation.',
    about: 'Ethanol kills germs, so it is used in hand sanitiser, and it can be used as a fuel.',
    safety: 'It catches fire easily and is not for children.',
  },
  {
    names: ['soap', 'detergent'],
    kind: 'compound',
    made: 'A soap molecule is long, with one end that loves water and one end that loves grease.',
    forms: 'Soap is made in factories from fats or oils and a strong base.',
    about: 'The grease-loving ends grab the dirt and the water-loving ends let the water carry it away.',
  },
];

export interface Topic {
  /** Phrases that point at this topic (lower-case). Longer phrases count for more. */
  keys: string[];
  text: string;
  /** Follow-up questions to offer. */
  next?: string[];
}

export const TOPICS: Topic[] = [
  // ----- atoms -----
  { keys: ['what is an atom', 'what are atoms', 'whats an atom', 'atom', 'atoms'], text: 'An atom is the tiniest piece of an element. Everything around you – your chair, the air, even you – is made of atoms! In the middle is the nucleus (protons and neutrons), and electrons zoom around it.', next: ['What is a proton?', 'What is a molecule?'] },
  { keys: ['proton', 'protons'], text: 'Protons are tiny particles with a positive (+) charge in the nucleus. The number of protons decides which element an atom is: 1 proton = hydrogen, 6 = carbon, 79 = gold!', next: ['What is a neutron?', 'What is the atomic number?'] },
  { keys: ['neutron', 'neutrons'], text: 'Neutrons sit in the nucleus with the protons. They have no charge. Changing the number of neutrons makes a different isotope of the same element.', next: ['What is an isotope?'] },
  { keys: ['electron', 'electrons'], text: "Electrons are super-light particles with a negative (−) charge. They live around the nucleus in 'shells'. The electrons in the outer shell decide how an element reacts with others.", next: ['What is an electron shell?', 'What is an ion?'] },
  { keys: ['nucleus', 'nuclei'], text: 'The nucleus is the tiny, heavy centre of an atom. It holds the protons and neutrons. If an atom were as big as a football stadium, the nucleus would be a pea in the middle!' },
  { keys: ['electron shell', 'electron shells', 'shell', 'shells', 'energy level', 'energy levels', 'orbit', 'orbital', 'orbitals'], text: 'Electrons are arranged in layers called shells. The first shell holds up to 2 electrons and the next holds up to 8. Atoms are most settled when their outer shell is full. Try it in the Atom Builder!' },
  { keys: ['valence', 'outer electrons', 'outer shell'], text: 'Valence electrons are the ones in the outer shell. They are the electrons an atom shares, gives away or takes when it joins with other atoms, so they decide how the element behaves.' },
  { keys: ['isotope', 'isotopes'], text: 'Isotopes are versions of the same element with different numbers of neutrons. Carbon-12 and carbon-14 are both carbon (6 protons), but carbon-14 has 2 extra neutrons.' },
  { keys: ['ion', 'ions', 'charged atom'], text: 'An ion is an atom that has gained or lost electrons, so it has a charge. Lose electrons → positive ion. Gain electrons → negative ion.' },
  { keys: ['atomic number'], text: 'The atomic number is the number of protons in an atom. It is the big counting number on each tile: hydrogen is 1, helium is 2, all the way up to oganesson at 118.' },
  { keys: ['atomic mass', 'atomic weight', 'mass number', 'how heavy is an atom'], text: 'Atomic mass tells you how heavy an atom is. It is roughly the number of protons plus the number of neutrons, because electrons weigh almost nothing.' },
  { keys: ['how small', 'how big is an atom', 'size of an atom', 'see an atom', 'see atoms'], text: 'Atoms are incredibly small. About five million of them side by side would fit across the full stop at the end of this sentence. You need a very special microscope to see them.' },
  { keys: ['quark', 'quarks', 'smaller than an atom', 'inside a proton'], text: 'Protons and neutrons are made of even tinier bits called quarks – three in each. As far as anyone knows, quarks and electrons are not made of anything smaller.' },
  { keys: ['empty space', 'mostly empty'], text: 'Atoms are mostly empty space! Nearly all the weight is in the tiny nucleus, and the electrons whizz around far away from it.' },

  // ----- elements, compounds, mixtures -----
  { keys: ['what is an element', 'what are elements', 'whats an element', 'what is a chemical element'], text: 'An element is a substance made of only one kind of atom. Gold is only gold atoms; oxygen is only oxygen atoms. There are 118 elements, and everything in the universe is built from them.', next: ['What is a compound?', 'How many elements are there?'] },
  { keys: ['compound', 'compounds'], text: 'A compound is two or more different elements joined together by chemical bonds. Water is a compound of hydrogen and oxygen. A compound can be totally different from the elements in it.', next: ['What is a mixture?', 'What is water made of?'] },
  { keys: ['mixture', 'mixtures'], text: 'A mixture is different things mixed together but not chemically joined, so they can be separated again. Air, sea water and trail mix are all mixtures.', next: ['What is a solution?'] },
  { keys: ['molecule', 'molecules'], text: 'A molecule is two or more atoms joined together. Water (H₂O) is a molecule made of 2 hydrogen atoms and 1 oxygen atom.' },
  { keys: ['difference between an element and a compound', 'element and a compound', 'element or compound', 'compound and a mixture', 'compound or mixture', 'element compound mixture'], text: 'An element has one kind of atom (gold). A compound has different atoms chemically joined (water). A mixture has things mixed but not joined, so you can separate them (salty water).' },
  { keys: ['solution', 'solutions', 'dissolve', 'dissolves', 'dissolving', 'dissolved', 'solvent', 'solute', 'soluble'], text: 'When something dissolves, it breaks into pieces too small to see and spreads evenly through a liquid. Salt dissolves in water to make a solution. The salt is still there – that is why the sea tastes salty.' },
  { keys: ['formula', 'chemical formula', 'what do the little numbers mean', 'small numbers'], text: 'A chemical formula is a short way to write what a substance is made of. H₂O means 2 hydrogen atoms and 1 oxygen atom. The little number tells you how many of the atom before it.' },
  { keys: ['alloy', 'alloys'], text: 'An alloy is a metal mixed with other elements to make it better. Steel is iron with carbon, bronze is copper with tin, and brass is copper with zinc.' },
  { keys: ['allotrope', 'allotropes'], text: 'Allotropes are different forms of the same element. Diamond and graphite are both pure carbon, with the atoms arranged in different ways.' },
  { keys: ['pure substance', 'pure'], text: 'A pure substance is made of just one thing – one element or one compound. Pure water is only water molecules. Tap water is not quite pure: it has tiny amounts of minerals in it.' },

  // ----- the periodic table -----
  { keys: ['periodic table', 'how is the table organised', 'how is the table organized', 'how does the table work', 'why is it called periodic'], text: 'The periodic table lines up all 118 elements in order of how many protons they have. Rows are called periods and columns are called groups. Elements in the same group often behave in similar ways – like a family!', next: ['What is a group?', 'Who made the periodic table?'] },
  { keys: ['who made the periodic table', 'who invented the periodic table', 'who created the periodic table', 'mendeleev', 'who discovered the periodic table'], text: 'A Russian chemist called Dmitri Mendeleev made the first periodic table in 1869. He left gaps for elements nobody had found yet and predicted what they would be like – and he was right!' },
  { keys: ['how many elements', 'number of elements'], text: 'There are 118 known elements. About 94 are found in nature; the rest have only been made by scientists, a few atoms at a time.' },
  { keys: ['group', 'groups', 'column', 'columns', 'family', 'families'], text: 'Groups are the columns of the periodic table (1 to 18). Elements in the same group have the same number of outer electrons, so they often act alike.' },
  { keys: ['period', 'periods', 'row', 'rows'], text: 'Periods are the rows of the periodic table. The period number tells you how many electron shells an element’s atoms have.' },
  { keys: ['symbol', 'symbols', 'why is gold au', 'why is iron fe', 'why is sodium na', 'latin name', 'latin names', 'why do some symbols'], text: 'Every element has a one- or two-letter symbol. Some come from old Latin names: gold is Au (aurum), iron is Fe (ferrum), sodium is Na (natrium), silver is Ag (argentum) and lead is Pb (plumbum).' },
  { keys: ['alkali metal', 'alkali metals', 'group 1', 'react with water', 'reacts with water'], text: 'The alkali metals are group 1: lithium, sodium, potassium, rubidium, caesium and francium. They are soft, shiny and so reactive that they fizz or even burst into flame in water, so they are stored under oil.' },
  { keys: ['alkaline earth', 'group 2'], text: 'The alkaline earth metals are group 2: beryllium, magnesium, calcium, strontium, barium and radium. Calcium builds your bones and teeth, and magnesium burns with a dazzling white light.' },
  { keys: ['halogen', 'halogens', 'group 17'], text: 'The halogens are group 17: fluorine, chlorine, bromine, iodine and astatine. They are very reactive nonmetals, and they make salts when they join with metals.' },
  { keys: ['noble gas', 'noble gases', 'group 18', 'inert gas', 'inert gases'], text: "Noble gases (helium, neon, argon, krypton, xenon, radon) have full outer electron shells, so they hardly ever react. That makes them calm and 'noble'!" },
  { keys: ['transition metal', 'transition metals'], text: 'Transition metals fill the middle of the table. They are tough, shiny metals like iron, copper, silver and gold, and many of them make brightly coloured compounds.' },
  { keys: ['lanthanide', 'lanthanides', 'rare earth', 'rare earths', 'actinide', 'actinides', 'bottom two rows', 'rows at the bottom'], text: 'The two rows at the bottom are the lanthanides and actinides. They really belong inside rows 6 and 7, and are pulled out so the table is not too wide. Lanthanides make strong magnets; actinides, like uranium, are radioactive.' },
  { keys: ['metalloid', 'metalloids', 'semimetal', 'semiconductor', 'semiconductors'], text: 'Metalloids, like silicon and boron, are in between metals and nonmetals. Silicon carries electricity only a little, which makes it perfect for computer chips.' },
  { keys: ['metal and nonmetal', 'metals and nonmetals', 'difference between metals', 'nonmetal', 'nonmetals', 'non metal', 'non metals', 'what is a metal', 'what are metals', 'what makes a metal'], text: "Metals are usually shiny, bendy and good at carrying heat and electricity (like copper wires). Nonmetals are often gases or crumbly solids and don't carry electricity well (like oxygen or sulfur). Metalloids are in between!" },
  { keys: ['synthetic element', 'synthetic elements', 'man made element', 'man made elements', 'made in a lab', 'lab made', 'artificial element', 'how are new elements made', 'make new elements', 'newest element', 'newest elements', 'new elements'], text: 'The heaviest elements are not found in nature. Scientists make them by smashing lighter atoms together in huge machines. The four newest – nihonium, moscovium, tennessine and oganesson – were named in 2016.' },
  { keys: ['how are elements named', 'who names the elements', 'named after', 'how do elements get their names'], text: 'Elements are named after places (americium, californium), scientists (einsteinium, curium), myths (thorium, titanium) and properties. A group of scientists called IUPAC agrees each new name.' },
  { keys: ['reactive', 'reactivity', 'most reactive'], text: 'Reactivity is how eagerly an element joins with others. Fluorine is the most reactive nonmetal. Among metals, the alkali metals are the most reactive, and they get wilder as you go down the group.' },

  // ----- record breakers -----
  { keys: ['lightest element', 'lightest'], text: 'Hydrogen is the lightest element. Its atoms have just one proton and one electron.' },
  { keys: ['heaviest element', 'heaviest'], text: 'Oganesson, element 118, has the heaviest atoms ever made. The heaviest element found in nature in useful amounts is uranium, element 92.' },
  { keys: ['densest element', 'densest', 'most dense'], text: 'Osmium is the densest element. A lump the size of a football would weigh about as much as two grown-up men!' },
  { keys: ['highest melting point', 'hardest to melt'], text: 'Tungsten has the highest melting point of all the metals: about 3,400 °C. That is why it was used for the glowing wire in old light bulbs.' },
  { keys: ['liquid at room temperature', 'liquid elements', 'which elements are liquid'], text: 'Only two elements are liquid at room temperature: mercury, a silvery metal, and bromine, a red-brown nonmetal.' },
  { keys: ['most common element in the universe', 'most abundant element in the universe', 'universe made of', 'most common element', 'most abundant element'], text: 'Hydrogen is by far the most common element in the universe – about three quarters of all normal matter. Helium is second. On Earth’s surface, the most common is oxygen.' },
  { keys: ['earth made of', 'earths crust', 'crust', 'rocks made of', 'what is the earth made'], text: 'Earth’s crust is mostly oxygen (about 46%) and silicon (about 28%), joined together in rocks, then aluminium and iron. The centre of the Earth is mostly iron and nickel.' },
  { keys: ['human body', 'body made of', 'what am i made of', 'what are we made of', 'elements in my body', 'elements in the body', 'what are humans made of'], text: 'You are mostly oxygen, carbon, hydrogen and nitrogen – those four make up about 96% of you. Then come calcium in your bones and phosphorus, with small amounts of others like iron in your blood.' },
  { keys: ['sun made of', 'what is the sun made', 'stars made of', 'star made of', 'where do elements come from', 'where did elements come from', 'how were elements made', 'how are elements made', 'stardust', 'big bang'], text: 'The Sun is about three quarters hydrogen and one quarter helium. Stars squeeze light atoms together to make heavier ones, and exploding stars make the heaviest. Nearly every atom in you was made inside a star!' },
  { keys: ['rarest element', 'rarest'], text: 'Astatine is the rarest element found in nature. There are only about 25 grams of it in the whole of Earth’s crust at any moment – less than a small chocolate bar.' },
  { keys: ['first element', 'element number 1', 'element number one'], text: 'Hydrogen is the first element: number 1, with one proton.' },
  { keys: ['last element', 'final element', 'element 118'], text: 'Oganesson is the last element so far: number 118. Only a few atoms of it have ever been made.' },
  { keys: ['magnetic', 'magnet', 'magnets', 'magnetism'], text: 'Only a few elements are strongly magnetic at room temperature: iron, cobalt and nickel. The strongest magnets also use neodymium.' },
  { keys: ['conduct electricity', 'conducts electricity', 'conductor', 'conductors', 'conduct heat', 'insulator', 'insulators'], text: 'Metals conduct electricity because some of their electrons are free to move. Silver and copper are the best conductors. Materials that block electricity, like plastic and rubber, are called insulators.' },

  // ----- states of matter -----
  { keys: ['states of matter', 'state of matter', 'solid liquid gas', 'solids liquids and gases', 'three states'], text: 'Matter comes as a solid, a liquid or a gas. In a solid the particles are packed tight and only wiggle. In a liquid they slide past each other. In a gas they zoom about freely.', next: ['What is melting?', 'What is plasma?'] },
  { keys: ['what is a solid', 'solid', 'solids'], text: 'In a solid, the particles are packed closely together and can only wiggle on the spot. That is why a solid keeps its shape.' },
  { keys: ['what is a liquid', 'liquid', 'liquids'], text: 'In a liquid, the particles are close together but can slide past each other. That is why a liquid flows and takes the shape of its container.' },
  { keys: ['what is a gas', 'gas', 'gases'], text: 'In a gas, the particles are far apart and zoom around in all directions. A gas spreads out to fill any space it is in.' },
  { keys: ['plasma', 'fourth state'], text: 'Plasma is the fourth state of matter: a gas so hot or so energised that electrons are torn off its atoms. Lightning, neon signs and the Sun are plasma.' },
  { keys: ['melt', 'melts', 'melting', 'melting point', 'freeze', 'freezes', 'freezing', 'freezing point'], text: 'Melting is a solid turning into a liquid when it warms up; freezing is the reverse. Ice melts at 0 °C. Heat makes the particles jiggle until they break free of their places.' },
  { keys: ['boil', 'boils', 'boiling', 'boiling point', 'evaporate', 'evaporates', 'evaporation', 'evaporating'], text: 'Boiling and evaporating both turn a liquid into a gas. Water boils at 100 °C, but a puddle can evaporate slowly even on a cool day as the fastest particles escape.' },
  { keys: ['condense', 'condenses', 'condensation', 'condensing'], text: 'Condensation is a gas cooling into a liquid. The water drops on a cold window or a cold drink are water vapour from the air that has condensed.' },
  { keys: ['sublimation', 'sublime', 'sublimes'], text: 'Sublimation is a solid turning straight into a gas without melting first. Dry ice (frozen carbon dioxide) does this, which makes spooky fog.' },
  { keys: ['density', 'dense', 'float', 'floats', 'floating', 'sink', 'sinks', 'sinking', 'why does ice float'], text: 'Density is how much stuff is packed into a space. Things less dense than water float; denser things sink. Ice floats because water spreads out a little when it freezes.' },
  { keys: ['water cycle', 'rain', 'clouds', 'cloud'], text: 'In the water cycle, the Sun evaporates water from seas and lakes, the vapour cools and condenses into clouds, and it falls as rain. The same water goes round and round.' },
  { keys: ['temperature', 'heat', 'hot and cold', 'what is heat'], text: 'Temperature tells you how fast the particles in something are jiggling. Hotter means faster. Heat is energy moving from something hot to something cooler.' },
  { keys: ['absolute zero', 'coldest'], text: 'Absolute zero is the coldest anything can be: −273.15 °C. At that temperature particles almost stop moving. Helium is the only element that stays liquid nearly all the way down.' },

  { keys: ['sea water', 'seawater', 'salty', 'why is the sea salty', 'ocean', 'oceans', 'the sea'], text: 'Sea water is water with salts dissolved in it, mostly sodium chloride. Rain slowly washes tiny amounts of salt out of rocks and rivers carry it to the sea. When sea water evaporates, the salt stays behind.' },

  // ----- reactions -----
  { keys: ['chemical reaction', 'chemical reactions', 'reaction', 'reactions', 'react', 'reacts', 'what happens when things react'], text: 'In a chemical reaction, atoms swap partners and make new substances. No atoms are made or destroyed – they are just rearranged. Signs of a reaction are bubbles, a colour change, heat or light.', next: ['What is burning?', 'What is a catalyst?'] },
  { keys: ['chemical change', 'physical change', 'chemical and physical', 'physical and chemical'], text: 'A physical change alters how something looks but not what it is, like ice melting. A chemical change makes something new, like wood burning to ash. Physical changes can usually be undone.' },
  { keys: ['burn', 'burns', 'burning', 'combustion', 'fire', 'flame', 'flames', 'what is fire'], text: 'Burning is a fast reaction between a fuel and oxygen that gives out heat and light. Fire needs three things: fuel, oxygen and heat. Take one away and it goes out.' },
  { keys: ['why does iron rust', 'rusting', 'rusts', 'corrosion', 'corrode', 'tarnish'], text: 'Rusting is a slow reaction: iron joins with oxygen when water is around, making flaky orange-brown iron oxide. Paint or a coat of zinc keeps the air and water out.' },
  { keys: ['oxidation', 'oxidise', 'oxidize', 'oxidised', 'oxidized', 'oxide', 'oxides'], text: 'Oxidation is when a substance joins with oxygen. Rusting and burning are both oxidation. The compound that forms is called an oxide, like iron oxide (rust).' },
  { keys: ['catalyst', 'catalysts', 'enzyme', 'enzymes'], text: 'A catalyst speeds up a reaction without being used up itself. Cars use platinum catalysts to clean their exhaust, and your body uses catalysts called enzymes to digest food.' },
  { keys: ['exothermic', 'endothermic', 'gives out heat', 'takes in heat', 'energy in reactions'], text: 'Reactions that give out heat are exothermic, like burning. Reactions that take heat in are endothermic, so they feel cold – that is how instant ice packs work.' },
  { keys: ['conservation of mass', 'atoms destroyed', 'atoms disappear', 'can atoms be destroyed', 'can you destroy an atom'], text: 'In a chemical reaction no atoms are lost or made. Count the atoms before and after and the numbers match. That is why the Chem Lab shows an atom-count table.' },
  { keys: ['balance', 'balanced', 'balancing', 'balanced equation', 'chemical equation', 'equation', 'equations'], text: 'A chemical equation shows what goes in and what comes out. It is balanced when each side has the same number of each kind of atom, like 2 H₂ + O₂ → 2 H₂O: four hydrogen and two oxygen on both sides.' },
  { keys: ['reactant', 'reactants', 'product', 'products'], text: 'Reactants are the substances you start with in a reaction. Products are the new substances that are made.' },
  { keys: ['photosynthesis', 'how do plants make food', 'plants make oxygen', 'how do plants'], text: 'Photosynthesis is how plants make food. Using sunlight, they turn carbon dioxide and water into sugar and give off oxygen: 6 CO₂ + 6 H₂O → C₆H₁₂O₆ + 6 O₂.' },
  { keys: ['respiration', 'why do we breathe', 'why do we need oxygen', 'breathe', 'breathing'], text: 'Your body uses oxygen to release the energy in food. It is like very slow, gentle burning: sugar and oxygen become carbon dioxide and water, which you breathe out.' },
  { keys: ['firework', 'fireworks', 'flame test', 'flame colour', 'flame colours', 'flame color', 'flame colors'], text: 'Fireworks get their colours from metal compounds: strontium glows red, sodium yellow, barium green and copper blue. Each element gives off its own colour of light when it gets hot. Fireworks are only for trained experts.' },
  { keys: ['explode', 'explosion', 'explosions', 'why do things explode'], text: 'An explosion is a reaction that makes a lot of hot gas very suddenly, so it pushes outward with a bang. That is exactly why explosive chemicals are only handled by trained experts.' },
  { keys: ['electrolysis', 'split water', 'splitting water'], text: 'Electrolysis uses electricity to pull a compound apart. Passing electricity through water splits it into hydrogen gas and oxygen gas – the reverse of making water.' },
  { keys: ['battery', 'batteries', 'how do batteries work'], text: 'A battery holds chemicals that react and push electrons around a circuit. Many use lithium, because it is light and gives up electrons easily.', next: ['Tell me about lithium'] },
  { keys: ['cooking', 'baking', 'why do cakes rise', 'bread rise', 'cook an egg', 'toast'], text: 'Cooking is chemistry! Heat changes the molecules in food, so an egg turns solid and bread turns brown. Cakes rise because baking soda or baking powder gives off bubbles of carbon dioxide.' },
  { keys: ['glow', 'glow in the dark', 'glow stick', 'glow sticks', 'neon sign', 'neon signs', 'why do things glow'], text: 'Things glow when their atoms get extra energy and give it back as light. In a neon sign, electricity energises the gas. In a glow stick, a chemical reaction does it.' },

  // ----- bonds -----
  { keys: ['bond', 'bonds', 'bonding', 'chemical bond', 'how do atoms join', 'how do atoms stick', 'why do atoms join'], text: 'A chemical bond is what holds atoms together. Atoms bond by sharing electrons or by giving and taking them, so that their outer shells end up full.', next: ['What is an ionic bond?', 'What is a covalent bond?'] },
  { keys: ['ionic bond', 'ionic bonds', 'ionic'], text: 'In an ionic bond, one atom gives electrons to another. Both become charged ions, and opposite charges stick together. Table salt is ionic: sodium gives an electron to chlorine.' },
  { keys: ['covalent bond', 'covalent bonds', 'covalent'], text: 'In a covalent bond, atoms share electrons. Water is covalent: the oxygen atom shares electrons with two hydrogen atoms.' },
  { keys: ['metallic bond', 'metallic bonding', 'why are metals shiny', 'why do metals bend'], text: 'In a metal, the outer electrons drift freely between all the atoms, like a sea. That is why metals conduct electricity, shine, and can be bent without snapping.' },
  { keys: ['crystal', 'crystals'], text: 'A crystal is a solid whose particles are stacked in a neat, repeating pattern. Salt, sugar, snowflakes and diamonds are all crystals.' },

  // ----- acids and bases -----
  { keys: ['acid', 'acids', 'acidic', 'sour'], text: 'Acids taste sour and can react with metals. Lemon juice and vinegar are weak acids. Your stomach makes a strong acid to help digest food. Strong acids burn, so only experts handle them.', next: ['What is a base?', 'What is pH?'] },
  { keys: ['base', 'bases', 'alkali', 'alkalis', 'alkaline'], text: 'A base is the chemical opposite of an acid. Bases feel slippery and taste bitter – soap and baking soda are weak bases. A base that dissolves in water is called an alkali.' },
  { keys: ['ph', 'ph scale', 'indicator', 'litmus', 'red cabbage'], text: 'The pH scale measures how acidic or basic something is, from 0 to 14. Below 7 is an acid, 7 is neutral like pure water, and above 7 is a base. Indicators change colour to show the pH.' },
  { keys: ['neutralise', 'neutralize', 'neutralisation', 'neutralization', 'acid and base', 'acid and a base', 'acid meets a base'], text: 'When an acid meets a base they cancel each other out. That is called neutralisation, and it makes a salt and water.' },
  { keys: ['acid rain'], text: 'Acid rain is rain made slightly acidic by gases from burning fuels. Over time it can damage trees, lakes and stone buildings.' },

  // ----- radioactivity -----
  { keys: ['radioactive', 'radioactivity', 'radiation'], text: 'Radioactive atoms have an unstable nucleus that slowly breaks apart and gives off energy (radiation). Scientists use it for power, medicine and dating old things – but it can be harmful, so only trained experts handle it.' },
  { keys: ['half life', 'halflife', 'carbon dating'], text: 'A half-life is the time it takes for half of a radioactive substance to break down. Carbon-14 has a half-life of about 5,730 years, which lets scientists work out the age of old bones and wood.' },
  { keys: ['nuclear', 'fission', 'fusion', 'nuclear power', 'nuclear energy', 'how does the sun shine'], text: 'Fission splits a heavy nucleus, like uranium, in two; power stations use it. Fusion squeezes light nuclei together; that is how the Sun shines, turning hydrogen into helium.' },

  // ----- big picture -----
  { keys: ['what is chemistry', 'chemistry', 'what do chemists do', 'chemist', 'chemists'], text: 'Chemistry is the science of what everything is made of and how it changes. Chemists invent medicines, materials, cleaner fuels and even new elements.' },
  { keys: ['matter', 'what is matter', 'what is everything made of', 'everything made of'], text: 'Matter is anything that takes up space and has weight: solids, liquids and gases. All matter is made of atoms.' },
  { keys: ['lab safety', 'safety rules', 'safe in a lab', 'goggles', 'experiment', 'experiments'], text: 'Real experiments need a trained grown-up, safety goggles and a proper lab. Never taste, sniff or mix chemicals yourself. You can try reactions safely in the Chem Lab simulations here.' },
  { keys: ['greenhouse', 'global warming', 'climate change', 'climate'], text: 'Gases such as carbon dioxide and methane trap some of the Sun’s heat, like a blanket around the Earth. Burning fossil fuels adds more of them, which is warming the planet.' },
  { keys: ['recycle', 'recycling'], text: 'Atoms never wear out, so metals such as aluminium can be melted and used again and again. Recycling a can takes far less energy than making a new one from rock.' },
  { keys: ['mole', 'avogadro'], text: 'A mole is the chemist’s counting word, like a dozen but enormously bigger: about 602 thousand billion billion particles. It lets chemists count atoms by weighing them.' },
  { keys: ['antimatter'], text: 'Antimatter is like a mirror image of matter, with the charges swapped. When matter and antimatter meet, both vanish in a flash of energy. Scientists can only make tiny amounts.' },
];
