// Generates src/geo/countryMeta.json (topojson numeric id -> alpha-2 + display name,
// for every polygon in world-atlas) and src/data/countries.json (quizzable features).
// Joins world-atlas (Natural Earth) numeric ids to world-countries via ccn3.
// Run: npm run generate-data
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const countries = require('world-countries');
const topo = JSON.parse(readFileSync(new URL('../public/data/countries-50m.json', import.meta.url)));

const byCcn3 = new Map(countries.filter((c) => c.ccn3).map((c) => [c.ccn3, c]));

// world-atlas entries whose numeric id is missing/unusable in Natural Earth.
const NAME_OVERRIDES = {
  Kosovo: 'XK',
  'N. Cyprus': 'CY-N',
  Somaliland: 'SO-S',
};
const byCca2 = new Map(countries.map((c) => [c.cca2, c]));

const REGION = (c) => {
  if (c.region === 'Africa') return 'africa';
  if (c.region === 'Europe') return 'europe';
  if (c.region === 'Oceania') return 'oceania';
  if (c.region === 'Americas') return c.subregion === 'South America' ? 'south-america' : 'north-america';
  if (c.region === 'Asia') return c.subregion === 'Western Asia' ? 'middle-east' : 'asia';
  return null; // Antarctic
};

const tier = (c) => (c.area > 500_000 ? 1 : c.area > 50_000 ? 2 : 3);

// Informal names people actually type, absent from altSpellings.
const ALIAS_EXTRA = {
  US: ['america', 'the states'],
  GB: ['uk', 'britain', 'great britain'],
  NL: ['holland'],
  MM: ['burma'],
  SZ: ['swaziland'],
  MK: ['macedonia'],
  TL: ['east timor'],
  CD: ['congo-kinshasa', 'democratic republic of congo'],
  CG: ['congo-brazzaville'],
  AE: ['uae', 'emirates'],
  VA: ['vatican', 'the vatican'],
  TR: ['turkey'],
  CZ: ['czech republic'],
};

const aliases = (c) => {
  const out = new Set(ALIAS_EXTRA[c.cca2] ?? []);
  for (const alt of [c.name.official, ...c.altSpellings]) {
    const a = alt.toLowerCase().trim();
    if (a.length > 2 && a !== c.name.common.toLowerCase()) out.add(a);
  }
  return [...out];
};

const meta = {};
const features = [];
const unmatched = [];

for (const g of topo.objects.countries.geometries) {
  const name = g.properties?.name ?? 'unknown';
  let wc = byCcn3.get(String(g.id).padStart(3, '0'));
  if (!wc && NAME_OVERRIDES[name]) {
    const code = NAME_OVERRIDES[name];
    wc = byCca2.get(code) ?? null;
    meta[g.id ?? name] = { a2: code, name };
    if (!wc) continue; // synthetic territory (N. Cyprus, Somaliland): on the globe, not quizzed
  } else if (!wc) {
    unmatched.push(`${g.id} ${name}`);
    meta[g.id ?? name] = { a2: `??-${g.id}`, name };
    continue;
  }
  meta[g.id] = { a2: wc.cca2, name: wc.name.common };

  const region = REGION(wc);
  const quizzable = region && (wc.unMember || ['XK', 'TW', 'PS', 'VA'].includes(wc.cca2));
  if (!quizzable) continue;
  features.push({
    id: `country:${wc.cca2.toLowerCase()}`,
    kind: 'country',
    name: wc.name.common,
    aliases: aliases(wc),
    region,
    geometry: { type: 'iso-a2', code: wc.cca2 },
    tier: tier(wc),
  });
}

features.sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(
  new URL('../src/geo/countryMeta.json', import.meta.url),
  JSON.stringify(meta, null, 1),
);
writeFileSync(
  new URL('../src/data/countries.json', import.meta.url),
  JSON.stringify({ version: 1, kind: 'country', features }, null, 1),
);

console.log(`meta entries: ${Object.keys(meta).length}, quiz features: ${features.length}`);
if (unmatched.length) console.log('UNMATCHED:\n' + unmatched.join('\n'));
