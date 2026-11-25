import assert from 'node:assert/strict';
import { visualSummary } from './nursing-summary-visual-fixture.mjs';

export async function verifyNursingSummary(page) {
  await page.setViewportSize({width:1366,height:768});
  await page.locator('main').evaluate((main, html) => { main.innerHTML = html; }, visualSummary);
  const grid = page.locator('[data-hhr-reading="vital-grid"]');
  await grid.waitFor();
  const tiles = grid.locator(':scope > *');
  assert.equal(await tiles.count(),9);
  const rects = await tiles.evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().toJSON()));
  assert.ok(rects.every(r => r.top === rects[0].top && r.height < 52),JSON.stringify(rects));
  const sizes = await tiles.first().evaluate(el => ['vital-value','vital-label','vital-pam','vital-time'].map(kind =>
    parseFloat(getComputedStyle(el.querySelector('[data-hhr-reading="'+kind+'"]')).fontSize)));
  assert.deepEqual(sizes,[15,12,11,11]);
  assert.equal(await tiles.first().locator('[data-hhr-reading="vital-pam"]').innerText(), 'PAM: 90');
  assert.equal(await tiles.nth(3).locator('strong').evaluate(el=>getComputedStyle(el).color),'rgb(255, 0, 0)');
  assert.ok(await page.getByRole('button',{name:'Ver historial completo'}).isVisible());
  assert.equal(await tiles.nth(2).locator('sub').textContent(), '2');
  const actions = page.locator('#nursing-test section:last-child tbody tr').first().getByRole('button');
  const controls = await actions.evaluateAll(buttons => buttons.map(el => el.getBoundingClientRect().toJSON()));
  assert.equal(controls.length,3);
  assert.ok(controls.every(r => Math.abs(r.top-controls[0].top)<1 && r.width>=24 && r.height>=24));
  assert.ok((await page.locator('#nursing-test tbody tr').last().boundingBox()).height < 46);
  // Partial navigation must not undo density while the section itself is still mounted.
  await page.locator('#nursing-test nav').evaluate(el=>el.remove());
  await page.waitForFunction(()=>!document.querySelector('[data-hhr-ficha-sections]'));
  assert.equal(await tiles.count(),9);
  await page.setViewportSize({width:390,height:844});
  const mobileTops = await tiles.evaluateAll(nodes => new Set(nodes.map(el => Math.round(el.getBoundingClientRect().top))).size);
  assert.equal(mobileTops, 3);
  assert.equal(await tiles.nth(7).locator('p').last().textContent(),'2 horas');
  const orders = page.locator('[data-hhr-reading="orders"]').last();
  await orders.getByRole('button',{name:'Más opciones'}).first().focus();
  assert.ok(await orders.evaluate(el => el.scrollWidth > el.clientWidth && el.scrollLeft > 0));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.ok(await tiles.last().evaluate(el=>el.getBoundingClientRect().right <= innerWidth));
}
