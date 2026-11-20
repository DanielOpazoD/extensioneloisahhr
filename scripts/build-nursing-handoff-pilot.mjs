import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { unzipSync, zipSync } from 'fflate';
import { packageRayenExtension } from './package-extension.mjs';

const installationKey = process.env.HHR_HANDOFF_LOCAL_KEY;
const port = Number(process.env.HHR_HANDOFF_FUNCTIONS_PORT ?? 5001);
if (!/^[a-f0-9]{64}$/.test(installationKey ?? '')) {
  throw new Error('Genera el piloto junto al emulador con runNursingHandoffPilot.cjs.');
}
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Puerto del emulador no válido.');

const { zip } = packageRayenExtension(process.cwd());
const files = unzipSync(zip);
const manifest = JSON.parse(Buffer.from(files['manifest.json']).toString());
manifest.name = 'Eloísa HHR · Entrega de turno (pruebas)';
manifest.version_name = manifest.version + ' · Entrega de turno (pruebas)';
manifest.host_permissions.push('http://127.0.0.1:' + port + '/*');
const nursingList = 'https://fichamedico.rayensalud.cl/dashboard/encounter-list-nurse*';

const testCase = process.env.HHR_HANDOFF_LOCAL_INTERACTIVE === '1' &&
  process.env.HHR_HANDOFF_SHARED_CENSUS !== '1' ? {
  episode: '901001',
  patient: { run: '11111111-1', name: 'Paciente ficticio · Entrega de turno' },
} : null;
const localPilot = { installationKey, port, testCase };
const worker = manifest.background.service_worker;
files[worker] = Buffer.concat([
  Buffer.from(`'use strict';\nglobalThis.HhrNursingHandoffLocalPilot = ${JSON.stringify(localPilot)};\n`),
  files[worker],
]);

if (testCase) {
  manifest.content_scripts.push({
    matches: [nursingList],
    js: ['nursing-handoff-local-check.js'],
    run_at: 'document_idle',
  });
  files['nursing-handoff-local-check.js'] = Buffer.from(`(() => {
    if (location.pathname !== '/dashboard/encounter-list-nurse' ||
        new URL(location.href).searchParams.get('hhrHandoffTest') !== '1') return;
    const row = document.createElement('section');
    row.className = 'hhr-hospitalized-panel';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Abrir entrega del paciente ficticio';
    button.dataset.hhrHandoffEpisode = ${JSON.stringify(testCase.episode)};
    row.append(button);
    document.body.prepend(row);
  })();\n`);
}
files['manifest.json'] = Buffer.from(JSON.stringify(manifest, null, 2));
const unpacked = process.env.HHR_HANDOFF_LOCAL_UNPACKED;
if (unpacked) {
  for (const [name, content] of Object.entries(files)) {
    const target = join(unpacked, name);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content, { mode: 0o600 });
  }
  console.log(unpacked);
} else {
  const target = 'dist/eloisa-hhr-entrega-turno-pruebas.zip';
  mkdirSync('dist', { recursive: true });
  writeFileSync(target, zipSync(files, { level: 6 }), { mode: 0o600 });
  chmodSync(target, 0o600);
  console.log(target);
}
