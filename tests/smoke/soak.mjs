// Soak test: runs the built game for several in-game days at high speed with automatic deals,
// and checks for console errors and leaking scene objects. Usage: npm run build && node tests/smoke/soak.mjs
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = 4174;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'pipe' });
process.on('exit', () => server.kill('SIGTERM'));
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(`http://localhost:${PORT}/`)).ok) break;
  } catch {
    /* not up yet */
  }
  await new Promise((r) => setTimeout(r, 250));
}

const errors = [];
let failed = false;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`http://localhost:${PORT}/`);
await page.waitForFunction(() => window.__mm?.ready, null, { timeout: 15000 });
await page.evaluate(() => window.__mm.newGame(777));

const counts = [];
for (let day = 1; day <= 10; day++) {
  for (let step = 0; step < 72; step++) {
    await page.evaluate(() => {
      const mm = window.__mm;
      mm.app.ui.close();
      mm.state.money = Math.max(mm.state.money, 30000);
      // take every service job, sell to buyers via tags, keep the lifts busy
      for (const c of mm.state.customers) if (c.intent === 'service' && !c.service.accepted) mm.app.state.customers.find((x) => x.id === c.id).service.accepted = true;
      for (const car of mm.state.cars) if (car.loc.kind === 'lot' && car.price == null) car.price = 100;
      mm.advance(10);
    });
    await page.waitForTimeout(40);
  }
  await page.evaluate(() => window.__mm.app.ui.close());
  await page.waitForTimeout(800);
  const n = await page.evaluate(() => window.__mm.app.scene.children.list.length);
  counts.push(n);
  const info = await page.evaluate(() => `${window.__mm.state.cars.length} cars, ${window.__mm.state.customers.length} customers, sold ${window.__mm.state.stats.carsSold}`);
  console.log(`day ${day}: ${n} scene objects (${info})`);
}
await page.screenshot({ path: path.join(root, 'tests/smoke/out/soak-end.png') });
if (counts[counts.length - 1] > counts[1] + 40) {
  failed = true;
  console.error('FAIL: scene objects keep growing', counts);
}
if (errors.length) {
  failed = true;
  console.error('FAIL: console errors:', errors.slice(0, 5));
}
await browser.close();
console.log(failed ? 'SOAK FAILED' : 'SOAK OK');
process.exit(failed ? 1 : 0);
