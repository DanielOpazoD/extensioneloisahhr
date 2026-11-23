import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

it('guarda el ajuste desde Centro HHR y aplica cambios de otra pestaña aunque la primera lectura llegue tarde', async () => {
  const root = document.createElement('div');
  root.id = 'hhr-prescription-print-modal';
  root.innerHTML = '<main class="hhr-center-main"></main>';
  document.body.append(root);
  const key = 'hhr-nursing-handoff-enabled';
  const pending = Promise.withResolvers();
  let changed;
  const storage = { get:vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue({}),
    set:vi.fn(async values => changed({ [key]:{ newValue:values[key] } }, 'local')) };
  vi.stubGlobal('chrome', {storage:{ local:storage, onChanged:{ addListener:cb => { changed = cb; } } }});
  vi.stubGlobal('HhrCenterPreferences', { get:()=>({}), load:async()=>{} });
  vi.stubGlobal('HhrFavoriteLinks', { create:()=>document.createElement('div') });
  try {
    for (const file of ['nursing-handoff-preference','hhr-center-settings']) {
      Function(readFileSync('extension/' + file + '.js', 'utf8'))();
    }
    globalThis.HhrCenterSettings.render({ root });
    const input = root.querySelector('[data-setting="handoff"]');
    await vi.waitFor(() => expect(input.checked).toBe(true));
    input.click();
    await vi.waitFor(() => expect(input.disabled).toBe(false));
    expect(storage.set).toHaveBeenCalledWith({[key]:false});
    pending.resolve({});
    await Promise.resolve();
    expect(globalThis.HhrNursingHandoffPreference.get()).toBe(false);
    changed({[key]:{newValue:true}}, 'local');
    await vi.waitFor(() => expect(input.checked).toBe(true));
  } finally {
    root.remove();
    document.documentElement.removeAttribute('data-hhr-handoff-enabled');
    vi.unstubAllGlobals();
  }
});
