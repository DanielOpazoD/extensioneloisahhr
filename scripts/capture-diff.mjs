// Before and after, for the eyes of a reviewer: captures the fictional views at a base revision and compares
// each one with the capture the change made, pixel by pixel. It writes an image of each difference and a table
// of how much changed. It never fails a build: a change of the view is expected; one nobody meant is seen here.
// Usage: node scripts/capture-diff.mjs <base ref> <directory of the change's captures> [<directory to write>]
import { execFileSync } from 'node:child_process';
import { appendFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const [base, changed, output = path.join(changed, 'diferencias')] = process.argv.slice(2);
if (!base || !changed) throw Error('Uso: node scripts/capture-diff.mjs <ref base> <directorio de capturas del cambio> [<directorio de salida>]');

// Each capture of the change, by the script that draws it and its directory under `changed`.
const views = [
  ['capture-summary.mjs', 'ficha-resumen', []],
  ['capture-care-plan.mjs', 'ficha-plan', []],
  ['capture-history.mjs', 'ficha-historial', []],
  ['capture-other-views.mjs', 'ficha-vistas', []],
];

await mkdir(output, {recursive:true});
const browser = await chromium.launch();
const rows = [];
try {
  const page = await browser.newPage();
  // Two images in one page, compared on a canvas: no image library to install.
  const compare = (before, after) => page.evaluate(async ([before, after]) => {
    const load = src => new Promise((done, fail) => { const image = new Image(); image.onload = () => done(image); image.onerror = fail; image.src = src; });
    const [a, b] = await Promise.all([load(before), load(after)]);
    const width = Math.max(a.width, b.width), height = Math.max(a.height, b.height);
    const draw = image => { const canvas = new OffscreenCanvas(width, height), context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, width, height); context.drawImage(image, 0, 0); return context.getImageData(0, 0, width, height); };
    const [pa, pb] = [draw(a), draw(b)];
    const out = new OffscreenCanvas(width, height), context = out.getContext('2d'), diff = context.createImageData(width, height);
    let changed = 0;
    for (let at = 0; at < pa.data.length; at += 4) {
      const delta = Math.abs(pa.data[at] - pb.data[at]) + Math.abs(pa.data[at + 1] - pb.data[at + 1]) + Math.abs(pa.data[at + 2] - pb.data[at + 2]);
      const grey = Math.round((pb.data[at] + pb.data[at + 1] + pb.data[at + 2]) / 3 * .25 + 191);
      // What changed in magenta over a pale copy of the new capture.
      if (delta > 24) { changed++; diff.data.set([214, 0, 140, 255], at); } else diff.data.set([grey, grey, grey, 255], at);
    }
    context.putImageData(diff, 0, 0);
    const blob = await out.convertToBlob({type:'image/png'});
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
    return {changed, total:width * height, sizes:[a.width + '×' + a.height, b.width + '×' + b.height], png:btoa(binary)};
  }, [before, after]);
  const dataUrl = async file => 'data:image/png;base64,' + (await readFile(file)).toString('base64');

  for (const [script, directory, extra] of views) {
    const mine = path.join(changed, directory);
    if (!existsSync(mine)) continue;
    const theirs = path.join(output, 'base-' + directory);
    try {
      execFileSync('node', [path.join('scripts', script), base, theirs, ...extra], {stdio:'ignore', timeout:10 * 60_000});
    } catch {
      rows.push([directory, '—', 'la revisión base no dibuja esta vista']);
      continue;
    }
    for (const name of (await readdir(mine)).filter(file => file.endsWith('.png')).sort()) {
      const before = path.join(theirs, name);
      if (!existsSync(before)) { rows.push([directory + '/' + name, '—', 'nueva']); continue; }
      const result = await compare(await dataUrl(before), await dataUrl(path.join(mine, name)));
      const share = result.changed / result.total;
      if (result.changed) await writeFile(path.join(output, directory + '-' + name), Buffer.from(result.png, 'base64'));
      rows.push([directory + '/' + name, (share * 100).toFixed(2) + ' %', result.sizes[0] === result.sizes[1] ? (result.changed ? 'cambió' : 'igual') : 'cambió de tamaño: ' + result.sizes.join(' → ')]);
    }
  }
} finally {
  await browser.close();
}
const table = ['| Captura | Píxeles distintos | Estado |', '| --- | ---: | --- |', ...rows.map(row => '| ' + row.join(' | ') + ' |')].join('\n');
const report = `## Capturas: antes (${base.slice(0, 12)}) y después\n\nEn magenta, lo que cambió. Las imágenes están en el artefacto «capturas-diferencias».\n\n${table}\n`;
await writeFile(path.join(output, 'README.md'), report);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report);
console.info(report);
