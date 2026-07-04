import type { FeatureId, ProgressRecord, QuestionResult } from '../domain/types';
import { nextBox } from '../domain/selection';
import type { ProgressStore } from './ProgressStore';

const KEY = 'geo.progress.v1';

export class LocalStorageProgressStore implements ProgressStore {
  private records: Map<FeatureId, ProgressRecord>;

  constructor(private storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>) {
    this.records = new Map();
    try {
      const raw = this.storage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<FeatureId, ProgressRecord>;
        this.records = new Map(Object.entries(parsed));
      }
    } catch {
      // corrupted store: start fresh rather than crash the app
    }
  }

  async getAll(): Promise<Map<FeatureId, ProgressRecord>> {
    return new Map(this.records);
  }

  async record(result: QuestionResult): Promise<void> {
    const prev = this.records.get(result.featureId);
    this.records.set(result.featureId, {
      featureId: result.featureId,
      attempts: (prev?.attempts ?? 0) + 1,
      correct: (prev?.correct ?? 0) + (result.correct ? 1 : 0),
      box: nextBox(prev?.box ?? 0, result.correct),
      lastAskedAt: result.answeredAt,
    });
    this.flush();
  }

  async summary(): Promise<{ seen: number; mastered: number }> {
    let mastered = 0;
    for (const r of this.records.values()) if (r.box === 4) mastered++;
    return { seen: this.records.size, mastered };
  }

  async reset(): Promise<void> {
    this.records.clear();
    this.storage.removeItem(KEY);
  }

  private flush(): void {
    this.storage.setItem(KEY, JSON.stringify(Object.fromEntries(this.records)));
  }
}
