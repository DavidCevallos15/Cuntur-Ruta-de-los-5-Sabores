import Phaser from 'phaser';
import { makeDigits } from '../game/ui.ts';
import { blob, canvasTex, drawGrid, gridTex, outline, rect, type Ctx, type Pal } from './pixels.ts';

const pad = (rows: string[], w: number) => rows.map((r) => r.padEnd(w, '.').slice(0, w));
const overlay = (base: string[], top: string[]) =>
  base.map((r, y) => r.split('').map((ch, x) => (top[y] && top[y][x] && top[y][x] !== '.' ? top[y][x] : ch)).join(''));

/* ---------- Cóndor: 28x18, mira a la derecha ---------- */
const CW = 28;
const CONDOR_BODY = pad([
  '', '', '', '', '',
  '......................KKKK',
  '.....................KRRRRK',
  '....................KRRRERRYY',
  '..KKKKKKKKKKKKKKWWWWKRRRRRYY',
  '.KKKKKKKKKKKKKKKWWWWKRRRYY',
  'KKKKKKKKKKKKKKKKKWWWWKKK',
  '.KKKKKKKKKKKKKKKKKKKK',
  '..KKKKKKKKKKKKKKKKK',
  '....KKKKKKKKKKKKK',
  '......KK..KK.KK',
  '', '', '',
], CW);
const WING_UP = pad([
  '..KK', '..KKKK', '...KKKKK', '....KKKKKKK', '.....KKKKKKKKK',
  '......KKGGGGKKKKK', '.......KKGGGKKKKKK', '........KKKKKKKKK',
], CW);
const WING_MID = pad([
  '', '', '', '', '',
  '..KKKKKKKKKKKK', '.KKKGGGGGGKKKKK', 'KKKGGGGGGGGKKKKK', '.KKKKKKKKKKKKK',
], CW);
const WING_DOWN = pad([
  '', '', '', '', '', '', '', '',
  '', '', '..KKKKKKKKKKKKK', '...KKKGGGGKKKKK', '....KKGGGGGKKK', '.....KKKGGGKK', '......KKKKKK', '.......KKK',
], CW);
const CONDOR_PAL: Pal = { K: '#2a2d44', W: '#f4f1e8', G: '#e6e9f5', R: '#c4584c', Y: '#e9b949', E: '#fff6d8' };

export function makeCondor(scene: Phaser.Scene) {
  const frames = [WING_UP, WING_MID, WING_DOWN];
  frames.forEach((wing, i) => {
    const body = CONDOR_BODY.slice();
    // El ala va delante del cuerpo; en la fila 0..17 se superpone.
    const rows = overlay(body, wing.concat(Array(Math.max(0, 18 - wing.length)).fill('')));
    gridTex(scene, `cond_${i}`, rows.slice(0, 18), CONDOR_PAL, { outline: '#dfe6f5' });
  });
}

/* ---------- Peligros aéreos (≈ 18x12) ---------- */
const GULL = [
  '.W..............W.', 'WWW............WWW', 'WGWW.........WWGW', '.WGGWW..KK.WWGGW.',
  '..WGGGWWWWWWGGGW..', '...WWGGGWWGGGWW...', '.....WWWWWWWW.YY..', '......WWWWWW.YY...', '.......WWWW.......',
].map((r) => r.padEnd(18, '.'));
const PELI = [
  '..........WWWW....', '.........WWWWWW...', '........WWWKWW....', '.....WWWWWWWWWYYYY',
  '..WWWWWWWWWWWWYYYY', 'WWWGGGWWWWWWWYYY..', '.WWGGGGWWWWW.YY...', '..WWWWWWWWW.......', '...WWWWWW.........', '....OO.OO.........',
].map((r) => r.padEnd(18, '.'));
const POP = [
  '....WW....WW......', '..WWYYWWWWYYWW....', '.WYYWWYYYYWWYYW...', 'WYYWKWYYYYWKWYYW..',
  'WYYYYYYWWYYYYYYW..', 'WYYWWYYYYYYWWYYW..', '.WYYYYWWWWYYYYW...', '..WWWYYYYYYWWW....', '....WWWWWWWW......',
].map((r) => r.padEnd(18, '.'));
const FIREBALL = [
  '.......YYY........', '..RRR.YYYYYY......', '.RRRRRYYWWYYY.....', 'ORRRRYYYWWWYYY....',
  'ORRRRYYYWWWYYY....', '.RRRRRYYWWYYY.....', '..RRR.YYYYYY......', '.......YYY........',
].map((r) => r.padEnd(18, '.'));
const BUG = [
  '..GG....GG........', '.GCCG..GCCG.......', 'GCCCCGGCCCCG......', '.GCCCGGGCCCG......',
  '...GGPPPPGG.......', '...PPPPPPPPP.PP...', '..PPPKPPPPPPPPP...', '...PPPPPPPPP.PP...', '....P.P.P.P.......',
].map((r) => r.padEnd(18, '.'));

