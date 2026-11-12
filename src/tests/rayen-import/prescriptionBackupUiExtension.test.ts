import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { expect, it, vi } from 'vitest';

it('conserva las opciones tras HTTP 500 y permite elegir e imprimir el respaldo', async () => {
  const root = document.createElement('div');
  root.innerHTML = '<main class="hhr-center-main"></main>';
  document.body.append(root);
  const sendMessage = vi.fn(async message => {
    if (message.type === 'options') return { ok: true, patient: { name: 'Paciente Sintetico' },
      groups: [{ key: 'professional:synthetic', professional: 'Medico Sintetico',
        count: 1, medications: [{ medication: 'Medicamento Sintetico' }] }] };
    return message.selectionKey === 'backup'
      ? { ok: true, backup: true, medicationCount: 1 }
      : { error: 'HTTP 500' };
  });
  const factory = vm.runInNewContext(readFileSync('extension/hhr-prescription-center.js', 'utf8') +
    ';globalThis.HhrPrescriptionCenterRuntime', { document });
  const helper = vm.runInNewContext(readFileSync('extension/prescription-print.js', 'utf8') +
    ';globalThis.HhrPrescriptionPrint', { URL });
  factory.create({ helper,
    runtimeMessages: { PRESCRIPTION_OPTIONS_REQUEST: 'options', PRESCRIPTION_PRINT_REQUEST: 'print' },
    currentRouteEncounterId: () => '123', prepareCenterModalRoot: () => root,
    runClinicalTransition: (_root: unknown, fn: () => void) => fn(),
    normalizedText: (s: string) => s, sendMessage,
    setLiveRegion: (el: HTMLElement, text: string) => { el.textContent = text; },
    attachPatientListFilter: vi.fn(), openHospitalizedDocuments: vi.fn(),
  }).open('123');
  await vi.waitFor(() => expect(root.querySelector<HTMLButtonElement>('.hhr-rx-submit')?.disabled).toBe(false));
  const submit = root.querySelector<HTMLButtonElement>('.hhr-rx-submit');
  submit?.click();
  await vi.waitFor(() => expect(root.textContent).toContain('HTTP 500'));
  const backup = root.querySelector<HTMLInputElement>('input[value="backup"]');
  expect(backup).not.toBeNull();
  backup?.click();
  expect(submit?.textContent).toBe('Generar respaldo HHR');
  submit?.click();
  await vi.waitFor(() => expect(root.textContent).toContain('Se abrió el respaldo HHR con 1'));
  expect(sendMessage).toHaveBeenLastCalledWith({ type: 'print', encId: '123',
    selectionKey: 'backup', printFormat: 'standard' });
  expect(root.querySelector('.hhr-rx-error')).toBeNull();
  root.remove();
});
