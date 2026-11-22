import { mkdirSync, writeFileSync } from 'node:fs';
import { unzipSync, zipSync } from 'fflate';
import { packageRayenExtension } from './package-extension.mjs';

const origin = process.env.HHR_HANDOFF_TEST_ORIGIN ?? 'https://deploy-preview-1901--testinghhr.netlify.app';
if (!/^https:\/\/(?:(?:deploy-preview-\d+--)?)testinghhr\.netlify\.app$/.test(origin)) {
  throw new Error('El registro de equipos requiere el sitio de pruebas de HHR.');
}
const functions = 'https://southamerica-east1-hhr-pruebas.cloudfunctions.net';
const config = { origin, endpoint: functions + '/nursingHandoffDevice' };
const files = unzipSync(packageRayenExtension(process.cwd()).zip);
const manifest = JSON.parse(Buffer.from(files['manifest.json']).toString());
manifest.name = 'Eloísa HHR · Equipo de enfermería (pruebas)';
manifest.version_name = manifest.version + ' · Equipo de enfermería (pruebas)';
manifest.host_permissions.push(functions + '/*');
manifest.content_scripts.find(entry => entry.js.includes('nursing-handoff-hhr-relay.js')).matches = [origin + '/*'];
const worker = manifest.background.service_worker;
files[worker] = Buffer.concat([
  Buffer.from(`'use strict';\nglobalThis.HhrNursingHandoffDevicePilot = ${JSON.stringify(config)};\n`),
  files[worker],
]);
files['manifest.json'] = Buffer.from(JSON.stringify(manifest, null, 2));

const target = 'dist/eloisa-hhr-equipo-enfermeria-pruebas.zip';
mkdirSync('dist', { recursive: true });
writeFileSync(target, zipSync(files, { level: 6 }), { mode: 0o600 });
console.log(target);