/* ---------- Comidas (14x14) ---------- */
function foodBowl(c: Ctx, broth: string, extra: (c: Ctx) => void) {
  blob(c, 7, 8, 6, 3, '#e8d7b9');
  rect(c, 1, 7, 12, 1, '#fff2d6');
  blob(c, 7, 7, 5, 1, broth);
  extra(c);
  rect(c, 5, 11, 4, 1, '#c9b48e');
}

export function makeFoods(scene: Phaser.Scene) {
  const mk = (key: string, fn: (c: Ctx) => void) =>
    canvasTex(scene, key, 16, 16, (c) => {
      c.save(); c.translate(1, 1); fn(c); c.restore();
      outline(c, 16, 16, '#2b1a14');
    });
  // Encebollado con chifle: sopa naranja + cebolla morada + chifles dorados
  mk('food_encebollado', (c) => foodBowl(c, '#f09a2e', (c2) => {
    rect(c2, 3, 6, 2, 1, '#b8396a'); rect(c2, 6, 7, 3, 1, '#b8396a'); rect(c2, 9, 6, 2, 1, '#d46a9a');
    rect(c2, 5, 5, 3, 2, '#f4a58a');
    rect(c2, 9, 2, 1, 4, '#e6b34a'); rect(c2, 10, 1, 1, 5, '#f2c75c'); rect(c2, 11, 3, 1, 3, '#e6b34a'); rect(c2, 2, 3, 1, 3, '#f2c75c');
  }));
  // Ceviche de atún: copa con trozos rosados, limón y cilantro
  mk('food_ceviche', (c) => {
    rect(c, 3, 5, 8, 1, '#f1f7f7'); rect(c, 3, 6, 8, 3, '#f6a29a'); rect(c, 4, 9, 6, 1, '#f1f7f7'); rect(c, 6, 10, 2, 2, '#f1f7f7'); rect(c, 4, 12, 6, 1, '#f1f7f7');
    rect(c, 4, 5, 2, 2, '#e8504f'); rect(c, 7, 5, 3, 1, '#c93f5a'); rect(c, 5, 7, 2, 1, '#b8396a');
    blob(c, 11, 4, 2, 2, '#9bd34a'); rect(c, 11, 3, 1, 2, '#f7f3c0'); rect(c, 2, 4, 2, 1, '#4caf50'); rect(c, 3, 3, 1, 1, '#4caf50');
  });
  // Hornado: lonja de cerdo dorada con papa y mote
  mk('food_hornado', (c) => {
    blob(c, 7, 11, 7, 2, '#efe6d2');
    rect(c, 2, 5, 10, 5, '#a8562a'); rect(c, 3, 4, 8, 1, '#c97a3c'); rect(c, 3, 6, 4, 1, '#d99a56'); rect(c, 8, 7, 3, 1, '#d99a56'); rect(c, 4, 8, 6, 1, '#7a3a18');
    rect(c, 11, 8, 2, 2, '#f4dc7a'); rect(c, 1, 9, 2, 2, '#f7f1c8');
  });
  // Llapingachos: tortillas de papa con huevo y chorizo
  mk('food_llapingacho', (c) => {
    blob(c, 7, 10, 7, 2, '#efe6d2');
    blob(c, 5, 8, 4, 2, '#f1c75a'); blob(c, 9, 7, 4, 2, '#e8b43e'); rect(c, 3, 8, 3, 1, '#fff0a8'); rect(c, 8, 6, 3, 1, '#fff0a8');
    rect(c, 6, 4, 4, 3, '#fffaf0'); rect(c, 7, 5, 2, 1, '#f2a31f');
    rect(c, 10, 8, 3, 2, '#a1362a'); rect(c, 1, 4, 3, 1, '#4caf50');
  });
  // Maito: pescado envuelto en hoja de bijao, amarrado
  mk('food_maito', (c) => {
    blob(c, 7, 7, 6, 4, '#2f8a3e'); rect(c, 2, 6, 10, 1, '#4caf50'); rect(c, 3, 8, 8, 1, '#1f6a2c');
    rect(c, 6, 3, 2, 8, '#8a5a2b'); rect(c, 12, 5, 2, 1, '#2f8a3e'); rect(c, 0, 8, 2, 1, '#2f8a3e'); rect(c, 4, 5, 1, 1, '#9bd34a');
  });
}

