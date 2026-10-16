import { serve, launch } from './lib.mjs';
const { server, port } = await serve();
const browser = await launch();
const out = process.argv[2] || '/tmp/shots';
const worlds = ['costa', 'islas', 'viento', 'lava', 'selva'];
const logs = [];
const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
page.on('console', (m) => { if (m.type() !== 'log') logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await page.goto(`http://127.0.0.1:${port}/`);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/0_preload.png` });
await page.mouse.click(400, 200);
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/1_menu.png` });
for (const w of worlds) {
  await page.goto(`http://127.0.0.1:${port}/?world=${w}&speed=60`);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${w}_ready.png` });
  await page.evaluate(() => window.__cuntur.tap());
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/${w}_play.png` });
}
console.log(logs.slice(0, 20).join('\n'));
await browser.close(); server.close();
