import { describe, expect, it } from 'vitest';
import { editDistance, matchAnswer, normalizeAnswer } from './matching';
import type { Feature } from './types';

const country = (id: string, name: string, aliases: string[] = []): Feature => ({
  id: `country:${id}`,
  kind: 'country',
  name,
  aliases,
  region: 'africa',
  geometry: { type: 'iso-a2', code: id.toUpperCase() },
  tier: 2,
});

const niger = country('ne', 'Niger');
const nigeria = country('ng', 'Nigeria');
const iran = country('ir', 'Iran');
const iraq = country('iq', 'Iraq');
const chad = country('td', 'Chad');
const kyrgyzstan = country('kg', 'Kyrgyzstan');
const ivoryCoast = country('ci', 'Ivory Coast', ["côte d'ivoire", "cote d'ivoire"]);
const usa = country('us', 'United States', ['usa', 'united states of america', 'america']);
const gambia = country('gm', 'Gambia', ['the gambia']);

const pool = [niger, nigeria, iran, iraq, chad, kyrgyzstan, ivoryCoast, usa, gambia];

describe('normalizeAnswer', () => {
  it('strips diacritics, case, punctuation', () => {
    expect(normalizeAnswer("CÔTE D'IVOIRE")).toBe('cote d ivoire');
    expect(normalizeAnswer('  São   Tomé ')).toBe('sao tome');
  });
  it('strips a leading "the"', () => {
    expect(normalizeAnswer('The Gambia')).toBe('gambia');
    expect(normalizeAnswer('the netherlands')).toBe('netherlands');
  });
});

describe('editDistance', () => {
  it('counts a transposition as one edit', () => {
    expect(editDistance('sweeden', 'sweden')).toBe(1);
    expect(editDistance('abcd', 'abdc')).toBe(1);
    expect(editDistance('unitde states', 'united states')).toBe(1);
  });
});

describe('matchAnswer', () => {
  it('accepts exact and alias matches', () => {
    expect(matchAnswer('Niger', niger, pool)).toEqual({ correct: true });
    expect(matchAnswer("côte d'ivoire", ivoryCoast, pool)).toEqual({ correct: true });
    expect(matchAnswer('USA', usa, pool)).toEqual({ correct: true });
    expect(matchAnswer('The Gambia', gambia, pool)).toEqual({ correct: true });
  });

  it('rejects near names of short countries (Iran vs Iraq, Chad)', () => {
    expect(matchAnswer('Iraq', iran, pool).correct).toBe(false);
    expect(matchAnswer('Irak', iran, pool).correct).toBe(false); // len 4 => exact only
    expect(matchAnswer('Chas', chad, pool).correct).toBe(false);
  });

  it('never lets Nigeria match Niger (ambiguity guard + threshold)', () => {
    expect(matchAnswer('Nigeria', niger, pool).correct).toBe(false);
    expect(matchAnswer('Niger', nigeria, pool).correct).toBe(false);
  });

  it('accepts typos in long names as near-misses', () => {
    expect(matchAnswer('kirgyzstan', kyrgyzstan, pool)).toEqual({ correct: true, nearMiss: true });
    expect(matchAnswer('kyrgyzstan', kyrgyzstan, pool)).toEqual({ correct: true });
  });

  it('rejects empty/garbage input', () => {
    expect(matchAnswer('   ', niger, pool).correct).toBe(false);
    expect(matchAnswer('xx', niger, pool).correct).toBe(false);
  });
});
