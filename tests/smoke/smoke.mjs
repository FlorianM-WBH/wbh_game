// Headless smoke test: serves dist/, plays a scripted sequence via window.__mm, saves screenshots.
// Usage: npm run build && npm run smoke   (uses the system Google Chrome via playwright-core)
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, 'tests/smoke/out');
mkdirSync(out, { recursive: true });
const PORT = 4173;

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'pipe' });
const stopServer = () => server.kill('SIGTERM');
process.on('exit', stopServer);

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/`);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('preview server did not start');
}

const errors = [];
let failed = false;
function check(cond, msg) {
  if (!cond) {
    failed = true;
    console.error('FAIL:', msg);
  } else console.log('ok:', msg);
}

try {
  await waitForServer();
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => window.__mm?.ready, null, { timeout: 15000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '01-title.png') });
  check((await page.evaluate(() => window.__mm.menuTitle())) === 'title', 'title screen shown');

  await page.evaluate(() => window.__mm.newGame(1234));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, '02-start.png') });
  check((await page.evaluate(() => window.__mm.state.cars.length)) === 2, 'new game has two starting cars');

  // walk with the keyboard and check the player moved
  const before = await page.evaluate(() => ({ ...window.__mm.app.scene.player }));
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowDown');
  const after = await page.evaluate(() => ({ x: window.__mm.app.scene.player.x, y: window.__mm.app.scene.player.y }));
  check(after.y > before.y + 5, `player walks (y ${before.y.toFixed(1)} -> ${after.y.toFixed(1)})`);

  // let customers arrive
  await page.evaluate(() => window.__mm.advance(90));
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(out, '03-customers.png') });
  const nCust = await page.evaluate(() => window.__mm.state.customers.length);
  check(nCust > 0, `customers arrived (${nCust})`);

  // open each workplace menu
  for (const id of ['office', 'computer', 'lift']) {
    await page.evaluate((id) => window.__mm.interact({ kind: 'station', id }), id);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(out, `04-menu-${id}.png`) });
    check(!!(await page.evaluate(() => window.__mm.menuTitle())), `${id} menu opens`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
  }

  // talk to a customer and negotiate if possible
  const cust = await page.evaluate(() => window.__mm.state.customers[0]);
  if (cust) {
    await page.evaluate((id) => window.__mm.interact({ kind: 'customer', customerId: id }), cust.id);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(out, '05-customer.png') });
    await page.keyboard.press('1');
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(out, '06-after-choice.png') });
    const title = await page.evaluate(() => window.__mm.menuTitle());
    if (title === 'negotiation') {
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(out, '07-negotiation.png') });
      check(true, 'negotiation panel reachable');
    }
    for (let i = 0; i < 4; i++) await page.keyboard.press('Escape');
  }

  // full loop: buy a car from a seller, repair it on the lift
  await page.evaluate(() => {
    window.__mm.state.customers = window.__mm.state.customers.filter((x) => x.intent === 'buy');
    window.__mm.state.cars = window.__mm.state.cars.filter((c) => c.loc.kind !== 'buyin');
    window.__mm.state.money = 50000;
  });
  const sellerId = await page.evaluate(() => window.__mm.spawn('sell'));
  check(sellerId != null, 'seller spawned');
  await page.waitForTimeout(4500);
  await page.screenshot({ path: path.join(out, '08-seller.png') });
  await page.evaluate((id) => window.__mm.interact({ kind: 'customer', customerId: id }), sellerId);
  await page.waitForTimeout(150);
  await page.keyboard.press('1');
  await page.waitForTimeout(150);
  check((await page.evaluate(() => window.__mm.menuTitle())) === 'negotiation', 'purchase negotiation opens');
  await page.keyboard.press('a');
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(out, '09-purchase-deal.png') });
  check((await page.evaluate(() => window.__mm.state.stats.carsBought)) === 1, 'car bought from seller');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(out, '10-bought-car-parked.png') });

  await page.evaluate(() => window.__mm.interact({ kind: 'station', id: 'lift' }));
  await page.waitForTimeout(150);
  await page.keyboard.press('1');
  await page.waitForTimeout(150);
  check((await page.evaluate(() => window.__mm.state.lift.carId)) != null, 'car on the lift');
  await page.screenshot({ path: path.join(out, '11-lift-menu.png') });
  await page.keyboard.press('1');
  await page.waitForTimeout(150);
  check((await page.evaluate(() => window.__mm.state.lift.job)) != null, 'repair job started');
  await page.evaluate(() => window.__mm.advance(10));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(out, '12-repairing.png') });
  await page.evaluate(() => window.__mm.advance(300));
  check((await page.evaluate(() => window.__mm.state.stats.repairsDone)) >= 1, 'repair finished');

  // evening
  await page.evaluate(() => window.__mm.advance(560));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '13-evening-or-summary.png') });

  check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
} catch (e) {
  failed = true;
  console.error(e);
} finally {
  stopServer();
}
console.log(failed ? 'SMOKE FAILED' : 'SMOKE OK', `(screenshots in ${path.relative(root, out)})`);
process.exit(failed ? 1 : 0);