/* ---------- Peligros: pequeños ---------- */
export function makeHazardsG(scene: Phaser.Scene) {
  const pal: Pal = { W: '#f6f6f2', G: '#aeb6c4', K: '#202030', Y: '#f2b134', O: '#e98a2b', R: '#e8483a', C: '#bfe8ff', P: '#2f9e8f' };
  const o = '#1c1c28';
  gridTex(scene, 'hz_gaviota', GULL, pal, { outline: o });
  gridTex(scene, 'hz_pelicano', PELI, { ...pal, W: '#e7e3da', Y: '#f0a53a' }, { outline: o });
  gridTex(scene, 'hz_canguil', POP, { ...pal, W: '#ffffff', Y: '#ffe08a' }, { outline: o });
  gridTex(scene, 'hz_bola_lava', FIREBALL, { ...pal, W: '#fff6c0', Y: '#ffb02e', R: '#e8431f', O: '#8f1d12' }, { outline: '#3b0a0a' });
  gridTex(scene, 'hz_insecto', BUG, { ...pal, G: '#7cd6c4', C: '#d4fff4', P: '#2f7d3f' }, { outline: '#0f2a1a' });
}

/* ---------- Peligros: columnas (22 x 92) ---------- */
export function makeHazardsB(scene: Phaser.Scene) {
  const W = 22, H = 92;
  // Palmera (ancla abajo)
  canvasTex(scene, 'hz_palmera', W, H, (c) => {
    for (let y = 18; y < H; y++) {
      const bend = Math.round(Math.sin(y / 14) * 1.5);
      rect(c, 8 + bend, y, 6, 1, y % 6 < 2 ? '#6b4423' : '#8a5a2b');
    }
    const leaf = '#2f9e44', leaf2 = '#58c26a';
    for (let i = 0; i < 6; i++) { rect(c, 0 + i, 14 + (i >> 1), 1, 3, leaf); rect(c, 21 - i, 14 + (i >> 1), 1, 3, leaf); }
    rect(c, 1, 12, 8, 3, leaf); rect(c, 13, 12, 8, 3, leaf); rect(c, 3, 9, 6, 3, leaf2); rect(c, 13, 9, 6, 3, leaf2);
    rect(c, 6, 4, 10, 6, leaf); rect(c, 8, 1, 6, 4, leaf2); rect(c, 9, 15, 4, 3, '#a56b2a');
    outline(c, W, H, '#14301c');
  });
  // Roca volcánica (ancla abajo): apilado irregular
  canvasTex(scene, 'hz_roca', W, H, (c) => {
    const rows: [number, number, number][] = [[80, 22, 12], [64, 20, 16], [50, 17, 14], [36, 13, 14], [22, 10, 14], [8, 7, 14]];
    rows.forEach(([y, w, h], i) => {
      const x = Math.round((W - w) / 2) + (i % 2 ? 1 : -1);
      rect(c, x, y, w, h, i % 2 ? '#4a4f5c' : '#3a3f4b'); rect(c, x, y, w, 2, '#6b7280'); rect(c, x + w - 3, y + 2, 2, h - 2, '#2a2d38'); rect(c, x + 3, y + 5, 3, 1, '#59606e');
    });
    rect(c, 0, 90, 22, 2, '#2a2d38');
    outline(c, W, H, '#14141c');
  });
  // Nube de tormenta (cuelga del techo)
  canvasTex(scene, 'hz_tormenta', W, H, (c) => {
    blob(c, 11, 12, 11, 9, '#4b5563'); blob(c, 6, 18, 6, 6, '#374151'); blob(c, 16, 18, 6, 6, '#374151'); blob(c, 11, 8, 8, 5, '#6b7280');
    for (let y = 28; y < 80; y += 6) { rect(c, 5, y, 1, 3, '#8ecae6'); rect(c, 16, y + 2, 1, 3, '#8ecae6'); }
    const bolt = '#ffe45c';
    rect(c, 11, 28, 3, 6, bolt); rect(c, 9, 34, 4, 5, bolt); rect(c, 11, 39, 3, 6, bolt); rect(c, 8, 45, 4, 5, bolt); rect(c, 9, 50, 2, 8, bolt);
    outline(c, W, H, '#10131c');
  });
  // Columna de ceniza (ancla abajo)
  canvasTex(scene, 'hz_ceniza', W, H, (c) => {
    blob(c, 11, 82, 10, 8, '#3a3236'); blob(c, 11, 66, 8, 8, '#4a4145'); blob(c, 12, 50, 8, 8, '#5a5054'); blob(c, 10, 34, 8, 8, '#6b6065'); blob(c, 11, 18, 10, 9, '#7a6f74'); blob(c, 9, 9, 7, 6, '#8d8186');
    rect(c, 4, 86, 14, 4, '#ff6b2b'); rect(c, 7, 84, 8, 2, '#ffb02e'); rect(c, 13, 60, 2, 2, '#ff8a3c'); rect(c, 7, 42, 2, 2, '#ff8a3c');
    outline(c, W, H, '#1a0f12');
  });
  // Rama con lianas (cuelga del techo)
  canvasTex(scene, 'hz_liana', W, H, (c) => {
    rect(c, 0, 0, 22, 9, '#5b3a1e'); rect(c, 0, 0, 22, 2, '#7a5230'); rect(c, 2, 4, 3, 1, '#3d2610');
    [[3, 70], [9, 88], [15, 60]].forEach(([x, len]) => {
      for (let y = 9; y < len; y++) rect(c, x + Math.round(Math.sin(y / 7 + x) * 1.2), y, 2, 1, '#2f8a3e');
      for (let y = 20; y < len; y += 14) { rect(c, x - 3, y, 3, 2, '#4caf50'); rect(c, x + 2, y + 5, 3, 2, '#4caf50'); }
      rect(c, x - 1, len, 4, 3, '#7bd389');
    });
    rect(c, 18, 9, 2, 22, '#2f8a3e'); rect(c, 17, 31, 4, 3, '#7bd389');
    outline(c, W, H, '#0e2a14');
  });
}

