// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../../extension/hhr-request-drafts.js';
import '../../../extension/hhr-read-recovery.js';
import '../../../extension/hhr-request-forms.js';
import '../../../extension/hhr-lab-request-patient.js';
import '../../../extension/hhr-lab-center.js';
import '../../../extension/hhr-lab-selection-runtime.js';
import '../../../extension/hhr-imaging-center.js';
import '../../../extension/hhr-document-preview-runtime.js';

const originalUrl = location.href;
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
const rootFor = id => {
  const root = document.createElement('div'); root.dataset.encounterId = id; root.dataset.selectedEncounterId = id;
  root.innerHTML = '<main class="hhr-center-main"></main>'; document.body.append(root); return root;
};
const messages = { CONNECTION_REPAIR_REQUEST: 'repair', EXTENSION_HEALTH_REQUEST: 'health' };
const connected = { fichaMedico: { status: 'ready', reason: 'connected' } };
const input = (root, selector, value) => {
  const field = root.querySelector(selector); field.value = value; field.dispatchEvent(new Event('input', { bubbles: true })); return field;
};
afterEach(() => {
  document.querySelectorAll('main').forEach(main => main.parentElement.__hhrDocumentPreview?.dispose());
  document.body.replaceChildren(); history.replaceState({}, '', originalUrl); vi.unstubAllGlobals();
  if (originalScroll) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll);
  else delete HTMLElement.prototype.scrollIntoView;
});

