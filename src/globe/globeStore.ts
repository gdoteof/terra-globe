// Globe-internal state. The game layer never imports this.
import { create } from 'zustand';
import type { CountryData, CountryId } from '../geo/types';
import type { Picker } from '../geo/picking';
import type { GlobeGeometries } from './buildGeometry';

interface GlobeState {
  data: CountryData | null;
  picker: Picker | null;
  /** Prebuilt land/border geometry — render waits for this, not just data. */
  geoms: GlobeGeometries | null;
  /** country id -> palette/vertex-attribute index (position in data.countries) */
  indexById: Map<CountryId, number>;
  hoverId: CountryId | null;
  setLoaded(data: CountryData, picker: Picker): void;
  setGeoms(geoms: GlobeGeometries): void;
  setHover(id: CountryId | null): void;
}

export const useGlobeStore = create<GlobeState>((set) => ({
  data: null,
  picker: null,
  geoms: null,
  indexById: new Map(),
  hoverId: null,
  setLoaded: (data, picker) =>
    set({ data, picker, indexById: new Map(data.countries.map((c, i) => [c.id, i])) }),
  setGeoms: (geoms) => set({ geoms }),
  setHover: (hoverId) => set({ hoverId }),
}));