/* ---------- Personas de fondo (16x26) ---------- */
interface PersonSpec { skin: string; hair: string; shirt: string; pants: string; hat?: 'cap' | 'chef' | 'sombrero' | 'felt' | 'band'; hatCol?: string; apron?: string; shawl?: string; tall?: boolean; vest?: string }
const PEOPLE: Record<string, PersonSpec> = {
  npc_vendedora: { skin: '#c68642', hair: '#2b1810', shirt: '#e8483a', pants: '#3b4a6b', hat: 'band', hatCol: '#f2c75c', apron: '#fff7e6' },
  npc_pescador: { skin: '#a8693a', hair: '#1c1410', shirt: '#4a7fb5', pants: '#d9c9a0', hat: 'cap', hatCol: '#2d5a8f' },
  npc_nino: { skin: '#b9763f', hair: '#1c1410', shirt: '#f2c75c', pants: '#3a5a8f' },
  npc_cocinero: { skin: '#c68642', hair: '#1c1410', shirt: '#f6f6f2', pants: '#2b2f3a', hat: 'chef', hatCol: '#ffffff' },
  npc_guia: { skin: '#b9763f', hair: '#1c1410', shirt: '#7a9e4a', pants: '#6b5a3a', hat: 'sombrero', hatCol: '#d9b46a', vest: '#e98a2b' },
  npc_senora: { skin: '#c08050', hair: '#1c1410', shirt: '#d23f7a', pants: '#2f6f6a', hat: 'felt', hatCol: '#7a5a3a', shawl: '#f2a31f' },
};

