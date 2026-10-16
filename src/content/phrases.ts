import raw from './phrases.json' with { type: 'json' };
import type { Phrase, PhraseEvent, WorldId } from '../types.ts';

const ALL = (raw.phrases as Phrase[]).filter((p) => p.enabled !== false);

/** Selector con memoria: no repite hasta agotar el banco de ese evento+mundo. */
export class PhrasePicker {
  private used = new Set<string>();
  private rng: () => number;
  constructor(rng: () => number = Math.random) { this.rng = rng; }

  pick(event: PhraseEvent, world: WorldId): Phrase | undefined {
    const pool = ALL.filter((p) => p.event === event && (p.world === world || p.world === 'all'));
    if (!pool.length) return undefined;
    let fresh = pool.filter((p) => !this.used.has(p.id));
    if (!fresh.length) { pool.forEach((p) => this.used.delete(p.id)); fresh = pool; }
    const total = fresh.reduce((s, p) => s + (p.weight ?? 1), 0);
    let r = this.rng() * total;
    for (const p of fresh) { r -= p.weight ?? 1; if (r <= 0) { this.used.add(p.id); return p; } }
    const last = fresh[fresh.length - 1]; this.used.add(last.id); return last;
  }
}
export const phraseCount = () => ALL.length;
