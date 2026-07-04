export type FeatureKind = 'country' | 'capital' | 'river' | 'mountain-range' | 'bay';
export type FeatureId = string; // "country:fr", "capital:fr", "river:nile"

export type Region =
  | 'africa'
  | 'europe'
  | 'asia'
  | 'north-america'
  | 'south-america'
  | 'oceania'
  | 'middle-east';

/** How the globe locates/draws this feature. */
export type GeometryRef =
  | { type: 'iso-a2'; code: string } // countries
  | { type: 'point'; lat: number; lng: number } // capitals, peaks
  | { type: 'named'; dataset: string; key: string }; // rivers/ranges/bays

export interface Feature {
  id: FeatureId;
  kind: FeatureKind;
  name: string; // canonical display name: "Côte d'Ivoire"
  aliases: string[]; // accepted answers, pre-lowercased
  region: Region;
  geometry: GeometryRef;
  tier: 1 | 2 | 3; // 1 = France, 3 = Comoros
  parent?: FeatureId; // capital -> its country
}

export type QuizMode = 'multiple-choice' | 'fill-in' | 'click';
export type LabelVisibility = 'none' | 'some' | 'all';

export interface QuizConfig {
  mode: QuizMode;
  kinds: FeatureKind[];
  region: Region | 'all';
  labels: LabelVisibility;
  questionCount: number;
}

export type Question =
  | { mode: 'multiple-choice'; target: Feature; choices: Feature[] }
  | { mode: 'fill-in'; target: Feature }
  | { mode: 'click'; target: Feature };

export type Answer =
  | { mode: 'multiple-choice'; featureId: FeatureId }
  | { mode: 'fill-in'; text: string }
  | { mode: 'click'; featureId: FeatureId };

export interface QuestionResult {
  featureId: FeatureId;
  correct: boolean;
  answeredAt: number; // epoch ms
  nearMiss?: boolean; // fill-in: right country, imperfect spelling
}

export interface SessionResult {
  config: QuizConfig;
  results: QuestionResult[];
  score: number;
  bestStreak: number;
  durationMs: number;
}

export interface ProgressRecord {
  featureId: FeatureId;
  attempts: number;
  correct: number;
  box: 0 | 1 | 2 | 3 | 4; // Leitner-lite
  lastAskedAt: number; // epoch ms
}
