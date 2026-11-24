// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import '../../../extension/clinical-checklist-evolution.js';
import '../../../extension/clinical-checklist-broker.js';

const code = 'PT-00000000-0000-4000-8000-000000000001';
const record = { code, evolution: 'Aplicación pauta IAAS\nCódigo de verificación: ' + code };
beforeEach(() => vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(() => [{ height: 30 }]));
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

it('conserva la nota previa, notifica al editor nativo y evita insertar dos veces el mismo código', () => {
  document.body.innerHTML = '<section id="observationEntrySection"><textarea>Nota previa</textarea><textarea aria-hidden="true"></textarea></section>';
  const area = document.querySelector('textarea');
  const input = vi.fn(); area.addEventListener('input', input);
  expect(globalThis.HhrChecklistEvolution.insert({ ...record, evolution: 'Código distinto' })).toBe(false);
  expect(area.value).toBe('Nota previa');
  expect(globalThis.HhrChecklistEvolution.insert(record)).toBe(true);
  expect(globalThis.HhrChecklistEvolution.insert(record)).toBe(true);
  expect(area.value).toBe('Nota previa\n\n' + record.evolution);
  expect(input).toHaveBeenCalledTimes(1);
});

it('rechaza un editor ambiguo, un diálogo ajeno y un texto que no cabe', () => {
  document.body.innerHTML = '<section id="observationEntrySection"><textarea></textarea><textarea></textarea></section>';
  expect(globalThis.HhrChecklistEvolution.insert(record)).toBe(false);
  document.querySelector('textarea').remove();
  document.body.insertAdjacentHTML('beforeend', '<div role="dialog" aria-label="Alta"><textarea></textarea></div>');
  expect(globalThis.HhrChecklistEvolution.insert(record)).toBe(false);
  document.querySelector('[role=dialog]').setAttribute('aria-label', 'Nueva evolución');
  const note = document.querySelector('[role=dialog] textarea');
  note.maxLength = 8;
  expect(globalThis.HhrChecklistEvolution.insert(record)).toBe(false);
  note.removeAttribute('maxlength');
  expect(globalThis.HhrChecklistEvolution.insert(record)).toBe(true);
  expect(document.querySelector('section textarea').value).toBe('');
});

it('verifica el episodio, el profesional y el documento de nuevo antes de entregar respuestas a HHR', async () => {
  const url = 'https://fichamedico.rayensalud.cl/dashboard/encounter-list/91';
  const tabs = { connect: vi.fn(), get: vi.fn(async id => id === 1 ? { id, url } : { id, url: 'https://hhr-hospitalizados.app/' }) };
  const broker = globalThis.HhrClinicalChecklistBroker.create({ chrome: { storage: { local: { get: async () => ({ 'hhr-clinical-checklists-enabled': true }) } }, tabs },
    resolveSession: async () => ({ info: { practitionerId: 17 } }), getContext: async () => ({ patient: { run: 'TEST-X', name: 'Paciente ficticio' } }),
    encounterFromUrl: value => new URL(value).pathname.split('/').pop() });
  const sender = { frameId: 0, tab: { id: 1 }, url };
  const base = { encId: '91', actor: '17', document: 'TEST-X', hhrTabId: 2, request: { action: 'apply' } };
  for (const change of [{ actor: '42' }, { document: 'TEST-Y' }, { encId: '92' }]) {
    expect((await broker.handle({ ...base, ...change }, sender)).error).toBeTruthy();
  }
  const staleSender = { ...sender, url: url.replace('/91', '/80') };
  expect(await broker.handle({ ...base, request: { action: 'verify' } }, staleSender)).toMatchObject({ episode: '91', actor: '17', document: 'TEST-X' });
  expect(tabs.connect).not.toHaveBeenCalled();
});
