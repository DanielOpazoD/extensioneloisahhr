// A ratchet for what makes the code hard to read: lines wider than 160 characters and files longer than
// 800 lines. Today's counts are kept in scripts/code-shape-baseline.json; a change may lower them, never
// raise them (a long file may grow only while its wide lines go down), and a new file starts at zero.
// When a change lowers a count, refresh the baseline with
// `node scripts/check-code-shape.mjs --update`, so that the gain is kept.
import { readdir, readFile, writeFile } from 'node:fs/promises';

const WIDE = 160, LONG = 800;
const dir = new URL('../extension/', import.meta.url);
const baselineUrl = new URL('./code-shape-baseline.json', import.meta.url);
const files = (await readdir(dir)).filter(name => /\.(js|css)$/.test(name)).sort();

const shape = {};
for (const name of files) {
  const lines = (await readFile(new URL(name, dir), 'utf8')).split('\n');
  const wide = lines.filter(line => line.length > WIDE).length;
  if (wide || lines.length > LONG) shape[name] = {wide, ...(lines.length > LONG ? {lines:lines.length} : {})};
}

if (process.argv.includes('--update')) {
  await writeFile(baselineUrl, JSON.stringify(shape, null, 1) + '\n');
  console.info('Línea base de la forma del código actualizada.');
  process.exit(0);
}
const baseline = JSON.parse(await readFile(baselineUrl, 'utf8'));
const worse = [], better = [];
for (const name of files) {
  const now = shape[name] || {wide:0}, before = baseline[name] || {wide:0};
  if (now.wide > before.wide) worse.push(`${name}: ${now.wide} líneas de más de ${WIDE} caracteres (antes ${before.wide})`);
  // Splitting wide lines adds lines: a long file may grow when its wide lines went down in the same change.
  if ((now.lines || 0) > Math.max(before.lines || 0, LONG) && now.wide >= before.wide) worse.push(`${name}: ${now.lines} líneas (antes ${before.lines || 'menos de ' + LONG})`);
  if (now.wide < before.wide || (now.lines || 0) < (before.lines || 0)) better.push(name);
}
if (worse.length) {
  console.error('La forma del código empeoró:\n' + worse.join('\n') + '\nParte la línea o el archivo; ver docs/arquitectura.md.');
  process.exit(1);
}
const total = Object.values(shape).reduce((sum, item) => sum + item.wide, 0);
console.info(`Forma del código: ${total} líneas anchas en ${Object.keys(shape).length} archivos, ninguna peor que la línea base.` +
  (better.length ? ` Mejoraron ${better.length}: actualiza la línea base con --update.` : ''));
