// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import '../../../extension/documentos/document-preview-jobs.js';

const setup = () => {
  const stored = {};
  let now = 1_800_000_000_000;
  const storage = {
    get: vi.fn(async key => key === null ? { ...stored } : { [key]: stored[key] }),
    set: vi.fn(async value => Object.assign(stored, value)),
    remove: vi.fn(async keys => { for (const key of Array.isArray(keys) ? keys : [keys]) delete stored[key]; }),
  };
  const print = vi.fn(async () => ({ ok: true, printTabId: 20 }));
  const jobs = globalThis.HhrDocumentPreviewJobs.create({
    chromeApi: { storage: { session: storage } }, cryptoApi: { randomUUID },
    bufferToBase64: buffer => Buffer.from(buffer).toString('base64'),
    base64ToArrayBuffer: base64 => Uint8Array.from(Buffer.from(base64, 'base64')).buffer,
    openPdfPrintDialog: print, now: () => now,
  });
  const sender = { url: 'https://fichamedico.rayensalud.cl/dashboard/encounter-list-nurse/1', tab: { id: 10 } };
  const buffer = new TextEncoder().encode('%PDF-synthetic-byte-identity').buffer;
  return { jobs, stored, storage, sender, buffer, print, expire: () => { now += 11 * 60 * 1000; } };
};

describe('Prepared PDF preview jobs', () => {
  it('returns a preview without opening print and prints those exact bytes once', async () => {
    const { jobs, sender, buffer, print } = setup();
    const preview = await jobs.prepare({ buffer, filename: 'synthetic.pdf', sender });
    expect(print).not.toHaveBeenCalled();
    expect(preview.pdfBase64).toBe(Buffer.from(buffer).toString('base64'));
    expect(await jobs.handle({ jobId: preview.jobId, operation: 'print' }, sender)).toMatchObject({ ok: true });
    expect(new Uint8Array(print.mock.calls[0][0].buffer)).toEqual(new Uint8Array(buffer));
    expect((await jobs.handle({ jobId: preview.jobId, operation: 'print' }, sender)).error).toBeTruthy();
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('rejects a different tab or route, and expires old documents', async () => {
    const { jobs, sender, buffer, print, expire } = setup();
    const preview = await jobs.prepare({ buffer, filename: 'synthetic.pdf', sender });
    const request = { jobId: preview.jobId, operation: 'print' };
    expect((await jobs.handle(request, { ...sender, tab: { id: 11 } })).error).toBeTruthy();
    expect((await jobs.handle(request, { ...sender, url: sender.url + '?encId=2' })).error).toMatch(/episodio/);
    const second = await jobs.prepare({ buffer, filename: 'synthetic.pdf', sender });
    expire();
    expect((await jobs.handle({ ...request, jobId: second.jobId }, sender)).error).toMatch(/venció/);
    expect(print).not.toHaveBeenCalled();
  });

  it('keeps concurrently prepared formats available until their own release', async () => {
    const { jobs, sender, buffer, stored } = setup();
    const [first, second] = await Promise.all([
      jobs.prepare({ buffer, filename: 'standard.pdf', sender }),
      jobs.prepare({ buffer, filename: 'compact.pdf', sender }),
    ]);
    expect(Object.keys(stored)).toHaveLength(2);
    expect(await jobs.handle({ jobId: first.jobId, operation: 'release' }, sender)).toEqual({ ok: true });
    expect(await jobs.handle({ jobId: first.jobId, operation: 'release' }, sender)).toEqual({ ok: true });
    expect(await jobs.handle({ jobId: second.jobId, operation: 'print' }, sender)).toMatchObject({ ok: true });
  });

  it('rejects oversized PDFs and senders outside the clinical tab', async () => {
    const { jobs, sender, buffer, storage } = setup();
    expect((await jobs.prepare({ buffer, sender: { ...sender, url: 'https://example.com/' } })).error).toBeTruthy();
    expect((await jobs.prepare({ buffer: new ArrayBuffer(5 * 1024 * 1024 + 1), sender })).error).toMatch(/tamaño/);
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('offers direct printing when concurrent previews exhaust shared session storage', async () => {
    const { jobs, sender, storage, stored, print } = setup();
    storage.set.mockImplementation(async value => {
      const combined = { ...stored, ...value };
      if (Buffer.byteLength(JSON.stringify(combined)) > 10 * 1024 * 1024) throw new Error('QUOTA_BYTES exceeded');
      Object.assign(stored, value);
    });
    const buffer = new ArrayBuffer(4 * 1024 * 1024);
    const first = await jobs.prepare({ buffer, filename: 'first.pdf', sender });
    expect(first.ok).toBe(true);
    expect(await jobs.prepare({ buffer, filename: 'second.pdf', sender })).toMatchObject({
      errorCode: 'PREVIEW_STORAGE_UNAVAILABLE',
    });
    expect(Object.keys(stored)).toHaveLength(1);
    expect(await jobs.handle({ jobId: first.jobId, operation: 'print' }, sender)).toMatchObject({ ok: true });
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('prevents two concurrent print requests from opening two dialogs', async () => {
    const { jobs, sender, buffer, print } = setup();
    const preview = await jobs.prepare({ buffer, filename: 'synthetic.pdf', sender });
    const request = { jobId: preview.jobId, operation: 'print' };
    const results = await Promise.all([jobs.handle(request, sender), jobs.handle(request, sender)]);
    expect(results.filter(result => result.ok)).toHaveLength(1);
    expect(print).toHaveBeenCalledTimes(1);
  });
});
