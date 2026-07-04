import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GLOBE_RADIUS } from '../../geo/spherical';
import type { CountryId } from '../../geo/types';
import { useGlobeStore } from '../globeStore';
import { globeTheme } from '../theme';
import { resampleToSegments } from './CountryBorders';

const OUTLINE_RADIUS = GLOBE_RADIUS * 1.004;

/** Pulsing bright outline around the quiz target. */
export function HighlightOutline({ highlightedId }: { highlightedId: CountryId | null }) {
  const data = useGlobeStore((s) => s.data)!;
  const materialRef = useRef<THREE.LineBasicMaterial>(null);

  const geometry = useMemo(() => {
    if (!highlightedId) return null;
    const c = data.byId.get(highlightedId);
    if (!c) return null;
    const positions: number[] = [];
    const polygons = c.geometry.type === 'Polygon' ? [c.geometry.coordinates] : c.geometry.coordinates;
    for (const rings of polygons) {
      for (const ring of rings) resampleToSegments(ring as number[][], OUTLINE_RADIUS, positions);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, [data, highlightedId]);
  useEffect(() => () => geometry?.dispose(), [geometry]);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.opacity = 0.55 + 0.45 * Math.sin(clock.elapsedTime * 3.2);
    }
  });

  if (!geometry) return null;
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        ref={materialRef}
        color={globeTheme.highlight}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}
