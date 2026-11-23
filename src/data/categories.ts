import type { CategoryId } from './types';

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  short: string;
  color: string;
  /** Kid-friendly one-line description */
  blurb: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'alkali-metal', label: 'Alkali metals', short: 'Alkali', color: '#FF1493', blurb: 'Soft, shiny metals that react super strongly with water.' },
  { id: 'alkaline-earth-metal', label: 'Alkaline earth metals', short: 'Alk. earth', color: '#FF8A00', blurb: 'Shiny metals found in rocks, shells and bones.' },
  { id: 'transition-metal', label: 'Transition metals', short: 'Transition', color: '#00F5FF', blurb: 'Tough, shiny metals like iron, copper and gold.' },
  { id: 'post-transition-metal', label: 'Post-transition metals', short: 'Post-trans.', color: '#5AA9FF', blurb: 'Softer metals like aluminum, tin and lead.' },
  { id: 'metalloid', label: 'Metalloids', short: 'Metalloid', color: '#B6FF00', blurb: 'Half metal, half nonmetal – great for computer chips.' },
  { id: 'reactive-nonmetal', label: 'Reactive nonmetals', short: 'Nonmetal', color: '#FFE45C', blurb: 'Not metals! Includes the oxygen we breathe and the carbon in living things.' },
  { id: 'noble-gas', label: 'Noble gases', short: 'Noble gas', color: '#C266FF', blurb: 'Calm gases that almost never react. Some glow in neon signs.' },
  { id: 'lanthanide', label: 'Lanthanides', short: 'Lanthanide', color: '#FF7FD1', blurb: 'Metals used in strong magnets, screens and lasers.' },
  { id: 'actinide', label: 'Actinides', short: 'Actinide', color: '#FF5C5C', blurb: 'Radioactive metals, like uranium.' },
  { id: 'unknown', label: 'Unknown properties', short: 'Unknown', color: '#A8A8B8', blurb: 'Super-heavy lab-made elements – scientists are still finding out what they are like.' },
];

export const CATEGORY_BY_ID: Record<CategoryId, CategoryInfo> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, CategoryInfo>;
