import type { ComponentType } from 'react';
import type { Answer, Feature, Question, QuizConfig, QuizMode } from '../domain/types';
import type { LabelMode } from '../globe/GlobeProps';

/** What a mode tells the globe to do for the current question (alpha-2 codes). */
export interface GlobeDirectives {
  highlightedId: string | null;
  flyToId: string | null;
  labelMode: LabelMode;
  suppressLabels: string[];
}

export interface InputProps {
  question: Question;
  answered: { answer: Answer; correct: boolean } | null;
  onSubmit: (a: Answer) => void;
}

export interface ModeDefinition<M extends QuizMode = QuizMode> {
  id: M;
  label: string;
  description: string;
  buildQuestion(target: Feature, pool: Feature[], rng: () => number): Extract<Question, { mode: M }>;
  checkAnswer(
    q: Extract<Question, { mode: M }>,
    a: Extract<Answer, { mode: M }>,
    pool: Feature[],
  ): { correct: boolean; nearMiss?: boolean };
  /** null when the globe itself is the input (click mode). */
  InputComponent: ComponentType<InputProps> | null;
  globeDirectives(q: Extract<Question, { mode: M }>, config: QuizConfig): GlobeDirectives;
  promptText(q: Extract<Question, { mode: M }>): string;
}

/** v1 quiz content is countries; their geometry ref carries the globe id. */
export function globeId(f: Feature): string {
  return f.geometry.type === 'iso-a2' ? f.geometry.code : '';
}

export function labelModeFor(config: QuizConfig): LabelMode {
  return config.labels === 'some' ? 'neighbors' : config.labels;
}
