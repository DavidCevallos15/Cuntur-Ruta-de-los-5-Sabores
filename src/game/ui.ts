import Phaser from 'phaser';
import { sfx } from './audio.ts';

/** El juego se diseña en 480x270 pero se renderiza a 960x540 con zoom 2: pixel art igual de nítido y texto legible. */
export const ZOOM = 2;
export function setupCam(scene: Phaser.Scene): void { scene.cameras.main.setOrigin(0, 0).setZoom(ZOOM); }

export const FONT = '"Pixelify Sans", ui-monospace, monospace';

export function txt(scene: Phaser.Scene, x: number, y: number, s: string, size = 10, color = '#ffffff', opts: Phaser.Types.GameObjects.Text.TextStyle = {}) {
  return scene.add.text(Math.round(x), Math.round(y), s, { fontFamily: FONT, fontSize: size + 'px', color, resolution: ZOOM, ...opts });
}

export interface Btn { box: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; setEnabled(v: boolean): void; objs: Phaser.GameObjects.GameObject[] }

export function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, fill: string, onTap: () => void, depth = 50): Btn {
  const fillNum = Phaser.Display.Color.HexStringToColor(fill).color;
  const shadow = scene.add.rectangle(x, y + 2, w, h, 0x000000, 0.35).setDepth(depth);
  const box = scene.add.rectangle(x, y, w, h, fillNum).setStrokeStyle(1, 0xffffff, 0.9).setDepth(depth + 1).setInteractive({ useHandCursor: true });
  const t = txt(scene, x, y, label, 11, '#101820', { fontStyle: '600' }).setOrigin(0.5).setDepth(depth + 2);
  let enabled = true;
  box.on('pointerdown', () => {
    if (!enabled) return;
    sfx(scene, 'ui_click', { vol: 0.6 });
    box.setScale(0.96); scene.time.delayedCall(70, () => box.setScale(1));
    onTap();
  });
  return {
    box, label: t, objs: [shadow, box, t],
    setEnabled(v: boolean) { enabled = v; box.setAlpha(v ? 1 : 0.5); t.setAlpha(v ? 1 : 0.5); },
  };
}

/** Globo de diálogo: rectángulo blanco con cola. El origen es el punto al que apunta la cola (centro-abajo). */
export function bubble(scene: Phaser.Scene, text: string, opts: { width?: number; size?: number; depth?: number; tail?: boolean } = {}) {
  const size = opts.size ?? 10;
  const t = txt(scene, 0, 0, text, size, '#1b1b26', { wordWrap: { width: opts.width ?? 104 }, align: 'center', lineSpacing: 1 });
  const pad = 4;
  const w = Math.ceil(t.width) + pad * 2, h = Math.ceil(t.height) + pad * 2;
  const g = scene.add.graphics();
  g.fillStyle(0x1b1b26, 1); g.fillRect(-w / 2 - 1, -h - 6 - 1, w + 2, h + 2);
  g.fillStyle(0xfffdf5, 1); g.fillRect(-w / 2, -h - 6, w, h);
  if (opts.tail !== false) { g.fillStyle(0x1b1b26, 1); g.fillTriangle(-4, -7, 4, -7, 0, 0); g.fillStyle(0xfffdf5, 1); g.fillTriangle(-3, -7, 3, -7, 0, -2); }
  t.setOrigin(0.5, 0).setPosition(0, -h - 6 + pad);
  const c = scene.add.container(0, 0, [g, t]).setDepth(opts.depth ?? 6);
  return Object.assign(c, { bw: w, bh: h + 6 });
}

export const AUTHOR = 'David Cevallos';
export const PORTFOLIO = 'https://davidcevallos.vercel.app/';
/** Abre el portafolio. Llamar desde 'pointerup' (en táctil es el evento que cuenta como gesto del usuario). */
export function openPortfolio(): void {
  const w = window.open(PORTFOLIO, '_blank', 'noopener');
  if (!w) location.href = PORTFOLIO;
}

/* ---- Dígitos pixel propios (5x7): legibles a cualquier escala, sin ambigüedad 5/S ---- */
const DIGITS: Record<string, string[]> = {
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};
export function makeDigits(scene: Phaser.Scene): void {
  for (const [ch, rows] of Object.entries(DIGITS)) {
    const key = 'dg_' + (ch === '/' ? 'sl' : ch === ' ' ? 'sp' : ch);
    if (scene.textures.exists(key)) continue;
    const tex = scene.textures.createCanvas(key, 7, 9)!;
    const c = tex.getContext();
    // contorno oscuro + relleno blanco (se tiñe con setTint)
    const on = (x: number, y: number) => y >= 0 && y < 7 && x >= 0 && x < 5 && rows[y][x] === '#';
    for (let y = -1; y <= 7; y++) for (let x = -1; x <= 5; x++) {
      if (on(x, y)) continue;
      if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) { c.fillStyle = '#101820'; c.fillRect(x + 1, y + 1, 1, 1); }
    }
    c.fillStyle = '#ffffff';
    rows.forEach((r, y) => [...r].forEach((p, x) => { if (p === '#') c.fillRect(x + 1, y + 1, 1, 1); }));
    tex.refresh();
  }
}
export interface NumLabel { container: Phaser.GameObjects.Container; setText(s: string): void; setColor(c: number): void; width: number }
/** Texto numérico con los dígitos pixel. origin: 0 = izquierda, 0.5 = centrado. */
export function numLabel(scene: Phaser.Scene, x: number, y: number, s: string, scale = 2, color = 0xffffff, originX = 0): NumLabel {
  const cont = scene.add.container(x, y);
  let tint = color;
  const lbl: NumLabel = {
    container: cont, width: 0,
    setText(str: string) {
      cont.removeAll(true);
      const step = 6 * scale;
      lbl.width = str.length * step;
      [...str].forEach((ch, i) => {
        const key = 'dg_' + (ch === '/' ? 'sl' : ch === ' ' ? 'sp' : ch);
        if (!scene.textures.exists(key)) return;
        cont.add(scene.add.image(i * step - lbl.width * originX, 0, key).setOrigin(0, 0.5).setScale(scale).setTint(tint));
      });
    },
    setColor(c: number) { tint = c; cont.each((o: Phaser.GameObjects.Image) => o.setTint(c)); },
  };
  lbl.setText(s);
  return lbl;
}
