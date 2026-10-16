import Phaser from 'phaser';
import { blob, canvasTex, rect, type Ctx } from './pixels.ts';
import type { WorldId } from '../types.ts';

const W = 480, H = 270, GROUND = 248;
const per = (x: number, k: number, ph = 0) => Math.sin((2 * Math.PI * k * x) / W + ph);

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

/** Cielo en bandas con dithering (estilo retro). stops: de arriba a abajo. */
function sky(c: Ctx, stops: string[], steps = 16) {
  const bandH = Math.ceil(GROUND / steps);
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const s = t * (stops.length - 1), k = Math.min(stops.length - 2, Math.floor(s));
    const col = mix(stops[k], stops[k + 1], s - k);
    rect(c, 0, i * bandH, W, bandH + 1, col);
    if (i > 0) {
      const prev = mix(stops[Math.min(stops.length - 2, Math.floor(((i - 1) / (steps - 1)) * (stops.length - 1)))], stops[Math.min(stops.length - 1, Math.floor(((i - 1) / (steps - 1)) * (stops.length - 1)) + 1)], 0.5);
      void prev;
      for (let x = 0; x < W; x += 2) rect(c, x + (i % 2), i * bandH - 1, 1, 1, mix(col, stops[Math.min(stops.length - 1, k + 1)], 0.35));
    }
  }
  rect(c, 0, GROUND, W, H - GROUND, stops[stops.length - 1]);
}

function clouds(c: Ctx, col: string, ys: number[], alpha = 1) {
  c.globalAlpha = alpha;
  ys.forEach((y, i) => {
    const x = (i * 163 + 40) % W;
    blob(c, x, y, 26, 5, col); blob(c, x + 14, y - 4, 16, 5, col); blob(c, x - 16, y - 2, 12, 4, col);
  });
  c.globalAlpha = 1;
}

function palm(c: Ctx, x: number, baseY: number, h: number, col: string, leaf: string) {
  for (let y = 0; y < h; y++) rect(c, x + Math.round(Math.sin(y / 10) * 2), baseY - y, 3, 1, col);
  const top = baseY - h;
  for (let i = 0; i < 7; i++) {
    rect(c, x - i - 1, top - 3 + (i >> 1), 1, 2, leaf); rect(c, x + 3 + i, top - 3 + (i >> 1), 1, 2, leaf);
  }
  rect(c, x - 3, top - 5, 9, 3, leaf); rect(c, x - 1, top - 8, 5, 3, leaf);
}

function costa(s: Phaser.Scene) {
  canvasTex(s, 'bg_costa_sky', W, H, (c) => {
    sky(c, ['#33b5e5', '#8fdcf2', '#ffe9b8', '#ffd2a0']);
    blob(c, 372, 72, 20, 20, '#fff3b0'); blob(c, 372, 72, 14, 14, '#fffbe0');
    clouds(c, '#ffffff', [38, 60, 96], 0.9);
  });
  canvasTex(s, 'bg_costa_far', W, H, (c) => {
    for (let x = 0; x < W; x++) { const h = 20 + per(x, 2) * 8 + per(x, 5, 1) * 4; rect(c, x, 178 - h, 1, h, '#3f9a78'); }
    rect(c, 0, 178, W, 70, '#1f9aa8');
    for (let y = 180; y < GROUND; y += 5) for (let x = (y * 7) % 23; x < W; x += 23) rect(c, x, y, 6, 1, '#7fe0e8');
    rect(c, 0, 178, W, 2, '#d5f5f2');
  });
  canvasTex(s, 'bg_costa_near', W, H, (c) => {
    rect(c, 0, 226, W, 22, '#e6c98a');
    for (let x = 0; x < W; x++) rect(c, x, 226 + Math.round(per(x, 4) * 2), 1, 2, '#f3dca4');
    [60, 190, 330, 440].forEach((x, i) => palm(c, x, 232, 70 - (i % 2) * 14, '#6b4423', i % 2 ? '#2f9e44' : '#3fb55a'));
    [125, 380].forEach((x) => { rect(c, x, 205, 28, 22, '#c7955a'); rect(c, x - 3, 197, 34, 9, '#a86a35'); rect(c, x + 10, 212, 8, 15, '#6b4423'); for (let i = 0; i < 28; i += 4) rect(c, x + i, 205, 1, 22, '#9b6a38'); });
  });
  canvasTex(s, 'bg_costa_ground', W, 22, (c) => {
    rect(c, 0, 0, W, 22, '#f0d79a'); rect(c, 0, 0, W, 3, '#fff0bf');
    for (let x = 0; x < W; x += 9) { rect(c, x + (x % 5), 7 + (x % 4) * 3, 3, 1, '#d4b676'); }
    for (let x = 14; x < W; x += 71) rect(c, x, 4, 3, 2, '#f4a8b0');
  });
}

