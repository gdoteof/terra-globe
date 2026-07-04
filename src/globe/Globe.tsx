import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { loadCountries } from '../geo/countries';
import { buildPicker } from '../geo/picking';
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
  } = props;
  const cameraApi = useRef<CameraApi | null>(null);
  const loaded = useGlobeStore((s) => s.data != null);

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
  useEffect(() => {
    let cancelled = false;
    loadCountries().then((data) => {
      if (cancelled) return;
      if (!useGlobeStore.getState().data) {
        useGlobeStore.getState().setLoaded(data, buildPicker(data.countries));
      }
      onReadyRef.current?.();
    });
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
      {loaded && (
        <>
          <CountryFills highlightedId={highlightedId} flashes={flashes} />
          <CountryBorders />
          <HighlightOutline highlightedId={highlightedId} />
          <Labels labelMode={labelMode} highlightedId={highlightedId} suppressLabels={suppressLabels} />
          <PointMarkers highlightedId={highlightedId} />
        </>
      )}
      <CameraRig apiRef={cameraApi} idleSpin={idleSpin} />
      <PickSphere interactive={interactive} onSelect={onCountrySelect} onHover={onHoverChange} />
    </Canvas>
  );
});
