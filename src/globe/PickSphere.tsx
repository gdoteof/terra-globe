import { useEffect, useRef } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { GLOBE_RADIUS, vec3ToLonLat } from '../geo/spherical';
import type { CountryId } from '../geo/types';
import { useGlobeStore } from './globeStore';

const CLICK_SLOP_PX = 6;

interface Props {
  interactive: boolean;
  onSelect?: (id: CountryId) => void;
  onHover?: (id: CountryId | null) => void;
}

/**
 * The only raycast target in the scene: one sphere. A hit becomes lon/lat,
 * then the spatial index resolves the country — O(1) picking regardless of
 * land-mesh complexity.
 */
export function PickSphere({ interactive, onSelect, onHover }: Props) {
  const { gl } = useThree();
  const hoverRef = useRef<CountryId | null>(null);

  const setHoverState = (id: CountryId | null) => {
    if (hoverRef.current === id) return;
    hoverRef.current = id;
    useGlobeStore.getState().setHover(id);
    onHover?.(id);
    gl.domElement.style.cursor = id ? 'pointer' : 'grab';
  };

  useEffect(() => {
    if (!interactive) setHoverState(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive]);

  const pickAt = (e: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>): CountryId | null => {
    const picker = useGlobeStore.getState().picker;
    if (!picker) return null;
    const [lon, lat] = vec3ToLonLat(e.point.x, e.point.y, e.point.z);
    return picker.pick(lon, lat);
  };

  return (
    <mesh
      onPointerMove={(e) => {
        if (interactive) setHoverState(pickAt(e));
      }}
      onPointerLeave={() => setHoverState(null)}
      onClick={(e) => {
        if (!interactive || e.delta > CLICK_SLOP_PX) return;
        const id = pickAt(e);
        if (id) onSelect?.(id);
      }}
    >
      <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  );
}
