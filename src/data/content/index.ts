import type { ElementContent } from '../types';
import { CONTENT_PART1 } from './part1';
import { CONTENT_PART2 } from './part2';
import { CONTENT_PART3 } from './part3';

export const CONTENT: Record<number, ElementContent> = { ...CONTENT_PART1, ...CONTENT_PART2, ...CONTENT_PART3 };
