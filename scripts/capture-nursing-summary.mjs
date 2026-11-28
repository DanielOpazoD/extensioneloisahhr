// Render the same synthetic summary against a release tag or the current checkout.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { extensionSource } from './ficha-capture-harness.mjs';
import path from 'node:path';
import { visualSummary } from './nursing-summary-visual-fixture.mjs';

const [revision, outputDirectory, theme] = process.argv.slice(2);
if (!revision || !outputDirectory) throw new Error('Uso: node scripts/capture-nursing-summary.mjs <etiqueta|WORKTREE> <directorio> [off|compact|balanced|reading]');
await mkdir(outputDirectory, {recursive:true});
const source = extensionSource(revision);
const has = async name => { try { await source(name); return true; } catch { return false; } };
const browser = await chromium.launch();
try {
  for (const width of [1366,390]) {
    const page = await browser.newPage({viewport:{width,height:768},deviceScaleFactor:1});
    await page.setContent('<main>'+visualSummary+'</main>');
    // Every file is in ficha/; a tag from before 0.48.242 kept it in the root, and the harness finds it there.
    if (await has('ficha/hhr-ficha-themes.css')) await page.addStyleTag({content:await source('ficha/hhr-ficha-themes.css')});
    const newer = await has('ficha/hhr-ficha-round-layout.js');
    const orders = await has('ficha/hhr-ficha-order-details.js');
    const plan = await has('ficha/hhr-ficha-care-plan.js');
    const extra = [...(newer ? ['hhr-ficha-round-layout','hhr-ficha-reading-labels'] : []), ...(orders ? ['hhr-ficha-order-details'] : [])];
    for (const file of extra) await page.addStyleTag({content:await source('ficha/'+file+'.css')});
    for (const name of [...extra,...(orders ? ['hhr-ficha-note-reader'] : []),...(plan ? ['hhr-ficha-care-plan'] : []),'hhr-ficha-reading-surfaces','hhr-ficha-vital-strip','hhr-ficha-summary-density','hhr-native-ficha-presentation']) {
      await page.addScriptTag({content:await source('ficha/'+name+'.js')});
    }
    await page.evaluate(async theme => {
      window.HhrNativeFichaPresentation.create().refresh('1',theme);
      await document.fonts.ready;
      await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
    }, theme);
    const metrics = await page.evaluate(() => ({
      summaryHeight:document.querySelector('#nursing-test').getBoundingClientRect().height,
      vitalHeight:document.querySelector('.readings').getBoundingClientRect().height,
      diagnosisHeight:document.querySelector('section').getBoundingClientRect().height,
      completeOrders:[...document.querySelectorAll('section:last-of-type tbody tr')].filter(row => {
        const bounds = row.getBoundingClientRect();
        return bounds.top >= 0 && bounds.bottom <= innerHeight;
      }).length,
      pageWidth:document.documentElement.scrollWidth,
      cellFont:getComputedStyle(document.querySelector('tbody td')).fontSize,
    }));
    console.log(revision,width,metrics);
    await page.screenshot({path:path.join(outputDirectory,width+'.png')});
    await page.locator('#vitalSignsEntry').screenshot({path:path.join(outputDirectory,'signos-'+width+'.png')});
    await page.close();
  }
} finally {
  await browser.close();
}
