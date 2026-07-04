import Flatbush from 'flatbush';
import { geoContains } from 'd3-geo';
import type { CountryFeature, CountryId } from './types';
import { angularDistance } from './spherical';

/** Countries under this spherical area (~22,000 km²) get nearest-centroid pick tolerance. */
const SMALL_AREA_SR = 6e-4;
const PICK_TOLERANCE_RAD = 1.5 * (Math.PI / 180);

export interface Picker {
  pick(lon: number, lat: number): CountryId | null;
}

export function buildPicker(countries: CountryFeature[]): Picker {
  // bbox index; antimeridian-crossing features (west > east) are indexed as two boxes
  const boxes: number[][] = [];
  const boxOwner: number[] = [];
  countries.forEach((c, i) => {
    const [[w, s], [e, n]] = c.bounds;
    if (w <= e) {
      boxes.push([w, s, e, n]);
      boxOwner.push(i);
    } else {
      boxes.push([w, s, 180, n], [-180, s, e, n]);
      boxOwner.push(i, i);
    }
  });
  const index = new Flatbush(boxes.length);
  for (const [w, s, e, n] of boxes) index.add(w, s, e, n);
  index.finish();

  const small = countries.filter((c) => c.areaSr < SMALL_AREA_SR);

  return {
    pick(lon, lat) {
      const candidates = index.search(lon, lat, lon, lat);
      for (const b of candidates) {
        const c = countries[boxOwner[b]];
        if (geoContains(c.geometry, [lon, lat])) return c.id;
      }
      // tolerance: nearest small country, so islands/microstates are tappable
      let best: CountryFeature | null = null;
      let bestDist = PICK_TOLERANCE_RAD;
      for (const c of small) {
        const d = angularDistance([lon, lat], c.centroid);
        if (d < bestDist) {
          best = c;
          bestDist = d;
        }
      }
      return best?.id ?? null;
    },
  };
}
