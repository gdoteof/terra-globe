import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { geoInterpolate } from 'd3-geo';
import { GLOBE_RADIUS, angularDistance, lonLatToVec3 } from '../../geo/spherical';
import { useGlobeStore } from '../globeStore';
import { globeTheme } from '../theme';

const BORDER_RADIUS = GLOBE_RADIUS * 1.0025;
const MAX_SEGMENT_RAD = Math.PI / 180; // resample so no segment exceeds ~1°

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

export function CountryBorders() {
  const data = useGlobeStore((s) => s.data)!;

  const geometry = useMemo(() => {
    const positions: number[] = [];
    for (const line of data.borders.coordinates) {
      resampleToSegments(line as number[][], BORDER_RADIUS, positions);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, [data]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={globeTheme.border} transparent opacity={0.42} />
    </lineSegments>
  );
}
