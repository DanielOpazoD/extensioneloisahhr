import { createPublicKey } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { unzipSync, zipSync } from 'fflate';
import { packageRayenExtension } from './package-extension.mjs';

const origin = process.env.HHR_HANDOFF_TEST_ORIGIN;
const key = process.env.HHR_HANDOFF_TEST_PUBLIC_KEY;
if (!/^https:\/\/(?:deploy-preview-\d+--)?testinghhr\.netlify\.app$/.test(origin ?? '')) {
  throw new Error('Configura el sitio de pruebas para el registro de equipos.');
}
const files = unzipSync(packageRayenExtension(process.cwd()).zip);
const manifest = JSON.parse(Buffer.from(files['manifest.json']).toString());
const endpoint = new URL(process.env.HHR_HANDOFF_TEST_ENDPOINT ?? origin + '/');
const hospitalEndpoint = ['hhr-hospitalizados.app', 'southamerica-east1-hhr-pruebas.cloudfunctions.net'];
if (!process.env.HHR_HANDOFF_TEST_ENDPOINT || endpoint.protocol !== 'https:' ||
    endpoint.username || endpoint.password || hospitalEndpoint.includes(endpoint.hostname.replace(/\.$/, ''))) {
  throw new Error('Configura un endpoint HTTPS separado del backend de Hospitalizados.');
}
const publicKey = key && createPublicKey({ key: Buffer.from(key, 'base64'), format: 'der', type: 'spki' });
const manifestKey = publicKey && publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
if (!manifestKey || manifestKey === manifest.key) {
  throw new Error('Configura una clave pública de Chrome exclusiva de pruebas.');
}
const config = { origin, endpoint: endpoint.href };
manifest.key = manifestKey;
manifest.host_permissions.push(endpoint.origin + '/*');
manifest.name = 'Eloísa HHR · Equipo de enfermería (pruebas)';
manifest.version_name = manifest.version + ' · Equipo de enfermería (pruebas)';
manifest.content_scripts.find(entry => entry.js.includes('entrega-enfermeria/nursing-handoff-hhr-relay.js')).matches = [origin + '/*'];
const worker = manifest.background.service_worker;
files[worker] = Buffer.concat([
  Buffer.from(`'use strict';\nglobalThis.HhrNursingHandoffDevice = ${JSON.stringify(config)};\n`),
  files[worker],
]);
files['manifest.json'] = Buffer.from(JSON.stringify(manifest, null, 2));

const target = 'dist/eloisa-hhr-equipo-enfermeria-pruebas.zip';
mkdirSync('dist', { recursive: true });
writeFileSync(target, zipSync(files, { level: 6 }), { mode: 0o600 });
console.log(target);
