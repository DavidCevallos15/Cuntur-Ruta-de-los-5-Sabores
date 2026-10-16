import Phaser from 'phaser';

export type Pal = Record<string, string>;
export type Ctx = CanvasRenderingContext2D;

/** Crea una textura de canvas y la dibuja con `fn`. Todo se dibuja con rectángulos enteros (pixel art nítido). */
export function canvasTex(scene: Phaser.Scene, key: string, w: number, h: number, fn: (c: Ctx) => void): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) throw new Error('No se pudo crear la textura ' + key);
  const c = tex.getContext();
  c.imageSmoothingEnabled = false;
  fn(c);
  tex.refresh();
}

export const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

/** Elipse rellena en pixeles (por filas). */
export function blob(c: Ctx, cx: number, cy: number, rx: number, ry: number, col: string) {
  c.fillStyle = col;
  for (let dy = -ry; dy <= ry; dy++) {
    const k = Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.0001)));
    const half = Math.round(rx * k);
    c.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2 + 1, 1);
  }
}

/** Dibuja una rejilla ASCII: '.' = transparente. */
export function drawGrid(c: Ctx, rows: string[], pal: Pal, ox = 0, oy = 0) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch];
      if (!col) throw new Error(`Carácter de paleta desconocido "${ch}"`);
      c.fillStyle = col;
      c.fillRect(ox + x, oy + y, 1, 1);
    }
  });
}

/** Contorno de 1px alrededor de lo opaco (se aplica sobre el mismo canvas, que debe traer 1px de margen). */
export function outline(c: Ctx, w: number, h: number, col: string) {
  const d = c.getImageData(0, 0, w, h);
  const a = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d.data[(y * w + x) * 4 + 3]);
  c.fillStyle = col;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (a(x, y) === 0 && (a(x - 1, y) > 0 || a(x + 1, y) > 0 || a(x, y - 1) > 0 || a(x, y + 1) > 0)) c.fillRect(x, y, 1, 1);
}

export function gridTex(scene: Phaser.Scene, key: string, rows: string[], pal: Pal, opts: { outline?: string } = {}) {
  const pad = opts.outline ? 1 : 0;
  const w = Math.max(...rows.map((r) => r.length)) + pad * 2;
  const h = rows.length + pad * 2;
  canvasTex(scene, key, w, h, (c) => {
    drawGrid(c, rows, pal, pad, pad);
    if (opts.outline) outline(c, w, h, opts.outline);
  });
}

export function hex(col: string): number {
  return parseInt(col.replace('#', ''), 16);
}
