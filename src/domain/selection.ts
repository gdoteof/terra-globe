import type { Feature, FeatureId, ProgressRecord } from './types';

/** Weights by Leitner box; unseen items sit between box 0 and box 1. */
const BOX_WEIGHT = [16, 8, 4, 2, 1] as const;
const UNSEEN_WEIGHT = 8;
const STALE_MS = 7 * 24 * 60 * 60 * 1000;
const STALE_MULTIPLIER = 1.5;
const MAX_WEIGHT = 24;
const ANTI_REPEAT_WINDOW = 5;

function weightOf(record: ProgressRecord | undefined, now: number): number {
  if (!record) return UNSEEN_WEIGHT;
  let w: number = BOX_WEIGHT[record.box];
  if (now - record.lastAskedAt > STALE_MS) w *= STALE_MULTIPLIER;
  return Math.min(w, MAX_WEIGHT);
}

/**
 * Weighted-random draw favoring weak/unseen/stale items.
 * Excludes the last few asked unless that would leave too few candidates.
 */
export function selectTarget(
  pool: Feature[],
  progress: Map<FeatureId, ProgressRecord>,
  askedRecently: FeatureId[],
  rng: () => number,
  now: number,
): Feature {
  if (pool.length === 0) throw new Error('selectTarget: empty pool');
  const recent = new Set(askedRecently.slice(-ANTI_REPEAT_WINDOW));
  let candidates = pool.filter((f) => !recent.has(f.id));
  if (candidates.length < 3) candidates = pool;

  const weights = candidates.map((f) => weightOf(progress.get(f.id), now));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll < 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

/** Leitner-lite transition applied on every answer. */
export function nextBox(box: ProgressRecord['box'], correct: boolean): ProgressRecord['box'] {
  return correct ? ((Math.min(box + 1, 4) as ProgressRecord['box'])) : 0;
}
