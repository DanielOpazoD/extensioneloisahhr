// Render the same synthetic summary against a release tag or the current checkout.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { visualSummary } from './nursing-summary-visual-fixture.mjs';

const [revision, outputDirectory] = process.argv.slice(2);
if (!revision || !outputDirectory) throw new Error('Uso: node scripts/capture-nursing-summary.mjs <etiqueta|WORKTREE> <directorio>');
await mkdir(outputDirectory, {recursive:true});
const browser = await chromium.launch();
try {
  for (const width of [1366,390]) {
    const page = await browser.newPage({viewport:{width,height:768},deviceScaleFactor:1});
    await page.setContent('<main>'+visualSummary+'</main>');
    for (const name of ['hhr-ficha-reading-surfaces','hhr-ficha-vital-strip','hhr-ficha-summary-density','hhr-native-ficha-presentation']) {
      const file = 'extension/'+name+'.js';
      const content = revision === 'WORKTREE' ? await readFile(file,'utf8') :
        execFileSync('git',['show',revision+':'+file],{encoding:'utf8'});
      await page.addScriptTag({content});
    }
    await page.evaluate(async () => {
      window.HhrNativeFichaPresentation.create().refresh('1');
      await document.fonts.ready;
      await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
    });
    const metrics = await page.evaluate(() => ({
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
    await page.close();
  }
} finally {
  await browser.close();
}
