// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); document.body.replaceChildren(); });

it.each([true, false])('mantiene la guía abierta al solicitar una descarga (éxito: %s)', async success => {
  document.body.innerHTML = readFileSync('extension/installation.html', 'utf8');
  const download = vi.fn(async () => { if (!success) throw Error(); return 1; });
  vi.stubGlobal('chrome', { downloads: { download } });
  Function(readFileSync('extension/estado/extension-download.js', 'utf8'))();
  const link = document.querySelector('[data-download]');
  const click = new MouseEvent('click', { bubbles: true, cancelable: true });
  expect(link.dispatchEvent(click)).toBe(false);
  expect(download).toHaveBeenCalledWith({ url: link.href });
  await Promise.resolve();
  const feedback = document.getElementById('download-feedback');
  expect(feedback.hidden).toBe(false);
  expect(feedback.textContent).toContain(success ? 'Descarga iniciada' : 'No se pudo iniciar');
});
