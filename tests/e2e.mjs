// E2E headless: bot que sigue la política óptima del validador (misma física), derrota por inactividad, reintento, pausa, orientación vertical.
import { serve, launch } from './lib.mjs';
import { WORLDS } from '../src/content/worlds.ts';
import { solve, K } from '../tools/plan.ts';

const { server, port } = await serve();
const browser = await launch();
const fails = [];
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) fails.push(name); };
const base = `http://127.0.0.1:${port}/`;
const errors = [];
async function open(query, vp = { width: 844, height: 390 }) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });
  await page.goto(base + query);
  await page.waitForFunction(() => window.__cuntur, null, { timeout: 15000 });
  return page;
}

// 1) Bot gana cada mundo
const only = process.argv[2];
for (const w of WORLDS) {
  if (only && only !== w.id) continue;
  const solver = solve(w, 3);
  const page = await open(`?world=${w.id}`);
  await page.evaluate(() => { window.__cuntur.manual(true); window.__cuntur.tap(); });
  let snap = await page.evaluate(() => window.__cuntur.snap());
  let k = 0, f = 0;
  while (snap.state === 'playing' && f < solver.F + 5) {
    const yBin = Math.min(solver.Y - 1, Math.max(0, Math.round(snap.py - solver.yMin)));
    const { flap } = solver.policy(f, yBin, k);
    snap = await page.evaluate((fl) => window.__cuntur.stepFrame(fl), flap);
    k = Math.min(K, (flap ? 0 : k) + 1); f++;
  }
  check(`bot gana ${w.id}`, snap.state === 'won' && snap.food >= 10, `estado=${snap.state} comida=${snap.food}/${snap.foodCount} corazones=${snap.hearts} t=${snap.elapsed.toFixed(1)}s`);
  await page.screenshot({ path: `/tmp/shots/win_${w.id}.png` });
  await page.context().close();
}
if (!only || only === 'ui') {
  // 2) Inactividad => pierde; clic real en REINTENTAR => vuelve a "ready" con 3 corazones
  let page = await open('?world=costa');
  await page.evaluate(() => { window.__cuntur.manual(true); window.__cuntur.tap(); });
  let s;
  for (let i = 0; i < 2000; i++) { s = await page.evaluate(() => window.__cuntur.stepFrame(false)); if (s.state !== 'playing') break; }
  check('sin aletear => pierde', s.state === 'lost', `corazones=${s.hearts}`);
  // los botones se activan a los 700 ms de reloj del juego; en headless (swiftshader ~17 fps) eso tarda más
  await page.waitForFunction(() => window.__game.scene.getScene('Game').input._list.some((o) => o.type === 'Rectangle' && o.y === 180 && o.alpha === 1), null, { timeout: 15000 });
  await page.screenshot({ path: '/tmp/shots/lose_panel.png' });
  const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await page.touchscreen.tap(box.x + (240 / 480) * box.w, box.y + (180 / 270) * box.h);
  await page.waitForFunction(() => window.__cuntur.snap().state === 'ready', null, { timeout: 8000 }).catch(() => {});
  s = await page.evaluate(() => window.__cuntur.snap());
  check('REINTENTAR reinicia sin pasar por el menú', s.state === 'ready' && s.hearts === 3 && s.food === 0, JSON.stringify(s));
  // 3) Pausa: no avanza y reanuda
  await page.waitForFunction(() => window.__cuntur && window.__cuntur.snap().state === 'ready');
  await page.evaluate(() => window.__cuntur.tap());
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__cuntur.pause());
  const a = await page.evaluate(() => window.__cuntur.snap());
  await page.waitForTimeout(500);
  const b = await page.evaluate(() => window.__cuntur.snap());
  check('pausa congela el juego', a.state === 'paused' && Math.abs(a.px - b.px) < 0.001);
  await page.touchscreen.tap(box.x + box.w / 2, box.y + box.h / 2);
  await page.waitForTimeout(300);
  s = await page.evaluate(() => window.__cuntur.snap());
  check('toque reanuda', s.state === 'playing');
  // 4) Cambio de pestaña pausa
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(200);
  s = await page.evaluate(() => window.__cuntur.snap());
  check('visibilitychange pausa', s.state === 'paused');
  await page.context().close();
  // 5) Vertical: aviso de girar
  page = await open('?world=costa', { width: 390, height: 844 });
  const disp = await page.evaluate(() => getComputedStyle(document.getElementById('rotate')).display);
  check('aviso de girar en vertical', disp === 'flex');
  await page.screenshot({ path: '/tmp/shots/portrait.png' });
  await page.context().close();
}
check('sin errores de consola/JS', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close(); server.close();
process.exit(fails.length ? 1 : 0);
