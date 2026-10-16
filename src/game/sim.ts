import phys from '../content/physics.json' with { type: 'json' };

export const PHYS = phys;
export const GRAV = phys.gravity;
export const FLAP_V = phys.flapV;
export const MAX_FALL = phys.maxFall;
export const STEP = phys.step;

/** Un paso de física (mismo código en el juego y en el validador). */
export function stepVy(vy: number): number { return Math.min(MAX_FALL, vy + GRAV * STEP); }
