import type { MultiLineString, MultiPolygon, Polygon } from 'geojson';

/** ISO 3166-1 alpha-2, plus synthetic codes for non-ISO territories (e.g. "SO-S"). */
export type CountryId = string;

export interface CountryFeature {
  id: CountryId;
  name: string;
  geometry: Polygon | MultiPolygon; // lon/lat WGS84
  centroid: [lon: number, lat: number];
  bounds: [[w: number, s: number], [e: number, n: number]];
  /**
   * What the camera should frame: the dominant polygon when one holds most of
   * the area (Australia sans Macquarie Island, US mainland sans Hawaii),
   * otherwise the whole feature.
   */
  focusCentroid: [lon: number, lat: number];
  focusBounds: [[w: number, s: number], [e: number, n: number]];
  areaSr: number; // spherical area in steradians
  quizzable: boolean; // has real ISO identity (drawn vs. drawn+askable)
}

export interface CountryData {
  countries: CountryFeature[];
  byId: Map<CountryId, CountryFeature>;
  /** Every border arc + coastline exactly once (from topojson.mesh). */
  borders: MultiLineString;
  neighbors: Map<CountryId, CountryId[]>;
}
