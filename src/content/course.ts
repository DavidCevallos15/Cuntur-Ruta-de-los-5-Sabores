import geo from './geometry.json' with { type: 'json' };
import seg from './segments.json' with { type: 'json' };
import type { CourseItem, WorldConfig } from '../types.ts';

export const GEO = geo;
export const SEGMENT_LENGTH = geo.COLS * geo.CELL_W;

export interface BuiltCourse {
  items: CourseItem[];
  /** x donde termina el recorrido (línea de meta) */
  endX: number;
  /** longitud total en px y duración prevista en segundos */
  length: number;
  seconds: number;
  /** comida total disponible */
  foodCount: number;
}

/** Convierte los segmentos diseñados + la configuración del mundo en objetos con posición en el mundo. */
export function buildCourse(world: WorldConfig): BuiltCourse {
  const items: CourseItem[] = [];
  world.order.forEach((segIdx, at) => {
    const rows = seg.segments[segIdx].grid;
    const base = geo.RUN_IN + at * SEGMENT_LENGTH;
    for (let r = 0; r < geo.ROWS; r++) {
      const srcRow = world.flipV ? geo.ROWS - 1 - r : r;
      const line = rows[srcRow];
      for (let c = 0; c < geo.COLS; c++) {
        const ch = line[c];
        if (ch === '.') continue;
        const x = base + c * geo.CELL_W + geo.CELL_W / 2;
        const y = geo.ROW0_Y + r * geo.CELL_H;
        if (ch === 'F') items.push({ type: 'food', x, y, w: geo.food.w, h: geo.food.h, at });
        else if (ch === 'g') items.push({ type: 'g', x, y, w: geo.hazards.g.w, h: geo.hazards.g.h, at });
        else if (ch === 'B') {
          const { w, h } = geo.hazards.B;
          // Con flipV el peligro de suelo "B" original (fila r) ya viene reflejado: ahora cuelga del techo.
          if (world.flipV) items.push({ type: 'T', x, y: h / 2, w, h, at });
          else items.push({ type: 'B', x, y: geo.GROUND_Y - h / 2, w, h, at });
        }
      }
    }
  });
  const length = geo.RUN_IN + world.order.length * SEGMENT_LENGTH + geo.END_PAD;
  return {
    items,
    endX: length,
    length,
    seconds: length / world.speed,
    foodCount: items.filter((i) => i.type === 'food').length,
  };
}
