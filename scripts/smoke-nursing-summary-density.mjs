import assert from 'node:assert/strict';
import { visualSummary } from './nursing-summary-visual-fixture.mjs';

export async function verifyNursingSummary(page, worker) {
  await page.setViewportSize({width:1366,height:768});
  await page.locator('main').evaluate((main, html) => { main.innerHTML = html; }, visualSummary);
  const grid = page.locator('[data-hhr-reading="vital-grid"]');
  await grid.waitFor();
  const tiles = grid.locator(':scope > *');
  assert.equal(await tiles.count(),9);
  const rects = await tiles.evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().toJSON()));
  assert.ok(rects.every(r => r.top === rects[0].top && r.height < 52),JSON.stringify(rects));
  const pressure = tiles.first();
  const visibleLabel = pressure.locator('[data-hhr-vital-short]');
  const display = await visibleLabel.evaluate(node => {
    const style = getComputedStyle(node,'::before');
    return { text:style.content, size:parseFloat(style.fontSize) };
  });
  assert.match(display.text,/^"PA"/, 'The pressure label must visibly read PA');
  assert.equal(display.size,12);
  assert.match(await pressure.ariaSnapshot(),/Presión/);
  const pressureSizes = () => pressure.evaluate(el => ['vital-value','vital-pam','vital-time'].map(kind =>
    parseFloat(getComputedStyle(el.querySelector('[data-hhr-reading="'+kind+'"]'), kind === 'vital-time' ? '::after' : null).fontSize)));
  // A measurement is read at the highlighted size of the ficha (16 px); its PAM and its age at the meta size.
  assert.deepEqual(await pressureSizes(),[16,12,12]);
  const alignedReadings = () => tiles.evaluateAll(nodes => {
    const bounds = (tile, kind) => tile.querySelector(`[data-hhr-reading="vital-${kind}"]`).getBoundingClientRect();
    const firstTop = bounds(nodes[0],'value').top;
    return nodes.every(tile => {
      const label = bounds(tile,'label'), value = bounds(tile,'value');
      return Math.abs(label.left - value.left) < 1 && value.top >= label.bottom && Math.abs(value.top - firstTop) < 1;
    });
  });
  assert.ok(await alignedReadings(),
    'Each desktop value must start beneath its label on the same line as the other values');
  const glucoseTime = tiles.nth(7).locator('[data-hhr-reading="vital-time"]');
  await glucoseTime.evaluate(node => { node.title = '08:15 · Profesional de prueba'; });
  const glucoseSource = grid.locator('[data-hhr-vital-source="08:15 · Profesional de prueba"]');
  await glucoseSource.waitFor();
  assert.ok(await alignedReadings(), 'An individual measurement timestamp must keep the numbers aligned');
  await glucoseTime.evaluate(node => node.removeAttribute('title'));
  await glucoseSource.waitFor({state:'detached'});
  assert.equal(await tiles.first().locator('[data-hhr-reading="vital-pam"]').innerText(), 'PAM: 90');
  assert.equal(await tiles.nth(3).locator('strong').evaluate(el=>getComputedStyle(el).color),'rgb(33, 33, 33)');
  const historyButton = page.getByRole('button',{name:'Ver historial completo'});
  assert.ok(await historyButton.isVisible());
  assert.equal(await historyButton.getAttribute('title'),'Ver historial completo');
  const historyWidth = (await historyButton.boundingBox()).width;
  assert.ok(historyWidth >= 24 && historyWidth <= 32);
  await historyButton.evaluate(button => button.addEventListener('click', () => button.dataset.opened = 'true', {once:true}));
  await historyButton.focus();
  await historyButton.press('Enter');
  assert.equal(await historyButton.getAttribute('data-opened'),'true');
  assert.equal(await tiles.nth(2).locator('sub').textContent(), '2');
  const actions = page.locator('#nursing-test section:last-child tbody tr').first().getByRole('button');
  const controls = await actions.evaluateAll(buttons => buttons.map(el => el.getBoundingClientRect().toJSON()));
  assert.equal(controls.length,3);
  assert.ok(controls.every(r => Math.abs(r.top-controls[0].top)<1 && r.width>=24 && r.height>=24));
  assert.ok((await page.locator('#nursing-test tbody tr').last().boundingBox()).height < 46);
  const themeKey = 'hhr-ficha-theme-v1';
  const setTheme = mode => worker.evaluate(([key,value]) => chrome.storage.local.set({[key]:value}), [themeKey,mode]);
  const diagnosis = page.locator('#nursing-test section').first();
  const compactHeight = (await diagnosis.boundingBox()).height;
  await page.locator('#hhr-clinical-operations-bar .brand').click();
  const center = page.locator('#hhr-prescription-print-modal');
  await center.locator('[data-module="settings"].hhr-center-nav-button').click();
  const picker = center.getByLabel('Vista de la ficha clínica');
  assert.equal(await picker.locator('option').count(),4);
  for (const mode of ['off','reading','balanced','compact']) {
    if (mode === 'reading') await setTheme(mode); // Change from another extension context.
    else await picker.selectOption(mode);
    await page.waitForFunction(mode => (document.documentElement.dataset.hhrFichaTheme || 'off') === mode, mode);
    assert.equal(await picker.inputValue(),mode);
    assert.equal(await worker.evaluate(key => chrome.storage.local.get(key).then(result => result[key]),themeKey), mode);
    assert.equal(await page.locator('.reading').count(),9);
    if (mode === 'off') {
      assert.equal(await grid.count(),0);
      assert.equal(await page.locator('#nursing-test .reading').first().evaluate(el => getComputedStyle(el).minHeight),'122px');
    }
    if (mode === 'balanced') assert.ok((await diagnosis.boundingBox()).height > compactHeight);
  }
  await center.locator('.hhr-center-nav-button[data-module="home"]').click();
  await center.locator('.hhr-rx-close').click();
  // Partial navigation must not undo density while the section itself is still mounted.
  await page.locator('#nursing-test nav').evaluate(el=>el.remove());
  await page.waitForFunction(()=>!document.querySelector('[data-hhr-ficha-sections]'));
  assert.equal(await tiles.count(),9);
  await page.setViewportSize({width:390,height:844});
  assert.deepEqual(await pressureSizes(),[15,11,11]);
  const mobileTops = await tiles.evaluateAll(nodes => new Set(nodes.map(el => Math.round(el.getBoundingClientRect().top))).size);
  assert.equal(mobileTops, 3);
  assert.equal(await tiles.nth(7).locator('p').last().textContent(),'2 horas');
  const orders = page.locator('[data-hhr-reading="orders"]').last();
  await orders.getByRole('button',{name:'Más opciones'}).first().focus();
  assert.ok(await orders.evaluate(el => el.scrollWidth > el.clientWidth && el.scrollLeft > 0));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.ok(await tiles.last().evaluate(el=>el.getBoundingClientRect().right <= innerWidth));
}
