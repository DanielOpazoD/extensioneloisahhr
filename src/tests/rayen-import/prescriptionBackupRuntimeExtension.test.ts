// @vitest-environment node
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const sandbox = vm.createContext({ TextEncoder, TextDecoder, Uint8Array, ArrayBuffer,
  atob, btoa, console, Blob });
sandbox.self = sandbox;
for (const file of ['jspdf.umd.min.js', 'pdf-lib.min.js', 'prescription-print.js',
  'prescription-pdf.js', 'pdf-print.js', 'prescription-backup-runtime.js']) {
  vm.runInContext(readFileSync('extension/' + file, 'utf8'), sandbox, { filename: file });
}
const activeEntry = (entryId = 11, author = 'Medico Sintetico') => ({
  id: entryId, encounterId: 123, suspended: false, archived: false, finalized: false,
  deleted: false, virtualMedicalProductName: 'Medicamento Sintetico ' + entryId,
  posology: '1 comprimido cada 12 horas', administrationRoute: 'Oral',
  administrationNote: 'Nota vigente', authorHealthCarePractitionerName: author,
  authorHealthCarePractitionerId: 9, timestamp: 'revision-1',
});
const historyEntry = (entryId = 11, author = 'Medico Sintetico') => ({
  publishDatetime: '2026-11-12T12:00:00Z',
  patientPharmaIndicationResume: [{ MRE_ID: entryId, HCP_NAME: author, HCP_ID: 9,
    PREFERRED_IDENTIFIER_CODE: author === 'Medico Sintetico' ? '11111111-1' : '33333333-3', DESCRIPTOR: 'Nombre historico',
    POSOLOGY: 'DOSIS ANTIGUA', ROUTE_ADMINISTRATION: 'Oral',
    PUBLISH_DATETIME: '2026-11-12T12:00:00Z', SUSPENDED: false, ARCHIVED: false }],
});
const fixture = () => {
  const entries = [activeEntry()];
  const dependencies = {
    resolveSession: vi.fn(async () => ({ info: { role: 'synthetic' } })),
    sessionKey: vi.fn(async () => 'session-a'),
    authorize: vi.fn(async () => true),
    fetchCurrentMedicationEntries: vi.fn(async () => ({ entries })),
    fetchPrescriptionEvents: vi.fn(async () => ({ events: [historyEntry()] })),
    getClinicalReportContext: vi.fn(async () => ({ patientId: '456',
      patient: { name: 'Paciente Sintetico', run: '22222222-2' } })),
    prescriptionPrint: sandbox.HhrPrescriptionPrint,
    prescriptionPdf: sandbox.HhrPrescriptionPdf,
    pdfPrint: sandbox.HhrPdfPrint,
    openPdfPrintDialog: vi.fn(async (_request: { buffer: ArrayBuffer; filename: string }) => ({ ok: true })),
    now: () => Date.parse('2026-11-12T16:00:00Z'),
  };
  return { entries, dependencies,
    runtime: sandbox.HhrPrescriptionBackupRuntime.create(dependencies) };
};
const request = { encId: '123', sender: { tab: { id: 7 } } };
const pdfText = async (buffer: ArrayBuffer) => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer.slice(0)), useSystemFonts: true }).promise;
  try {
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const content = await (await doc.getPage(i)).getTextContent();
      pages.push(content.items.map(item => 'str' in item ? item.str : '').join(' '));
    }
    return pages;
  } finally { await doc.destroy(); }
};

