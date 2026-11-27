// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import '../../../extension/hhr-origin-policy.js';
import '../../../extension/clinical-checklist-evolution.js';
import '../../../extension/clinical-checklist-braden-templates.js';
import '../../../extension/clinical-checklist-braden.js';
import '../../../extension/clinical-checklist-broker.js';

const code = 'PT-00000000-0000-4000-8000-000000000001';
const record = { code, evolution: 'Aplicación pauta IAAS\nCódigo de verificación: ' + code };
beforeEach(() => vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(() => [{ height: 30 }]));
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

it('conserva la nota previa, notifica al editor nativo y evita insertar dos veces el mismo código', () => {
  document.body.innerHTML = '<section id="observationEntrySection"><textarea>Nota previa</textarea><textarea aria-hidden="true"></textarea></section>';
  const area = document.querySelector('textarea');
  const input = vi.fn();
  const change = vi.fn();
  area.addEventListener('input', input);
  area.addEventListener('change', change);
  expect(globalThis.HhrChecklistEvolution.insert({ ...record, evolution: 'Código distinto' })).toBe(false);
  expect(area.value).toBe('Nota previa');
  expect(globalThis.HhrChecklistEvolution.insert(record)).toBe(true);
  expect(globalThis.HhrChecklistEvolution.insert(record)).toBe(true);
  expect(document.activeElement).toBe(area);
  expect([area.selectionStart, area.selectionEnd]).toEqual([area.value.length, area.value.length]);
  expect(area.value).toBe('Nota previa\n\n' + record.evolution);
  expect(input).toHaveBeenCalledTimes(1);
  expect(change).toHaveBeenCalledTimes(1);
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

it('inserta una valoración Braden dedicada sin duplicarla ni alterar una nota narrativa', () => {
  document.body.innerHTML = '<section id="observationEntrySection"><textarea>Nota previa</textarea></section>';
  const editor = document.querySelector('textarea');
  const entered = vi.fn();
  editor.addEventListener('input', entered);
  const heading = '#EscalaBraden';
  const text = heading + '\nBraden Q\nPuntaje: 16 / 28';
  const { insertStandalone } = globalThis.HhrChecklistEvolution;
  expect(insertStandalone(text, heading)).toBe(false);
  expect(editor.value).toBe('Nota previa');
  editor.value = '';
  expect(insertStandalone('Nota previa\n' + text, heading)).toBe(false);
  expect(insertStandalone(text, heading)).toBe(true);
  expect(insertStandalone(text, heading)).toBe(true);
  expect(editor.value).toBe(text);
  expect(entered).toHaveBeenCalledTimes(1);
});

it('elige Braden Q recién a los 30 días y Braden adulto desde el cumpleaños 15', () => {
  const { eligibleTemplate } = globalThis.HhrChecklistBraden;
  const patient = { patientBirthDate: '2026-10-28T00:00:00', patientAge: '1 mes' };
  expect(eligibleTemplate(patient, '2026-11-26').reason).toMatch(/NSRAS/);
  expect(eligibleTemplate(patient, '2026-11-27').templateId).toBe('hhr-lpp-braden-q');
  expect(eligibleTemplate(patient, '2041-10-27').templateId).toBe('hhr-lpp-braden-q');
  expect(eligibleTemplate(patient, '2041-10-28').templateId).toBe('hhr-lpp-braden-adulto');
  expect(eligibleTemplate(patient, '2026-10-27').reason).toMatch(/nacimiento/);
  expect(eligibleTemplate(patient, '2026-02-30').reason).toMatch(/fecha/);
  expect(eligibleTemplate({ patientAge: '1 mes' }).reason).toMatch(/confirmar la edad/);
  expect(eligibleTemplate({ patientAge: '29 días' }).reason).toMatch(/NSRAS/);
  expect(eligibleTemplate({ patientAge: '30 días' }).templateId).toBe('hhr-lpp-braden-q');
});

it.each([
  { index: 0, title: 'Braden adulto', minimum: 6, maximum: 23, high: 12, moderate: 15 },
  { index: 1, title: 'Braden Q', minimum: 7, maximum: 28, high: 16, moderate: 21 },
])('calcula y genera la nota legible para $title', ({ index, title, minimum, maximum, high, moderate }) => {
  const { evaluateDraft, buildDraftEvolutionText } = globalThis.HhrChecklistBraden;
  const template = globalThis.HhrBradenTemplates[index];
  const answers = { fecha: '2026-11-27', hora: '16:00' };
  const dimensions = template.fields.filter(field => field.type === 'choice');
  expect(dimensions).toHaveLength(minimum);
  expect(dimensions.map(field => field.shortCode)).toEqual(['PS', 'H', 'A', 'M', 'N', 'F', 'PO'].slice(0, minimum));
  expect(buildDraftEvolutionText(template, answers)).toBe('');
  for (const total of [minimum, high, high + 1, moderate, moderate + 1, maximum]) {
    let remaining = total - minimum;
    for (const field of dimensions) {
      const option = Math.min(remaining, field.options.length - 1);
      answers[field.id] = field.options[option].label;
      remaining -= option;
    }
    const risk = total <= high ? 'alto' : total <= moderate ? 'moderado' : 'bajo';
    expect(evaluateDraft(template, answers)).toMatchObject({ complete: true, points: total, maximum, risk });
    const text = buildDraftEvolutionText(template, answers);
    expect(text.split('\n').slice(0, 3)).toEqual(['#EscalaBraden', title, '2026-11-27 16:00']);
    expect(text).toContain('Puntaje: ' + total + ' / ' + maximum);
    expect(text).toContain('(' + risk + ')');
  }
});

it('monta el disparador dentro de la tarjeta MUI de Evolución y abre el editor desde botones de ícono', async () => {
  document.body.innerHTML = `
    <div id="observationEntrySection">
      <div class="MuiCard-root">
        <div class="MuiCardHeader-root">
          <span class="MuiCardHeader-title">Evolución</span>
          <div class="MuiCardHeader-action"><button type="button" aria-label="Más opciones"><svg data-testid="MoreVertIcon"></svg></button></div>
        </div>
        <div class="MuiCardContent-root">
          <p>Buenas condiciones. En regresión el cuadro...</p>
          <div><button>Leer menos</button></div>
          <div class="evo-actions">
            <button type="button" id="icon-write"><svg></svg></button>
            <button type="button" id="icon-list"><svg></svg></button>
          </div>
        </div>
      </div>
    </div>`;
  const host = globalThis.HhrChecklistEvolution.resolveTriggerHost(null);
  expect(host).toBe(document.querySelector('.evo-actions'));

  const writeBtn = document.getElementById('icon-write');
  writeBtn.addEventListener('click', () => {
    const drawer = document.createElement('div');
    drawer.className = 'MuiDrawer-paper';
    drawer.innerHTML = '<h6>Evolución médica</h6><div contenteditable="true" id="rich-evo">Nota previa</div>';
    document.body.append(drawer);
  });

  expect(await globalThis.HhrChecklistEvolution.openEditor(() => true)).toBe(true);
  expect(globalThis.HhrChecklistEvolution.insert(record)).toBe(true);
  const rich = document.getElementById('rich-evo');
  expect(document.activeElement).toBe(rich);
  const caret = document.getSelection().getRangeAt(0);
  expect(caret.collapsed).toBe(true);
  expect(caret.endContainer).toBe(rich);
  expect(caret.endOffset).toBe(rich.childNodes.length);
  expect(document.getElementById('rich-evo').textContent).toContain(record.code);
});

it('ignora Centro HHR abierto cuando busca el editor nativo de evolución', () => {
  document.body.innerHTML = `
    <div id="hhr-prescription-print-modal" role="dialog" aria-label="Centro HHR"><textarea></textarea></div>
    <section id="observationEntrySection"><textarea id="evo-area"></textarea></section>`;
  expect(globalThis.HhrChecklistEvolution.editor()).toBe(document.getElementById('evo-area'));
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
  expect(await broker.handle({ encId: '91', request: { action: 'braden' } }, sender)).toMatchObject({
    episode: '91', actor: '17', document: 'TEST-X', patientName: 'Paciente ficticio',
  });
  expect(tabs.connect).not.toHaveBeenCalled();
});

it('reinyecta el relé si la pestaña HHR ya estaba abierta y prueba varias pestañas HHR', async () => {
  const fichaUrl = 'https://fichamedico.rayensalud.cl/dashboard/encounter-list/91';
  const injected = new Set();
  const makePort = tabId => {
    const disconnectHandlers = [];
    const messageHandlers = [];
    const port = {
      onDisconnect: { addListener: fn => disconnectHandlers.push(fn) },
      onMessage: { addListener: fn => messageHandlers.push(fn) },
      postMessage: req => {
        if (req.action === 'templates') {
          queueMicrotask(() => messageHandlers.forEach(fn => fn({ data: { uid: 'u1', authorName: 'Dra. Prueba', templates: [{ id: 't1', title: 'Pauta', version: 1, fields: [] }] } })));
        }
      },
      disconnect: vi.fn(),
    };
    queueMicrotask(() => {
      if (tabId === 2) {
        // First HHR tab is logged out (not_ready).
        messageHandlers.forEach(fn => fn({ unavailable: true, reason: 'not_ready' }));
      } else if (tabId === 3 && !injected.has(3)) {
        // Second HHR tab was already open before reload -> disconnects until reinjected.
        disconnectHandlers.forEach(fn => fn());
      } else if (tabId === 3) {
        messageHandlers.forEach(fn => fn({ ready: true }));
      }
    });
    return port;
  };
  const executeScript = vi.fn(async ({ target }) => {
    injected.add(target.tabId);
  });
  const tabs = {
    get: vi.fn(async id => ({ id, url: fichaUrl, incognito: false, windowId: 1 })),
    query: vi.fn(async () => [
      { id: 2, url: 'https://hhr-hospitalizados.app/', incognito: false, windowId: 1, lastAccessed: 200 },
      { id: 3, url: 'https://hhr-hospitalizados.app/', incognito: false, windowId: 1, lastAccessed: 100 },
    ]),
    connect: vi.fn(tabId => makePort(tabId)),
  };
  const broker = globalThis.HhrClinicalChecklistBroker.create({
    chrome: {
      storage: { local: { get: async () => ({ 'hhr-clinical-checklists-enabled': true }) } },
      tabs,
      scripting: { executeScript },
    },
    resolveSession: async () => ({ info: { practitionerId: 17 } }),
    getContext: async () => ({ patient: { run: 'TEST-X', name: 'Paciente ficticio' } }),
    encounterFromUrl: value => new URL(value).pathname.split('/').pop(),
  });
  const sender = { frameId: 0, tab: { id: 1, incognito: false, windowId: 1 }, url: fichaUrl };
  const result = await broker.handle({ encId: '91', request: { action: 'templates' } }, sender);
  expect(result.error).toBeUndefined();
  expect(result.hhrTabId).toBe(3);
  expect(result.templates).toHaveLength(1);
  expect(executeScript).toHaveBeenCalledWith({
    target: { tabId: 3, frameIds: [0] },
    files: ['hhr-origin-policy.js', 'clinical-checklist-hhr.js'],
  });
});

it('pide abrir HHR con sesión iniciada cuando no hay ninguna pestaña de HHR abierta', async () => {
  const fichaUrl = 'https://fichamedico.rayensalud.cl/dashboard/encounter-list/91';
  const tabs = {
    get: vi.fn(async id => ({ id, url: fichaUrl, incognito: false, windowId: 1 })),
    query: vi.fn(async () => []),
    create: vi.fn(),
    connect: vi.fn(),
  };
  const broker = globalThis.HhrClinicalChecklistBroker.create({
    chrome: { storage: { local: { get: async () => ({ 'hhr-clinical-checklists-enabled': true }) } }, tabs },
    resolveSession: async () => ({ info: { practitionerId: 17 } }),
    getContext: async () => ({ patient: { run: 'TEST-X', name: 'Paciente ficticio' } }),
    encounterFromUrl: value => new URL(value).pathname.split('/').pop(),
  });
  const sender = { frameId: 0, tab: { id: 1, incognito: false, windowId: 1 }, url: fichaUrl };
  const result = await broker.handle({ encId: '91', request: { action: 'templates' } }, sender);
  expect(result.error).toMatch(/Abre HHR Hospitalizados/);
  expect(tabs.create).not.toHaveBeenCalled();
});

it('completa rápido la matriz Braden NT 234, sugiere adulto vs pediátrico por edad y permite copiar texto para evolución', () => {
  const adultTemplate = {
    id: 'hhr-lpp-braden-adulto',
    version: 2,
    scaleGroup: 'braden',
    title: 'LPP · Braden adulto (≥15 años)',
    riskBands: { highMax: 12, moderateMax: 15 },
    fields: [
      { id: 'percepcion', shortCode: 'PS', label: 'PS · Percepción sensorial', type: 'choice', required: true, options: [{ label: '1 · Completamente limitada', points: 1 }, { label: '2 · Muy limitada', points: 2 }, { label: '3 · Ligeramente limitada', points: 3 }, { label: '4 · No limitada', points: 4 }] },
      { id: 'humedad', shortCode: 'H', label: 'H · Humedad', type: 'choice', required: true, options: [{ label: '1 · Constantemente húmeda', points: 1 }, { label: '2 · Muy húmeda', points: 2 }, { label: '3 · Ocasionalmente húmeda', points: 3 }, { label: '4 · Raramente húmeda', points: 4 }] },
      { id: 'actividad', shortCode: 'A', label: 'A · Actividad', type: 'choice', required: true, options: [{ label: '1 · Postrado en cama', points: 1 }, { label: '2 · En silla de ruedas', points: 2 }, { label: '3 · Anda ocasionalmente', points: 3 }, { label: '4 · Anda con frecuencia', points: 4 }] },
      { id: 'movilidad', shortCode: 'M', label: 'M · Movilidad', type: 'choice', required: true, options: [{ label: '1 · Completamente inmóvil', points: 1 }, { label: '2 · Muy limitada', points: 2 }, { label: '3 · Ligeramente limitada', points: 3 }, { label: '4 · Sin limitación', points: 4 }] },
      { id: 'nutricion', shortCode: 'N', label: 'N · Nutrición', type: 'choice', required: true, options: [{ label: '1 · Muy deficiente', points: 1 }, { label: '2 · Probablemente inadecuada', points: 2 }, { label: '3 · Adecuada', points: 3 }, { label: '4 · Excelente', points: 4 }] },
      { id: 'friccion', shortCode: 'F', label: 'F · Fricción y cizalla', type: 'choice', required: true, options: [{ label: '1 · Problema', points: 1 }, { label: '2 · Posibles problemas', points: 2 }, { label: '3 · Sin problemas aparentes', points: 3 }] },
      { id: 'fecha', label: 'Fecha de valoración', type: 'date', required: true },
      { id: 'hora', label: 'Hora de valoración (Rapa Nui)', type: 'time', required: true },
      { id: 'piel', label: 'Observaciones de piel e intervenciones', type: 'text', required: false },
    ],
  };
  const pediatricTemplate = {
    id: 'hhr-lpp-braden-q',
    version: 2,
    scaleGroup: 'braden',
    title: 'LPP · Braden Q pediátrico (30 días a <15 años)',
    riskBands: { highMax: 16, moderateMax: 21 },
    fields: [...adultTemplate.fields],
  };

  const braden = globalThis.HhrChecklistBraden;
  expect(braden.suggestBradenTemplate([adultTemplate, pediatricTemplate], { patientAge: '6 años' }).templateId).toBe('hhr-lpp-braden-q');
  expect(braden.suggestBradenTemplate([adultTemplate, pediatricTemplate], { patientAge: '68 años' }).templateId).toBe('hhr-lpp-braden-adulto');

  const container = document.createElement('div');
  document.body.append(container);
  const answers = {};
  const copied = vi.fn();
  const switched = vi.fn();
  braden.renderMatrix({
    container,
    template: adultTemplate,
    bradenTemplates: [adultTemplate, pediatricTemplate],
    suggestedId: adultTemplate.id,
    suggestedReason: 'Sugerida por edad (68 años)',
    answers,
    authorName: 'EU Prueba',
    onSwitchTemplate: switched,
    onAnswerChange: () => {},
    onCopyText: copied,
  });

  expect(answers.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(answers.hora).toMatch(/^\d{2}:\d{2}$/);
  expect(container.querySelector('.hhr-braden-na')?.textContent).toBe('No aplica');

  // 6 clicks: 3, 2, 3, 2, 3, 2 -> total 15 (Moderado, Cada 72 h)
  const picks = [['percepcion', '3'], ['humedad', '2'], ['actividad', '3'], ['movilidad', '2'], ['nutricion', '3'], ['friccion', '2']];
  for (const [field, pts] of picks) {
    container.querySelector(`button[data-field="${field}"][data-points="${pts}"]`).click();
  }

  expect(container.textContent).toContain('Total: 15 / 23');
  expect(container.textContent).toContain('Riesgo Moderado');
  expect(container.textContent).toContain('Reevaluar: Cada 72 h');
  expect(container.textContent).toContain('Posición: cada 4 h con SEMP adecuada');

  container.querySelector('.hhr-braden-copy-inline').click();
  expect(copied).toHaveBeenCalledWith(expect.stringContaining('Subpuntajes: PS 3 · H 2 · A 3 · M 2 · N 3 · F 2'));
  expect(copied).toHaveBeenCalledWith(expect.stringContaining('Puntaje: 15 / 23'));
});