function islas(s: Phaser.Scene) {
  canvasTex(s, 'bg_islas_sky', W, H, (c) => {
    sky(c, ['#41c1f0', '#8de0ff', '#d9f7ff', '#bff0ea']);
    clouds(c, '#ffffff', [44, 82], 0.95);
  });
  canvasTex(s, 'bg_islas_far', W, H, (c) => {
    rect(c, 0, 176, W, 72, '#1fb5b0');
    for (let y = 180; y < GROUND; y += 5) for (let x = (y * 11) % 29; x < W; x += 29) rect(c, x, y, 7, 1, '#8ff0e8');
    [[90, 70, 38], [300, 90, 48], [430, 50, 26]].forEach(([cx, w, h]) => {
      for (let x = -w; x <= w; x++) { const k = 1 - Math.abs(x) / w; const hh = Math.round(h * Math.pow(k, 0.7)); rect(c, (cx + x + W) % W, 176 - hh, 1, hh, '#59687a'); rect(c, (cx + x + W) % W, 176 - hh, 1, 2, '#7a8a9c'); }
    });
    rect(c, 0, 176, W, 2, '#dff8f6');
  });
  canvasTex(s, 'bg_islas_near', W, H, (c) => {
    rect(c, 0, 228, W, 20, '#2a2f3a');
    for (let x = 0; x < W; x++) rect(c, x, 228 + Math.round(per(x, 6) * 1.5), 1, 2, '#3a4150');
    [70, 250, 400].forEach((x, i) => { for (let k = 0; k < 3; k++) { blob(c, x + k * 9, 214 - k * 7 + (i % 2), 6, 9, '#3f8f3a'); rect(c, x + k * 9 - 1, 205 - k * 7, 1, 2, '#d94f6a'); } });
    blob(c, 170, 224, 22, 10, '#7a6a4a'); blob(c, 188, 218, 7, 6, '#9a8a62'); rect(c, 158, 230, 4, 4, '#6a5a3c'); rect(c, 180, 230, 4, 4, '#6a5a3c');
    blob(c, 335, 228, 12, 5, '#1b1f27'); rect(c, 342, 222, 4, 2, '#1b1f27');
  });
  canvasTex(s, 'bg_islas_ground', W, 22, (c) => {
    rect(c, 0, 0, W, 22, '#2e323d'); rect(c, 0, 0, W, 3, '#4a5160');
    for (let x = 0; x < W; x += 13) rect(c, x, 7 + (x % 3) * 4, 4, 2, '#1f222b');
    for (let x = 6; x < W; x += 61) rect(c, x, 2, 5, 3, '#e07a5f');
  });
}

