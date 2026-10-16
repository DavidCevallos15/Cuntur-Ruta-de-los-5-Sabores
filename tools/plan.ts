import { GEO, buildCourse } from '../src/content/course.ts';
import { FLAP_V, GRAV, MAX_FALL, STEP } from '../src/game/sim.ts';
import type { WorldConfig, CourseItem } from '../src/types.ts';

/** Fotogramas (de 1/60 s) máximos hasta que vy llega a MAX_FALL tras un aleteo. */
const SUB = 2;
export const K = Math.ceil((MAX_FALL - FLAP_V) / (GRAV * STEP * SUB));
/** Mínimo de fotogramas entre aleteos (humano ≈ 8 toques/s). */
export const MIN_K = 7;

export interface Solver {
  world: WorldConfig; margin: number; F: number; Y: number; yMin: number;
  V: Int8Array; items: CourseItem[]; alive: boolean;
  policy(f: number, y: number, k: number): { flap: boolean; ok: boolean };
  maxFood: number;
}

const vyOf = (k: number) => Math.min(MAX_FALL, FLAP_V + GRAV * STEP * SUB * k);

/** Inducción hacia atrás sobre (fotograma, y, k = fotogramas desde el último aleteo). V = máx. comidas alcanzables desde ahí o -1 si no hay forma de sobrevivir. */
export function solve(world: WorldConfig, margin: number): Solver {
  const { items, endX } = buildCourse(world);
  const hh = GEO.player.hitH / 2, hw = GEO.player.hitW / 2;
  // 1 px extra de holgura en suelo y techo para absorber el redondeo de los bins
  const yMin = Math.ceil(GEO.CEIL_HIT_Y + hh) + 1, yMax = Math.floor(GEO.FLOOR_HIT_Y - hh) - 1;
  const Y = yMax - yMin + 1;
  const dpx = world.speed * STEP;
  const S = Math.ceil(endX / dpx);
  const F = Math.ceil(S / SUB);
  const hz = items.filter((i) => i.type !== 'food');
  const foods = items.filter((i) => i.type === 'food');
  // hazards activos por subpaso
  const active: CourseItem[][] = Array.from({ length: F * SUB + 2 }, () => []);
  for (const h of hz) {
    const half = hw + h.w / 2 + margin;
    const a = Math.max(1, Math.ceil((h.x - half) / dpx)), b = Math.min(F * SUB + 1, Math.floor((h.x + half) / dpx));
    for (let s = a; s <= b; s++) active[s].push(h);
  }
  const foodAt = new Map<number, CourseItem[]>();
  for (const f of foods) { const s = Math.ceil(f.x / dpx); (foodAt.get(s) ?? foodAt.set(s, []).get(s)!).push(f); }

  const K1 = K + 1;
  const V = new Int8Array((F + 1) * Y * K1); // 0 por defecto al final
  const idx = (f: number, y: number, k: number) => (f * Y + y) * K1 + k;
  // Valor robusto: el sucesor y sus bins vecinos (±1 px) deben estar vivos; así el redondeo no saca al jugador de la ruta.
  const robust = (f: number, y: number, k: number) => {
    let m = 127;
    for (let d = -1; d <= 1; d++) { const yy = y + d; if (yy < 0 || yy >= Y) return -1; const v = V[idx(f, yy, k)]; if (v < m) m = v; }
    return m;
  };
  const blocked = (s: number, y: number) => {
    const a = active[s];
    for (let i = 0; i < a.length; i++) { const h = a[i]; if (Math.abs(y - h.y) < hh + h.h / 2 + margin) return true; }
    return false;
  };
  // Devuelve [valor, yBin, k'] del sucesor o null si es ilegal
  const succ = (f: number, yBin: number, k: number, flap: boolean): { v: number; y: number; k: number } | null => {
    let y = yMin + yBin;
    let vy = flap ? FLAP_V : vyOf(k);
    let gain = 0;
    for (let j = 1; j <= SUB; j++) {
      const s = f * SUB + j;
      vy = Math.min(MAX_FALL, vy + GRAV * STEP);
      y += vy * STEP;
      if (y > yMax + 0.4 || y < yMin - 0.4) return null;
      if (blocked(s, y)) return null;
      const fs = foodAt.get(s);
      if (fs) for (const fd of fs) if (Math.abs(y - fd.y) < (hh * 2 + fd.h) / 2 + 1 - margin * 0.5) gain++;
    }
    const nk = Math.min(K, (flap ? 0 : k) + 1);
    const ny = Math.min(Y - 1, Math.max(0, Math.round(y - yMin)));
    return { v: gain, y: ny, k: nk };
  };
  for (let f = F - 1; f >= 0; f--) {
    for (let y = 0; y < Y; y++) {
      for (let k = 0; k <= K; k++) {
        let best = -1;
        for (const flap of [false, true]) {
          if (flap && k < MIN_K) continue;
          const r = succ(f, y, k, flap);
          if (!r) continue;
          const nv = robust(f + 1, r.y, r.k);
          if (nv < 0) continue;
          const tot = Math.min(127, nv + r.v);
          if (tot > best) best = tot;
        }
        V[idx(f, y, k)] = best;
      }
    }
  }
  const startY = Math.round(GEO.player.startY - yMin);
  const maxFood = V[idx(0, startY, 0)];
  return {
    world, margin, F, Y, yMin, V, items, alive: maxFood >= 0, maxFood,
    policy(f, yBin, k) {
      let bestFlap = false, bestV = -2;
      for (const flap of [false, true]) {
        if (flap && k < MIN_K) continue;
        const r = succ(f, yBin, k, flap);
        if (!r) continue;
        const nv = robust(f + 1, r.y, r.k);
        if (nv < 0) continue;
        const tot = nv + r.v;
        if (tot > bestV) { bestV = tot; bestFlap = flap; }
      }
      return { flap: bestFlap, ok: bestV >= 0 };
    },
  };
}

/** Mayor margen (px de holgura alrededor de cada peligro) con el que todavía existe una ruta. */
export function tolerance(world: WorldConfig, max = 12): { margin: number; solver: Solver | null } {
  let lo = -1, hi = max, best: Solver | null = null;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi + 1) / 2);
    if (mid > hi) break;
    const s = solve(world, mid);
    if (s.alive) { lo = mid; best = s; } else hi = mid - 1;
  }
  return { margin: lo, solver: best };
}
