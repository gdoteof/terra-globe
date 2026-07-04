// Per-country color state as a 256x1 RGBA DataTexture. Changing a country's
// color = writing 4 bytes + needsUpdate — no geometry churn, no React render.
import * as THREE from 'three';

export const PALETTE_SIZE = 256;

export class PaletteController {
  readonly texture: THREE.DataTexture;
  private data: Uint8Array;
  private base: Uint8Array; // resting color per country
  private tweens = new Map<number, { from: THREE.Color; to: THREE.Color; start: number; ms: number }>();

  constructor() {
    this.data = new Uint8Array(PALETTE_SIZE * 4).fill(255);
    this.base = new Uint8Array(PALETTE_SIZE * 4).fill(255);
    this.texture = new THREE.DataTexture(this.data, PALETTE_SIZE, 1, THREE.RGBAFormat);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.needsUpdate = true;
  }

  setBase(index: number, css: string): void {
    const c = new THREE.Color(css);
    const o = index * 4;
    this.base[o] = Math.round(c.r * 255);
    this.base[o + 1] = Math.round(c.g * 255);
    this.base[o + 2] = Math.round(c.b * 255);
    this.base[o + 3] = 255;
    this.write(index, c);
  }

  /** Instantly set a country's displayed color (e.g. hover). */
  set(index: number, css: string): void {
    this.tweens.delete(index);
    this.write(index, new THREE.Color(css));
  }

  /** Restore a country to its resting color. */
  clear(index: number): void {
    this.tweens.delete(index);
    const o = index * 4;
    this.data.set(this.base.subarray(o, o + 4), o);
    this.texture.needsUpdate = true;
  }

  /** Flash a color then ease back to base (answer feedback). */
  flash(index: number, css: string, ms = 900): void {
    const o = index * 4;
    const to = new THREE.Color(this.base[o] / 255, this.base[o + 1] / 255, this.base[o + 2] / 255);
    this.write(index, new THREE.Color(css));
    this.tweens.set(index, { from: new THREE.Color(css), to, start: performance.now(), ms });
  }

  /** Advance flash tweens; call once per frame. */
  tick(now: number): void {
    for (const [index, t] of this.tweens) {
      const raw = Math.min(1, (now - t.start) / t.ms);
      const k = raw * raw * (3 - 2 * raw); // smoothstep ease
      if (raw >= 1) this.tweens.delete(index);
      this.write(index, t.from.clone().lerp(t.to, k), false);
    }
    if (this.tweens.size) this.texture.needsUpdate = true;
  }

  private write(index: number, c: THREE.Color, update = true): void {
    const o = index * 4;
    this.data[o] = Math.round(c.r * 255);
    this.data[o + 1] = Math.round(c.g * 255);
    this.data[o + 2] = Math.round(c.b * 255);
    this.data[o + 3] = 255;
    if (update) this.texture.needsUpdate = true;
  }
}
