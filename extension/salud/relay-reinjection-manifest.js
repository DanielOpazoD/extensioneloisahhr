(function (root) {
  'use strict';
  const RELAYS = Object.freeze({
    'contenido/content-hhr.js': Object.freeze({
      ready: 'hhr',
      isolated: Object.freeze([
        'contratos/message-contract.js',
        'contratos/hhr-origin-policy.js',
        'salud/bridge-generation.js',
        'salud/health-push-ordering-runtime.js',
        'contenido/content-hhr-sync-bundle.js',
        'contenido/content-hhr-connection-repair.js',
        'salud/health-request-runtime.js',
        'contenido/content-hhr.js',
        'contenido/content-hhr-patient-flow.js',
        'contenido/content-hhr-epicrisis.js',
        'contenido/content-hhr-audit-documents.js',
        'contenido/content-hhr-patient-documents.js',
        'contenido/content-hhr-statistical-discharge.js',
        'contenido/content-hhr-statistical-evidence.js',
        'contenido/content-hhr-syslab.js',
        'clinico/clinical-checklist-hhr.js',
      ]),
    }),
    'contenido/content-fichamedico.js': Object.freeze({
      ready: 'fichamedico',
      companionFile: 'contenido/content-prescription-print.js',
      companionRequires: Object.freeze(['centro/hhr-prescription-ui-lifecycle.js']),
      main: Object.freeze([
        'fichamedico/fichamedico-isolation-normalization.js',
        'fichamedico/fichamedico-treating-physician-dom.js',
        'fichamedico/fichamedico-treating-physician-sources.js',
        'fichamedico/fichamedico-treating-physician-normalization.js',
        'fichamedico/fichamedico-diagnosis-coding.js',
        'fichamedico/fichamedico-normalization.js',
        'fichamedico/fichamedico-read-resilience.js',
        'fichamedico/fichamedico-capture-cache.js',
        'fichamedico/fichamedico-census-runtime.js',
        'salud/bridge-generation-main.js',
        'salud/connection-relay-recovery.js',
        'fichamedico/inject-fichamedico.js',
      ]), isolated: Object.freeze([
        'contratos/message-contract.js',
        'salud/bridge-generation.js',
        'contenido/content-fichamedico.js',
      ]),
    }),
    'contenido/content-gestioncamas.js': Object.freeze({
      ready: 'gestioncamas',
      main: Object.freeze([
        'salud/bridge-generation-main.js',
        'salud/connection-relay-recovery.js',
        'gestion-camas/inject-gestioncamas.js',
      ]),
      isolated: Object.freeze([
        'contratos/message-contract.js',
        'salud/bridge-generation.js',
        'gestion-camas/gestion-camas-bridge-health.js',
        'salud/health-push-ordering-runtime.js',
        'salud/hhr-connection-action-model.js',
        'salud/hhr-connection-presentation.js',
        'gestion-camas/gestion-camas-connection-indicator.js',
        'gestion-camas/gestion-camas-connection-indicator-bootstrap.js',
        'contenido/content-gestioncamas.js',
      ]),
    }),
    'syslab/syslab-bridge.js': Object.freeze({
      ready: null,
      allFrames: true,
      isolated: Object.freeze(['syslab/lab-result-parser.js', 'syslab/lab-viewer.js', 'syslab/syslab-network-probe.js', 'syslab/syslab-bridge.js']),
    }),
  });
  const matchesPattern = (url, pattern) => root.HhrAppOrigins.matchesPattern(url, pattern);
  const create = chromeApi => {
    const entryFor = (requiredFile, world) =>
      (chromeApi.runtime.getManifest().content_scripts || []).find(entry =>
        (world === 'MAIN' ? entry.world === 'MAIN' : entry.world !== 'MAIN') &&
        Array.isArray(entry.js) && entry.js.includes(requiredFile)
      );
    const resolveRelay = requiredFile => {
      const config = RELAYS[requiredFile];
      const isolatedEntry = entryFor(requiredFile, 'ISOLATED');
      if (!config || !isolatedEntry) return null;
      const definition = { main: [], ...config };
      if (!definition.isolated.every(file => isolatedEntry.js.includes(file))) return null;
      const mainEntry = definition.main.length ? entryFor(definition.main.at(-1), 'MAIN') : null;
      if (definition.main.length &&
          (!mainEntry || !definition.main.every(file => mainEntry.js.includes(file)))) return null;
      const companionEntry = definition.companionFile ? entryFor(definition.companionFile, 'ISOLATED') : null;
      if (definition.companionFile && (!companionEntry || definition.companionRequires?.some(file => !companionEntry.js.includes(file)))) return null;
      return { definition, isolatedEntry, companionEntry };
    };
    return { requiredFiles: Object.keys(RELAYS), resolveRelay, matchesPattern };
  };
  root.HhrRelayReinjectionManifest = Object.freeze({ create });
})(typeof self !== 'undefined' ? self : globalThis);
