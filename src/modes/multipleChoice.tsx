import type { Feature } from '../domain/types';
import { shuffle } from '../lib/rng';
import { globeId, labelModeFor, type InputProps, type ModeDefinition } from './types';

/** Distractors: same kind, prefer same region, prefer nearby difficulty tier. */
function pickDistractors(target: Feature, pool: Feature[], rng: () => number): Feature[] {
  const others = pool.filter((f) => f.id !== target.id && f.kind === target.kind);
  const ranked = shuffle(others, rng).sort((a, b) => {
    const regionDiff = Number(b.region === target.region) - Number(a.region === target.region);
    if (regionDiff !== 0) return regionDiff;
    return Math.abs(a.tier - target.tier) - Math.abs(b.tier - target.tier);
  });
  return ranked.slice(0, 3);
}

function ChoiceButtons({ question, answered, onSubmit }: InputProps) {
  if (question.mode !== 'multiple-choice') return null;
  const chosenId = answered?.answer.mode === 'multiple-choice' ? answered.answer.featureId : null;
  return (
    <div className="choice-grid">
      {question.choices.map((c) => {
        const state = !answered
          ? 'idle'
          : c.id === question.target.id
            ? 'correct'
            : c.id === chosenId
              ? 'wrong'
              : 'faded';
        return (
          <button
            key={c.id}
            className={`choice choice--${state}`}
            disabled={!!answered}
            onClick={() => onSubmit({ mode: 'multiple-choice', featureId: c.id })}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}

export const multipleChoiceMode: ModeDefinition<'multiple-choice'> = {
  id: 'multiple-choice',
  label: 'Multiple choice',
  description: 'Pick the highlighted country from four options',
  buildQuestion(target, pool, rng) {
    return {
      mode: 'multiple-choice',
      target,
      choices: shuffle([target, ...pickDistractors(target, pool, rng)], rng),
    };
  },
  checkAnswer(q, a) {
    return { correct: a.featureId === q.target.id };
  },
  InputComponent: ChoiceButtons,
  globeDirectives(q, config) {
    const code = globeId(q.target);
    return {
      highlightedId: code,
      flyToId: code,
      labelMode: labelModeFor(config),
      suppressLabels: [code],
    };
  },
  promptText() {
    return 'Name the glowing country';
  },
};
