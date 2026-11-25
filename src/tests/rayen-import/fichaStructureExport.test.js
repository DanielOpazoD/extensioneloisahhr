// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeAll, expect, it, vi } from 'vitest';

beforeAll(() => {
  // The snippet runs once when pasted. Here its console output and clipboard are silenced.
  vi.spyOn(console, 'log').mockImplementation(() => {});
  globalThis.copy = () => {};
  window.eval(readFileSync('scripts/export-ficha-structure.snippet.js', 'utf8'));
});

it('describe la estructura sin nombres, cifras, valores de campos ni texto clínico', () => {
  document.body.innerHTML = `<main><section id="medicationEntrySection" class="MuiBox-root css-1a2b3c">
    <div class="MuiCard-root"><span class="MuiCardHeader-title">Fármacos</span>
      <span class="MuiCardHeader-subheader" data-hhr-update-label="15-04-2026 · 09:12 · Jacinta Olmedo">Última actualización: 15-04-2026, 09:12:35, Médico Jacinta Olmedo</span>
      <table><thead><tr><th>Medicamento</th><th>Posología</th><th>Acciones</th></tr></thead><tbody>
        ${['Paracetamol 500 mg', 'Losartán 50 mg', 'Omeprazol 20 mg', 'Enoxaparina 40 mg', 'Metformina 850 mg', 'Atorvastatina 20 mg', 'Sertralina 50 mg'].map(drug =>
          `<tr class="MuiTableRow-root"><td>${drug}</td><td>Vía oral cada 8 horas</td>
            <td><button aria-label="Eliminar ${drug}" title="RUN 12.345.678-9"><svg data-testid="DeleteIcon"><path d="M1 2"/></svg></button></td></tr>`).join('')}
      </tbody></table>
      <input type="text" placeholder="Buscar medicamento" value="Clonazepam secreto">
      <textarea aria-label="Observaciones">Paciente Rigoberto Fuentealba refiere dolor 7/10</textarea>
      <label><input type="checkbox" checked> Mostrar suspendidos</label>
      <button disabled>Validar tratamiento</button></div></section>
    <script>var secreto = 'Rigoberto';</script><div id="hhr-clinical-operations-bar">Centro de Rigoberto</div></main>`;
  const structure = globalThis.exportFichaStructure(document.body);

  for (const secret of ['Jacinta', 'Olmedo', 'Rigoberto', 'Fuentealba', 'Paracetamol', 'Losart', 'Enoxaparina', 'Clonazepam', 'Atorvastatina', 'Sertralina', 'secreto',
    '12.345', '678', '500', '09:12', '15-04', '2026', 'dolor', 'refiere']) expect(structure).not.toContain(secret);
  // No digit of the page survives: an id, a date and a dose all read as zeros.
  const digits = structure.split('\n').filter(line => /[1-9]/.test(line.replace(/<!--.*?-->/g, '')));
  expect(digits).toEqual([]);

  // What a stylesheet needs is all there.
  expect(structure).toContain('<section class="MuiBox-root" id="medicationEntrySection">');
  expect(structure).toContain('Fármacos');
  expect(structure).toContain('Última actualización: 00-00-0000, 00:00:00, Médico xxxxxxx xxxxxx');
  expect(structure).toContain('data-hhr-update-label="00-00-0000 · 00:00 · xxxxxxx xxxxxx"');
  expect(structure).toContain('Medicamento');
  expect(structure).toContain('Vía xxxx xxxx 0 xxxxx');
  expect(structure).toContain('aria-label="Eliminar xxxxxxxxxxx 000 xx"');
  expect(structure).toContain('<svg data-testid="DeleteIcon">');
  expect(structure).not.toContain('<path');
  expect(structure).toContain('<input type="text" placeholder="Buscar medicamento">');
  expect(structure).toContain('<input type="checkbox" checked>');
  expect(structure).toContain('<button disabled>');
  expect(structure).toContain('Validar tratamiento');
  // Seven rows of the same shape: five are described and two are counted.
  expect(structure.match(/<tr class="MuiTableRow-root">/g)).toHaveLength(5);
  expect(structure).toContain('<!-- +2 hermanos con la misma forma -->');
  expect(structure).not.toContain('xxxxxxxxxxxxx 00 xx');
  expect(structure).not.toContain('css-');
});
