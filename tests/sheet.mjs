import { serve, launch } from './lib.mjs';
import { writeFileSync } from 'node:fs';
const { server, port } = await serve();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`http://127.0.0.1:${port}/?world=costa`);
await page.waitForTimeout(1500);
const url = await page.evaluate(() => {
  const g = window.__game; const keys = g.textures.getTextureKeys().filter((k) => /^(cond_|food_|hz_|npc_|ui_heart|meta)/.test(k));
  const S = 4; const cols = 6; const cell = 120;
  const cv = document.createElement('canvas'); cv.width = cols * cell; cv.height = Math.ceil(keys.length / cols) * cell + 10; const c = cv.getContext('2d');
  c.fillStyle = '#7fb8d8'; c.fillRect(0, 0, cv.width, cv.height); c.imageSmoothingEnabled = false;
  keys.forEach((k, i) => { const im = g.textures.get(k).getSourceImage(); const s = im.height > 60 ? 1.2 : S; const x = (i % cols) * cell + 4, y = Math.floor(i / cols) * cell + 4; c.drawImage(im, x, y, im.width * s, im.height * s); c.fillStyle = '#000'; c.font = '9px monospace'; c.fillText(k, x, y + cell - 12); });
  return cv.toDataURL('image/png');
});
writeFileSync('/tmp/shots/sheet.png', Buffer.from(url.split(',')[1], 'base64'));
await browser.close(); server.close();
