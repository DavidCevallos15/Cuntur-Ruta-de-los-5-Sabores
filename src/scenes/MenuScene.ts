import Phaser from 'phaser';
import { WORLDS } from '../content/worlds.ts';
import { GEO } from '../content/course.ts';
import { bgKeys } from '../art/backgrounds.ts';
import { loadSave } from '../game/save.ts';
import { playMusic, sfx, toggleMute } from '../game/audio.ts';
import { AUTHOR, numLabel, txt, setupCam } from '../game/ui.ts';
import { hex } from '../art/pixels.ts';

export class MenuScene extends Phaser.Scene {
  private far!: Phaser.GameObjects.TileSprite;
  private near!: Phaser.GameObjects.TileSprite;
  constructor() { super('Menu'); }

  create() {
    setupCam(this);
    const k = bgKeys('costa');
    this.add.image(0, 0, k.sky).setOrigin(0);
    this.far = this.add.tileSprite(0, 0, GEO.W, GEO.H, k.far).setOrigin(0);
    this.near = this.add.tileSprite(0, 0, GEO.W, GEO.H, k.near).setOrigin(0);
    this.add.rectangle(0, 0, GEO.W, GEO.H, 0x0d1b2a, 0.45).setOrigin(0);
    playMusic(this, 'mus_menu', 0.45);

    const title = txt(this, 240, 26, 'CUNTUR', 34, '#ffb703', { fontStyle: '600', stroke: '#2b1a14', strokeThickness: 4 }).setOrigin(0.5);
    txt(this, 240, 52, 'Ruta de los 5 Sabores', 12, '#f4ead5', { stroke: '#101820', strokeThickness: 3 }).setOrigin(0.5);
    const cond = this.add.image(40, 40, 'cond_1');
    this.tweens.add({ targets: cond, x: 440, duration: 7000, repeat: -1, onRepeat: () => { cond.x = 40; } });
    this.tweens.add({ targets: cond, y: 54, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });
    this.time.addEvent({ delay: 140, loop: true, callback: () => cond.setTexture(`cond_${[0, 1, 2, 1][Math.floor(this.time.now / 140) % 4]}`) });
    void title;

    const save = loadSave();
    const cw = 86, gap = 5, x0 = (GEO.W - (cw * 5 + gap * 4)) / 2;
    WORLDS.forEach((w, i) => {
      const cx = x0 + i * (cw + gap) + cw / 2, cy = 150;
      const best = save.best[w.id];
      const card = this.add.rectangle(cx, cy, cw, 130, hex('#101820'), 0.88).setStrokeStyle(2, hex(w.accent)).setInteractive({ useHandCursor: true });
      this.add.rectangle(cx, cy - 55, cw - 6, 14, hex(w.accent));
      txt(this, cx, cy - 55, w.name.toUpperCase(), 9, '#101820', { fontStyle: '600' }).setOrigin(0.5);
      this.add.image(cx, cy - 22, w.food.key).setScale(2);
      txt(this, cx, cy + 4, w.region, 8, '#c8d3e0', { align: 'center', wordWrap: { width: cw - 8 } }).setOrigin(0.5, 0);
      txt(this, cx, cy + 30, w.food.label, 8, '#f4ead5', { align: 'center', wordWrap: { width: cw - 8 } }).setOrigin(0.5, 0);
      if (best) numLabel(this, cx, cy + 56, `${best.food}/15`, 1.5, best.won ? 0xffd23c : 0x9fb0c4, 0.5);
      else txt(this, cx, cy + 56, 'nuevo', 9, '#9fb0c4').setOrigin(0.5);
      card.on('pointerover', () => card.setFillStyle(hex('#1d2b3a'), 0.95));
      card.on('pointerout', () => card.setFillStyle(hex('#101820'), 0.88));
      card.on('pointerdown', () => { sfx(this, 'ui_click'); this.scene.start('Game', { worldId: w.id }); });
    });

    txt(this, 240, 232, 'Toca un mundo para volar', 11, '#ffb703').setOrigin(0.5);
    const credit = txt(this, 240, 252, `Desarrollado por ${AUTHOR} · davidcevallos.vercel.app`, 10, '#f4ead5', { stroke: '#101820', strokeThickness: 3 }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    credit.on('pointerdown', () => { sfx(this, 'ui_click'); this.scene.start('Credits'); });
    txt(this, 240, 264, 'prototipo v0.1', 8, '#8fa3b8').setOrigin(0.5);

    const snd = txt(this, 466, 10, this.game.sound.mute ? '🔇' : '🔊', 14, '#ffffff').setOrigin(0.5).setInteractive({ useHandCursor: true });
    snd.setText(this.game.sound.mute ? 'SIN' : 'SON');
    snd.on('pointerdown', () => { const m = toggleMute(this.game); snd.setText(m ? 'SIN' : 'SON'); });
  }

  update(_t: number, dt: number) {
    this.far.tilePositionX += dt * 0.012; this.near.tilePositionX += dt * 0.03;
  }
}
