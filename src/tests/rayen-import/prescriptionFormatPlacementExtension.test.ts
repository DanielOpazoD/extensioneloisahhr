// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../../extension/hhr-prescription-center.js';

const messages = {
  PRESCRIPTION_OPTIONS_REQUEST: 'options',
  PRESCRIPTION_PRINT_REQUEST: 'print',
  HOSPITALIZED_PRESCRIPTION_OPTIONS_REQUEST: 'census',
  HOSPITALIZED_PRESCRIPTION_PRINT_REQUEST: 'bulk-print',
};
const setup = () => {
  const root = document.createElement('div');
  root.innerHTML = '<main class="hhr-center-main"></main>';
  document.body.append(root);
  const sendMessage = vi.fn(async (message: { type: string }) => {
    if (message.type === 'options') return {
      groups: [{ key: 'staff', professional: 'Profesional de prueba', count: 1 }],
    };
    if (message.type === 'census') return {
      batchId: 'synthetic',
      patients: [{ encounterId: '2', name: 'Paciente de prueba', medicationCount: 1 }],
    };
    return { count: 1 };
  });
  globalThis.HhrPrescriptionCenterRuntime.create({
    helper: { formatDateTimeLabel: () => '', formatDateLabel: () => '' },
    runtimeMessages: messages,
    currentRouteEncounterId: () => '1',
    prepareCenterModalRoot: () => root,
    runClinicalTransition: vi.fn(),
    normalizedText: String,
    sendMessage,
    setLiveRegion: vi.fn(),
    attachPatientListFilter: vi.fn(),
    openHospitalizedDocuments: vi.fn(),
  }).open('1');
  return { root, sendMessage };
};
const input = (root: HTMLElement, selector: string) => {
  const node = root.querySelector(selector);
  if (!(node instanceof HTMLInputElement)) throw new Error('Missing input: ' + selector);
  return node;
};
const click = (root: HTMLElement, selector: string) => {
  const node = root.querySelector(selector);
  if (!(node instanceof HTMLButtonElement)) throw new Error('Missing button: ' + selector);
  node.click();
};

describe('Prescription format in the upper toolbar', () => {
  afterEach(() => { document.body.replaceChildren(); });

  it('keeps both formats above the scroll content and sends the compact current-patient selection', async () => {
    const { root, sendMessage } = setup();
    await vi.waitFor(() => expect(root.querySelectorAll('.hhr-rx-format-bar input')).toHaveLength(2));
    const bar = root.querySelector('.hhr-rx-format-bar');
    expect(bar?.nextElementSibling?.classList.contains('hhr-center-content')).toBe(true);
    expect(input(root, '[value="standard"]').checked).toBe(true);
    input(root, '[value="compact"]').click();
    click(root, '.hhr-rx-submit');
    await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'print', encId: '1', printFormat: 'compact',
    })));
  });

  it('replaces the formats when switching scope and prints the selected hospitalized patient', async () => {
    const { root, sendMessage } = setup();
    await vi.waitFor(() => expect(root.querySelectorAll('.hhr-rx-format-bar input')).toHaveLength(2));
    click(root, '[data-tab="hospitalized"]');
    expect(root.querySelector('.hhr-rx-format-bar')?.hasAttribute('hidden')).toBe(true);
    await vi.waitFor(() => expect(root.querySelectorAll('[name="hhr-bulk-prescription-format"]')).toHaveLength(2));
    expect(root.querySelectorAll('.hhr-rx-format-bar input')).toHaveLength(2);
    input(root, '[name="hhr-bulk-patient"]').click();
    input(root, '[value="compact"]').click();
    click(root, '.hhr-rx-submit');
    await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'bulk-print', encIds: ['2'], printFormat: 'compact',
    })));
    click(root, '[data-tab="current"]');
    await vi.waitFor(() => expect(root.querySelectorAll('[name="hhr-prescription-format"]')).toHaveLength(2));
    expect(root.querySelectorAll('[name="hhr-bulk-prescription-format"]')).toHaveLength(0);
  });
});
