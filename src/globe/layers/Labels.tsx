import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import labelFontUrl from '@fontsource/instrument-sans/files/instrument-sans-latin-600-normal.woff?url';
import { GLOBE_RADIUS, angularDistance, angularRadiusFromArea, lonLatToVec3 } from '../../geo/spherical';
import type { CountryFeature, CountryId } from '../../geo/types';
import { useGlobeStore } from '../globeStore';
import { globeTheme } from '../theme';
import type { LabelMode } from '../GlobeProps';

const LABEL_RADIUS = GLOBE_RADIUS * 1.03;
const MAX_ALL_LABELS = 120;
const BASE_FONT = 1;
const DIST_SCALE = 0.0135; // with BASE_FONT, ~15px screen height at any zoom

interface Props {
  labelMode: LabelMode;
  highlightedId: CountryId | null;
  suppressLabels: CountryId[];
}

function selectVisible(
  mode: LabelMode,
  targetId: CountryId | null,
  suppress: Set<CountryId>,
  dataCountries: CountryFeature[],
  byId: Map<CountryId, CountryFeature>,
  adjacency: Map<CountryId, CountryId[]>,
): CountryFeature[] {
  let picked: CountryFeature[] = [];
  if (mode === 'none') return picked;
  if (mode === 'target') {
    const t = targetId ? byId.get(targetId) : null;
    picked = t ? [t] : [];
  } else if (mode === 'neighbors') {
    const t = targetId ? byId.get(targetId) : null;
    if (!t) return [];
    const ids = (adjacency.get(t.id) ?? []).filter((id) => byId.get(id)?.quizzable);
    if (ids.length > 0) {
      picked = ids.map((id) => byId.get(id)!);
    } else {
      // islands have no shared borders: use the 3 nearest countries instead
      picked = dataCountries
        .filter((c) => c.quizzable && c.id !== t.id)
        .sort((a, b) => angularDistance(a.centroid, t.centroid) - angularDistance(b.centroid, t.centroid))
        .slice(0, 3);
    }
  } else {
    picked = dataCountries
      .filter((c) => c.quizzable)
      .sort((a, b) => b.areaSr - a.areaSr)
      .slice(0, MAX_ALL_LABELS);
  }
  return picked.filter((c) => !suppress.has(c.id));
}

interface LabelEntry {
  feature: CountryFeature;
  dir: THREE.Vector3;
  pos: THREE.Vector3;
  sizeK: number; // cartographic: bigger countries, bigger type
}

const projected = new THREE.Vector3();

export function Labels({ labelMode, highlightedId, suppressLabels }: Props) {
  const data = useGlobeStore((s) => s.data)!;
  const groupRef = useRef<THREE.Group>(null);

  const entries: LabelEntry[] = useMemo(() => {
    // in click mode the target isn't highlighted; the suppressed answer anchors "neighbors"
    const targetId = highlightedId ?? suppressLabels[0] ?? null;
    const visible = selectVisible(
      labelMode,
      targetId,
      new Set(suppressLabels),
      data.countries,
      data.byId,
      data.neighbors,
    );
    return visible
      .sort((a, b) => b.areaSr - a.areaSr) // declutter priority: large countries win
      .map((feature) => {
        const [x, y, z] = lonLatToVec3(feature.centroid[0], feature.centroid[1], LABEL_RADIUS);
        const pos = new THREE.Vector3(x, y, z);
        const sizeK = THREE.MathUtils.clamp(0.75 + angularRadiusFromArea(feature.areaSr) * 8, 0.8, 1.7);
        return { feature, dir: pos.clone().normalize(), pos, sizeK };
      });
  }, [data, labelMode, highlightedId, suppressLabels]);

  useFrame(({ camera, size }) => {
    const group = groupRef.current;
    if (!group) return;
    const camDist = camera.position.length();
    const camDir = camera.position.clone().normalize();
    const horizon = GLOBE_RADIUS / camDist;
    const fovRad = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
    const pxPerUnit = size.height / (2 * Math.tan(fovRad / 2));
    const taken: { x: number; y: number; w: number; h: number }[] = [];

    group.children.forEach((child, i) => {
      const entry = entries[i];
      if (!entry) return;
      const dot = entry.dir.dot(camDir);
      let fade = THREE.MathUtils.clamp((dot - horizon - 0.02) / 0.09, 0, 1);
      if (fade > 0.01) {
        // greedy screen-space declutter, larger countries first
        const h = BASE_FONT * entry.sizeK * DIST_SCALE * pxPerUnit * 1.25;
        const w = h * 0.54 * entry.feature.name.length;
        projected.copy(entry.pos).project(camera);
        const x = (projected.x * 0.5 + 0.5) * size.width;
        const y = (1 - (projected.y * 0.5 + 0.5)) * size.height;
        const overlaps = taken.some(
          (r) => Math.abs(r.x - x) < (r.w + w) / 2 && Math.abs(r.y - y) < (r.h + h) / 2,
        );
        if (overlaps) fade = 0;
        else taken.push({ x, y, w, h });
      }
      child.visible = fade > 0.01;
      if (!child.visible) return;
      child.quaternion.copy(camera.quaternion);
      // constant screen size: scale by distance to the label, not to the origin
      child.scale.setScalar(camera.position.distanceTo(entry.pos) * DIST_SCALE);
      const material = (child as THREE.Mesh).material as THREE.Material | undefined;
      if (material) material.opacity = fade * 0.95;
    });
  });

  return (
    <group ref={groupRef}>
      {entries.map(({ feature, pos, sizeK }) => (
        <Text
          key={feature.id}
          position={pos}
          font={labelFontUrl}
          fontSize={BASE_FONT * sizeK}
          color={globeTheme.label}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.07}
          outlineColor="#0d1424"
          material-transparent
          material-depthWrite={false}
          renderOrder={10}
        >
          {feature.name}
        </Text>
      ))}
    </group>
  );
}
