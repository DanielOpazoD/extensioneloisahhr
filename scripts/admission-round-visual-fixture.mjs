// The medical round supplies the native sections, nine measurements, forms and toolbar.
// All note and treatment text used here belongs to this fictional encounter.
export const lastAdmissionLine = 'Cierre del ingreso simulado. Se deja constancia del plan acordado.';
const admissionNote = [
  'INGRESO MÉDICO · CASO FICTICIO',
  'Motivo de ingreso', 'Observación de tolerancia a la movilización.',
  '', 'Historia actual',
  'Persona de simulación que acude a valoración de marcha.',
  'Refiere menor tolerancia al esfuerzo habitual durante la última semana.',
  'Descansa en casa y solicita apoyo para trayectos largos.',
  'Su acompañante aporta la información del entorno domiciliario.',
  '', 'Antecedentes y situación basal',
  'Vive con familia y dispone de apoyo para las tareas domésticas.',
  'Realiza actividades básicas con supervisión ocasional.',
  'Utiliza un bastón al desplazarse fuera del domicilio.',
  'Mantiene alimentación oral y hábitos de sueño regulares.',
  '', 'Revisión por sistemas',
  'Sin cambios recientes en el apetito.', 'No refiere caídas en el último mes.',
  'Se revisó la rutina habitual con su acompañante.',
  '', 'Examen al ingreso',
  'Vigil, participa en la entrevista y sigue instrucciones.',
  'Respira en reposo sin dificultad aparente.',
  'Se incorpora de forma lenta con apoyo de una persona.',
  'Camina pocos pasos bajo supervisión.', 'Se sienta de nuevo al finalizar la evaluación.',
  '', 'Evaluación funcional',
  'El traslado de cama a silla requiere ayuda.',
  'Tolera cinco minutos en sedestación durante el examen.',
  'Se identifican los apoyos disponibles para el regreso a casa.',
  '', 'Plan de cuidados',
  'Registrar tolerancia a la movilización durante el turno.',
  'Revisar con enfermería la comodidad y el descanso.',
  'Solicitar evaluación de marcha durante la hospitalización.',
  'Compartir con la familia las medidas acordadas.',
  'Revisar el resultado con el equipo en la próxima ronda.',
  '', 'Entrega',
  'Se informa al equipo del objetivo de observación.',
  'Queda pendiente confirmar la disponibilidad del acompañante.',
  lastAdmissionLine,
].join('\n');
export const medicationInstructions = [
  'Administrar la preparación de prueba con la comida. Registrar en la hoja de simulación la tolerancia observada antes del siguiente control.',
  'Mantener el horario acordado durante el turno. Comunicar al equipo del caso ficticio cualquier dificultad antes de completar el registro.',
];
export const freeInstruction = 'Acompañar al sillón durante la mañana y anotar en la hoja del turno cuánto tiempo permanece sentado, qué ayuda requiere y cómo tolera el regreso a la cama.';

