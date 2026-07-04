// Tiny WebAudio synth — no audio assets to ship. Called from presentation
// components only; gated on the sound setting.
import { useSettingsStore } from '../store/settingsStore';

type Sfx = 'correct' | 'wrong' | 'streak' | 'fanfare';

let ctx: AudioContext | null = null;

function tone(at: number, freq: number, dur: number, gainPeak: number, type: OscillatorType) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(gainPeak, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

const PATTERNS: Record<Sfx, [offsetS: number, freq: number, durS: number, gain: number, type: OscillatorType][]> = {
  correct: [
    [0, 660, 0.16, 0.12, 'sine'],
    [0.07, 880, 0.22, 0.12, 'sine'],
  ],
  wrong: [
    [0, 196, 0.28, 0.1, 'triangle'],
    [0.09, 147, 0.34, 0.1, 'triangle'],
  ],
  streak: [
    [0, 660, 0.12, 0.1, 'sine'],
    [0.06, 880, 0.12, 0.1, 'sine'],
    [0.12, 1174, 0.24, 0.11, 'sine'],
  ],
  fanfare: [
    [0, 523, 0.22, 0.1, 'sine'],
    [0.12, 659, 0.22, 0.1, 'sine'],
    [0.24, 784, 0.3, 0.11, 'sine'],
    [0.36, 1046, 0.5, 0.12, 'sine'],
  ],
};

export function playSfx(kind: Sfx): void {
  if (!useSettingsStore.getState().soundOn) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    for (const [off, freq, dur, gain, type] of PATTERNS[kind]) tone(now + off, freq, dur, gain, type);
  } catch {
    // no audio available — stay silent
  }
}
