import { useMemo } from 'react';
import * as THREE from 'three';
import { GLOBE_RADIUS } from '../../geo/spherical';
import { globeTheme } from '../theme';

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    vPos = normalize(position);
    gl_Position = projectionMatrix * mv;
  }
`;

// deep matte navy + fresnel rim + a whisper of a 15° graticule (night-atlas)
const fragmentShader = /* glsl */ `
  uniform vec3 uOcean;
  uniform vec3 uRim;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vPos;
  void main() {
    float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.4);
    vec3 col = mix(uOcean, uRim, fresnel * 0.9);
    float lat = degrees(asin(clamp(vPos.y, -1.0, 1.0)));
    float lon = degrees(atan(vPos.x, vPos.z));
    float g = 0.0;
    g += smoothstep(0.25, 0.0, abs(fract(lat / 15.0 + 0.5) - 0.5) * 15.0 / 0.6);
    g += smoothstep(0.25, 0.0, abs(fract(lon / 15.0 + 0.5) - 0.5) * 15.0 / 0.6);
    col += uRim * min(g, 1.0) * 0.09;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function Ocean() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uOcean: { value: new THREE.Color(globeTheme.ocean) },
          uRim: { value: new THREE.Color(globeTheme.oceanRim) },
        },
        vertexShader,
        fragmentShader,
      }),
    [],
  );
  return (
    <mesh material={material} raycast={() => null}>
      <sphereGeometry args={[GLOBE_RADIUS, 96, 96]} />
    </mesh>
  );
}