export async function installAdmissionFixture(page, width) {
  await page.evaluate(({admissionNote, medicationInstructions, freeInstruction, width}) => {
    const get = selector => document.querySelector(selector);
    const frame = get('.round-grid');
    const gridItem = content => {
      const item = document.createElement('div');
      item.className = 'MuiGrid-root MuiGrid-item MuiGrid-grid-xs-12';
      if (content) item.append(content);
      return item;
    };
    // React owns these sibling branches and their actions, independently of the reading layout.
    const group = (first, ...peers) => {
      const grid = document.createElement('div');
      grid.className = 'MuiGrid-root MuiGrid-container MuiGrid-spacing-xs-2';
      first.before(gridItem(grid));
      grid.append(first, ...peers);
    };
    const print = document.createElement('button');
    print.type = 'button';
    print.id = 'fixture-print';
    print.className = 'MuiButton-root';
    print.textContent = 'Imprimir indicaciones';
    print.addEventListener('click', () => { print.dataset.fixturePrint = 'clicked'; });
    group(get('section#vitalSignsEntry').parentElement, gridItem(print));
    const alerts = get('#alertEntrySection').parentElement;
    alerts.classList.replace('MuiGrid-grid-xs-6', 'MuiGrid-grid-xs-12');
    group(alerts, get('#diagnosisTestEntrySection').parentElement,
      get('#operationTheaterRequestEntrySection').parentElement);
    get('#diagnosisTestEntry .MuiCardHeader-title').textContent = width === 1280 ? 'Solicitudes de exámenes' : 'Solicitud de examen';
    get('#operationTheaterRequest .MuiCardHeader-title').textContent = width === 1280 ? 'Solicitud de intervención quirúrgica' : 'Solicitudes de intervención quirúrgica';
    get('#rest .MuiCardContent-root').innerHTML = '<p class="MuiTypography-root">No se presenta un Reposo registrado para este paciente</p>';
    get('#rest .MuiCardHeader-subheader').textContent = '';
    get('#diet .care-observation p').textContent = 'Preferir porciones pequeñas.';

    const wireDisclosure = (text, button, fullText, excerpt) => {
      let expanded = false;
      const render = () => {
        text.textContent = expanded ? fullText : excerpt + '…';
        button.textContent = expanded ? 'Leer menos' : 'Leer más';
        button.setAttribute('aria-expanded', String(expanded));
      };
      button.addEventListener('click', () => { expanded = !expanded; render(); });
      render();
    };
    const noteText = get('#evolution .MuiBox-root > .MuiTypography-caption');
    const originalButton = noteText.nextElementSibling.querySelector('button');
    const noteButton = originalButton.cloneNode(false);
    originalButton.replaceWith(noteButton);
    wireDisclosure(noteText, noteButton, admissionNote, admissionNote.slice(0, 140));

    const table = (headings, rows) => '<table class="MuiTable-root"><thead><tr>' +
      headings.map(heading => '<th class="MuiTableCell-root">' + heading + '</th>').join('') +
      '</tr></thead><tbody>' + rows.map(cells => '<tr class="MuiTableRow-root">' +
        cells.map(cell => '<td class="MuiTableCell-root">' + cell + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
    const textCell = key => '<div class="MuiBox-root"><p class="MuiTypography-root" data-fixture-text="' +
      key + '"></p><button type="button" class="MuiButton-root">Leer más</button></div>';
    const chip = label => '<span class="MuiChip-root"><span class="MuiChip-label">' + label + '</span></span>';
    const action = '<button type="button" aria-label="Ver comentario">···</button>';
    const medications = get('#medicationEntrySection');
    const free = medications.cloneNode(true);
    free.id = 'freeIndicationEntrySection';
    free.querySelector('.MuiCard-root').id = 'freeIndication';
    free.querySelector('.MuiCardHeader-title').textContent = 'Indicaciones libres';
    free.querySelector('.MuiCardHeader-action').replaceChildren();
    const medRows = ['SOS',width === 1280 ? 'Antimicrobiano' : 'Antimic.'].map((label,index) => [
      '<div class="MuiStack-root"><span>Preparación de prueba ' + (index ? 'B' : 'A') + '</span>' + chip(label) + '</div>',
      'Vía oral · pauta simulada', textCell('medication-' + index), action,
    ]);
    medications.querySelector('.MuiCardContent-root').innerHTML = table(
      ['Medicamento','Posología','Indicaciones específicas','Acciones'], medRows);
    free.querySelector('.MuiCardContent-root').innerHTML = table(['Indicación','Observación','Acciones'], [
      [textCell('free'), 'Acompañamiento por el equipo del turno.', action],
    ]);
    medications.parentElement.after(gridItem(free));
    const values = [...medicationInstructions, freeInstruction];
    for (const [index, text] of [...frame.querySelectorAll('[data-fixture-text]')].entries()) {
      wireDisclosure(text, text.nextElementSibling, values[index], values[index].slice(0,40).trimEnd());
    }
    for (const section of [medications, free]) section.addEventListener('click', () =>
      queueMicrotask(() => document.dispatchEvent(new Event('fixture-refresh'))));
  }, {admissionNote,medicationInstructions,freeInstruction,width});
}
