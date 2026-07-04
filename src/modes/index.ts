import type { QuizMode } from '../domain/types';
import type { ModeDefinition } from './types';
import { multipleChoiceMode } from './multipleChoice';
import { fillInMode } from './fillIn';
import { clickCountryMode } from './clickCountry';

export const MODES: { [M in QuizMode]: ModeDefinition<M> } = {
  'multiple-choice': multipleChoiceMode,
  'fill-in': fillInMode,
  click: clickCountryMode,
};

export const MODE_LIST = Object.values(MODES) as ModeDefinition[];
