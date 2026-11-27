// A change of module in the compact ficha reads as one page (hhr-ficha-transitions.js). The fictional Resumen
// answers a click on «Plan de tratamiento» as Eloísa does: it selects the tab and draws the plan in the same
// task, unmarked; the presentation marks it later. Three browsers are checked: one with view transitions, one
// without them and one that asks for reduced motion.
// node scripts/capture-transitions.mjs <ref|WORKTREE> <directory>
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fichaAssets, mountFicha } from './ficha-capture-harness.mjs';
import { carePlanPage } from './care-plan-visual-fixture.mjs';
import { summaryPage } from './summary-visual-fixture.mjs';

const [revision, directory] = process.argv.slice(2);
if (!revision || !directory) throw Error('Uso: node scripts/capture-transitions.mjs <ref|WORKTREE> <directorio>');
const assets = await fichaAssets(revision);
await mkdir(directory, {recursive:true});

// The plan as Eloísa draws it under the tabs, and its styles.
const plan = carePlanPage();
const planMain = plan.match(/<main[^>]*>([\s\S]*)<\/main>/)[1];
const planStyle = plan.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/\.MuiAppBar-root\{[^}]*\}/g, '');

// Eloísa's tab: selects itself and draws its module in the task of the click. The presentation is not told:
// `present()` stands for its next pass.
function answerTabs(html) {
  const tab = document.getElementById('encounter-event-tab-care-plan');
  tab.addEventListener('click', () => {
    window.fixtureClicks = (window.fixtureClicks || 0) + 1;
    for (const other of document.querySelectorAll('[role="tab"]')) other.setAttribute('aria-selected', String(other === tab));
    const main = document.querySelector('main'), header = main.querySelector(':scope > .MuiAppBar-root');
    const holder = document.createElement('div');
    holder.innerHTML = html;
    main.replaceChildren(header, ...holder.childNodes);
  });
  window.present = () => document.dispatchEvent(new Event('fixture-refresh'));
}

async function open(browser, {transitions, reduced = false}) {
  const page = await browser.newPage({viewport:{width:1440, height:900}, deviceScaleFactor:1, locale:'es-CL', timezoneId:'Pacific/Easter', reducedMotion:reduced ? 'reduce' : 'no-preference'});
  await page.setContent(summaryPage({}));
  if (!transitions) await page.evaluate(() => { delete Document.prototype.startViewTransition; });
  // Each transition is recorded: when Eloísa's click arrives and what the page holds when the new view is taken.
  await page.evaluate(() => {
    window.transitionLog = [];
    const start = Document.prototype.startViewTransition;
    if (!start) return;
    Document.prototype.startViewTransition = function (update) {
      const entry = {startedSwitching:document.documentElement.hasAttribute('data-hhr-ficha-switching')};
      window.transitionLog.push(entry);
      return start.call(this, async () => {
        entry.clicksBefore = window.fixtureClicks || 0;
        await update();
        entry.selected = document.getElementById('encounter-event-tab-care-plan').getAttribute('aria-selected');
        entry.tabsName = getComputedStyle(document.querySelector('main > .MuiAppBar-root')).viewTransitionName;
      });
    };
  });
  await page.addStyleTag({content:planStyle.replace(/(^|\})\s*(body|main)\{[^}]*\}/g, '$1')});
  await mountFicha(page, assets, {theme:'compact'});
  await page.evaluate(answerTabs, planMain);
  return page;
}

// What is seen under the tabs right after the click, and once the presentation has passed.
const under = page => page.evaluate(() => {
  const first = document.querySelector('main > :not(.MuiAppBar-root)');
  return {opacity:Number(getComputedStyle(first).opacity), settling:document.documentElement.hasAttribute('data-hhr-ficha-settling'),
    switching:document.documentElement.hasAttribute('data-hhr-ficha-switching'), marked:Boolean(document.querySelector('[data-hhr-plan="card"]')),
    tabs:Math.round(document.querySelector('main > .MuiAppBar-root').getBoundingClientRect().top)};
});

const browser = await chromium.launch();
try {
  // 1. With view transitions: Eloísa's click arrives inside the transition, the tabs keep their place, nothing is veiled.
  let page = await open(browser, {transitions:true});
  const tabsTop = (await under(page)).tabs;
  await page.click('#encounter-event-tab-care-plan');
  // The presentation passes once Eloísa has drawn the plan, as the next frame of the page does.
  await page.waitForFunction(() => window.fixtureClicks === 1, null, {timeout:3000});
  await page.evaluate(() => window.present());
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-hhr-ficha-switching'), null, {timeout:3000});
  const log = await page.evaluate(() => window.transitionLog);
  assert.equal(log.length, 1, 'Un clic en una pestaña abre una transición: ' + JSON.stringify(log));
  assert.ok(log[0].startedSwitching && log[0].clicksBefore === 0 && log[0].selected === 'true' && log[0].tabsName === 'hhr-ficha-tabs',
    'El clic llega a Eloísa dentro de la transición y la línea de pestañas no se mueve: ' + JSON.stringify(log[0]));
  let seen = await under(page);
  assert.ok(seen.marked && seen.opacity === 1 && !seen.settling && seen.tabs === tabsTop && await page.evaluate(() => window.fixtureClicks) === 1,
    'Tras la transición el plan está presentado, a la vista, y Eloísa recibió un solo clic: ' + JSON.stringify(seen));
  await page.screenshot({path:path.join(directory, '1440-plan-tras-transicion.png')});
  await page.close();

  // 2. Without view transitions: the content under the tabs is veiled until the presentation marks the plan.
  page = await open(browser, {transitions:false});
  await page.click('#encounter-event-tab-care-plan');
  seen = await under(page);
  assert.ok(seen.settling && seen.opacity === 0 && !seen.marked, 'Sin transiciones, lo nuevo espera velado a la vista: ' + JSON.stringify(seen));
  await page.evaluate(() => window.present());
  await page.waitForTimeout(260);
  seen = await under(page);
  assert.ok(!seen.settling && seen.marked && seen.opacity === 1, 'Presentado el plan, el velo se va: ' + JSON.stringify(seen));
  await page.close();

  // 3. Without view transitions and without a pass of the presentation, the veil lifts by itself.
  page = await open(browser, {transitions:false});
  await page.evaluate(() => document.removeEventListener('fixture-refresh', window.fichaFixture.refresh));
  await page.click('#encounter-event-tab-care-plan');
  await page.waitForTimeout(700);
  seen = await under(page);
  assert.ok(!seen.settling && seen.opacity === 1, 'Sin la pasada de la vista, el velo se levanta solo: ' + JSON.stringify(seen));
  await page.close();

  // 4. Reduced motion: no transition, the veil alone.
  page = await open(browser, {transitions:true, reduced:true});
  await page.click('#encounter-event-tab-care-plan');
  seen = await under(page);
  assert.ok(seen.settling && await page.evaluate(() => window.transitionLog.length) === 0, 'Con movimiento reducido no hay transición: ' + JSON.stringify(seen));
  await page.evaluate(() => window.present());
  await page.close();
  console.info('Transiciones', assets.version, 'comprobadas');
} finally {
  await browser.close();
}
