import { useGlobeStore } from '../globeStore';
import { globeTheme } from '../theme';

export function CountryBorders() {
  // prebuilt off the render path by buildGlobeGeometries; lives app-lifetime
  const geometry = useGlobeStore((s) => s.geoms)!.borders;

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={globeTheme.border} transparent opacity={0.42} />
    </lineSegments>
  );
}
