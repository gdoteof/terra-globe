import { describe, expect, it } from 'vitest';
import { nextBox, selectTarget } from './selection';
import type { Feature, FeatureId, ProgressRecord } from './types';
import { mulberry32 } from '../lib/rng';

const NOW = 1_750_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

const country = (id: string): Feature => ({
  id: `country:${id}`,
  kind: 'country',
  name: id,
  aliases: [],
  region: 'africa',
  geometry: { type: 'iso-a2', code: id.toUpperCase() },
  tier: 2,
});

const record = (id: string, box: ProgressRecord['box'], lastAskedAt = NOW): ProgressRecord => ({
  featureId: `country:${id}`,
  attempts: 5,
  correct: 3,
  box,
  lastAskedAt,
});

function drawCounts(pool: Feature[], progress: Map<FeatureId, ProgressRecord>, n = 10_000) {
  const rng = mulberry32(42);
  const counts = new Map<FeatureId, number>();
  for (let i = 0; i < n; i++) {
    const f = selectTarget(pool, progress, [], rng, NOW);
    counts.set(f.id, (counts.get(f.id) ?? 0) + 1);
  }
  return counts;
}

describe('nextBox', () => {
  it('promotes on correct up to 4, resets to 0 on wrong', () => {
    expect(nextBox(0, true)).toBe(1);
    expect(nextBox(4, true)).toBe(4);
    expect(nextBox(3, false)).toBe(0);
  });
});

describe('selectTarget', () => {
  it('heavily favors struggling (box 0) over mastered (box 4)', () => {
    const pool = [country('aa'), country('bb')];
    const progress = new Map([
      ['country:aa', record('aa', 0)],
      ['country:bb', record('bb', 4)],
    ]);
    const counts = drawCounts(pool, progress);
    // expected ratio 16:1
    expect(counts.get('country:aa')! / counts.get('country:bb')!).toBeGreaterThan(10);
  });

  it('gives unseen items a solid share', () => {
    const pool = [country('aa'), country('bb')];
    const progress = new Map([['country:aa', record('aa', 4)]]); // bb unseen
    const counts = drawCounts(pool, progress);
    // 8 vs 1
    expect(counts.get('country:bb')! / counts.get('country:aa')!).toBeGreaterThan(5);
  });

  it('bumps stale mastered items', () => {
    const pool = [country('aa'), country('bb')];
    const progress = new Map([
      ['country:aa', record('aa', 4, NOW - 10 * DAY)], // stale: 1 * 1.5
      ['country:bb', record('bb', 4, NOW)], // fresh: 1
    ]);
    const counts = drawCounts(pool, progress);
    const ratio = counts.get('country:aa')! / counts.get('country:bb')!;
    expect(ratio).toBeGreaterThan(1.3);
    expect(ratio).toBeLessThan(1.8);
  });

  it('avoids the anti-repeat window when enough candidates remain', () => {
    const pool = ['aa', 'bb', 'cc', 'dd', 'ee'].map(country);
    const rng = mulberry32(7);
    for (let i = 0; i < 200; i++) {
      const picked = selectTarget(pool, new Map(), ['country:aa', 'country:bb'], rng, NOW);
      expect(['country:cc', 'country:dd', 'country:ee']).toContain(picked.id);
    }
  });

  it('relaxes the window rather than starving a tiny pool', () => {
    const pool = ['aa', 'bb'].map(country);
    const picked = selectTarget(pool, new Map(), ['country:aa', 'country:bb'], mulberry32(1), NOW);
    expect(pool.map((f) => f.id)).toContain(picked.id);
  });
});
