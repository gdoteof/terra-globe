import { useMemo } from 'react';
import * as THREE from 'three';
import { GLOBE_RADIUS } from '../../geo/spherical';
import { globeTheme } from '../theme';

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    // BackSide: flip the normal toward the viewer, glow strongest at the limb
    float intensity = pow(0.72 + dot(normalize(-vNormal), vViewDir), 3.0);
    gl_FragColor = vec4(uColor, 1.0) * intensity * 0.55;
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Soft additive halo just outside the globe. */
export function Atmosphere() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(globeTheme.atmosphere) } },
        vertexShader,
        fragmentShader,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  return (
    <mesh material={material} raycast={() => null}>
      <sphereGeometry args={[GLOBE_RADIUS * 1.13, 64, 64]} />
    </mesh>
  );
}
