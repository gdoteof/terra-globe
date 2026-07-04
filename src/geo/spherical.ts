/**
 * THE single lon/lat <-> XYZ convention for the whole app. Matches
 * three-conic-polygon-geometry's polar2Cartesian so meshes and math agree:
 *   (lon 0, lat 0) -> +Z, north pole -> +Y, 90°E -> +X.
 * Pure math (no three.js) so it runs in node tests.
 */
export const GLOBE_RADIUS = 100;

const DEG = Math.PI / 180;

export function lonLatToVec3(
  lon: number,
  lat: number,
  r = GLOBE_RADIUS,
): [x: number, y: number, z: number] {
  const latR = lat * DEG;
  const lonR = lon * DEG;
  return [r * Math.cos(latR) * Math.sin(lonR), r * Math.sin(latR), r * Math.cos(latR) * Math.cos(lonR)];
}

export function vec3ToLonLat(x: number, y: number, z: number): [lon: number, lat: number] {
  const r = Math.sqrt(x * x + y * y + z * z);
  return [Math.atan2(x, z) / DEG, Math.asin(y / r) / DEG];
}

/** Great-circle angle between two lon/lat points, in radians. */
export function angularDistance(a: [number, number], b: [number, number]): number {
  const [ax, ay, az] = lonLatToVec3(a[0], a[1], 1);
  const [bx, by, bz] = lonLatToVec3(b[0], b[1], 1);
  return Math.acos(Math.min(1, Math.max(-1, ax * bx + ay * by + az * bz)));
}

/** Angular radius (radians) of a feature from its spherical area, treating it as a cap. */
export function angularRadiusFromArea(areaSr: number): number {
  // cap area = 2π(1 − cos θ) => θ = acos(1 − area / 2π)
  return Math.acos(Math.max(-1, 1 - areaSr / (2 * Math.PI)));
}
