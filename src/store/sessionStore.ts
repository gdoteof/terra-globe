import { create } from 'zustand';
import type {
  Answer,
  Feature,
  FeatureId,
  ProgressRecord,
  Question,
  QuestionResult,
  QuizConfig,
} from '../domain/types';
import { selectTarget } from '../domain/selection';
import { MODES } from '../modes';
import type { ModeDefinition } from '../modes/types';
import { contentSource, progressStore } from '../services';
import { FEEDBACK_CORRECT_MS, FEEDBACK_WRONG_MS } from '../app/constants';

export type Phase = 'menu' | 'asking' | 'answered' | 'summary';

interface SessionState {
  phase: Phase;
  config: QuizConfig | null;
  pool: Feature[];
  progress: Map<FeatureId, ProgressRecord>;
  questionIndex: number;
  question: Question | null;
  lastAnswer: Answer | null;
  lastResult: QuestionResult | null;
  lastNearMiss: boolean;
  score: number;
  streak: number;
  bestStreak: number;
  results: QuestionResult[];
  asked: FeatureId[];
  startedAt: number;

  startSession(config: QuizConfig, explicitPool?: Feature[]): Promise<void>;
  submitAnswer(a: Answer): void;
  nextQuestion(): void;
  backToMenu(): void;
}

const rng = Math.random;
let advanceTimer: ReturnType<typeof setTimeout> | null = null;

function buildQuestion(
  config: QuizConfig,
  pool: Feature[],
  progress: Map<FeatureId, ProgressRecord>,
  asked: FeatureId[],
): Question {
  const target = selectTarget(pool, progress, asked, rng, Date.now());
  const mode = MODES[config.mode] as ModeDefinition;
  return mode.buildQuestion(target, pool, rng);
}

export const useSessionStore = create<SessionState>((set, get) => ({
  phase: 'menu',
  config: null,
  pool: [],
  progress: new Map(),
  questionIndex: 0,
  question: null,
  lastAnswer: null,
  lastResult: null,
  lastNearMiss: false,
  score: 0,
  streak: 0,
  bestStreak: 0,
  results: [],
  asked: [],
  startedAt: 0,

  async startSession(config, explicitPool) {
    if (advanceTimer) clearTimeout(advanceTimer);
    const pool =
      explicitPool ?? (await contentSource.getFeatures({ kinds: config.kinds, region: config.region }));
    if (pool.length < 2) return; // nothing sensible to quiz
    const progress = await progressStore.getAll();
    const question = buildQuestion(config, pool, progress, []);
    set({
      phase: 'asking',
      config,
      pool,
      progress,
      questionIndex: 0,
      question,
      lastAnswer: null,
      lastResult: null,
      lastNearMiss: false,
      score: 0,
      streak: 0,
      bestStreak: 0,
      results: [],
      asked: [question.target.id],
      startedAt: Date.now(),
    });
  },

  submitAnswer(answer) {
    const { phase, question, pool, progress } = get();
    if (phase !== 'asking' || !question || answer.mode !== question.mode) return;

    const mode = MODES[question.mode] as ModeDefinition;
    const verdict = (
      mode.checkAnswer as (q: Question, a: Answer, pool: Feature[]) => { correct: boolean; nearMiss?: boolean }
    )(question, answer, pool);

    const result: QuestionResult = {
      featureId: question.target.id,
      correct: verdict.correct,
      answeredAt: Date.now(),
      nearMiss: verdict.nearMiss,
    };
    void progressStore.record(result);
    // keep the in-session view of progress current for selection weighting
    const prev = progress.get(result.featureId);
    const updated = new Map(progress);
    updated.set(result.featureId, {
      featureId: result.featureId,
      attempts: (prev?.attempts ?? 0) + 1,
      correct: (prev?.correct ?? 0) + (result.correct ? 1 : 0),
      box: result.correct ? ((Math.min((prev?.box ?? 0) + 1, 4)) as ProgressRecord['box']) : 0,
      lastAskedAt: result.answeredAt,
    });

    set((s) => {
      const streak = verdict.correct ? s.streak + 1 : 0;
      return {
        phase: 'answered',
        progress: updated,
        lastAnswer: answer,
        lastResult: result,
        lastNearMiss: verdict.nearMiss ?? false,
        score: s.score + (verdict.correct ? 1 : 0),
        streak,
        bestStreak: Math.max(s.bestStreak, streak),
        results: [...s.results, result],
      };
    });

    advanceTimer = setTimeout(
      () => get().nextQuestion(),
      verdict.correct ? FEEDBACK_CORRECT_MS : FEEDBACK_WRONG_MS,
    );
  },

  nextQuestion() {
    if (advanceTimer) {
      clearTimeout(advanceTimer);
      advanceTimer = null;
    }
    const { phase, config, pool, progress, questionIndex, asked } = get();
    if (phase !== 'answered' || !config) return;
    if (questionIndex + 1 >= config.questionCount) {
      set({ phase: 'summary', question: null });
      return;
    }
    const question = buildQuestion(config, pool, progress, asked);
    set({
      phase: 'asking',
      questionIndex: questionIndex + 1,
      question,
      lastAnswer: null,
      lastResult: null,
      lastNearMiss: false,
      asked: [...asked, question.target.id],
    });
  },

  backToMenu() {
    if (advanceTimer) clearTimeout(advanceTimer);
    set({
      phase: 'menu',
      config: null,
      question: null,
      lastAnswer: null,
      lastResult: null,
      lastNearMiss: false,
    });
  },
}));
