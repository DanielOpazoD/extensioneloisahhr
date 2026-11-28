// @vitest-environment node
// The service worker as it runs: every file it imports, its router and its routes. These tests send it the
// messages a page sends and check what it answers, where other tests read its source.
import { describe, expect, it } from 'vitest';
import { fichaSender, loadWorker } from '../support/workerHarness.js';

describe('service worker', () => {
  const worker = loadWorker();

  it('carga sus módulos y registra su enrutador', () => {
    expect(worker.listeners.filter(([route]) => route === 'chrome.runtime.onMessage').length).toBeGreaterThan(0);
    expect(typeof worker.context.HhrClinicalPanelRuntime.create).toBe('function');
  });

  it('no responde un mensaje que el contrato no conoce y rechaza uno mal formado antes de su ruta', async () => {
    expect(await worker.send({ type: 'X_DESCONOCIDO' })).toBe('sin respuesta');
    expect(await worker.send({ type: worker.types.CLINICAL_PANEL_REQUEST }, fichaSender())).toEqual({
      code: 'INVALID_MESSAGE', error: 'El campo encId no es válido para RAYEN_CLINICAL_PANEL_REQUEST.',
    });
  });

  it('responde la lista de hospitalizados solo a la propia ficha', async () => {
    expect(await worker.send({ type: worker.types.HOSPITALIZED_ROSTER_REQUEST }, { frameId: 0, url: 'https://example.test/dashboard/' }))
      .toEqual({ error: 'Lista de hospitalizados no disponible.' });
    // From the ficha, it asks that tab for its session: with no relay answering, it says so.
    expect(await worker.send({ type: worker.types.HOSPITALIZED_ROSTER_REQUEST }, fichaSender()))
      .toEqual({ error: 'La pestaña emisora no entregó una sesión clínica válida.' });
  });

  it('lee el panel clínico con la sesión de la ficha abierta y los documentos con la de la pestaña que pregunta', async () => {
    // No ficha open: the panel, which reads any open ficha, says so; the documents ask the sender's own tab.
    expect(await worker.send({ type: worker.types.CLINICAL_PANEL_REQUEST, encId: '141336' }, fichaSender())).toEqual({
      error: 'No hay una pestaña de Ficha Médico abierta. Ábrela e inicia sesión.',
      documentError: 'La pestaña emisora no entregó una sesión clínica válida.',
    });
  });
});

// Each runtime the worker needs is checked when it starts: a package without it stops with its own words,
// instead of answering clinical requests half wired.
const required = [
  ['clinical-write-recovery-policy.js', 'No se pudo cargar el runtime de escrituras clínicas.'],
  ['gestion-camas-egreso-lookup.js', 'No se pudo cargar la política de verificación de egresos.'],
  ['gestion-camas-egreso-report-runtime.js', 'No se pudo cargar el runtime del reporte de egresos.'],
  ['gestion-camas-clinical-cribs.js', 'No se pudo cargar el mapeo de cunas RN.'],
  ['gestion-camas-discharge-report-runtime.js', 'No se pudo cargar el runtime del informe estadístico de egreso.'],
  ['clinical-handoff-runtime.js', 'No se pudo cargar el runtime clínico de entrega de turno.'],
  ['clinical-panel-runtime.js', 'No se pudo cargar el runtime de lectura del panel clínico.'],
  ['patient-document-manager-runtime.js', 'No se pudo cargar el runtime del Gestor documental.'],
  ['clinical-report-runtime.js', 'No se pudo cargar el runtime de informes clínicos.'],
  ['clinical-batch-print-runtime.js', 'No se pudo cargar el runtime batch de documentos hospitalizados.'],
  ['clinical-score-runtime.js', 'No se pudo cargar el runtime de lectura de Scores.'],
  ['clinical-score-write-model.js', 'No se pudo cargar el runtime de escritura de Scores.'],
  ['fichamedico-transport-runtime.js', 'No se pudo cargar el runtime de transporte de Ficha Médico.'],
  ['fichamedico-history-read-model.js', 'No se pudieron cargar los modelos de lectura clínica de Ficha Médico.'],
  ['fichamedico-clinical-client.js', 'No se pudo cargar el cliente clínico de lectura de Ficha Médico.'],
  ['fichamedico-patient-flow-runtime.js', 'No se pudo cargar el runtime de trazabilidad de pacientes.'],
  ['fichamedico-patient-context.js', 'No se pudo cargar el contexto clínico de pacientes de Ficha Médico.'],
  ['rayen-sync-bundle-runtime.js', 'No se pudo cargar el coordinador de sincronización Rayen.'],
  ['runtime-generation.js', 'No se pudo cargar la generación de ejecución de la extensión.'],
  ['connection-repair-runtime.js', 'No se pudo cargar la reparación limpia de conexiones.'],
];
describe('arranque del service worker', () => {
  it.each(required)('sin %s se detiene y lo dice', (file, words) => {
    expect(() => loadWorker({ without: [file] })).toThrow(words);
  });
});

