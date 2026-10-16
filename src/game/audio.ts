import Phaser from 'phaser';
import { loadSave, writeSave } from './save.ts';

export const SFX_IDS = ['flap', 'collect', 'collect_big', 'hit', 'heart_lost', 'win', 'lose', 'portal_open', 'ui_click', 'squish', 'crunch', 'gust'] as const;
export type SfxId = (typeof SFX_IDS)[number];

const last = new Map<string, number>();

export function sfx(scene: Phaser.Scene, id: SfxId, opts: { vol?: number; detune?: number } = {}): void {
  const key = 'sfx_' + id;
  if (!scene.cache.audio.exists(key)) return;
  const now = performance.now();
  if (now - (last.get(id) ?? -1e9) < 45) return; // evita apilar el mismo sonido
  last.set(id, now);
  try { scene.sound.play(key, { volume: opts.vol ?? 0.8, detune: opts.detune ?? 0 }); } catch { /* audio bloqueado: se ignora */ }
}

export function applyMute(game: Phaser.Game): void { game.sound.mute = loadSave().mute; }
export function toggleMute(game: Phaser.Game): boolean {
  const s = loadSave(); s.mute = !s.mute; writeSave(s); game.sound.mute = s.mute; return s.mute;
}

/** Música de fondo: una sola pista a la vez, con fundido. */
let current: { key: string; snd: Phaser.Sound.BaseSound } | null = null;
export function playMusic(scene: Phaser.Scene, key: string, volume = 0.5): void {
  if (!scene.cache.audio.exists(key)) return;
  if (current && current.key === key) { if (!current.snd.isPlaying) current.snd.play(); return; }
  const old = current;
  if (old) scene.tweens.add({ targets: old.snd, volume: 0, duration: 400, onComplete: () => { old.snd.stop(); old.snd.destroy(); } });
  const snd = scene.sound.add(key, { loop: true, volume: 0 });
  snd.play();
  scene.tweens.add({ targets: snd, volume, duration: 600 });
  current = { key, snd };
}
export function pauseMusic(): void { if (current && current.snd.isPlaying) current.snd.pause(); }
export function resumeMusic(): void { if (current && current.snd.isPaused) current.snd.resume(); }
