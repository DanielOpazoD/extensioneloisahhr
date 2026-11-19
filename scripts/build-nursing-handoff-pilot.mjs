import { mkdirSync, writeFileSync } from 'node:fs';
import { unzipSync, zipSync } from 'fflate';
import { packageRayenExtension } from './package-extension.mjs';

const { zip } = packageRayenExtension(process.cwd());
const files = unzipSync(zip);
const manifest = JSON.parse(Buffer.from(files['manifest.json']).toString());
manifest.name = 'Eloísa HHR · Entrega de turno (pruebas)';
manifest.version_name = manifest.version + ' · Entrega de turno (pruebas)';
manifest.host_permissions.push('http://127.0.0.1:5001/*');
const worklist = manifest.content_scripts.find(item => item.js.includes('hhr-nursing-worklist.js'));
worklist.js.unshift('nursing-handoff-pilot-flag.js');
files['nursing-handoff-pilot-flag.js'] = Buffer.from('globalThis.HhrNursingHandoffDemo = true;\n');
files['manifest.json'] = Buffer.from(JSON.stringify(manifest, null, 2));
mkdirSync('dist', { recursive: true });
writeFileSync('dist/eloisa-hhr-entrega-turno-pruebas.zip', zipSync(files, { level: 6 }));
console.log('dist/eloisa-hhr-entrega-turno-pruebas.zip');
