import { forwardRef, useEffect, useImperativeHandle, useRef, type RefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { loadCountries } from '../geo/countries';
import { buildPicker } from '../geo/picking';
import { buildGlobeGeometries } from './buildGeometry';
import type { GlobeHandle, GlobeProps } from './GlobeProps';
import { useGlobeStore } from './globeStore';
import { CameraRig, type CameraApi } from './CameraRig';
import { PickSphere } from './PickSphere';
import { Ocean } from './layers/Ocean';
import { Atmosphere } from './layers/Atmosphere';
import { CountryFills } from './layers/CountryFills';
import { CountryBorders } from './layers/CountryBorders';
import { HighlightOutline } from './layers/HighlightOutline';
import { Labels } from './layers/Labels';
import { PointMarkers } from './layers/PointMarkers';

/**
 * Fires onReady only after the country layers have actually rendered a couple
 * of frames — the first-frame GPU upload + shader compile is the last big
 * hitch, and it should happen behind the loading screen, not under the menu.
 */
function ReadySignal({ onReadyRef }: { onReadyRef: RefObject<(() => void) | undefined> }) {
  const frames = useRef(0);
  useFrame(() => {
    if (frames.current > 2) return;
    frames.current += 1;
    if (frames.current === 2) onReadyRef.current?.();
  });
  return null;
}

export const Globe = forwardRef<GlobeHandle, GlobeProps>(function Globe(props, ref) {
  const {
    highlightedId,
    flashes,
    labelMode,
    suppressLabels,
    interactive,
    idleSpin,
    onCountrySelect,
    onHoverChange,
    onReady,
    onProgress,
  } = props;
  const cameraApi = useRef<CameraApi | null>(null);
  const ready = useGlobeStore((s) => s.geoms != null);

  useImperativeHandle(
    ref,
    () => ({
      flyTo: (id) => cameraApi.current?.flyTo(id) ?? Promise.resolve(),
      resetView: () => cameraApi.current?.resetView() ?? Promise.resolve(),
    }),
    [],
  );

  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // fetching the topojson is ~the first tenth of the wait
      const data = await loadCountries();
      if (cancelled) return;
      const store = useGlobeStore.getState();
      if (!store.data) store.setLoaded(data, buildPicker(data.countries));
      onProgressRef.current?.(0.1);
      // chunked tessellation — keeps the main thread (and loader) breathing
      const geoms = await buildGlobeGeometries(data, (f) => onProgressRef.current?.(0.1 + f * 0.9));
      if (cancelled) return;
      if (!useGlobeStore.getState().geoms) useGlobeStore.getState().setGeoms(geoms);
      // onReady fires from ReadySignal once the layers have truly rendered
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Canvas
      className="globe-canvas"
      camera={{ fov: 45, near: 0.5, far: 2000, position: [0, 85, 250] }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      flat // no tone mapping: authored theme colors render as written
    >
      <Stars radius={650} depth={120} count={3500} factor={7} fade speed={0.4} />
      <Ocean />
      <Atmosphere />
      {ready && (
        <>
          <CountryFills highlightedId={highlightedId} flashes={flashes} />
          <CountryBorders />
          <HighlightOutline highlightedId={highlightedId} />
          <Labels labelMode={labelMode} highlightedId={highlightedId} suppressLabels={suppressLabels} />
          <PointMarkers highlightedId={highlightedId} />
          <ReadySignal onReadyRef={onReadyRef} />
        </>
      )}
      <CameraRig apiRef={cameraApi} idleSpin={idleSpin} />
      <PickSphere interactive={interactive} onSelect={onCountrySelect} onHover={onHoverChange} />
    </Canvas>
  );
});
