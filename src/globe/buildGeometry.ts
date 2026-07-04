// The expensive one-time work: tessellating ~240 country polygons onto the
// sphere and resampling every border arc. Chunked across macrotasks so the
// main thread (and the loading screen) never freezes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import ConicPolygonGeometry from 'three-conic-polygon-geometry';
import { geoInterpolate } from 'd3-geo';
import { GLOBE_RADIUS, angularDistance, lonLatToVec3 } from '../geo/spherical';
import type { CountryData } from '../geo/types';

const LAND_RADIUS = GLOBE_RADIUS * 1.001;
const BORDER_RADIUS = GLOBE_RADIUS * 1.0025;
const CURVATURE_DEG = 3;
const MAX_SEGMENT_RAD = Math.PI / 180; // resample so no segment exceeds ~1°

export interface GlobeGeometries {
  land: THREE.BufferGeometry;
  borders: THREE.BufferGeometry;
}

/** Resample a lon/lat line along great circles and emit LineSegments pairs. */
export function resampleToSegments(line: number[][], radius: number, out: number[]): void {
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i] as [number, number];
    const b = line[i + 1] as [number, number];
    const steps = Math.max(1, Math.ceil(angularDistance(a, b) / MAX_SEGMENT_RAD));
    const interp = geoInterpolate(a, b);
    let prev = lonLatToVec3(a[0], a[1], radius);
    for (let k = 1; k <= steps; k++) {
      const [lon, lat] = interp(k / steps);
      const cur = lonLatToVec3(lon, lat, radius);
      out.push(prev[0], prev[1], prev[2], cur[0], cur[1], cur[2]);
      prev = cur;
    }
  }
}

const breathe = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function build(data: CountryData, onProgress: (f: number) => void): Promise<GlobeGeometries> {
  // countries: 0 → 0.75 of the bar
  const parts: THREE.BufferGeometry[] = [];
  const CHUNK = 12;
  for (let start = 0; start < data.countries.length; start += CHUNK) {
    for (let i = start; i < Math.min(start + CHUNK, data.countries.length); i++) {
      const c = data.countries[i];
      const polygons = c.geometry.type === 'Polygon' ? [c.geometry.coordinates] : c.geometry.coordinates;
      for (const rings of polygons) {
        const g = new ConicPolygonGeometry(
          rings as number[][][],
          GLOBE_RADIUS,
          LAND_RADIUS,
          false,
          true,
          false,
          CURVATURE_DEG,
        );
        g.deleteAttribute('uv');
        g.clearGroups();
        const count = g.getAttribute('position').count;
        g.setAttribute('aCountryIndex', new THREE.BufferAttribute(new Float32Array(count).fill(i), 1));
        parts.push(g);
      }
    }
    onProgress((Math.min(start + CHUNK, data.countries.length) / data.countries.length) * 0.75);
    await breathe();
  }

  // borders: 0.75 → 0.95
  const positions: number[] = [];
  const lines = data.borders.coordinates;
  const LINE_CHUNK = 400;
  for (let start = 0; start < lines.length; start += LINE_CHUNK) {
    for (let i = start; i < Math.min(start + LINE_CHUNK, lines.length); i++) {
      resampleToSegments(lines[i] as number[][], BORDER_RADIUS, positions);
    }
    onProgress(0.75 + (Math.min(start + LINE_CHUNK, lines.length) / lines.length) * 0.2);
    await breathe();
  }
  const borders = new THREE.BufferGeometry();
  borders.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  // merge: 0.95 → 1
  const land = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  onProgress(1);
  return { land, borders };
}

let cached: Promise<GlobeGeometries> | null = null;
let progressCb: (f: number) => void = () => {};

/** Idempotent (StrictMode-safe): concurrent callers share one build. */
export function buildGlobeGeometries(
  data: CountryData,
  onProgress?: (f: number) => void,
): Promise<GlobeGeometries> {
  if (onProgress) progressCb = onProgress;
  cached ??= build(data, (f) => progressCb(f));
  return cached;
}
