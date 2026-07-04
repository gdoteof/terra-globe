import { feature, mesh, neighbors } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { geoArea, geoBounds, geoCentroid } from 'd3-geo';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import countryMeta from './countryMeta.json';
import type { CountryData, CountryFeature, CountryId } from './types';

type CountriesTopology = Topology<{ countries: GeometryCollection<{ name?: string }> }>;

const meta = countryMeta as Record<string, { a2: string; name: string }>;

const DOMINANT_SHARE = 0.75;

/** The camera focus target: the dominant polygon, or the whole feature if none dominates. */
function focusGeometry(geometry: Polygon | MultiPolygon, totalArea: number): Polygon | MultiPolygon {
  if (geometry.type !== 'MultiPolygon') return geometry;
  let best: Polygon | null = null;
  let bestArea = 0;
  for (const coords of geometry.coordinates) {
    const poly: Polygon = { type: 'Polygon', coordinates: coords };
    const a = geoArea(poly);
    if (a > bestArea) {
      bestArea = a;
      best = poly;
    }
  }
  return best && bestArea / totalArea > DOMINANT_SHARE ? best : geometry;
}

function normalize(f: Feature, index: number): CountryFeature {
  const name = (f.properties as { name?: string } | null)?.name;
  // entries without a numeric id (e.g. Kosovo) are keyed by name in the meta table
  const m = (f.id != null ? meta[String(f.id)] : undefined) ?? (name ? meta[name] : undefined);
  const geometry = f.geometry as Polygon | MultiPolygon;
  const areaSr = geoArea(f);
  const focus = focusGeometry(geometry, areaSr);
  return {
    id: m?.a2 ?? `T-${index}`,
    name: m?.name ?? name ?? 'Unknown',
    geometry,
    centroid: geoCentroid(f),
    bounds: geoBounds(f),
    focusCentroid: geoCentroid(focus),
    focusBounds: geoBounds(focus),
    areaSr,
    quizzable: m != null && !m.a2.includes('-'),
  };
}

let cache: Promise<CountryData> | null = null;

export function loadCountries(url = '/data/countries-50m.json'): Promise<CountryData> {
  cache ??= fetchCountries(url);
  return cache;
}

async function fetchCountries(url: string): Promise<CountryData> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`failed to load geodata: ${res.status}`);
  const topology = (await res.json()) as CountriesTopology;
  const geometries = topology.objects.countries.geometries;

  const fc = feature(topology, topology.objects.countries);
  const countries = fc.features.map(normalize);
  const byId = new Map<CountryId, CountryFeature>(countries.map((c) => [c.id, c]));

  const adjacency = new Map<CountryId, CountryId[]>();
  neighbors(geometries).forEach((idxs, i) => {
    adjacency.set(countries[i].id, idxs.map((j) => countries[j].id));
  });

  return {
    countries,
    byId,
    borders: mesh(topology, topology.objects.countries),
    neighbors: adjacency,
  };
}
