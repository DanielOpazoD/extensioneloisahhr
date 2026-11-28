// The extension has no module system: each file publishes an object on its world (`globalThis.HhrX = …`)
// and the manifest, or the worker's importScripts, decides what is loaded where and in what order. Nothing
// else says when a file uses an object its world never loads. This check reads every world the manifest
// declares and fails on such a use. Only a use of a member counts (`HhrX.create(…)`): a read that tolerates
// the object's absence (`HhrX ?? …`, `HhrX === true`, `HhrX?.…`, a default parameter) is optional.
// node scripts/check-load-order.mjs
import { readFile } from 'node:fs/promises';

const dir = new URL('../extension/', import.meta.url);
const source = async name => readFile(new URL(name, dir), 'utf8');
const manifest = JSON.parse(await source('manifest.json'));

const OWNER = String.raw`(?:globalThis|self|window|root|globalScope|global)`;
const defines = text => new Set([...text.matchAll(new RegExp(String.raw`\b${OWNER}\.(Hhr\w+)\s*=(?!=)`, 'g'))].map(match => match[1]));
const uses = text => new Set([...text.matchAll(new RegExp(String.raw`\b${OWNER}\.(Hhr\w+)\s*\.(?!\.)`, 'g'))].map(match => match[1]));
// Known and explained: a file shared by two worlds whose use of the object is only in a function that one
// world calls.
const explained = new Map([
  ['salud/health-request-runtime.js HhrHealthReportCacheRuntime', 'HHR pages use only runtimeRequest(); create() runs in the worker, which loads the cache.'],
]);

// The worlds: the worker with its imports, and per set of pages and world the content scripts in their order.
const worker = await source(manifest.background.service_worker);
const imported = [...worker.matchAll(/importScripts\(([\s\S]*?)\);/g)].flatMap(match => [...match[1].matchAll(/'([^']+\.js)'/g)].map(name => name[1]));
const worlds = [{name:'service worker', files:[...imported, manifest.background.service_worker]}];
const order = ['document_start', 'document_end', 'document_idle'];
const groups = new Map();
for (const entry of manifest.content_scripts) {
  const key = (entry.world || 'ISOLATED') + ' · ' + entry.matches.join(' ');
  const group = groups.get(key) || [];
  group.push(...(entry.js || []).map(file => ({file, at:order.indexOf(entry.run_at || 'document_idle')})));
  groups.set(key, group);
}
for (const [name, files] of groups) worlds.push({name, files:files.sort((a, b) => a.at - b.at).map(item => item.file)});

const problems = [];
for (const world of worlds) {
  const texts = new Map();
  for (const file of world.files) texts.set(file, await source(file).catch(() => { problems.push(`${world.name}: ${file} no existe`); return ''; }));
  const defined = new Map();
  for (const [file, text] of texts) for (const name of defines(text)) defined.set(name, [...(defined.get(name) || []), file]);
  for (const [file, text] of texts) {
    for (const name of uses(text)) if (!defined.has(name) && !explained.has(file + ' ' + name)) problems.push(`${world.name}: ${file} usa ${name}, que ningún archivo de ese mundo define`);
  }
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.info(`Orden de carga: ${worlds.length} mundos, ${worlds.reduce((sum, world) => sum + world.files.length, 0)} archivos, sin objetos que falten.`);
