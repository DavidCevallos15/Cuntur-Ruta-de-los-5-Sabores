import Phaser from 'phaser';
import '@fontsource/pixelify-sans/latin-400.css';
import '@fontsource/pixelify-sans/latin-600.css';
import { PreloadScene } from './scenes/PreloadScene.ts';
import { MenuScene } from './scenes/MenuScene.ts';
import { GameScene } from './scenes/GameScene.ts';
import { CreditsScene } from './scenes/CreditsScene.ts';
import { GEO } from './content/course.ts';
import { ZOOM } from './game/ui.ts';

async function boot() {
  try { await Promise.all([document.fonts.load('10px "Pixelify Sans"'), document.fonts.load('600 10px "Pixelify Sans"')]); } catch { /* sigue con la fuente de respaldo */ }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GEO.W * ZOOM,
    height: GEO.H * ZOOM,
    backgroundColor: '#0d1b2a',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 2 },
    audio: { disableWebAudio: false },
    scene: [PreloadScene, MenuScene, GameScene, CreditsScene],
  });
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
void boot();
