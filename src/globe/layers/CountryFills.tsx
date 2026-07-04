import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import ConicPolygonGeometry from 'three-conic-polygon-geometry';
import { useFrame } from '@react-three/fiber';
import { GLOBE_RADIUS } from '../../geo/spherical';
import type { CountryData, CountryId } from '../../geo/types';
import { useGlobeStore } from '../globeStore';
import { PaletteController } from '../palette';
import { globeTheme } from '../theme';
import type { AnswerFlash } from '../GlobeProps';

const LAND_RADIUS = GLOBE_RADIUS * 1.001;
const CURVATURE_DEG = 3;

const vertexShader = /* glsl */ `
  attribute float aCountryIndex;
  varying float vIndex;
  varying vec3 vNormal;
  void main() {
    vIndex = aCountryIndex;
    vNormal = normalize(normalMatrix * normalize(position));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uPalette;
  uniform float uHighlight;
  uniform float uTime;
  uniform vec3 uHighlightColor;
  varying float vIndex;
  varying vec3 vNormal;
  void main() {
    vec3 base = texture2D(uPalette, vec2((vIndex + 0.5) / 256.0, 0.5)).rgb;
    // gentle view-space key light so the sphere reads as a form, not a sticker
    float lambert = 0.82 + 0.22 * max(dot(vNormal, normalize(vec3(0.35, 0.5, 0.85))), 0.0);
    vec3 col = base * lambert;
    if (abs(vIndex - uHighlight) < 0.5) {
      float pulse = 0.5 + 0.5 * sin(uTime * 3.2);
      col = mix(col, uHighlightColor, 0.45 + 0.3 * pulse);
      col += uHighlightColor * pulse * 0.2;
    }
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function buildMergedGeometry(data: CountryData): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  data.countries.forEach((c, i) => {
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
  });
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

interface Props {
  highlightedId: CountryId | null;
  flashes: AnswerFlash[];
}

export function CountryFills({ highlightedId, flashes }: Props) {
  const data = useGlobeStore((s) => s.data)!;
  const indexById = useGlobeStore((s) => s.indexById);
  const hoverId = useGlobeStore((s) => s.hoverId);

  const palette = useMemo(() => {
    const p = new PaletteController();
    data.countries.forEach((c, i) => {
      p.setBase(i, c.quizzable ? globeTheme.landTones[i % globeTheme.landTones.length] : globeTheme.landUnknown);
    });
    return p;
  }, [data]);

  const geometry = useMemo(() => buildMergedGeometry(data), [data]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uPalette: { value: palette.texture },
          uHighlight: { value: -1 },
          uTime: { value: 0 },
          uHighlightColor: { value: new THREE.Color(globeTheme.highlight) },
        },
        vertexShader,
        fragmentShader,
      }),
    [palette],
  );

  useEffect(() => {
    material.uniforms.uHighlight.value = highlightedId != null ? (indexById.get(highlightedId) ?? -1) : -1;
  }, [material, highlightedId, indexById]);

  // hover tint (suppressed on the pulsing target — the shader owns that one)
  const prevHover = useRef<number | null>(null);
  useEffect(() => {
    if (prevHover.current != null) palette.clear(prevHover.current);
    prevHover.current = null;
    if (hoverId && hoverId !== highlightedId) {
      const i = indexById.get(hoverId);
      if (i != null) {
        palette.set(i, globeTheme.hover);
        prevHover.current = i;
      }
    }
  }, [palette, hoverId, highlightedId, indexById]);

  // answer flashes
  const seenFlashes = useRef(new Set<number>());
  useEffect(() => {
    for (const f of flashes) {
      if (seenFlashes.current.has(f.key)) continue;
      seenFlashes.current.add(f.key);
      const i = indexById.get(f.id);
      if (i != null) {
        // wrong flashes linger through the longer feedback window
        palette.flash(i, f.result === 'correct' ? globeTheme.correct : globeTheme.wrong, f.result === 'correct' ? 900 : 2300);
      }
    }
  }, [palette, flashes, indexById]);

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
    palette.tick(performance.now());
  });

  return <mesh geometry={geometry} material={material} raycast={() => null} />;
}
