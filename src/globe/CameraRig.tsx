import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { GLOBE_RADIUS, angularDistance, lonLatToVec3 } from '../geo/spherical';
import type { CountryId } from '../geo/types';
import { useGlobeStore } from './globeStore';

const MIN_DIST = GLOBE_RADIUS * 1.18;
const MAX_DIST = GLOBE_RADIUS * 4;
const HOME_DIST = GLOBE_RADIUS * 2.7;
const IDLE_AFTER_S = 8;
const IDLE_SPEED = 0.35;
const FIT_FRACTION = 0.62; // country fills ~this share of the view height

export interface CameraApi {
  flyTo(id: CountryId): Promise<void>;
  resetView(): Promise<void>;
}

interface Flight {
  dirFrom: THREE.Vector3;
  qDelta: THREE.Quaternion;
  d0: number;
  d1: number;
  duration: number;
  t: number;
  resolve: () => void;
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function CameraRig({ apiRef, idleSpin }: { apiRef: RefObject<CameraApi | null>; idleSpin: boolean }) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera, gl } = useThree();
  const flightRef = useRef<Flight | null>(null);
  const lastActivity = useRef(0);
  const spinSpeed = useRef(0);

  useEffect(() => {
    const endFlight = () => {
      const f = flightRef.current;
      if (f) {
        flightRef.current = null;
        if (controlsRef.current) controlsRef.current.enabled = true;
        f.resolve();
      }
    };

    const fov = (camera as THREE.PerspectiveCamera).fov;

    const startFlight = (dirTo: THREE.Vector3, d1: number) =>
      new Promise<void>((resolve) => {
        endFlight(); // a new flight supersedes (and resolves) the old one
        const dirFrom = camera.position.clone().normalize();
        const angle = dirFrom.angleTo(dirTo);
        flightRef.current = {
          dirFrom,
          qDelta: new THREE.Quaternion().setFromUnitVectors(dirFrom, dirTo),
          d0: camera.position.length(),
          d1: THREE.MathUtils.clamp(d1, MIN_DIST, MAX_DIST),
          duration: THREE.MathUtils.clamp(0.6 + (angle / Math.PI) * 1.4, 0.6, 1.8),
          t: 0,
          resolve,
        };
        if (controlsRef.current) controlsRef.current.enabled = false;
        lastActivity.current = performance.now();
      });

    apiRef.current = {
      flyTo(id) {
        const data = useGlobeStore.getState().data;
        const c = data?.byId.get(id);
        if (!c) return Promise.resolve();
        // frame the dominant landmass, not remote outliers (Macquarie, Hawaii)
        const [x, y, z] = lonLatToVec3(c.focusCentroid[0], c.focusCentroid[1], 1);
        // angular half-extent: farthest focus-bounds corner from the centroid
        const [[w, s], [e, n]] = c.focusBounds;
        const corners: [number, number][] = [[w, s], [w, n], [e, s], [e, n]];
        const theta = Math.max(
          2 * (Math.PI / 180),
          ...corners.map((p) => angularDistance(c.focusCentroid, p)),
        );
        const halfView = ((fov / 2) * Math.PI / 180) * FIT_FRACTION;
        const dist =
          GLOBE_RADIUS * Math.cos(Math.min(theta, Math.PI / 2)) +
          (GLOBE_RADIUS * Math.sin(Math.min(theta, Math.PI / 2))) / Math.tan(halfView);
        return startFlight(new THREE.Vector3(x, y, z), dist);
      },
      resetView() {
        return startFlight(camera.position.clone().normalize(), HOME_DIST);
      },
    };

    // user grabbing the globe cancels a flight — never fight the player
    const onPointerDown = () => {
      lastActivity.current = performance.now();
      endFlight();
    };
    const el = gl.domElement;
    el.addEventListener('pointerdown', onPointerDown);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      endFlight();
      apiRef.current = null;
    };
  }, [apiRef, camera, gl]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const dist = camera.position.length();

    // near the surface, dragging should nudge, not whip continents past
    controls.rotateSpeed = 0.85 * THREE.MathUtils.clamp((dist - GLOBE_RADIUS) / (GLOBE_RADIUS * 1.8), 0.07, 1);
    controls.zoomSpeed = THREE.MathUtils.clamp((dist - GLOBE_RADIUS) / GLOBE_RADIUS, 0.35, 1);

    const flight = flightRef.current;
    if (flight) {
      // OrbitControls.update() applies autoRotate even when disabled for input —
      // left on (e.g. after idling in the menu) it overrides the whole flight
      spinSpeed.current = 0;
      controls.autoRotate = false;
      flight.t = Math.min(1, flight.t + delta / flight.duration);
      const k = easeInOutCubic(flight.t);
      const q = new THREE.Quaternion().slerp(flight.qDelta, k);
      const dir = flight.dirFrom.clone().applyQuaternion(q);
      // distance lags rotation slightly: rotate, then descend
      const kd = easeInOutCubic(THREE.MathUtils.clamp((flight.t - 0.12) / 0.88, 0, 1));
      camera.position.copy(dir.multiplyScalar(THREE.MathUtils.lerp(flight.d0, flight.d1, kd)));
      camera.lookAt(0, 0, 0);
      if (flight.t >= 1) {
        flightRef.current = null;
        controls.enabled = true;
        controls.update();
        flight.resolve();
      }
      lastActivity.current = performance.now();
      return;
    }

    // idle: ease into a slow spin, never jerk on/off — never while a question is up
    const idle = idleSpin && (performance.now() - lastActivity.current) / 1000 > IDLE_AFTER_S;
    const target = idle ? IDLE_SPEED : 0;
    spinSpeed.current += (target - spinSpeed.current) * Math.min(1, delta / 0.8);
    controls.autoRotate = spinSpeed.current > 0.005;
    controls.autoRotateSpeed = spinSpeed.current;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={MIN_DIST}
      maxDistance={MAX_DIST}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI - 0.15}
      onStart={() => (lastActivity.current = performance.now())}
      onEnd={() => (lastActivity.current = performance.now())}
    />
  );
}
