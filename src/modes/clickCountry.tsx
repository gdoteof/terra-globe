import { labelModeFor, type ModeDefinition } from './types';

export const clickCountryMode: ModeDefinition<'click'> = {
  id: 'click',
  label: 'Find it',
  description: 'Spin the globe and tap the named country',
  buildQuestion(target) {
    return { mode: 'click', target };
  },
  checkAnswer(q, a) {
    return { correct: a.featureId === q.target.id };
  },
  // the globe itself is the input
  InputComponent: null,
  globeDirectives(q, config) {
    return {
      highlightedId: null, // that's the puzzle
      flyToId: null,
      labelMode: labelModeFor(config),
      suppressLabels: q.target.geometry.type === 'iso-a2' ? [q.target.geometry.code] : [],
    };
  },
  promptText(q) {
    return `Find ${q.target.name}`;
  },
};