describe('Session-local request drafts', () => {
  const setup = () => {
    let actor = 'author-1', identity = null;
    const header = vi.fn(async id => {
      const patient = { name: 'Paciente de prueba', patientId: identity || 'patient-' + id, run: 'SINTETICO' };
      return { patient, actorId: actor, view: globalThis.HhrRequestForms.buildPatientView(patient, patient.run) };
    });
    const dependencies = { requestForms: globalThis.HhrRequestForms, labRequestPatient: globalThis.HhrLabRequestPatient,
      sendMessage: vi.fn(async () => ({})), runtimeMessages: messages, fetchPatientHeaderView: header,
      runClinicalTransition: (_root, action) => action(), normalizedText: String,
      setLiveRegion: (node, text) => { node.textContent = text; } };
    const lab = globalThis.HhrLabCenterRuntime.create(dependencies);
    const imaging = globalThis.HhrImagingCenterRuntime.create(dependencies);
    const labView = (root, id) => { root.dataset.activeModule = 'lab'; root.dataset.selectedEncounterId = id; lab.renderLabRequestView(root, id); };
    const imageView = (root, id) => { root.dataset.activeModule = 'imaging'; root.dataset.selectedEncounterId = id; imaging.renderImagingCenter(root, id); };
    return { labView, imageView, header, changeActor: value => { actor = value; }, changeIdentity: value => { identity = value; } };
  };
  const readyLab = root => vi.waitFor(() => expect(root.querySelector('.hhr-labreq-print').disabled).toBe(false));
  const readyImage = root => vi.waitFor(() => expect(root.querySelector('.hhr-imaging-print').disabled).toBe(false));

  it.each([['lab', false], ['imaging', false], ['lab', true], ['imaging', true]])('retains first-visit %s input until verification succeeds (failed session=%s)', async (kind, failed) => {
    const app = setup(), root = rootFor('1');
    const verifiedHeader = await app.header.getMockImplementation()('1');
    let finish;
    if (failed) app.header.mockResolvedValueOnce({ error: 'Sin sesión de Ficha Médico.', requiresLogin: true });
    else app.header.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const open = () => kind === 'lab' ? app.labView(root, '1') : app.imageView(root, '1');
    const field = kind === 'lab' ? '.hhr-labreq-medico' : '.hhr-imaging-physician';
    open(); input(root, field, 'Trabajo iniciado sin sesión');
    if (failed) await vi.waitFor(() => expect(root.querySelector('.hhr-read-reconnect')).toBeTruthy());
    if (kind === 'lab') { app.imageView(root, '1'); await readyImage(root); }
    else { app.labView(root, '1'); await readyLab(root); }
    finish?.(verifiedHeader); await Promise.resolve(); open();
    await (kind === 'lab' ? readyLab(root) : readyImage(root));
    expect(root.querySelector(field).value).toBe('Trabajo iniciado sin sesión');
  });

  it('preserves both forms, image documents and marks across module changes', async () => {
    const app = setup(), root = rootFor('1'); app.labView(root, '1'); await readyLab(root);
    const exam = root.querySelector('.hhr-labreq-exam input'); exam.checked = true;
    input(root, '.hhr-labreq-otros', 'Solicitud sintética'); input(root, '.hhr-labreq-medico', 'Profesional de prueba');
    app.imageView(root, '1'); await readyImage(root);
    input(root, '.hhr-imaging-physician', 'Solicitante de prueba');
    root.querySelector('[data-doc="encuesta"]').click();
    root.querySelector('.hhr-imaging-canvas').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(root.querySelectorAll('.hhr-imaging-mark')).toHaveLength(1);
    app.labView(root, '1'); await readyLab(root);
    expect(root.querySelector('.hhr-labreq-exam input').checked).toBe(true);
    expect(root.querySelector('.hhr-labreq-otros').value).toBe('Solicitud sintética');
    expect(root.querySelector('.hhr-labreq-medico').value).toBe('Profesional de prueba');
    app.imageView(root, '1'); await readyImage(root);
    expect(root.querySelector('[data-doc="encuesta"]').getAttribute('aria-selected')).toBe('true');
    expect(root.querySelectorAll('.hhr-imaging-mark')).toHaveLength(1);
    expect(root.querySelector('.hhr-imaging-physician').value).toBe('Solicitante de prueba');
  });

  it('isolates episodes and discards a draft when verified patient or author changes', async () => {
    const app = setup(), root = rootFor('1'); app.labView(root, '1'); await readyLab(root);
    input(root, '.hhr-labreq-otros', 'Borrador del primer episodio');
    app.labView(root, '2'); await readyLab(root); expect(root.querySelector('.hhr-labreq-otros').value).toBe('');
    app.labView(root, '1'); await readyLab(root); expect(root.querySelector('.hhr-labreq-otros').value).toBe('Borrador del primer episodio');
    globalThis.HhrRequestDrafts.checkpoint(root); app.changeActor('author-2'); app.labView(root, '1'); await readyLab(root);
    expect(root.querySelector('.hhr-labreq-otros').value).toBe('');
    input(root, '.hhr-labreq-otros', 'Borrador de otro autor'); globalThis.HhrRequestDrafts.checkpoint(root);
    app.changeIdentity('different-patient'); app.labView(root, '1'); await readyLab(root);
    expect(root.querySelector('.hhr-labreq-otros').value).toBe('');
  });

  it('keeps manual patient fields within the open panel and clears on a new panel', () => {
    const app = setup(), root = rootFor(''); app.labView(root, '');
    input(root, '[data-manual="name"]', 'Paciente nuevo sintético');
    input(root, '.hhr-labreq-otros', 'Examen manual');
    globalThis.HhrRequestDrafts.checkpoint(root); root.querySelector('main').replaceChildren(); app.labView(root, '');
    expect(root.querySelector('[data-manual="name"]').value).toBe('Paciente nuevo sintético');
    expect(root.querySelector('.hhr-labreq-otros').value).toBe('Examen manual');
    root.remove(); const fresh = rootFor(''); app.labView(fresh, '');
    expect(fresh.querySelector('[data-manual="name"]').value).toBe('');
  });

  it('does not overwrite edits with a late draft restore or an obsolete confirmation', () => {
    const root = rootFor('1'), main = root.querySelector('main'); let value = 'Saved selection';
    const attach = () => globalThis.HhrRequestDrafts.attach({ root, main, kind: 'lab', encId: '1', capture: () => ({ value }), restore: state => { value = state.value; } });
    attach().confirm('patient-1', 'author'); globalThis.HhrRequestDrafts.checkpoint(root);
    value = ''; const older = attach(); main.dispatchEvent(new Event('input')); value = 'New edit'; older.confirm('patient-1', 'author');
    expect(value).toBe('New edit');
    globalThis.HhrRequestDrafts.checkpoint(root); value = ''; const current = attach();
    older.confirm('patient-1', 'author'); expect(value).toBe('');
    current.confirm('patient-1', 'author'); expect(value).toBe('New edit');
  });
  it.each([['document', false], ['tool', false], ['document', true], ['tool', true]])('preserves a new imaging %s choice while identity verification is delayed (leave=%s)', async (choice, leave) => {
    const app = setup(), root = rootFor('1'); app.imageView(root, '1'); await readyImage(root);
    root.querySelector('[data-doc="encuesta"]').click();
    input(root, '.hhr-imaging-physician', 'Solicitante previo');
    root.querySelector('.hhr-imaging-canvas').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const verifiedHeader = await app.header.mock.results[0].value;
    let finish;
    app.header.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    app.imageView(root, '1');
    if (choice === 'document') root.querySelector('[data-doc="consentimiento"]').click();
    else root.querySelector('[data-tool="text"]').click();
    if (leave) { app.labView(root, '1'); await readyLab(root); }
    finish(verifiedHeader); await Promise.resolve();
    if (leave) app.imageView(root, '1');
    await readyImage(root);
    if (choice === 'document') expect(root.querySelector('[data-doc="consentimiento"]').getAttribute('aria-selected')).toBe('true');
    else expect(root.querySelector('[data-tool="text"]').getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('.hhr-imaging-physician').value).toBe('Solicitante previo');
    root.querySelector('[data-doc="encuesta"]').click();
    expect(root.querySelectorAll('.hhr-imaging-mark')).toHaveLength(1);
  });
  it.each([[false, false], [true, false], [false, true], [true, true]])('merges pending laboratory edits with untouched fields and exam selections (leave=%s, group=%s)', async (leave, group) => {
    const groups = [];
    vi.stubGlobal('HhrCenterPreferences', { get: () => ({ labGroups: groups }), load: async () => {}, reloadGroups: async () => {}, groupId: String });
    const app = setup(), root = rootFor('1'); app.labView(root, '1'); await readyLab(root);
    const select = index => {
      const checkbox = root.querySelectorAll('.hhr-labreq-exam input')[index]; checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    };
    select(0); input(root, '.hhr-labreq-medico', 'Profesional previo'); input(root, '.hhr-labreq-otros', 'Texto previo');
    groups.push({ name: 'Grupo sintético', keys: [root.querySelectorAll('.hhr-labreq-exam input')[1].dataset.key] });
    const verifiedHeader = await app.header.mock.results[0].value;
    let finish; app.header.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    app.labView(root, '1');
    if (group) {
      const selectGroup = root.querySelector('.hhr-labreq-selection select'); selectGroup.value = 'Grupo sintético'; selectGroup.dispatchEvent(new Event('change'));
      root.querySelector('[data-group="apply"]').click();
      await vi.waitFor(() => expect(root.querySelectorAll('.hhr-labreq-exam input')[1].checked).toBe(true));
    } else select(1);
    input(root, '.hhr-labreq-otros', 'Texto nuevo');
    if (leave) { app.imageView(root, '1'); await readyImage(root); }
    finish(verifiedHeader); await Promise.resolve();
    if (leave) app.labView(root, '1');
    await readyLab(root);
    expect(root.querySelectorAll('.hhr-labreq-exam input:checked')).toHaveLength(2);
    expect(root.querySelector('.hhr-labreq-medico').value).toBe('Profesional previo');
    expect(root.querySelector('.hhr-labreq-otros').value).toBe('Texto nuevo');
  });
  it('retains an explicitly manual request even when its native episode session fails', async () => {
    const app = setup(), root = rootFor('1');
    app.header.mockResolvedValue({ error: 'Sin sesión de Ficha Médico.', requiresLogin: true });
    app.labView(root, '1');
    const manual = root.querySelector('[name="hhr-labreq-patient-source"][value="manual"]');
    manual.checked = true; manual.dispatchEvent(new Event('change', { bubbles: true }));
    input(root, '[data-manual="name"]', 'Paciente manual sintético'); input(root, '.hhr-labreq-otros', 'Solicitud manual');
    await readyLab(root);
    globalThis.HhrRequestDrafts.checkpoint(root); root.querySelector('main').replaceChildren(); app.labView(root, '1');
    await readyLab(root);
    expect(root.querySelector('[data-manual="name"]').value).toBe('Paciente manual sintético');
    expect(root.querySelector('.hhr-labreq-otros').value).toBe('Solicitud manual');
    expect(root.querySelector('[name="hhr-labreq-patient-source"]:checked').value).toBe('manual');
    expect(root.querySelector('.hhr-labreq-feedback').textContent).toBe('');
  });
  it('does not rebind pending edits to a different verified author', async () => {
    const app = setup(), root = rootFor('1'); app.imageView(root, '1'); await readyImage(root);
    root.querySelector('[data-doc="encuesta"]').click();
    const verifiedHeader = await app.header.mock.results[0].value;
    let finish; app.header.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    app.imageView(root, '1'); root.querySelector('[data-doc="consentimiento"]').click();
    app.labView(root, '1'); await readyLab(root); finish(verifiedHeader); await Promise.resolve();
    app.changeActor('another-author'); app.imageView(root, '1'); await readyImage(root);
    expect(root.querySelector('[data-doc="solicitud"]').getAttribute('aria-selected')).toBe('true');
  });
});

