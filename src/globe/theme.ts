// Night-flight atlas: deep-space navy ocean, warm parchment land, amber accents.
// Every globe state color lives here.
export const globeTheme = {
  ocean: '#12263f',
  oceanRim: '#2b5078',
  atmosphere: '#3d6fb4',
  // subtle per-country rotation of close parchment tones, atlas-style
  landTones: ['#c9b18c', '#bfa67e', '#d2bc98', '#b89e74'],
  landUnknown: '#a3937a', // non-quizzable scraps: muted, not a hole
  border: '#33260f',
  hover: '#e8d9b5',
  highlight: '#ffb347', // pulsing quiz target (amber)
  correct: '#4fd18b',
  wrong: '#e85f5f',
  label: '#f2e9d8',
  markerRing: '#ffb347',
} as const;
