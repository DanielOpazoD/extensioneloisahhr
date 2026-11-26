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
            <td><button aria-label="Eliminar ${drug}" title="RUN 12.345.678-9"><svg class="MuiSvgIcon-root" data-testid="DeleteIcon"><path d="M1 2"/></svg></button></td></tr>`).join('')}
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
  expect(structure).toContain('<svg class="MuiSvgIcon-root" data-testid="DeleteIcon">');
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

it('no deja salir datos por identificadores, clases, estados, la ruta ni las partes que no recorre', () => {
  window.history.replaceState(null, '', '/dashboard/encounter-list/12345678-K/jacinta-olmedo/abc9/:rjacinta:/OlmedoIcon');
  document.body.innerHTML = `<main>
    <div id="paciente-jacinta-olmedo" class="Olmedo MuiBox-root MuiGrid-grid-xs-12 css-9z" data-testid="Jacinta" data-hhr-round="frame"
      data-hhr-update-label="15-04-2026 · 09:12 · Jacinta Olmedo" data-run="12.345.678-9" tabindex="12345678" aria-current="2026-04-15" hidden="jacinta">
      <i id="jacintaOlmedo" data-testid="olmedo" class="MuiOlmedo.jacinta hhr-Jacinta" role="rigoberto" type="fuentealba"></i>
      <label for="Rigoberto Fuentealba">Nombre</label>
      <select aria-label="Diagnóstico"><option selected>Neumonía de Rigoberto</option></select>
      <div contenteditable="true">Rigoberto refiere dolor</div>
      <a href="/pacientes/Rigoberto-Fuentealba/12345678">Ver</a><button value="Rigoberto" name="Fuentealba">Guardar</button>
      <div role="slider" aria-valuetext="Rigoberto 37,5" aria-valuenow="375"></div>
      <svg class="MuiSvgIcon-root" data-testid="EditNoteRoundedIcon" aria-label="Enmendar"><title>Rigoberto</title><desc>Fuentealba</desc><text>Olmedo</text></svg>
      <b id="_r_jacintaolmedo_" data-testid="JacintaOlmedoIcon" data-hhr-foo="jacinta" data-hhr-plan="card" aria-controls=":rolmedo: RigobertoIcon"></b>
      <!-- Comentario con Rigoberto --><template><p>Rigoberto</p></template>
      <section id="medicationEntrySection"><span id="_r_1b_">Fármacos</span><button id="encounter-event-tab-history" aria-selected="true" role="tab">Historial</button></section>
    </div></main>`;
  const structure = globalThis.exportFichaStructure(document.body);
  for (const secret of ['Jacinta', 'jacinta', 'Olmedo', 'olmedo', 'Rigoberto', 'Fuentealba', 'Neumon', 'dolor', '12345678', '12.345', '2026', '09:12', '375', '37,5', 'abc9', '-K/'])
    expect(structure).not.toContain(secret);
  expect(structure.split('\n').filter(line => /[1-9]/.test(line.replace(/<!--.*?-->/g, '').replace(/MuiGrid-grid-xs-12/g, '')))).toEqual([]);
  // What describes the page is kept.
  expect(structure).toContain('/dashboard/encounter-list/00000000-x/xxxxxxx-xxxxxx/xxx0/:r0:/xxxxxxxxxx ');
  expect(structure).toContain('<div class="MuiBox-root MuiGrid-grid-xs-12" id="paciente-xxxxxxx-xxxxxx" data-testid="xxxxxxx" data-hhr-round="frame" ' +
    'data-hhr-update-label="00-00-0000 · 00:00 · xxxxxxx xxxxxx" aria-current="0000-00-00" hidden="xxxxxxx"');
  expect(structure).toContain('<i id="xxxxxxxxxxxxx" data-testid="xxxxxx" role="xxxxxxxxx" type="xxxxxxxxxx">');
  expect(structure).toContain('data-hhr-round="frame"');
  expect(structure).toContain('<section id="medicationEntrySection">');
  expect(structure).toContain('id="_r_0_"');
  // An id shaped like React's, an icon name outside a library icon and a mark of the extension keep nothing they were not meant to.
  expect(structure).toContain('<b id="_r_0_" data-testid="xxxxxxxxxxxxxxxxx" data-hhr-foo="xxxxxxx" data-hhr-plan="card" aria-controls=":r0: xxxxxxxxxxxxx">');
  expect(structure).toContain('<button id="encounter-event-tab-history" aria-selected="true" role="tab">');
  expect(structure).toContain('<svg class="MuiSvgIcon-root" data-testid="EditNoteRoundedIcon" aria-label="Enmendar">');
  expect(structure).toContain('<select aria-label="Diagnóstico">');
  window.history.replaceState(null, '', '/');
});
