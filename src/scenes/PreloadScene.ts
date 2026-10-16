import Phaser from 'phaser';
import { makeAllSprites } from '../art/sprites.ts';
import { makeBackgrounds } from '../art/backgrounds.ts';
import { SFX_IDS, applyMute } from '../game/audio.ts';
import { WORLDS } from '../content/worlds.ts';
import { txt, setupCam } from '../game/ui.ts';

export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    setupCam(this);
    this.cameras.main.setBackgroundColor('#0d1b2a');
    const bar = this.add.rectangle(240, 150, 4, 6, 0xffb703).setOrigin(0, 0.5);
    bar.x = 120;
    txt(this, 240, 120, 'Cargando…', 12, '#f4ead5').setOrigin(0.5);
    this.load.on('progress', (p: number) => { bar.width = 240 * p; });
    this.load.on('loaderror', (f: Phaser.Loader.File) => console.warn('No se pudo cargar', f.key));
    this.load.setPath('assets/audio/');
    SFX_IDS.forEach((id) => this.load.audio('sfx_' + id, [`sfx/${id}.ogg`, `sfx/${id}.mp3`]));
    ['mus_menu', ...WORLDS.map((w) => w.music.key)].forEach((k) => this.load.audio(k, [`music/${k}.ogg`, `music/${k}.mp3`]));
  }

  create() {
    makeAllSprites(this);
    makeBackgrounds(this);
    applyMute(this.game);
    const q = new URLSearchParams(location.search);
    if (q.get('credits')) { this.scene.start('Credits'); return; }
    if (q.get('world')) { this.scene.start('Game', { worldId: q.get('world') }); return; }
    const hint = txt(this, 240, 190, 'TOCA PARA JUGAR', 14, '#ffb703', { fontStyle: '600' }).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.25, yoyo: true, repeat: -1, duration: 600 });
    const go = () => { this.input.off('pointerdown', go); this.scene.start('Menu'); };
    this.input.on('pointerdown', go);
    this.input.keyboard?.once('keydown', go);
  }
}
