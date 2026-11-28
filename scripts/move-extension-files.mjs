// Moves the flat `extension/` folder into one folder per subject and rewrites every reference to
// the moved files (stage 3 of docs/arquitectura.md). It runs in two steps, one commit each, so git
// sees the renames and branches that edit the same files can rebase on top:
//
//   node scripts/move-extension-files.mjs --plan   prints old → new and changes nothing
//   node scripts/move-extension-files.mjs --move   `git mv` of every file, contents untouched
//   node scripts/move-extension-files.mjs --refs   rewrites the references to the new paths
//
// A reference is rewritten when it names the file as a path: `extension/<name>` (as in the links of
// the documentation and the tests) or the whole name between quotes or backticks (manifest, worker
// imports, HTML `src`/`href`, `chrome.runtime.getURL`, the lists of the relay reinjection, the
// helpers of the tests). A name mentioned in prose is left as it is. Both steps can run again.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });

// What stays in the root: what Chrome or HHR reach by a fixed address. The pages keep their URL
// (HHR checks `/urgency-login.html`, the popup, the offscreen document and the iframes are opened by
// path), the manifest and the worker, the lock of the vendored files and the folders of images.
const stays = name => /^(manifest\.json|background\.js|vendor-lock\.json|README\.md|[\w-]+\.html)$/.test(name);

// First rule that matches wins. Exact names go before the prefixes that would also catch them.
const RULES = [
  ['icons', /^hhr-logo\.svg$/],
  ['vendor', /^(jspdf\.umd\.min\.js|pdf-lib\.min\.js|xlsx\.full\.min\.js|pdf\.min\.mjs|pdf\.worker\.min\.mjs)$/],
  ['contratos', /^(message-contract|offscreen-contract|eloisa-patient-code-contract|clinical-read-error-contract|hhr-origin-policy)\.js$/],
  ['contenido', /^content-/],
  ['fichamedico', /^(fichamedico-|inject-fichamedico\.js$)/],
  ['gestion-camas', /^(gestion-camas-|cudyr-|inject-gestioncamas\.js$|worklist-patient-editor\.js$)/],
  ['urgencia', /^urgency-/],
  ['syslab', /^(syslab-|lab-result-parser\.js$|lab-viewer\.js$|offscreen-(coordinator|router)\.js$)/],
  ['exalab', /^exalab-/],
  ['entrega-enfermeria', /^nursing-handoff-/],
  ['ficha', /^(hhr-ficha-|hhr-native-ficha-presentation\.js$|ficha-evolution-notes\.js$|hhr-history-date-navigation\.js$|hhr-plan-)/],
  ['listas', /^(hhr-continuous-worklist-main|hhr-native-worklist-presentation|hhr-worklist-|hhr-nursing-|hhr-favorite-links|rapa-nui-weather|hhr-daily-births|worklist-return-)/],
  ['centro', /^(hhr-center-|hhr-lab-|hhr-prescription-|hhr-imaging-|hhr-request-|hhr-hospitalized-documents-center|hhr-document-preview-runtime|hhr-discharge-actions-runtime|hhr-medication-actions-runtime|hhr-clinical-write-client-runtime|hhr-read-recovery|hhr-ui|prescription-|exam-request-)/],
  ['documentos', /^(epicrisis-|audit-|pdf-print|print-pdf|report-parser|zip-store-writer|document-preview-jobs|patient-document-manager-runtime|hospitalization-report)/],
  ['clinico', /^(clinical-|encounter-navigation\.js$|tab-encounter-authorization\.js$)/],
  ['censo', /^(rayen-sync-bundle-runtime|sync-bundle-cancellation-runtime|capture-read-recovery|census-sync-horizon-runtime|hospitalized-roster-runtime|patient-clinical-bundle-runtime)\.js$/],
  ['salud', /^(health-|relay-reinjection-|connection-|runtime-generation|runtime-loader|bridge-generation|hhr-connection-)/],
  ['estado', /^(extension-|build-identity\.js$)/],
];

/** Old name in the root of `extension/` → new path inside it. Derived from the names, so it is the
 * same before and after the move. */
export function extensionMoves(names) {
  const moves = new Map();
  for (const name of names) {
    if (stays(name)) continue;
    const rule = RULES.find(([, pattern]) => pattern.test(name));
    if (!rule) throw new Error(`Sin carpeta para extension/${name}: agrega una regla.`);
    moves.set(name, `${rule[0]}/${name}`);
  }
  return moves;
}

const tracked = () => git('ls-files', '-z').split('\0').filter(Boolean);
// The names come from the root as it was before the move, or from the folders after it.
const currentMoves = () => {
  const names = new Set();
  for (const file of tracked()) {
    const parts = file.split('/');
    if (parts[0] !== 'extension' || parts.length > 3) continue;
    // The images of forms/, installation/ and icons/ were already in folders; only the logo moves.
    if (parts.length === 3 && !RULES.some(([folder]) => folder === parts[1])) continue;
    if (parts.length === 3 && parts[1] === 'icons' && parts[2] !== 'hhr-logo.svg') continue;
    names.add(parts.at(-1));
  }
  return extensionMoves([...names].sort());
};

const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Rewrites the references of one text. `code` also rewrites the names between quotes. */
export function rewriteReferences(text, moves, { code = true } = {}) {
  let out = text;
  for (const [name, target] of moves) {
    const word = escape(name);
    // `extension/<name>`, not followed by more of a file name (pdf.min.mjs vs pdf.min.mjs.map).
    out = out.replace(new RegExp(`(extension/)${word}(?![\\w.-])`, 'g'), `$1${target}`);
    if (code) out = out.replace(new RegExp(`(['"\`])${word}\\1`, 'g'), `$1${target}$1`);
  }
  return out;
}

// Never rewritten: the history keeps the names it had, the vendored files keep their hashes, the
// lock of npm is not ours, and this guion lists the old names on purpose.
const untouched = file => file === 'CHANGELOG.md' || file === 'package-lock.json'
  || file === 'scripts/move-extension-files.mjs' || /\.min\.(js|mjs)$/.test(file);
const isText = file => /\.(js|mjs|cjs|ts|tsx|json|html|css|md|yml|yaml)$/.test(file);

function move() {
  const moves = currentMoves();
  for (const [name, target] of moves) {
    if (!tracked().includes(`extension/${name}`)) continue;
    execFileSync('mkdir', ['-p', path.join(root, 'extension', path.dirname(target))]);
    git('mv', `extension/${name}`, `extension/${target}`);
  }
  console.log(`${moves.size} archivos en sus carpetas.`);
}

function refs() {
  const moves = currentMoves();
  let changed = 0;
  for (const file of tracked().filter(file => isText(file) && !untouched(file))) {
    const absolute = path.join(root, file);
    const text = readFileSync(absolute, 'utf8');
    const next = rewriteReferences(text, moves, { code: !file.endsWith('.md') });
    if (next !== text) {
      writeFileSync(absolute, next);
      changed += 1;
    }
  }
  console.log(`${changed} archivos con referencias reescritas.`);
}

const mode = process.argv[2];
if (mode === '--move') move();
else if (mode === '--refs') refs();
else if (mode === '--plan') for (const [name, target] of currentMoves()) console.log(`${name} → ${target}`);
else if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  console.error('Uso: node scripts/move-extension-files.mjs --plan | --move | --refs');
  process.exit(1);
}
