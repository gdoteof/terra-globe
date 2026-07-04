import type { Feature, FeatureKind, Region } from '../domain/types';
import countriesData from './countries.json';

export interface ContentSource {
  getFeatures(filter: { kinds: FeatureKind[]; region: Region | 'all' }): Promise<Feature[]>;
}

/** v1: static JSON, filtered in memory. Later: per-kind lazy datasets or an API. */
export class StaticContentSource implements ContentSource {
  async getFeatures(filter: { kinds: FeatureKind[]; region: Region | 'all' }): Promise<Feature[]> {
    const all = countriesData.features as Feature[];
    return all.filter(
      (f) => filter.kinds.includes(f.kind) && (filter.region === 'all' || f.region === filter.region),
    );
  }
}
