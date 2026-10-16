import Phaser from 'phaser';
import { WORLDS, WORLD_BY_ID } from '../content/worlds.ts';
import { GEO, buildCourse, type BuiltCourse } from '../content/course.ts';
import { PhrasePicker } from '../content/phrases.ts';
import { bgKeys, GROUND_TOP } from '../art/backgrounds.ts';
import { hex } from '../art/pixels.ts';
import { bubble, button, numLabel, txt, setupCam, type NumLabel } from '../game/ui.ts';
import { pauseMusic, playMusic, resumeMusic, sfx, toggleMute } from '../game/audio.ts';
import { recordRun } from '../game/save.ts';
import { FLAP_V, GRAV, MAX_FALL, STEP } from '../game/sim.ts';
import type { CourseItem, WorldConfig, WorldId } from '../types.ts';

type State = 'ready' | 'playing' | 'paused' | 'won' | 'lost';

const WIN_FOOD = 10;
const MAX_HEARTS = 3;
const INVULN = 1.0;
const DEFAULT_SX = GEO.player.screenX;

interface Live { item: CourseItem; obj: Phaser.GameObjects.Image; taken?: boolean }
interface Talker { x: number; sprite: Phaser.GameObjects.Image; bub: Phaser.GameObjects.Container & { bh: number }; shown: boolean }

export class GameScene extends Phaser.Scene {
  world!: WorldConfig;
  course!: BuiltCourse;
  state: State = 'ready';
  private picker = new PhrasePicker();
  private live: Live[] = [];
  private talkers: Talker[] = [];
  private px = 0; private py: number = GEO.player.startY; private vy = 0;
  private acc = 0; private elapsed = 0;
  private hearts = MAX_HEARTS; private food = 0; private invuln = 0;
  private flapAnim = 0;
  private player!: Phaser.GameObjects.Image;
  private far!: Phaser.GameObjects.TileSprite; private near!: Phaser.GameObjects.TileSprite; private ground!: Phaser.GameObjects.TileSprite;
  private heartImgs: Phaser.GameObjects.Image[] = [];
  private foodTxt!: NumLabel; private lastFoodStr = '';
  private progress!: Phaser.GameObjects.Rectangle; private progressMark!: Phaser.GameObjects.Rectangle;
  private readyObjs: Phaser.GameObjects.GameObject[] = [];
  private overlayObjs: Phaser.GameObjects.GameObject[] = [];
  private toast?: Phaser.GameObjects.Container;
  private playerBub?: Phaser.GameObjects.Container; private playerBubUntil = 0;
  private dbg?: Phaser.GameObjects.Graphics; private dbgTxt?: Phaser.GameObjects.Text;
  private params = new URLSearchParams(location.search);
  private resultAt = 0;
  private sx = DEFAULT_SX;
  private manual = false;
  private grav = GRAV; private flapV = FLAP_V;

  constructor() { super('Game'); }

  init(data: { worldId?: string }) {
    const id = (data.worldId ?? 'costa') as WorldId;
    this.world = WORLD_BY_ID[id] ?? WORLDS[0];
    const sp = Number(this.params.get('speed'));
    if (sp > 0) this.world = { ...this.world, speed: sp };
    this.course = buildCourse(this.world);
    this.state = 'ready'; this.live = []; this.talkers = []; this.heartImgs = []; this.readyObjs = []; this.overlayObjs = [];
    this.px = 0; this.py = GEO.player.startY; this.vy = 0; this.acc = 0; this.elapsed = 0;
    this.hearts = Number(this.params.get('hearts')) || MAX_HEARTS; this.food = 0; this.invuln = 0; this.flapAnim = 0;
    this.picker = new PhrasePicker();
    this.grav = Number(this.params.get('g')) || GRAV; this.flapV = -Math.abs(Number(this.params.get('f'))) || FLAP_V; this.manual = false;
    this.toast = undefined; this.playerBub = undefined; this.playerBubUntil = 0;
  }