describe('respaldo de receta sin consultar el servidor de PDF oficial', () => {
  it('genera un PDF real, usa la dosis vigente y conserva paciente, autor y fecha local', async () => {
    const { runtime, dependencies } = fixture();
    expect(await runtime.handle(request)).toMatchObject({ ok: true, backup: true, medicationCount: 1 });
    const pdf = dependencies.openPdfPrintDialog.mock.calls[0][0];
    const pages = await pdfText(pdf.buffer);
    expect(pages.join(' ')).toContain('Respaldo HHR');
    expect(pages.join(' ')).toContain('No es el PDF oficial');
    expect(pages.join(' ')).toContain('Paciente Sintetico');
    expect(pages.join(' ')).toContain('Medico Sintetico');
    expect(pages.join(' ')).toContain('1 comprimido cada 12 horas');
    expect(pages.join(' ')).toContain('12-11-2026 07:00');
    expect(pages.join(' ')).not.toContain('DOSIS ANTIGUA');
    const printable = await sandbox.HhrPdfPrint.preparePdfForBrowserPrint(pdf.buffer);
    const doc = await sandbox.PDFLib.PDFDocument.load(printable);
    expect(String(doc.catalog.get(sandbox.PDFLib.PDFName.of('OpenAction')))).toContain('/Print');
  });

  it('separa los prescriptores en páginas y excluye suspendidos, archivados, finalizados y borrados', async () => {
    const { runtime, entries, dependencies } = fixture();
    entries.push(activeEntry(12, 'Otra Medica Sintetica'));
    for (const [i, field] of ['suspended', 'archived', 'finalized', 'deleted'].entries()) {
      entries.push({ ...activeEntry(20 + i), [field]: true });
    }
    dependencies.fetchPrescriptionEvents.mockResolvedValue({ events: [historyEntry(),
      historyEntry(12, 'Otra Medica Sintetica'), ...[20, 21, 22, 23].map(n => historyEntry(n))] });
    expect(await runtime.handle({ ...request, printFormat: 'compact' })).toMatchObject({ medicationCount: 2 });
    const pages = await pdfText(dependencies.openPdfPrintDialog.mock.calls[0][0].buffer);
    expect(pages).toHaveLength(2);
    expect(pages.every(page => page.includes('Respaldo HHR'))).toBe(true);
    expect(pages.join(' ')).not.toContain('Medicamento Sintetico 20');
  });

  it.each(['suspended', 'archived', 'finalized', 'deleted'])('rechaza el estado %s ilegible', async field => {
    const { runtime, entries, dependencies } = fixture();
    delete entries[0][field];
    expect(await runtime.handle(request)).toHaveProperty('error');
    expect(dependencies.openPdfPrintDialog).not.toHaveBeenCalled();
  });

  it.each(['encounterId', 'posology', 'administrationRoute', 'authorHealthCarePractitionerId'])
    ('rechaza contenido sin %s verificable', async field => {
      const { runtime, entries, dependencies } = fixture();
      delete entries[0][field];
      expect(await runtime.handle(request)).toHaveProperty('error');
      expect(dependencies.openPdfPrintDialog).not.toHaveBeenCalled();
    });

  it('no imprime una lista parcial cuando falta autoría de un medicamento activo', async () => {
    const { runtime, entries, dependencies } = fixture();
    entries.push(activeEntry(99));
    expect(await runtime.handle(request)).toHaveProperty('error');
    expect(dependencies.openPdfPrintDialog).not.toHaveBeenCalled();
  });

  it('rechaza profesionales distintos aunque compartan el mismo nombre', async () => {
    const { runtime, entries, dependencies } = fixture();
    entries[0].authorHealthCarePractitionerId = 10;
    expect(await runtime.handle(request)).toHaveProperty('error');
    expect(dependencies.openPdfPrintDialog).not.toHaveBeenCalled();
  });

  it('acepta un nombre abreviado cuando coincide el identificador estable del prescriptor', async () => {
    const { runtime, entries } = fixture();
    entries[0].authorHealthCarePractitionerName = 'M. Sintetico';
    expect(await runtime.handle(request)).toMatchObject({ ok: true });
  });

  it('separa fechas del mismo prescriptor y no usa la fecha de un medicamento excluido', async () => {
    const { runtime, entries, dependencies } = fixture();
    entries.push(activeEntry(12), { ...activeEntry(13), suspended: true });
    const previous = historyEntry(12);
    previous.patientPharmaIndicationResume[0].PUBLISH_DATETIME = '2026-11-11T12:00:00Z';
    const excluded = historyEntry(13);
    excluded.patientPharmaIndicationResume[0].PUBLISH_DATETIME = '2026-11-13T12:00:00Z';
    dependencies.fetchPrescriptionEvents.mockResolvedValue({ events: [historyEntry(), previous, excluded] });
    expect(await runtime.handle(request)).toMatchObject({ medicationCount: 2 });
    const pages = await pdfText(dependencies.openPdfPrintDialog.mock.calls[0][0].buffer);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toContain('12-11-2026 07:00');
    expect(pages[1]).toContain('11-11-2026 07:00');
    expect(pages.join(' ')).not.toContain('13-11-2026');
  });

  it('marca los medicamentos externos y bloquea esquemas de insulina que no puede reproducir', async () => {
    const { runtime, entries, dependencies } = fixture();
    Object.assign(entries[0], { is_external: true });
    expect(await runtime.handle(request)).toMatchObject({ ok: true });
    expect((await pdfText(dependencies.openPdfPrintDialog.mock.calls[0][0].buffer)).join(' '))
      .toContain('Medicamento externo');
    dependencies.openPdfPrintDialog.mockClear();
    Object.assign(entries[0], { insulinSchema: [{ synthetic: true }] });
    expect(await runtime.handle(request)).toHaveProperty('error');
    expect(dependencies.openPdfPrintDialog).not.toHaveBeenCalled();
  });

  it('no consulta la ficha sin autorización', async () => {
    const { runtime, dependencies } = fixture();
    dependencies.authorize.mockResolvedValue(false);
    expect(await runtime.handle(request)).toHaveProperty('error');
    expect(dependencies.fetchCurrentMedicationEntries).not.toHaveBeenCalled();
  });

  it('detiene el PDF cuando cambia la sesión', async () => {
    const { runtime, dependencies } = fixture();
    dependencies.sessionKey.mockResolvedValueOnce('session-a').mockResolvedValue('session-b');
    expect(await runtime.handle(request)).toMatchObject({ error: expect.stringContaining('sesión cambió') });
    expect(dependencies.openPdfPrintDialog).not.toHaveBeenCalled();
  });

  it('revalida la autorización después de la última lectura y antes de abrir el PDF', async () => {
    const { runtime, dependencies } = fixture();
    dependencies.authorize.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValue(false);
    expect(await runtime.handle(request)).toHaveProperty('error');
    expect(dependencies.openPdfPrintDialog).not.toHaveBeenCalled();
  });

  it('detiene el PDF si cambia una dosis mientras se prepara', async () => {
    const { runtime, entries, dependencies } = fixture();
    dependencies.fetchCurrentMedicationEntries.mockResolvedValueOnce({ entries })
      .mockResolvedValue({ entries: [{ ...entries[0], posology: '2 comprimidos' }] });
    expect(await runtime.handle(request)).toMatchObject({ error: expect.stringContaining('tratamiento cambió') });
    expect(dependencies.openPdfPrintDialog).not.toHaveBeenCalled();
  });

  it('no convierte un fallo de lectura en un respaldo vacío', async () => {
    const { runtime, dependencies } = fixture();
    dependencies.fetchCurrentMedicationEntries.mockResolvedValue({ error: 'HTTP 500' });
    expect(await runtime.handle(request)).toHaveProperty('error');
    expect(dependencies.openPdfPrintDialog).not.toHaveBeenCalled();
  });
});
