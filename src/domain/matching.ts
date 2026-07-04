import type { Feature } from './types';

/** Strip diacritics/punctuation/case/leading-"the" so "Côte d'Ivoire" ≡ "cote divoire". */
export function normalizeAnswer(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/^the\s+/, '');
}

/** Damerau–Levenshtein (optimal string alignment): transpositions cost 1. */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

/** Short names must be exact (Iran/Iraq, Chad); longer ones tolerate typos. */
function fuzzyThreshold(len: number): number {
  return len <= 4 ? 0 : len <= 7 ? 1 : 2;
}

function candidateStrings(f: Feature): string[] {
  return [normalizeAnswer(f.name), ...f.aliases.map(normalizeAnswer)];
}

export interface MatchResult {
  correct: boolean;
  nearMiss?: boolean;
}

export function matchAnswer(input: string, target: Feature, pool: Feature[]): MatchResult {
  const normalized = normalizeAnswer(input);
  if (!normalized) return { correct: false };

  const targets = candidateStrings(target);
  if (targets.includes(normalized)) return { correct: true };

  // Ambiguity guard: an exact name of a DIFFERENT feature is wrong, no matter
  // how close it is to the target ("Nigeria" when the answer is Niger).
  for (const other of pool) {
    if (other.id !== target.id && candidateStrings(other).includes(normalized)) {
      return { correct: false };
    }
  }

  for (const cand of targets) {
    if (editDistance(normalized, cand) <= fuzzyThreshold(cand.length)) {
      return { correct: true, nearMiss: true };
    }
  }
  return { correct: false };
}
