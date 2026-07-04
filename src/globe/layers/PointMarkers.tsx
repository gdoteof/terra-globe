import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GLOBE_RADIUS, angularRadiusFromArea, lonLatToVec3 } from '../../geo/spherical';
import type { CountryId } from '../../geo/types';
import { useGlobeStore } from '../globeStore';
import { globeTheme } from '../theme';

/** Below this angular radius a highlighted country gets a locator ring. */
const SMALL_RAD = 1.5 * (Math.PI / 180);
/** Once the country itself fills this fraction of the view, the ring retires. */
const MAX_APPARENT_FRACTION = 0.14;

export function PointMarkers({ highlightedId }: { highlightedId: CountryId | null }) {
  const data = useGlobeStore((s) => s.data)!;
  const ringRef = useRef<THREE.Mesh>(null);

  const target = useMemo(() => {
    if (!highlightedId) return null;
    const c = data.byId.get(highlightedId);
    if (!c) return null;
    const theta = angularRadiusFromArea(c.areaSr);
    if (theta > SMALL_RAD) return null;
    const [x, y, z] = lonLatToVec3(c.centroid[0], c.centroid[1], GLOBE_RADIUS * 1.01);
    return { pos: new THREE.Vector3(x, y, z), theta };
  }, [data, highlightedId]);

  useFrame(({ camera, size, clock }) => {
    const ring = ringRef.current;
    if (!ring || !target) return;
    const dist = camera.position.distanceTo(target.pos);
    const fovRad = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
    const viewHeightAtTarget = 2 * dist * Math.tan(fovRad / 2);
    const countrySize = 2 * GLOBE_RADIUS * Math.sin(target.theta);
    // zoomed in enough to see the country itself? the ring has done its job
    ring.visible = countrySize / viewHeightAtTarget < MAX_APPARENT_FRACTION;
    if (!ring.visible) return;
    ring.quaternion.copy(camera.quaternion);
    const pulse = 1 + 0.15 * Math.sin(clock.elapsedTime * 3.2);
    // constant ~56px screen diameter
    const scale = ((56 / size.height) * viewHeightAtTarget) / 3.9;
    ring.scale.setScalar(scale * pulse);
  });

  if (!target) return null;
  return (
    <mesh ref={ringRef} position={target.pos} renderOrder={11} raycast={() => null}>
      <ringGeometry args={[1.62, 1.95, 48]} />
      <meshBasicMaterial
        color={globeTheme.markerRing}
        transparent
        opacity={0.85}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