function viento(s: Phaser.Scene) {
  canvasTex(s, 'bg_viento_sky', W, H, (c) => {
    sky(c, ['#2c5a98', '#6aa7de', '#cfe3f5', '#f2e6d8']);
    clouds(c, '#ffffff', [34, 70, 108], 0.85);
  });
  canvasTex(s, 'bg_viento_far', W, H, (c) => {
    for (let x = 0; x < W; x++) rect(c, x, 190 - Math.round(24 + per(x, 3) * 10 + per(x, 7, 2) * 5), 1, 80, '#5a7fa8');
    for (let x = -150; x <= 150; x++) { const hh = Math.round(135 * (1 - Math.abs(x) / 150)); const xx = (240 + x + W) % W; rect(c, xx, 195 - hh, 1, hh, '#7d8fa8'); const snow = Math.round(hh * 0.4); rect(c, xx, 195 - hh, 1, Math.max(0, snow - Math.abs(x) * 0.15), '#f7fbff'); }
    clouds(c, '#ffffff', [168, 180], 0.9);
  });
  canvasTex(s, 'bg_viento_near', W, H, (c) => {
    for (let x = 0; x < W; x++) { const h = 22 + per(x, 2) * 9 + per(x, 5, 1) * 4; rect(c, x, 232 - h, 1, h + 16, '#7a8f3a'); rect(c, x, 232 - h, 1, 3, '#a1b456'); }
    for (let x = 20; x < W; x += 47) { rect(c, x, 212 - (x % 3) * 3, 2, 14, '#556b2f'); rect(c, x - 3, 208 - (x % 3) * 3, 8, 2, '#8a9f45'); }
    [90, 350].forEach((x) => { rect(c, x, 214, 3, 18, '#3d2c1e'); blob(c, x + 1, 210, 8, 5, '#3f7a3a'); rect(c, x - 2, 205, 1, 6, '#f2a31f'); });
    [210, 420].forEach((x) => { rect(c, x, 214, 22, 14, '#e8d7b9'); rect(c, x - 2, 208, 26, 6, '#b8543a'); rect(c, x + 8, 219, 6, 9, '#5a3d28'); });
  });
  canvasTex(s, 'bg_viento_ground', W, 22, (c) => {
    rect(c, 0, 0, W, 22, '#5a4a32'); rect(c, 0, 0, W, 6, '#6f9a3a'); rect(c, 0, 0, W, 2, '#9bc24d');
    for (let x = 0; x < W; x += 7) rect(c, x, 6 + (x % 4) * 2, 2, 1, '#3d2f1e');
    for (let x = 5; x < W; x += 29) rect(c, x, -2, 1, 3, '#b8d86a');
  });
}

function lava(s: Phaser.Scene) {
  canvasTex(s, 'bg_lava_sky', W, H, (c) => {
    sky(c, ['#2a0b1a', '#7a1d2a', '#d94a1f', '#ffae42']);
    for (let i = 0; i < 40; i++) rect(c, (i * 97) % W, (i * 53) % 120, 1, 1, '#ffd9a0');
  });
  canvasTex(s, 'bg_lava_far', W, H, (c) => {
    [[120, 120, 105], [360, 150, 130]].forEach(([cx, w, h]) => {
      for (let x = -w; x <= w; x++) {
        const k = 1 - Math.abs(x) / w; let hh = Math.round(h * k);
        if (Math.abs(x) < 12) hh = Math.min(hh, Math.round(h * (1 - 12 / w)) - 5 + Math.round(Math.abs(x) * 0.4));
        rect(c, (cx + x + W) % W, 200 - hh, 1, hh, '#3a1a22');
      }
      const top = 200 - Math.round(h * (1 - 12 / w)) + 5;
      blob(c, cx, top, 11, 3, '#ff7a2e'); blob(c, cx, top, 7, 1, '#ffd23c');
      for (let y = top; y < 200; y++) rect(c, cx + 8 + Math.round((y - top) * 0.45) + Math.round(Math.sin(y / 5)), y, 2, 1, '#ff5a1f');
      blob(c, cx + 6, top - 18, 12, 9, '#5a3a40'); blob(c, cx - 5, top - 32, 14, 9, '#6b4a50'); blob(c, cx + 8, top - 44, 10, 7, '#7a5a60');
    });
    rect(c, 0, 200, W, 48, '#2a1218');
  });
  canvasTex(s, 'bg_lava_near', W, H, (c) => {
    for (let x = 0; x < W; x++) { const h = 14 + per(x, 4) * 8 + per(x, 9, 1) * 4; rect(c, x, 238 - h, 1, h + 10, '#1c0e12'); }
    for (let x = 0; x < W; x++) { const y = 236 + Math.round(per(x, 3) * 3); rect(c, x, y, 1, 3, '#ff5a1f'); rect(c, x, y, 1, 1, '#ffd23c'); }
    [60, 200, 310, 430].forEach((x) => { rect(c, x, 214, 4, 10, '#0f070a'); rect(c, x - 2, 218, 8, 8, '#0f070a'); });
  });
  canvasTex(s, 'bg_lava_ground', W, 22, (c) => {
    rect(c, 0, 0, W, 22, '#241216'); rect(c, 0, 0, W, 3, '#3f2229');
    for (let x = 0; x < W; x += 31) { rect(c, x, 6, 2, 8, '#ff5a1f'); rect(c, x + 2, 12, 6, 2, '#ff8a3c'); rect(c, x + 8, 14, 2, 6, '#ff5a1f'); }
  });
}