  create() {
    setupCam(this);
    const w = this.world, k = bgKeys(w.id);
    this.add.image(0, 0, k.sky).setOrigin(0).setScrollFactor(0).setDepth(0);
    this.far = this.add.tileSprite(0, 0, GEO.W, GEO.H, k.far).setOrigin(0).setScrollFactor(0).setDepth(1);
    this.near = this.add.tileSprite(0, 0, GEO.W, GEO.H, k.near).setOrigin(0).setScrollFactor(0).setDepth(2);
    this.ground = this.add.tileSprite(0, GROUND_TOP, GEO.W, 22, k.ground).setOrigin(0).setScrollFactor(0).setDepth(10);

    this.buildCourseObjects();
    this.player = this.add.image(this.sx, this.py, 'cond_1').setDepth(15).setScrollFactor(0);
    this.buildHud();
    this.buildReady();

    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: unknown[]) => { if (over.length === 0) this.onTap(); });
    this.input.keyboard?.on('keydown-SPACE', () => this.onTap());
    this.input.keyboard?.on('keydown-UP', () => this.onTap());
    this.input.keyboard?.on('keydown-W', () => this.onTap());

    const onHide = () => { if (this.state === 'playing') this.pause(); };
    const vis = () => { if (document.hidden) onHide(); };
    window.addEventListener('blur', onHide); document.addEventListener('visibilitychange', vis);
    this.events.once('shutdown', () => { window.removeEventListener('blur', onHide); document.removeEventListener('visibilitychange', vis); });

    if (this.params.get('debug')) {
      this.dbg = this.add.graphics().setDepth(100);
      this.dbgTxt = txt(this, 4, 40, '', 8, '#00ff88').setScrollFactor(0).setDepth(101);
    }
    playMusic(this, w.music.key, w.music.volume);
    this.exposeApi();
    this.cameras.main.fadeIn(250, 13, 27, 42);
    if (this.params.get('auto')) this.time.delayedCall(100, () => this.onTap());
  }

  /* ---------------- construcción ---------------- */
  private buildCourseObjects() {
    const w = this.world;
    for (const item of this.course.items) {
      let key = w.food.key, depth = 8;
      if (item.type === 'g') { key = w.hazards.g.key; depth = 9; }
      else if (item.type === 'B' || item.type === 'T') { key = w.hazards.B.key; depth = 9; }
      const obj = this.add.image(item.x, item.y, key).setDepth(depth);
      if (item.type === 'food') this.tweens.add({ targets: obj, y: item.y - 3, yoyo: true, repeat: -1, duration: 700 + ((item.x | 0) % 5) * 60, ease: 'Sine.inOut' });
      this.live.push({ item, obj });
    }
    // Personas de fondo (estáticas) con su globo de frase
    const colX = (at: number, col: number) => GEO.RUN_IN + at * GEO.COLS * GEO.CELL_W + col * GEO.CELL_W + GEO.CELL_W / 2;
    for (const t of w.talkers) {
      const x = colX(t.at, t.col);
      const spr = this.add.image(x, GEO.GROUND_Y - 13, t.kind).setDepth(5);
      this.tweens.add({ targets: spr, scaleY: 0.97, yoyo: true, repeat: -1, duration: 900 + (x % 7) * 40, ease: 'Sine.inOut' });
      const phrase = this.picker.pick('talker', w.id);
      const bub = bubble(this, phrase?.text ?? '¡Belleza!', { width: 100 }).setVisible(false);
      bub.setPosition(x, GEO.GROUND_Y - 30);
      this.talkers.push({ x, sprite: spr, bub, shown: false });
    }
    for (const s of w.signs) {
      const x = colX(s.at, s.col);
      const label = txt(this, 0, 0, s.text, 9, '#fff3d6', { fontStyle: '600' }).setOrigin(0.5);
      const bw = Math.ceil(label.width) + 10;
      this.add.image(x - bw / 3, GEO.GROUND_Y - 7, 'ui_post').setDepth(4);
      this.add.image(x + bw / 3, GEO.GROUND_Y - 7, 'ui_post').setDepth(4);
      this.add.rectangle(x, GEO.GROUND_Y - 22, bw, 14, 0x8a5a2b).setStrokeStyle(1, 0x3d2610).setDepth(4);
      label.setPosition(x, GEO.GROUND_Y - 22).setDepth(5);
    }
    // Meta
    this.add.image(this.course.endX, GEO.GROUND_Y - 60, 'meta_gate').setDepth(5);
    txt(this, this.course.endX, GEO.GROUND_Y - 128, 'META', 12, '#ffffff', { fontStyle: '600', stroke: '#101820', strokeThickness: 3 }).setOrigin(0.5).setDepth(5);
  }

  private buildHud() {
    const D = 30;
    for (let i = 0; i < MAX_HEARTS; i++) this.heartImgs.push(this.add.image(12 + i * 12, 14, 'ui_heart').setScrollFactor(0).setDepth(D));
    this.add.image(215, 14, this.world.food.key).setScrollFactor(0).setDepth(D).setScale(0.9);
    this.foodTxt = numLabel(this, 228, 14, '0/' + WIN_FOOD, 1.5); this.foodTxt.container.setScrollFactor(0).setDepth(D);
    this.add.rectangle(0, 0, GEO.W, 3, 0x000000, 0.35).setOrigin(0).setScrollFactor(0).setDepth(D);
    this.progress = this.add.rectangle(0, 0, 0, 3, hex(this.world.accent)).setOrigin(0).setScrollFactor(0).setDepth(D + 1);
    this.progressMark = this.add.rectangle(0, 1.5, 4, 7, 0xffffff).setScrollFactor(0).setDepth(D + 2);
    const mk = (x: number, label: string, fn: () => void) => {
      const r = this.add.rectangle(x, 14, 30, 22, 0x101820, 0.7).setStrokeStyle(1, 0xffffff, 0.6).setScrollFactor(0).setDepth(D).setInteractive({ useHandCursor: true });
      const t = txt(this, x, 14, label, 9, '#ffffff', { fontStyle: '600' }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 1);
      r.on('pointerdown', () => { sfx(this, 'ui_click', { vol: 0.5 }); fn(); });
      return t;
    };
    mk(462, 'II', () => this.togglePause());
    const snd = mk(428, this.game.sound.mute ? 'SIN' : 'SON', () => { snd.setText(toggleMute(this.game) ? 'SIN' : 'SON'); });
  }

  private buildReady() {
    const w = this.world;
    const panel = this.add.rectangle(240, 120, 330, 92, 0x101820, 0.82).setStrokeStyle(2, hex(w.accent)).setScrollFactor(0).setDepth(40);
    const title = txt(this, 240, 92, `${w.name.toUpperCase()} · ${w.region}`, 12, w.accent, { fontStyle: '600' }).setOrigin(0.5).setScrollFactor(0).setDepth(41);
    const intro = txt(this, 240, 118, '“' + w.story.intro + '”', 10, '#f4ead5', { align: 'center', wordWrap: { width: 300 } }).setOrigin(0.5).setScrollFactor(0).setDepth(41);
    const goal = txt(this, 240, 146, `Recoge ${WIN_FOOD} ${w.food.plural} y llega a la meta`, 10, '#ffffff').setOrigin(0.5).setScrollFactor(0).setDepth(41);
    const tap = txt(this, 240, 190, 'TOCA PARA ALETEAR', 14, '#ffb703', { fontStyle: '600', stroke: '#101820', strokeThickness: 3 }).setOrigin(0.5).setScrollFactor(0).setDepth(41);
    this.tweens.add({ targets: tap, alpha: 0.3, yoyo: true, repeat: -1, duration: 550 });
    this.readyObjs = [panel, title, intro, goal, tap];
    const back = button(this, 36, 252, 60, 18, 'MENÚ', '#c8d3e0', () => this.scene.start('Menu'), 40);
    back.objs.forEach((o) => (o as Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.GameObject).setScrollFactor?.(0));
    this.readyObjs.push(...back.objs);
  }

  /* ---------------- entrada y estados ---------------- */
  private onTap() {
    if (this.state === 'ready') { this.startRun(); this.flap(); return; }
    if (this.state === 'playing') { this.flap(); return; }
    if (this.state === 'paused') { this.resume(); return; }
    if ((this.state === 'won' || this.state === 'lost') && this.time.now - this.resultAt > 1200 && this.params.get('quick') !== '0') {
      // Tocar fuera de los botones no hace nada; el teclado sí reintenta (ver keydown en overlay)
    }
  }

  private startRun() {
    this.state = 'playing'; this.py = GEO.player.startY; this.vy = 0;
    this.readyObjs.forEach((o) => o.destroy()); this.readyObjs = [];
    sfx(this, 'portal_open', { vol: 0.35 });
  }

  private flap() {
    this.vy = this.flapV; this.flapAnim = 0.22;
    sfx(this, 'flap', { vol: 0.5, detune: Phaser.Math.Between(-120, 120) });
  }

  private togglePause() { if (this.state === 'playing') this.pause(); else if (this.state === 'paused') this.resume(); }

  private pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused'; pauseMusic();
    const dim = this.add.rectangle(0, 0, GEO.W, GEO.H, 0x000000, 0.55).setOrigin(0).setScrollFactor(0).setDepth(60);
    const t = txt(this, 240, 110, 'PAUSA', 22, '#ffb703', { fontStyle: '600' }).setOrigin(0.5).setScrollFactor(0).setDepth(61);
    const t2 = txt(this, 240, 138, 'Toca para seguir', 11, '#ffffff').setOrigin(0.5).setScrollFactor(0).setDepth(61);
    const menu = button(this, 240, 180, 90, 20, 'SALIR AL MENÚ', '#c8d3e0', () => this.scene.start('Menu'), 61);
    this.overlayObjs = [dim, t, t2, ...menu.objs];
  }

  private resume() {
    if (this.state !== 'paused') return;
    this.overlayObjs.forEach((o) => o.destroy()); this.overlayObjs = [];
    this.state = 'playing'; resumeMusic();
    this.invuln = Math.max(this.invuln, 0.6);
  }

  /* ---------------- bucle ---------------- */
  update(_t: number, dtMs: number) {
    const dt = Math.min(dtMs / 1000, 0.05);
    if (this.state === 'playing' && !this.manual) {
      this.acc += dt;
      while (this.acc >= STEP && this.state === 'playing') { this.step(STEP); this.acc -= STEP; }
    } else if (this.state === 'ready') {
      this.py = GEO.player.startY + Math.sin(this.time.now / 260) * 5;
    }
    // Parallax / cámara
    const cam = this.cameras.main;
    cam.scrollX = this.px - this.sx;
    this.far.tilePositionX = cam.scrollX * 0.12; this.near.tilePositionX = cam.scrollX * 0.38; this.ground.tilePositionX = cam.scrollX;
    this.renderPlayer(dt);
    this.updateTalkers();
    this.updateHud();
    if (this.playerBub && this.time.now > this.playerBubUntil) { this.playerBub.destroy(); this.playerBub = undefined; }
    if (this.playerBub) this.playerBub.setPosition(this.sx, this.py - 12);
    if (this.dbg) this.drawDebug();
  }

  private step(dt: number) {
    this.elapsed += dt;
    this.px += this.world.speed * dt;
    this.vy = Math.min(MAX_FALL, this.vy + this.grav * dt);
    this.py += this.vy * dt;
    if (this.invuln > 0) this.invuln -= dt;
    const hh = GEO.player.hitH / 2;
    const yMin = GEO.CEIL_HIT_Y + hh, yMax = GEO.FLOOR_HIT_Y - hh;
    if (this.py > yMax) { this.py = yMax - 2; this.vy = -230; this.damage('suelo'); if (this.state !== 'playing') return; }
    if (this.py < yMin) { this.py = yMin; this.vy = Math.max(this.vy, 40); this.damage('techo'); if (this.state !== 'playing') return; }
    const hw = GEO.player.hitW / 2;
    for (const l of this.live) {
      if (l.taken) continue;
      const it = l.item;
      if (Math.abs(this.px - it.x) > it.w / 2 + hw + 2) continue;
      if (it.type === 'food') {
        if (Math.abs(this.py - it.y) < (hh * 2 + it.h) / 2 + 1) this.collect(l);
      } else if (Math.abs(this.py - it.y) < hh + it.h / 2 && Math.abs(this.px - it.x) < hw + it.w / 2) {
        this.damage('obstaculo');
        if (this.state !== 'playing') return;
      }
    }
    if (this.px >= this.course.endX) this.finish();
  }

  private collect(l: Live) {
    l.taken = true; this.food++;
    const x = l.obj.x, y = l.obj.y;
    this.tweens.killTweensOf(l.obj);
    this.tweens.add({ targets: l.obj, scale: 1.8, alpha: 0, y: y - 14, duration: 220, onComplete: () => l.obj.destroy() });
    this.burst(x, y, hex(this.world.accent), 8);
    const big = this.food === 5 || this.food === WIN_FOOD || this.food === 15;
    sfx(this, big ? 'collect_big' : 'collect', { vol: 0.7, detune: (this.food % 5) * 40 });
    sfx(this, 'crunch', { vol: 0.35 });
    this.foodTxt.container.setScale(1.3); this.tweens.add({ targets: this.foodTxt.container, scale: 1, duration: 160 });
    if (this.food === WIN_FOOD) this.showToast(`¡${WIN_FOOD} ${this.world.food.plural}! Ahora llega a la meta`, true);
    else if (this.food === 3 || this.food === 6) this.showToast(this.picker.pick('milestone', this.world.id)?.text ?? '¡Belleza!');
  }

  private damage(_why: string) {
    if (this.invuln > 0) return;
    this.hearts--; this.invuln = INVULN;
    sfx(this, 'hit', { vol: 0.8 }); sfx(this, 'heart_lost', { vol: 0.5 });
    this.cameras.main.shake(140, 0.006);
    const h = this.heartImgs[this.hearts]; if (h) { h.setTexture('ui_heart_empty'); this.tweens.add({ targets: h, scale: 1.8, yoyo: true, duration: 120 }); }
    this.burst(this.px, this.py, 0xffffff, 6);
    const p = this.picker.pick('hit', this.world.id);
    if (p) this.sayOverPlayer(p.text);
    if (this.hearts <= 0) this.finishLose('¡Sin corazones!');
  }

  private finish() {
    if (this.food >= WIN_FOOD) this.finishWin(); else this.finishLose(`Te faltaron ${WIN_FOOD - this.food} ${this.world.food.plural}`);
  }

  private finishWin() {
    if (this.state !== 'playing') return;
    this.state = 'won'; sfx(this, 'win', { vol: 0.9 });
    recordRun(this.world.id, this.food, true);
    this.showResult(true, '¡LO LOGRASTE!', this.world.story.win);
  }

  private finishLose(reason: string) {
    if (this.state !== 'playing') return;
    this.state = 'lost'; sfx(this, 'lose', { vol: 0.9 });
    recordRun(this.world.id, this.food, false);
    this.showResult(false, '¡CASI!', reason);
  }

  private showResult(win: boolean, title: string, sub: string) {
    this.resultAt = this.time.now;
    const D = 70;
    const dim = this.add.rectangle(0, 0, GEO.W, GEO.H, 0x000000, 0.55).setOrigin(0).setScrollFactor(0).setDepth(D);
    const panel = this.add.rectangle(240, 138, 320, 214, 0x101820, 0.95).setStrokeStyle(2, hex(win ? '#ffd23c' : this.world.accent)).setScrollFactor(0).setDepth(D + 1);
    const t = txt(this, 240, 50, title, 22, win ? '#ffd23c' : '#ff8a6b', { fontStyle: '600' }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2);
    const phrase = this.picker.pick(win ? 'win' : 'lose', this.world.id)?.text ?? '';
    const s1 = txt(this, 240, 72, sub, 10, '#c8d3e0', { align: 'center', wordWrap: { width: 290 } }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D + 2);
    const s2 = txt(this, 240, 92, '“' + phrase + '”', 11, '#ffffff', { align: 'center', wordWrap: { width: 290 } }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D + 2);
    const icon = this.add.image(196, 140, this.world.food.key).setScale(1.5).setScrollFactor(0).setDepth(D + 2);
    const scL = numLabel(this, 214, 140, `${this.food}/${this.course.foodCount}`, 2); const sc = scL.container.setScrollFactor(0).setDepth(D + 2); scL.container.each((o: Phaser.GameObjects.Image) => o.setScrollFactor(0));
    const objs: Phaser.GameObjects.GameObject[] = [dim, panel, t, s1, s2, icon, sc];
    const retry = button(this, 240, 180, 120, 24, 'REINTENTAR', '#ffb703', () => this.scene.restart({ worldId: this.world.id }), D + 3);
    const menu = button(this, 170, 216, 100, 22, 'MENÚ', '#c8d3e0', () => this.scene.start('Menu'), D + 3);
    objs.push(...retry.objs, ...menu.objs);
    const idx = WORLDS.findIndex((w) => w.id === this.world.id);
    const next = win && idx < WORLDS.length - 1 ? WORLDS[idx + 1] : undefined;
    if (next) { const nb = button(this, 310, 216, 110, 22, 'SIGUIENTE ›', next.accent, () => this.scene.start('Game', { worldId: next.id }), D + 3); objs.push(...nb.objs); }
    else { const nb = button(this, 310, 216, 110, 22, win ? '¡FIN DEL VIAJE! ›' : 'ELEGIR MUNDO', '#7bd389', () => this.scene.start(win ? 'Credits' : 'Menu'), D + 3); objs.push(...nb.objs); }
    objs.forEach((o) => (o as Phaser.GameObjects.Image).setScrollFactor?.(0));
    [retry, menu].forEach((b) => b.setEnabled(false));
    this.time.delayedCall(700, () => [retry, menu].forEach((b) => b.setEnabled(true)));
    this.overlayObjs = objs;
    this.input.keyboard?.once('keydown-SPACE', () => { if (this.time.now - this.resultAt > 700) this.scene.restart({ worldId: this.world.id }); });
    if (win) this.burst(this.px, this.py, 0xffd23c, 20);
  }

  /* ---------------- presentación ---------------- */
  private renderPlayer(dt: number) {
    if (this.flapAnim > 0) this.flapAnim -= dt;
    const f = this.flapAnim > 0.14 ? 2 : this.flapAnim > 0.06 ? 1 : this.vy < 40 ? 0 : 1;
    this.player.setTexture(`cond_${f}`);
    this.player.setPosition(this.sx, Math.round(this.py));
    this.player.setAngle(Phaser.Math.Clamp(this.vy * 0.07, -18, 24));
    this.player.setAlpha(this.invuln > 0 && Math.floor(this.time.now / 80) % 2 === 0 ? 0.35 : 1);
  }

  private updateTalkers() {
    const sx = this.cameras.main.scrollX;
    for (const t of this.talkers) {
      const screenX = t.x - sx;
      const show = screenX > 50 && screenX < 410;
      if (show !== t.shown) {
        t.shown = show; t.bub.setVisible(show);
        if (show) { t.bub.setAlpha(0); this.tweens.add({ targets: t.bub, alpha: 0.96, duration: 160 }); }
      }
    }
  }

  private updateHud() {
    const fs = `${this.food}/${WIN_FOOD}`;
    if (fs !== this.lastFoodStr) { this.lastFoodStr = fs; this.foodTxt.setText(fs); this.foodTxt.container.each((o: Phaser.GameObjects.Image) => o.setScrollFactor(0)); this.foodTxt.setColor(this.food >= WIN_FOOD ? 0xffd23c : 0xffffff); }
    const p = Phaser.Math.Clamp(this.px / this.course.endX, 0, 1);
    this.progress.width = GEO.W * p; this.progressMark.x = GEO.W * p;
  }

  private sayOverPlayer(text: string) {
    this.playerBub?.destroy();
    this.playerBub = bubble(this, text, { width: 80, depth: 35 }).setScrollFactor(0);
    this.playerBubUntil = this.time.now + 900;
  }

  private showToast(text: string, strong = false) {
    this.toast?.destroy();
    const b = bubble(this, text, { width: 220, size: 11, depth: 36, tail: false }).setScrollFactor(0);
    b.setPosition(240, 56 + b.bh); b.setAlpha(0);
    this.toast = b;
    this.tweens.add({ targets: b, alpha: 1, duration: 150 });
    this.time.delayedCall(strong ? 2200 : 1500, () => this.tweens.add({ targets: b, alpha: 0, duration: 250, onComplete: () => { b.destroy(); if (this.toast === b) this.toast = undefined; } }));
  }

  private burst(x: number, y: number, color: number, n: number) {
    for (let i = 0; i < n; i++) {
      const p = this.add.image(x, y, 'px').setTint(color).setDepth(16);
      const a = (i / n) * Math.PI * 2 + Math.random(), d = 12 + Math.random() * 14;
      this.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, duration: 320, onComplete: () => p.destroy() });
    }
  }

  private drawDebug() {
    const g = this.dbg!; g.clear();
    g.lineStyle(1, 0x00ff88); g.strokeRect(this.px - GEO.player.hitW / 2, this.py - GEO.player.hitH / 2, GEO.player.hitW, GEO.player.hitH);
    g.lineStyle(1, 0xff3355);
    for (const l of this.live) if (!l.taken && l.item.type !== 'food') g.strokeRect(l.item.x - l.item.w / 2, l.item.y - l.item.h / 2, l.item.w, l.item.h);
    this.dbgTxt!.setText(`fps ${this.game.loop.actualFps.toFixed(0)}  x ${this.px.toFixed(0)}  y ${this.py.toFixed(0)}  vy ${this.vy.toFixed(0)}`);
  }

  private exposeApi() {
    (window as unknown as { __cuntur: unknown }).__cuntur = {
      snap: () => ({ state: this.state, px: this.px, py: this.py, vy: this.vy, hearts: this.hearts, food: this.food, elapsed: this.elapsed, world: this.world.id, end: this.course.endX, speed: this.world.speed, foodCount: this.course.foodCount }),
      tap: () => this.onTap(),
      pause: () => this.pause(), resume: () => this.resume(),
      manual: (v: boolean) => { this.manual = v; },
      stepFrame: (flap: boolean) => { if (flap) this.flap(); this.step(STEP); this.step(STEP); return (window as unknown as { __cuntur: { snap(): unknown } }).__cuntur.snap(); },
    };
  }
}
