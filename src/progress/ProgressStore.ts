import type { FeatureId, ProgressRecord, QuestionResult } from '../domain/types';

/**
 * Async even though v1 is localStorage — this is the seam where a
 * backend-synced implementation slots in later.
 */
export interface ProgressStore {
  getAll(): Promise<Map<FeatureId, ProgressRecord>>;
  record(result: QuestionResult): Promise<void>;
  summary(): Promise<{ seen: number; mastered: number }>;
  reset(): Promise<void>;
}
