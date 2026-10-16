import type { WorldConfig, WorldId } from '../types.ts';

/**
 * Los 5 mundos comparten las mismas mecánicas (aleteo, comida, 2 peligros). Lo que cambia es la
 * velocidad, el orden de los segmentos, la orientación (flipV), el arte, la música y la cultura.
 * Los mundos 2-5 usan arte provisional generado por código.
 */
export const WORLDS: WorldConfig[] = [
  {
    id: 'costa', name: 'Costa', region: 'Manabí · Guayaquil', speed: 112,
    order: [0, 1, 2, 3, 4, 5], flipV: false,
    hazards: { g: { key: 'hz_gaviota', label: 'Gaviota' }, B: { key: 'hz_palmera', label: 'Palmera inclinada' } },
    food: { key: 'food_encebollado', label: 'Encebollado con chifle', plural: 'encebollados' },
    accent: '#ff9f43', music: { key: 'mus_costa', volume: 0.5 },
    story: {
      intro: '¡Hoy sí sale ese encebollado con chifle!',
      win: '¡Belleza! Ahora sí, a la mesa.',
      lose: ['Se enfrió la sopa… ¿otra vuelta?', 'Sin encebollado no hay paraíso.'],
    },
    talkers: [
      { at: 0, col: 9, kind: 'npc_vendedora' }, { at: 1, col: 13, kind: 'npc_pescador' },
      { at: 2, col: 3, kind: 'npc_nino' }, { at: 3, col: 14, kind: 'npc_cocinero' },
      { at: 4, col: 4, kind: 'npc_vendedora' }, { at: 5, col: 15, kind: 'npc_pescador' },
    ],
    signs: [
      { at: 0, col: 3, text: 'ENCEBOLLADO CON CHIFLE' }, { at: 2, col: 1, text: 'CEVICHE DE CAMARÓN' },
      { at: 4, col: 18, text: 'HIELO Y GASEOSAS' },
    ],
  },
  {
    id: 'islas', name: 'Islas', region: 'Galápagos', speed: 116,
    order: [0, 2, 1, 4, 3, 5], flipV: false,
    hazards: { g: { key: 'hz_pelicano', label: 'Pelícano' }, B: { key: 'hz_roca', label: 'Roca volcánica' } },
    food: { key: 'food_ceviche', label: 'Ceviche de atún', plural: 'ceviches' },
    accent: '#2ec4b6', music: { key: 'mus_islas', volume: 0.5 },
    story: {
      intro: 'Vine por encebollado… pero ese ceviche de atún promete.',
      win: '¡Ceviche y corviche! Qué bacán.',
      lose: ['Se lo llevó la marea… ¿otra vez?', 'Hasta el atún se escapó.'],
    },
    talkers: [
      { at: 0, col: 9, kind: 'npc_pescador' }, { at: 1, col: 3, kind: 'npc_guia' },
      { at: 2, col: 13, kind: 'npc_cocinero' }, { at: 3, col: 4, kind: 'npc_nino' },
      { at: 4, col: 14, kind: 'npc_vendedora' }, { at: 5, col: 8, kind: 'npc_guia' },
    ],
    signs: [
      { at: 0, col: 3, text: 'CEVICHE DE ATÚN' }, { at: 2, col: 18, text: 'CORVICHES CALIENTES' },
      { at: 4, col: 2, text: 'RESPETA A LA FAUNA' },
    ],
  },
  {
    id: 'viento', name: 'Viento', region: 'Sierra · Cotopaxi', speed: 120,
    order: [0, 1, 3, 2, 5, 4], flipV: true,
    hazards: { g: { key: 'hz_canguil', label: 'Canguil volador' }, B: { key: 'hz_tormenta', label: 'Nube de tormenta' } },
    food: { key: 'food_hornado', label: 'Hornado', plural: 'hornados' },
    accent: '#b39ddb', music: { key: 'mus_viento', volume: 0.5 },
    story: {
      intro: '¿Con canguil? ¡Yo traje chifle por si acaso!',
      win: '¡Hornadito servido! Y sin canguil.',
      lose: ['Se enfrió en las alturas… ¿otra vuelta?', 'El viento se llevó el hornado.'],
    },
    talkers: [
      { at: 0, col: 9, kind: 'npc_senora' }, { at: 1, col: 3, kind: 'npc_nino' },
      { at: 2, col: 14, kind: 'npc_senora' }, { at: 3, col: 4, kind: 'npc_cocinero' },
      { at: 4, col: 13, kind: 'npc_senora' }, { at: 5, col: 8, kind: 'npc_nino' },
    ],
    signs: [
      { at: 0, col: 3, text: 'HORNADO Y MOTE' }, { at: 2, col: 18, text: 'CHOCHOS CON TOSTADO' },
      { at: 4, col: 2, text: 'AQUÍ SÍ HAY CANGUIL' },
    ],
  },
  {
    id: 'lava', name: 'Lava', region: 'Ruta de volcanes', speed: 124,
    order: [0, 3, 2, 5, 1, 4], flipV: false,
    hazards: { g: { key: 'hz_bola_lava', label: 'Bola de lava' }, B: { key: 'hz_ceniza', label: 'Columna de ceniza' } },
    food: { key: 'food_llapingacho', label: 'Llapingachos', plural: 'llapingachos' },
    accent: '#ef476f', music: { key: 'mus_lava', volume: 0.5 },
    story: {
      intro: '¡Calentito sí; directo del volcán, no!',
      win: '¡Llapingachos listos! Con ají, ñaño.',
      lose: ['La ceniza se lo comió… ¿otra vuelta?', 'Esto ya pasó de calentito.'],
    },
    talkers: [
      { at: 0, col: 9, kind: 'npc_cocinero' }, { at: 1, col: 4, kind: 'npc_guia' },
      { at: 2, col: 13, kind: 'npc_senora' }, { at: 3, col: 3, kind: 'npc_nino' },
      { at: 4, col: 14, kind: 'npc_guia' }, { at: 5, col: 8, kind: 'npc_cocinero' },
    ],
    signs: [
      { at: 0, col: 3, text: 'LLAPINGACHOS CON AJÍ' }, { at: 2, col: 18, text: 'CAMINO AL VOLCÁN' },
      { at: 4, col: 2, text: 'NO SE ACERQUE AL CRÁTER' },
    ],
  },
  {
    id: 'selva', name: 'Selva', region: 'Amazonía · Oriente', speed: 118,
    order: [0, 2, 3, 1, 4, 5], flipV: true,
    hazards: { g: { key: 'hz_insecto', label: 'Insecto' }, B: { key: 'hz_liana', label: 'Rama con lianas' } },
    food: { key: 'food_maito', label: 'Maito', plural: 'maitos' },
    accent: '#7bd389', music: { key: 'mus_selva', volume: 0.5 },
    story: {
      intro: 'En hojita también se come sabroso.',
      win: '¡Maito servido! Sabe a selva.',
      lose: ['El río se llevó el maito… ¿otra vuelta?', 'La selva no perdona el hambre.'],
    },
    talkers: [
      { at: 0, col: 9, kind: 'npc_guia' }, { at: 1, col: 13, kind: 'npc_vendedora' },
      { at: 2, col: 3, kind: 'npc_nino' }, { at: 3, col: 14, kind: 'npc_pescador' },
      { at: 4, col: 4, kind: 'npc_guia' }, { at: 5, col: 15, kind: 'npc_vendedora' },
    ],
    signs: [
      { at: 0, col: 3, text: 'MAITO EN HOJA DE BIJAO' }, { at: 2, col: 18, text: 'CAMINO AL RÍO' },
      { at: 4, col: 2, text: 'CHONTACURO FRESCO' },
    ],
  },
];

export const WORLD_BY_ID: Record<WorldId, WorldConfig> = Object.fromEntries(WORLDS.map((w) => [w.id, w])) as Record<WorldId, WorldConfig>;
