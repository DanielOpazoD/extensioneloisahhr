import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const flush = async () => {
  for (let round = 0; round < 8; round++) await Promise.resolve();
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.replaceChildren();
});

it('conserva el turno nocturno, espera la confirmación y mantiene ambos textos al pasar al siguiente turno', async () => {
  vi.useFakeTimers();
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  document.body.innerHTML = readFileSync('extension/nursing-handoff-editor.html', 'utf8').split('<body>')[1].split('</body>')[0];
  vi.stubGlobal('HhrRayenMessageContract', { types: { NURSING_HANDOFF_EDITOR:'test' } });
  vi.stubGlobal('ResizeObserver', class { observe() {} });
  const night = { date:'2026-11-19', shift:'night', version:'a'.repeat(64), text:'Nota inicial' };
  let server = night;
  const writing = Promise.withResolvers();
  const sendMessage = vi.fn(async message => {
    if (message.action === 'context') return { inline:true };
    if (message.action === 'draft') return { ok:true };
    if (message.action === 'save') return writing.promise;
    if (message.date && message.date !== server.date) {
      return { error:'Cambió el turno o la fecha censal. Abre otra entrega.', code:'FAILED_PRECONDITION' };
    }
    if (message.since) return new Promise(() => {});
    return server;
  });
  vi.stubGlobal('chrome', { runtime:{ sendMessage } });
  Function(readFileSync('extension/nursing-handoff-editor.js', 'utf8'))();

  const id = value => document.getElementById(value);
  const type = text => {
    id('note').value = text;
    id('note').dispatchEvent(new Event('input', { bubbles:true }));
  };
  const refresh = async () => {
    id('note').dispatchEvent(new FocusEvent('focus'));
    await flush();
  };
  await flush();
  expect(id('slot').textContent).toMatch(/19.* · Noche$/);
  expect(id('slot').title).toBe('2026-11-19');
  type('Mi primera nota nocturna');
  expect(id('status').dataset.tone).toBe('draft');
  id('edit').dispatchEvent(new Event('submit', { cancelable:true }));
  expect(id('status').dataset.tone).toBe('pending');
  expect(sendMessage.mock.calls.some(([msg]) =>
    msg.action === 'save' && msg.date === night.date && msg.shift === 'night' && msg.version === night.version)).toBe(true);
  server = { ...night, version:'b'.repeat(64), text:id('note').value };
  const readsBeforeReceipt = sendMessage.mock.calls.filter(([msg]) => msg.action === 'read').length;
  writing.resolve({ ...server, confirmed:true });
  await flush();
  expect(id('status').textContent).toBe('✓ Guardado en HHR');

  expect(sendMessage.mock.calls.filter(([msg]) => msg.action === 'read')).toHaveLength(readsBeforeReceipt);
  await vi.advanceTimersByTimeAsync(40000);
  expect(sendMessage.mock.calls.filter(([msg]) => msg.action === 'read')).toHaveLength(readsBeforeReceipt + 1);

  type('Borrador local concurrente');
  server = { ...server, version:'c'.repeat(64), text:'Otra edición en HHR' };
  await refresh();
  expect(id('remote').value).toBe('Otra edición en HHR');
  expect(id('note').value).toBe('Borrador local concurrente');
  expect(id('save').disabled).toBe(true);
  id('use-remote').click();
  expect(id('note').value).toBe('Otra edición en HHR');
  expect(id('recovery-text').value).toBe('Borrador local concurrente');
  id('restore-draft').click();
  expect(id('note').value).toBe('Borrador local concurrente');
  expect(id('recovery-text').value).toBe('Otra edición en HHR');
  expect(id('status').dataset.tone).toBe('draft');

  type('Borrador final de noche');
  server = { date:'2026-11-20', shift:'day', version:'d'.repeat(64), text:'Nota recibida del turno anterior' };
  await refresh();
  expect(id('note').readOnly).toBe(true);
  expect(id('slot').textContent).toMatch(/19.* · Noche$/);
  expect(id('current-shift').hidden).toBe(false);
  id('current-shift').click();
  await flush();
  expect(id('slot').textContent).toMatch(/20.* · Día$/);
  expect(id('note').value).toBe('Nota recibida del turno anterior');
  expect(id('recovery-text').value).toBe('Borrador final de noche');
  expect(id('recovery-versions').options.length).toBe(3);
  id('recovery-versions').value = '2';
  id('recovery-versions').dispatchEvent(new Event('change'));
  expect(id('recovery-text').value).toBe('Borrador local concurrente');
  expect(id('restore-draft').hidden).toBe(true);
  expect(sendMessage.mock.calls.filter(([message]) => message.action === 'save')).toHaveLength(1);
});
