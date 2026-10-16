export type WorldId = 'costa' | 'islas' | 'viento' | 'lava' | 'selva';

export interface Art { key: string; label: string }

export interface WorldConfig {
  id: WorldId;
  name: string;
  region: string;
  /** px/s de avance automático (constante en todo el mundo). */
  speed: number;
  /** Orden de los 6 segmentos diseñados (índices 0..5). */
  order: number[];
  /** Espeja el segmento verticalmente y convierte los peligros de suelo en peligros de techo. */
  flipV: boolean;
  hazards: { g: Art; B: Art };
  food: Art & { plural: string };
  accent: string;
  music: { key: string; volume: number };
  story: { intro: string; win: string; lose: string[] };
  /** Personajes de fondo: posición = segmento (0..5 del recorrido) y columna. */
  talkers: { at: number; col: number; kind: string }[];
  signs: { at: number; col: number; text: string }[];
}

export type PhraseEvent = 'talker' | 'milestone' | 'hit' | 'win' | 'lose' | 'intro';
export type PhraseSource =
  | 'documentada'      // aparece en una fuente enlazada en `ref`
  | 'jerga-verificada' // la palabra aparece en una lista de modismos enlazada
  | 'jerga'            // conocimiento general, por validar con jugadores
  | 'original';        // escrita para el juego

export interface Phrase {
  id: string;
  text: string;
  event: PhraseEvent;
  world: WorldId | 'all';
  source: PhraseSource;
  ref?: string;
  /** Peso de aparición (por defecto 1). */
  weight?: number;
  /** false = candidata desactivada hasta que decidas. */
  enabled?: boolean;
  note?: string;
}

export type ItemType = 'food' | 'g' | 'B' | 'T';

export interface CourseItem {
  type: ItemType;
  /** centro, en píxeles del mundo */
  x: number;
  y: number;
  w: number;
  h: number;
  /** posición del segmento dentro del recorrido (0..5) */
  at: number;
}