describe('Reconnect and continue reads', () => {
  it('reloads results after login when a refresh superseded the failed PDF continuation', async () => {
    const types = { SYSLAB_STATUS_REQUEST: 'status', SYSLAB_LOGIN_REQUEST: 'login', LAB_SEARCH_REQUEST: 'search', LAB_PDF_OPEN_REQUEST: 'pdf' };
    let connected = true;
    const send = vi.fn(async message => {
      if (message.type === 'status') return { connected };
      if (message.type === 'search') return { batchId: 'batch-synthetic', patient: { name: 'Paciente sintético' },
        exams: [{ id: 'exam-1', date: '17-11-2026', exams: ['Hemograma'] }] };
      if (message.type === 'pdf') { connected = false; return { error: 'La sesión de Syslab venció.' }; }
      if (message.type === 'login') { connected = true; return { connected: true }; }
      throw new Error('Unexpected request');
    });
    const root = rootFor('1'); root.dataset.activeModule = 'lab';
    const lab = globalThis.HhrLabCenterRuntime.create({ labHelper: {}, requestForms: globalThis.HhrRequestForms,
      sendMessage: send, runtimeMessages: types, fetchPatientHeaderView: vi.fn(),
      runClinicalTransition: (_root, action) => action(), normalizedText: String,
      setLiveRegion: (node, text) => { node.textContent = text; } });
    lab.renderLabCenter(root, '1');
    await vi.waitFor(() => expect(root.querySelector('.hhr-lab-exam-row button')).toBeTruthy());
    root.querySelector('.hhr-lab-exam-row button').click();
    await vi.waitFor(() => expect(root.querySelector('.hhr-syslab-access').hidden).toBe(false));
    root.querySelector('.hhr-center-refresh').click();
    await vi.waitFor(() => expect(root.querySelectorAll('.hhr-lab-exam-row')).toHaveLength(0));
    input(root, '[name="username"]', 'synthetic-user'); input(root, '[name="password"]', crypto.randomUUID());
    root.querySelector('.hhr-syslab-access-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(send.mock.calls.filter(([message]) => message.type === 'search')).toHaveLength(2));
    expect(root.querySelectorAll('.hhr-lab-exam-row')).toHaveLength(1);
    expect(send.mock.calls.filter(([message]) => message.type === 'pdf')).toHaveLength(1);
  });
  it.each([[false, false], [true, false], [false, true], [true, true]])('resumes the selected Syslab read only while its view remains current (leave=%s, pdf=%s)', async (leave, pdf) => {
    const types = { SYSLAB_STATUS_REQUEST: 'status', SYSLAB_LOGIN_REQUEST: 'login', LAB_SEARCH_REQUEST: 'search', LAB_DETAILS_REQUEST: 'details', LAB_PDF_OPEN_REQUEST: 'pdf' };
    const readType = pdf ? 'pdf' : 'details';
    let finishLogin;
    const login = new Promise(resolve => { finishLogin = resolve; });
    let detailCalls = 0;
    const send = vi.fn(async message => {
      if (message.type === 'status') return { connected: true };
      if (message.type === 'search') return { batchId: 'batch-synthetic', patient: { name: 'Paciente sintético' },
        exams: [{ id: 'exam-1', date: '17-11-2026', exams: ['Hemograma'] }, { id: 'exam-2', date: '16-11-2026', exams: ['Creatinina'] }] };
      if (message.type === readType) {
        if (++detailCalls === 1) return { error: 'La sesión de Syslab venció. Inicia sesión desde la extensión.' };
        if (pdf) return { ok: true };
        return { analysis: { summary: { reportCount: 1, findingCount: 0, alertCount: 0 }, columns: [], comparison: [], trends: [], reports: [] } };
      }
      if (message.type === 'login') return login;
      throw new Error('Unexpected request');
    });
    const root = rootFor('1'); root.dataset.activeModule = 'lab';
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
    const lab = globalThis.HhrLabCenterRuntime.create({ labHelper: {}, requestForms: globalThis.HhrRequestForms,
      sendMessage: send, runtimeMessages: types, fetchPatientHeaderView: vi.fn(),
      runClinicalTransition: (_root, action) => action(), normalizedText: String,
      setLiveRegion: (node, text) => { node.textContent = text; } });
    lab.renderLabCenter(root, '1');
    await vi.waitFor(() => expect(root.querySelectorAll('.hhr-lab-exam-row input')).toHaveLength(2));
    const first = root.querySelector('.hhr-lab-exam-row input'); first.checked = false; first.dispatchEvent(new Event('change'));
    if (pdf) root.querySelectorAll('.hhr-lab-exam-row button')[1].click();
    else root.querySelector('.hhr-lab-analyze').click();
    await vi.waitFor(() => expect(root.querySelector('.hhr-syslab-access').hidden).toBe(false));
    input(root, '[name="username"]', 'synthetic-user'); input(root, '[name="password"]', crypto.randomUUID());
    const passwordInput = root.querySelector('[name="password"]');
    root.querySelector('.hhr-syslab-access-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    if (leave) { root.dataset.activeModule = 'imaging'; root.querySelector('main').replaceChildren(); }
    finishLogin({ connected: true }); await login; await new Promise(resolve => setTimeout(resolve, 0));
    expect(passwordInput.value).toBe('');
    const details = send.mock.calls.map(([message]) => message).filter(message => message.type === readType);
    expect(details).toHaveLength(leave ? 1 : 2);
    if (pdf) expect(details[0].examId).toBe('exam-2');
    else expect(details[0].examIds).toEqual(['exam-2']);
    if (!leave) expect(details[1]).toEqual(details[0]);
    expect(send.mock.calls.filter(([message]) => message.type === 'search')).toHaveLength(1);
  });
  const mount = sendMessage => {
    const root = rootFor('1'), host = document.createElement('div'); root.querySelector('main').append(host);
    const retry = vi.fn(async () => {}); let valid = true;
    globalThis.HhrReadRecovery.attach({ root, host, response: { error: 'Sin sesión de Ficha Médico.' },
      isCurrent: () => valid, retry, sendMessage, runtimeMessages: messages });
    return { root, host, retry, invalidate: () => { valid = false; } };
  };
  it('offers recovery for session failures and preserves permission/validation errors', () => {
    expect(globalThis.HhrReadRecovery.isSessionFailure({ status: 401 })).toBe(true);
    expect(globalThis.HhrReadRecovery.isSessionFailure({ requiresLogin: true })).toBe(true);
    expect(globalThis.HhrReadRecovery.isSessionFailure({ error: 'Sin token de Ficha Médico.' })).toBe(true);
    expect(globalThis.HhrReadRecovery.isSessionFailure({ status: 403, error: 'Sin permiso para consultar.' })).toBe(false);
    expect(globalThis.HhrReadRecovery.isSessionFailure({ error: 'La selección expiró. Actualiza la lista.' })).toBe(false);
  });
  it('retries once after verified repair without issuing print or write requests', async () => {
    const send = vi.fn(async () => ({ report: connected })); const view = mount(send);
    view.host.querySelector('button').click();
    await vi.waitFor(() => expect(view.retry).toHaveBeenCalledTimes(1));
    expect(send.mock.calls).toEqual([[{ type: 'repair' }]]); expect(view.host.querySelector('button')).toBeNull();
  });
  it('waits for official login and checks health before continuing', async () => {
    const send = vi.fn().mockResolvedValueOnce({ requiresLogin: true, opened: { fichaMedicoTabId: 9 } })
      .mockResolvedValueOnce({ fichaMedico: { status: 'stale' } }).mockResolvedValueOnce(connected);
    const view = mount(send); view.host.querySelector('button').click();
    await vi.waitFor(() => expect(view.host.querySelector('button').textContent).toBe('Continuar'));
    view.host.querySelector('button').click(); await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(view.retry).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(view.host.querySelector('button').disabled).toBe(false));
    view.host.querySelector('button').click(); await vi.waitFor(() => expect(view.retry).toHaveBeenCalledTimes(1));
    expect(send.mock.calls.slice(1)).toEqual([[{ type: 'health' }], [{ type: 'health' }]]);
  });
  it.each(['view', 'route', 'context'])('ignores a delayed repair after changing %s', async change => {
    let finish; const pending = new Promise(resolve => { finish = resolve; }); const send = vi.fn(() => pending);
    const view = mount(send); const button = view.host.querySelector('button'); button.click(); button.click();
    expect(send).toHaveBeenCalledTimes(1);
    if (change === 'view') view.root.querySelector('main').replaceChildren();
    else if (change === 'route') history.pushState({}, '', '/other-episode'); else view.invalidate();
    finish({ report: connected }); await pending; await Promise.resolve();
    expect(view.retry).not.toHaveBeenCalled();
  });
  it('keeps the prepared-view flow after reconnecting and does not print automatically', async () => {
    const root = rootFor('1');
    const load = vi.fn().mockResolvedValueOnce({ error: 'Sesión vencida.', requiresLogin: true }).mockResolvedValueOnce({ html: '<p>Documento sintético</p>' });
    const send = vi.fn(async () => ({ report: connected }));
    globalThis.HhrDocumentPreviewRuntime.open({ root, title: 'Vista previa', load, sendMessage: send, runtimeMessages: messages });
    await vi.waitFor(() => expect(root.querySelector('.hhr-read-reconnect')).toBeTruthy());
    root.querySelector('.hhr-read-reconnect').click(); await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(root.querySelector('.hhr-preview-html').srcdoc).toContain('Documento sintético');
    expect(send.mock.calls).toEqual([[{ type: 'repair' }]]);
  });
});