function selva(s: Phaser.Scene) {
  canvasTex(s, 'bg_selva_sky', W, H, (c) => {
    sky(c, ['#0f3d2a', '#1f7a4a', '#7fcf9b', '#d6f0c8']);
    for (let i = 0; i < 6; i++) rect(c, 60 + i * 70, 0, 12, 130, 'rgba(255,255,220,0.10)');
  });
  canvasTex(s, 'bg_selva_far', W, H, (c) => {
    for (let x = 0; x < W; x++) { const h = 70 + per(x, 3) * 18 + per(x, 8, 1) * 10; rect(c, x, 210 - h, 1, h, '#2f7a52'); }
    for (let x = 0; x < W; x += 6) { const h = 30 + per(x, 5, 2) * 14 + (x % 12); blob(c, x, 150 - Math.round(per(x, 3) * 18), 8, 8, '#2a6f4a'); void h; }
    c.globalAlpha = 0.35; rect(c, 0, 160, W, 60, '#d6f0c8'); c.globalAlpha = 1;
  });
  canvasTex(s, 'bg_selva_near', W, H, (c) => {
    [40, 170, 290, 420].forEach((x, i) => { rect(c, x, 0, 14 + (i % 2) * 4, 240, '#2b1a10'); rect(c, x, 0, 3, 240, '#4a2f1c'); rect(c, x - 3, 232, 22, 8, '#2b1a10'); });
    for (let x = 0; x < W; x++) { const h = 16 + per(x, 4) * 7 + per(x, 11, 1) * 4; rect(c, x, 236 - h, 1, h + 12, '#14602e'); rect(c, x, 236 - h, 1, 2, '#2f9e44'); }
    [100, 230, 360].forEach((x) => { blob(c, x, 206, 16, 6, '#1a7a3a'); blob(c, x + 6, 200, 12, 5, '#2f9e44'); rect(c, x, 206, 1, 12, '#0f4a22'); });
    [70, 250, 390].forEach((x) => { for (let y = 0; y < 90; y++) rect(c, x + Math.round(Math.sin(y / 9) * 2), y, 2, 1, '#1f7a36'); rect(c, x - 2, 90, 6, 3, '#7bd389'); });
  });
  canvasTex(s, 'bg_selva_ground', W, 22, (c) => {
    rect(c, 0, 0, W, 22, '#3a2a18'); rect(c, 0, 0, W, 6, '#2f6f2f'); rect(c, 0, 0, W, 2, '#4caf50');
    for (let x = 0; x < W; x += 11) rect(c, x, 8 + (x % 3) * 3, 3, 2, '#241a0e');
    for (let x = 8; x < W; x += 53) { rect(c, x, -2, 1, 3, '#7bd389'); rect(c, x + 2, -3, 1, 4, '#7bd389'); }
  });
}

export function makeBackgrounds(scene: Phaser.Scene) {
  costa(scene); islas(scene); viento(scene); lava(scene); selva(scene);
}
export const bgKeys = (id: WorldId) => ({ sky: `bg_${id}_sky`, far: `bg_${id}_far`, near: `bg_${id}_near`, ground: `bg_${id}_ground` });
export const GROUND_TOP = GROUND;
