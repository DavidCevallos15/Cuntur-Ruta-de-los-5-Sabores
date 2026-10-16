import Phaser from 'phaser';
import { GEO } from '../content/course.ts';
import { WORLDS } from '../content/worlds.ts';
import { bgKeys } from '../art/backgrounds.ts';
import { loadSave } from '../game/save.ts';
import { playMusic } from '../game/audio.ts';
import { AUTHOR, PORTFOLIO, button, numLabel, txt, setupCam } from '../game/ui.ts';

/** Pantalla final: créditos del autor + enlace real (DOM) al portafolio. */
export class CreditsScene extends Phaser.Scene {
  constructor() { super('Credits'); }

  create() {
    setupCam(this);
    const k = bgKeys('selva');
    this.add.image(0, 0, k.sky).setOrigin(0);
    this.add.tileSprite(0, 0, GEO.W, GEO.H, k.far).setOrigin(0);
    this.add.rectangle(0, 0, GEO.W, GEO.H, 0x0d1b2a, 0.6).setOrigin(0);
    playMusic(this, 'mus_menu', 0.45);
    const save = loadSave();
    const total = WORLDS.reduce((s, w) => s + (save.best[w.id]?.food ?? 0), 0);
    txt(this, 240, 30, '¡FIN DEL VIAJE!', 24, '#ffd23c', { fontStyle: '600', stroke: '#2b1a14', strokeThickness: 4 }).setOrigin(0.5);
    txt(this, 240, 58, 'Cuntur probó los 5 sabores del Ecuador', 11, '#f4ead5').setOrigin(0.5);
    WORLDS.forEach((w, i) => this.add.image(160 + i * 40, 86, w.food.key).setScale(1.5));
    txt(this, 200, 108, 'Mejor total:', 11, '#c8d3e0').setOrigin(0.5);
    numLabel(this, 238, 108, `${total}/${WORLDS.length * 15}`, 1.5, 0xffd23c);
    txt(this, 240, 136, 'Desarrollado por', 11, '#c8d3e0').setOrigin(0.5);
    txt(this, 240, 154, AUTHOR, 20, '#ffffff', { stroke: '#101820', strokeThickness: 3 }).setOrigin(0.5);
    const cond = this.add.image(-20, 204, 'cond_1');
    this.tweens.add({ targets: cond, x: 500, duration: 6000, repeat: -1 });
    button(this, 240, 240, 100, 20, 'MENÚ', '#c8d3e0', () => this.scene.start('Menu'));

    // Enlace HTML real sobre el canvas: funciona con toque en iOS/Android y se puede mantener pulsado para copiar.
    const a = document.createElement('a');
    a.href = PORTFOLIO; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = 'davidcevallos.vercel.app ↗';
    a.style.cssText = 'position:fixed;z-index:5;transform:translate(-50%,-50%);font:600 16px "Pixelify Sans",monospace;color:#101820;background:#ffb703;padding:8px 14px;border:2px solid #fff;border-radius:4px;text-decoration:none;white-space:nowrap;touch-action:manipulation;';
    document.body.appendChild(a);

    const place = () => {
      const r = this.game.canvas.getBoundingClientRect();
      a.style.left = `${r.left + (240 / GEO.W) * r.width}px`;
      a.style.top = `${r.top + (184 / GEO.H) * r.height}px`;
    };
    place();
    this.scale.on('resize', place);
    window.addEventListener('resize', place);
    this.events.once('shutdown', () => { a.remove(); this.scale.off('resize', place); window.removeEventListener('resize', place); });
  }
}