export function makePeople(scene: Phaser.Scene) {
  Object.entries(PEOPLE).forEach(([key, p]) => {
    const kid = key === 'npc_nino';
    const H = 28;
    canvasTex(scene, key, 18, H, (c) => {
      const y0 = kid ? 6 : 0; // los niños son más bajos
      rect(c, 5, y0 + 18, 3, 7, p.pants); rect(c, 9, y0 + 18, 3, 7, p.pants);
      rect(c, 4, y0 + 24, 4, 2, '#2b1a14'); rect(c, 9, y0 + 24, 4, 2, '#2b1a14');
      rect(c, 4, y0 + 9, 10, 10, p.shirt); rect(c, 2, y0 + 10, 2, 7, p.shirt); rect(c, 14, y0 + 10, 2, 7, p.shirt);
      rect(c, 2, y0 + 17, 2, 2, p.skin); rect(c, 14, y0 + 17, 2, 2, p.skin);
      if (p.apron) rect(c, 5, y0 + 13, 8, 10, p.apron);
      if (p.vest) { rect(c, 4, y0 + 9, 3, 9, p.vest); rect(c, 11, y0 + 9, 3, 9, p.vest); }
      if (p.shawl) { rect(c, 3, y0 + 8, 12, 4, p.shawl); rect(c, 5, y0 + 12, 8, 2, p.shawl); }
      rect(c, 5, y0 + 2, 8, 8, p.skin); rect(c, 5, y0 + 2, 8, 2, p.hair);
      rect(c, 7, y0 + 5, 1, 2, '#1c1410'); rect(c, 11, y0 + 5, 1, 2, '#1c1410'); rect(c, 8, y0 + 8, 3, 1, '#7a3a2a');
      if (p.hat === 'cap') { rect(c, 4, y0 + 1, 10, 3, p.hatCol!); rect(c, 12, y0 + 3, 4, 1, p.hatCol!); }
      if (p.hat === 'chef') { rect(c, 5, y0 - 4, 8, 5, p.hatCol!); rect(c, 4, y0 - 2, 10, 3, p.hatCol!); }
      if (p.hat === 'sombrero') { rect(c, 1, y0 + 1, 16, 2, p.hatCol!); rect(c, 5, y0 - 2, 8, 4, p.hatCol!); rect(c, 5, y0, 8, 1, '#8a5a2b'); }
      if (p.hat === 'felt') { rect(c, 3, y0 + 1, 12, 2, p.hatCol!); rect(c, 6, y0 - 2, 6, 4, p.hatCol!); }
      if (p.hat === 'band') { rect(c, 5, y0 + 2, 8, 1, p.hatCol!); }
      if (key === 'npc_senora') { rect(c, 3, y0 + 2, 2, 8, p.hair); rect(c, 13, y0 + 2, 2, 8, p.hair); }
      outline(c, 18, H, '#1c1410');
    });
  });
}

/* ---------- Letrero de madera (se escala con el texto en escena) y UI ---------- */
export function makeUi(scene: Phaser.Scene) {
  const hp: Pal = { R: '#ef476f', D: '#b3264a', W: '#ffd1dc', K: '#3a0f1c', E: '#4a4560' };
  const heart = ['.KK.KK.', 'KRWRKRK', 'KRRRRRK', 'KRRRRRK', '.KRRRK.', '..KRK..', '...K...'];
  gridTex(scene, 'ui_heart', heart, hp);
  gridTex(scene, 'ui_heart_empty', heart.map((r) => r.replace(/[RW]/g, 'E')), hp);
  canvasTex(scene, 'px', 2, 2, (c) => rect(c, 0, 0, 2, 2, '#ffffff'));
  canvasTex(scene, 'ui_post', 3, 14, (c) => { rect(c, 0, 0, 3, 14, '#6b4423'); rect(c, 0, 0, 1, 14, '#8a5a2b'); });
  canvasTex(scene, 'meta_gate', 40, 120, (c) => {
    rect(c, 0, 0, 6, 120, '#f6f6f2'); rect(c, 34, 0, 6, 120, '#f6f6f2');
    for (let y = 0; y < 120; y += 12) { rect(c, 0, y, 6, 6, '#202030'); rect(c, 34, y + 6, 6, 6, '#202030'); }
    for (let x = 6; x < 34; x += 4) for (let y = 0; y < 16; y += 4) rect(c, x, y, 4, 4, (x + y) % 8 === 0 ? '#202030' : '#f6f6f2');
  });
}

export function makeAllSprites(scene: Phaser.Scene) {
  makeCondor(scene); makeFoods(scene); makeHazardsG(scene); makeHazardsB(scene); makePeople(scene); makeUi(scene); makeDigits(scene);
}
// evita el aviso de import sin uso si se simplifica más tarde
export type { Ctx };
export const _drawGrid = drawGrid;
