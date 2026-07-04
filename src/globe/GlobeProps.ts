// The contract between the game layer and the globe. The game traffics only in
// ISO alpha-2 codes and plain data; no three.js types cross this boundary.
import type { CountryId } from '../geo/types';

export type LabelMode = 'none' | 'target' | 'neighbors' | 'all';

export interface AnswerFlash {
  id: CountryId;
  result: 'correct' | 'wrong';
  /** Unique per flash so an identical consecutive flash still retriggers. */
  key: number;
}

export interface GlobeHandle {
  /** Fly the camera to a country; resolves when the flight ends (or is cancelled). */
  flyTo(id: CountryId): Promise<void>;
  resetView(): Promise<void>;
}

export interface GlobeProps {
  /** Pulsing quiz target (null = none). */
  highlightedId: CountryId | null;
  flashes: AnswerFlash[];
  labelMode: LabelMode;
  /** Never label these (e.g. the answer). Applies in every labelMode. */
  suppressLabels: CountryId[];
  /** Gates hover/click picking — not camera control. */
  interactive: boolean;
  /** Allow the slow idle auto-rotate (menus yes, mid-question no). */
  idleSpin: boolean;
  onCountrySelect?: (id: CountryId) => void;
  onHoverChange?: (id: CountryId | null) => void;
  /** Fires once when geodata is loaded and the globe is on screen. */
  onReady?: () => void;
}
