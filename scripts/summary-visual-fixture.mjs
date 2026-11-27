// A fictional Resumen with the structure of the real one (docs/estructura-eloisa.md): the frame
// and its items in Eloísa's order, the twelve section links in theirs, and each card with the
// elements and classes that were observed. Every name, drug and figure is invented.
// Measured in Eloísa on 26-11-2026: page #f1f1f1, white cards without shadow and with 12 px corners, Inter on every text
// (here its declared fallback, Arial scaled to Inter's width, so macOS and Linux draw the same widths),
// 32 px of padding on main at each side and a fixed tab bar across the whole width with 24 px of padding.
// MUI names the family on every Typography, as here: a text takes the family of the view only where a rule gives it.
// Also measured on 26-11-2026, in a patient without diagnoses: Fármacos inside a second section with the line of its
// validator, Eloísa focusing the empty alert field when the summary opens, the sentence of Cirugía in three text
// nodes, Balance Hídrico with its filter, and Eventos Adversos and Examen Gíneco Obstétrico without permission.
const paths = {
  MoreVertRoundedIcon:'M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4m0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4m0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
  MoreVertIcon:'M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4m0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4m0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
  EditNoteRoundedIcon:'M3 10h11v2H3zm0-2h11V6H3zm0 8h7v-2H3zm15.01-3.13.71-.71a1 1 0 0 1 1.41 0l.71.71a1 1 0 0 1 0 1.41l-.71.71zm-.71.71-5.3 5.3V21h2.12l5.3-5.3z',
  FormatListBulletedRoundedIcon:'M4 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m0-6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m0 12a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M8 19h12a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2m0-6h12a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2M7 6a1 1 0 0 0 1 1h12a1 1 0 0 0 0-2H8a1 1 0 0 0-1 1',
  CalendarIcon:'M17 12h-5v5h5zM16 1v2H8V1H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-1V1zm3 18H5V8h14z',
  LocalPrintshopRoundedIcon:'M19 8H5a3 3 0 0 0-3 3v4a2 2 0 0 0 2 2h2v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2h2a2 2 0 0 0 2-2v-4a3 3 0 0 0-3-3m-4 11H9a1 1 0 0 1-1-1v-4h8v4a1 1 0 0 1-1 1m4-7a1 1 0 1 1 0-2 1 1 0 0 1 0 2m-2-9H7a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1',
  DehazeIcon:'M2 15.5v2h20v-2zm0-5v2h20v-2zm0-5v2h20v-2z',
  ArchiveRoundedIcon:'m20.54 5.23-1.39-1.68A1.5 1.5 0 0 0 18 3H6a1.5 1.5 0 0 0-1.16.55L3.46 5.23A2 2 0 0 0 3 6.5V19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.5a2 2 0 0 0-.46-1.27M12 17.5 6.5 12H10v-2h4v2h3.5zM5.12 5l.81-1h12l.94 1z',
  ChangeHistoryRoundedIcon:'M12 7.77 18.39 18H5.61zm-.85-2.41L2.2 19.47A1 1 0 0 0 3.05 21h17.9a1 1 0 0 0 .85-1.53L12.85 5.36a1 1 0 0 0-1.7 0',
  CancelIcon:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12z',
  SpeakerNotesIcon:'M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2M8 14H6v-2h2zm0-3H6V9h2zm0-3H6V6h2zm7 6h-5v-2h5zm3-3h-8V9h8zm0-3h-8V6h8z',
  NoteAddIcon:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm2 14h-3v3h-2v-3H8v-2h3v-3h2v3h3zm-3-7V3.5L18.5 9z',
  StarRoundedIcon:'m12 17.27 4.15 2.51a1 1 0 0 0 1.49-1.08l-1.1-4.72 3.67-3.18a1 1 0 0 0-.57-1.75l-4.83-.41-1.89-4.46a1 1 0 0 0-1.84 0L9.19 8.63l-4.83.41a1 1 0 0 0-.57 1.75l3.67 3.18-1.1 4.72a1 1 0 0 0 1.49 1.08z',
  ArrowDropDownIcon:'m7 10 5 5 5-5z',
};
// Eloísa names an icon button on its icon, never on the button.
const icon = (id, name = '') => `<svg class="MuiSvgIcon-root" data-testid="${id}"${name ? ` aria-label="${name}"` : ' aria-hidden="true"'} viewBox="0 0 24 24" focusable="false"><path d="${paths[id]}"/></svg>`;
const iconButton = (id, name = '', size = 'Small', attributes = '') =>
  `<button type="button" class="MuiButtonBase-root MuiIconButton-root MuiIconButton-size${size}"${attributes}>${icon(id, name)}</button>`;
const toggle = (label, checked = false) => `<label class="MuiFormControlLabel-root"><span class="MuiSwitch-root"><span class="MuiButtonBase-root PrivateSwitchBase-root">` +
  `<input class="PrivateSwitchBase-input MuiSwitch-input" type="checkbox"${checked ? ' checked' : ''}><span></span></span><span></span></span>` +
  `<span class="MuiTypography-root MuiTypography-body1 MuiFormControlLabel-label">${label}</span></label>`;
const textField = (label, id, attributes = '', adornment = '') => `<div class="MuiFormControl-root MuiTextField-root">
  <label class="MuiFormLabel-root MuiInputLabel-root" for="${id}">${label}</label>
  <div class="MuiInputBase-root MuiOutlinedInput-root"><input class="MuiInputBase-input MuiOutlinedInput-input" id="${id}" type="text"${attributes}>${adornment}</div></div>`;
// A name as Eloísa writes it in a byline (read 26-11-2026): first name, second name, first surname and second
// surname joined by a space. The second name is empty here, so its space stays.
const fields = name => name.replace(' ', '  ') + ' Prueba';
const signature = (role, name, time = '09:12:35', comma = ',') => `Última actualización: 15-04-2026${comma} ${time}, ${role} ${fields(name)}`;
const card = (cardId, title, body, subheader = '', action = '') => `<div class="MuiPaper-root MuiCard-root"${cardId ? ` id="${cardId}"` : ''}>
  <div class="MuiCardHeader-root"><div class="MuiCardHeader-content"><span class="MuiTypography-root MuiTypography-h6 MuiCardHeader-title">${title}</span>
    <span class="MuiTypography-root MuiTypography-body2 MuiCardHeader-subheader">${subheader}</span></div>
    <div class="MuiCardHeader-action"><div class="MuiStack-root">${action}</div></div></div>
  <div class="MuiCardContent-root">${body}</div></div>`;
const section = (id, cardId, ...rest) => `<section class="MuiBox-root" id="${id}">${card(cardId, ...rest)}</section>`;
const item = (content, size = 'xs-12') => `<div class="MuiGrid-root MuiGrid-item ${size.split(' ').map(name => 'MuiGrid-grid-' + name).join(' ')}">${content}</div>`;
const message = text => `<p class="MuiTypography-root MuiTypography-body2">${text}</p>`;
const caption = (text, inline = false) => `<span class="MuiTypography-root MuiTypography-caption"${inline ? ' style="display:inline-flex"' : ''}>${text}</span>`;

// A long text reaches the page cut at 48 characters, with «Leer más» on a line of its own.
const cut = 48;
const readable = text => text.length <= cut ? `<div class="MuiBox-root">${caption(text, true)}</div>` :
  `<div class="MuiBox-root"><span class="MuiTypography-root MuiTypography-caption" style="display:inline-flex" data-fixture-full="${text}">${text.slice(0, cut).trimEnd()}...</span>` +
  `<div class="MuiBox-root" style="display:flex"><button type="button" class="MuiButtonBase-root MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-textSizeSmall">Leer más</button></div></div>`;
const table = (headings, rows) => `<div class="MuiPaper-root"><div class="MuiTableContainer-root"><table class="MuiTable-root">
  <thead class="MuiTableHead-root"><tr class="MuiTableRow-root">${headings.map(heading =>
    `<th class="MuiTableCell-root MuiTableCell-head MuiTableCell-stickyHeader MuiTableCell-sizeMedium"><p class="MuiTypography-root MuiTypography-body2">${heading}</p></th>`).join('')}</tr></thead>
  <tbody class="MuiTableBody-root">${rows.map(cells => `<tr class="MuiTableRow-root">${cells.map(cell =>
    `<td class="MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium">${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
const chip = label => `<div class="MuiChip-root MuiChip-sizeSmall"><span class="MuiChip-label">${label}</span></div>`;
let menus = 0;
// The actions of a prescription row: suspend, its notes (none yet) and the overflow menu.
const rowActions = () => `<div class="MuiStack-root"><div class="MuiStack-root">${iconButton('CancelIcon', 'Suspender')}` +
  `${iconButton('SpeakerNotesIcon', 'Ver notas', 'Small', ' disabled').replace('MuiButtonBase-root ', 'MuiButtonBase-root Mui-disabled ')}</div>` +
  `<div>${iconButton('MoreVertIcon', '', 'Medium', ` id="fixture-menu-${menus++}" aria-haspopup="true"`)}</div></div>`;

const requester = 'Tomás Ejemplo';
// Days of treatment, name, markers, posology, specific instructions. Each name has the length of its row in one real
// list of fourteen (24 to 113 characters). The posology is whole: Eloísa cuts it at about 48 with «Leer más».
export const summaryMedications = [
  [12, 'Preparación de prueba A 5 mg comprimido', [], '1 comprimido cada 8 horas - oral', ''],
  [12, 'Preparación de prueba B 40 mg/0,4 mL solución inyectable en jeringa prellenada 100', [], '1 jeringa cada 24 horas por 7 días - subcutánea, rotar el sitio', ''],
  [9, 'Preparación de prueba C 1 g polvo para solución inyectable, frasco ampolla de uso exclusivo de la simulación 2026', ['Antimic.'], '1 g cada 12 horas - endovenosa', ''],
  [9, 'Preparación de prueba D 2 g', [], '1 cápsula cada 24 horas en ayunas por 30 días - oral', 'Registrar la tolerancia de prueba.'],
  [7, 'Preparación de prueba E 500 mg comprimido recubierto', [], '1 comprimido cada 12 horas por 14 días - oral, con agua', 'Suspender si el caso lo indica.'],
  [7, 'Preparación de prueba F1', ['SOS'], '1 comprimido cada 6 horas si lo requiere - oral, máximo 4', 'Avisar al equipo de la simulación.'],
  [5, 'Preparación de prueba G 100 mcg aero', [], '2 inhalaciones cada 6 horas con aerocámara - inhalatoria', 'Enjuagar después de usar.'],
  [5, 'Preparación de prueba H 10 mg/mL1', [], '10 gotas cada 8 horas - oral', ''],
  [4, 'Preparación de prueba I 25 mg compr', [], '1 comprimido cada 24 horas por la noche durante 10 días - oral', 'Controlar el registro ficticio antes de la dosis de la noche.'],
  [4, 'Preparación de prueba J 2 mg compri', [], '1 comprimido cada 12 horas - sublingual', 'Mantener bajo la lengua hasta disolver, sin tragar agua.'],
  [3, 'Preparación de prueba K 50 mg amp', [], '1 ampolla cada 8 horas diluida en 100 mL - endovenosa lenta', 'Pasar en treinta minutos de prueba.'],
  [3, 'Preparación de prueba L 10 g', [], 'Aplicar una capa fina cada 12 horas en la zona indicada - tópica', 'Usar guantes en la simulación.'],
  [2, 'Preparación de prueba M 300 mg cápsula liberación lenta', [], '1 cápsula cada 24 horas con el desayuno por 60 días - oral', ''],
  [1, 'Preparación de prueba N 1 mg', [], '1 comprimido cada 24 horas con la comida principal - oral', 'Registrar en la hoja de prueba.'],
];
const medicationRow = ([days, name, markers, posology, instructions]) => [
  // Eloísa keeps 36 px for the triangle and hangs the number 14.4 px under its top (read 26-11-2026).
  `<div class="MuiBox-root" style="display:flex;align-items:baseline;height:36px">${icon('ChangeHistoryRoundedIcon')}<div class="MuiBox-root" style="margin-top:14.4px">${caption(days)}</div></div>`,
  `<div class="MuiStack-root">${caption(name)}<div class="MuiStack-root markers">${markers.map(chip).join('')}</div></div>`,
  readable(posology), instructions ? readable(instructions) : `<div class="MuiBox-root">${caption('', true)}</div>`, caption(requester + ' Prueba'), rowActions(),
];
// The first cell marks the main diagnosis. GES and Eno stay empty, as in the list that was read.
export const summaryDiagnoses = [
  ['Dato ficticio', 'Z00.0: Diagnóstico de prueba de la simulación, no corresponde a una persona', 'Confirmado', '12-04-2026'],
  ['Dato ficticio', 'Z00.1: Segundo diagnóstico de prueba', 'Confirmado', '13-04-2026'],
];
const diagnosisRow = ([kind, text, status, date], index) => [
  index ? '' : icon('StarRoundedIcon'),
  `<div class="MuiStack-root"><div class="MuiBox-root">${caption(kind, true)}</div>${caption(text)}</div>`,
  `<div class="MuiFormControl-root"><div class="MuiInputBase-root MuiOutlinedInput-root"><div role="combobox" tabindex="0" aria-expanded="false" aria-haspopup="listbox" id="select-diagnosis-status-${index}">${caption(status)}</div>` +
    `<input aria-hidden="true" tabindex="-1" value="${status}">${icon('ArrowDropDownIcon')}</div></div>`,
  caption(date), caption('') + caption(''), caption(''),
  `<div class="MuiStack-root"><div class="MuiStack-root">${iconButton('SpeakerNotesIcon', 'Ver notas', 'Small', ' disabled').replace('MuiButtonBase-root ', 'MuiButtonBase-root Mui-disabled ')}${iconButton('NoteAddIcon', 'Agregar notas')}</div></div>`,
];
// The text of a free indication is cut like a posology: the last one reaches the page with «Leer más».
export const summaryFree = [
  ['Control de signos vitales de prueba', 'Cada 6 hora(s) por 30 día(s)'], ['Curación simple de la simulación', 'Cada 24 hora(s) por 10 día(s)'],
  ['Aseo y confort del caso ficticio', 'Cada 12 hora(s) por 30 día(s)'],
  ['Movilización asistida de prueba al sillón dos veces al día, con registro de la tolerancia', 'Cada 12 hora(s) por 7 día(s)'],
];

const note = `Paciente de simulación en control de ronda. Refiere descanso adecuado y tolerancia a la alimentación.
Se sienta en el sillón con asistencia. Sin cambios respecto de la revisión previa.

Plan de la ronda
• Registrar tolerancia al levantarse durante el turno.
• Revisar con enfermería la planificación de cuidados.
• Reevaluar movilidad en la próxima visita.`;
const discharge = section('estimatedDischargeSection', 'estimatedDischarge', 'Fecha estimada de alta',
  `<section class="MuiStack-root"><form class="MuiStack-root" onsubmit="return false">${textField('Fecha estimada de alta', 'fixture-discharge', ' placeholder="dd/mm/aaaa"',
    `<div class="MuiInputAdornment-root">${iconButton('CalendarIcon', '', 'Medium', ' aria-label="Elegir fecha"')}</div>`)}
    <button type="submit" class="MuiButtonBase-root MuiButton-root MuiButton-contained Mui-disabled" disabled>Modificar</button></form>
    <hr class="MuiDivider-root MuiDivider-vertical"><div class="MuiStack-root"><button type="button" class="MuiButtonBase-root MuiButton-root MuiButton-contained" aria-label="Lista de registros">${icon('DehazeIcon')}</button></div></section>`);
const evolution = section('observationEntrySection', 'evolution', 'Evolución',
  `<div class="MuiStack-root"><div class="MuiStack-root"><div class="MuiBox-root">
    <span class="MuiTypography-root MuiTypography-caption">${note}</span><div class="MuiBox-root"><button type="button" class="MuiButtonBase-root MuiButton-root MuiButton-text">Leer menos</button></div>
  </div></div><div class="MuiStack-root"><div class="MuiStack-root">${iconButton('EditNoteRoundedIcon', 'Enmendar')}${iconButton('FormatListBulletedRoundedIcon', 'Ver enmendados')}</div></div></div>`,
  signature('Médico', requester), iconButton('MoreVertRoundedIcon', '', 'Medium'));
const handoff = section('shiftChangeEntrySection', 'shiftChangeObservation', 'Observaciones de entrega de turno',
  `<div class="MuiBox-root"></div><form class="MuiStack-root" onsubmit="return false">${textField('Observaciones', 'fixture-handoff')}
    <button type="submit" class="MuiButtonBase-root MuiButton-root MuiButton-contained Mui-disabled" disabled>Agregar</button></form>`);

const measurement = ([label, value, age, flagged]) => {
  const reading = label === 'Presión' ? `<div class="MuiGrid-root"><div class="MuiStack-root numeric"><h5 class="MuiTypography-root MuiTypography-h5">118</h5>` +
    `<h5 class="MuiTypography-root MuiTypography-h5">/</h5><h5 class="MuiTypography-root MuiTypography-h5">72</h5></div>` +
    `<div class="MuiStack-root numeric"><p class="MuiTypography-root MuiTypography-body1">PAM:</p><p class="MuiTypography-root MuiTypography-body1">87</p></div></div>` :
    `<h5 class="MuiTypography-root MuiTypography-h5"${flagged ? ' style="color:#cc2424"' : ''}>${value}</h5>`;
  // React nests a block inside this paragraph. The script below rebuilds it, as the parser would close the p.
  return `<div class="MuiPaper-root MuiCard-root tile"><div class="MuiCardContent-root"><div class="MuiTypography-root MuiTypography-body1" data-fixture-paragraph>${label}` +
    `<div class="MuiBox-root">${caption('', true)}</div></div>${reading}<p class="MuiTypography-root MuiTypography-body1">${age}</p></div></div>`;
};
const vitals = section('vitalSignsEntry', 'vitalSignsEntry', 'Signos vitales', `<div class="MuiStack-root vitals-grid">${[
  ['Presión', '', '2 horas'], ['Fre. Cardíaca', '78', '2 horas'], ['Saturación O2', '96', '2 horas'], ['Tº axilar', '38,1', '2 horas', true],
  ['Frec. respiratoria', '17', '2 horas'], ['Glasgow', '15', '2 horas'], ['Sup. Oxígeno', '21', '2 horas'], ['Hemoglucotest', '104', '4 horas'], ['EVA', '2', '2 horas'],
].map(measurement).join('')}</div><p class="MuiTypography-root MuiTypography-body2">Observaciones: mediciones de prueba.</p>
  <button type="submit" class="MuiButtonBase-root MuiButton-root MuiButton-text">VER HISTORIAL COMPLETO</button>`,
  signature('Paramédico', 'Luis Ejemplo', '8:15:02', ''));

const alertRow = ([author, text, age]) => `<div class="MuiStack-root alert-row"><div class="MuiStack-root"><p class="MuiTypography-root MuiTypography-body2">${author}</p>
  <div><span class="MuiTypography-root MuiTypography-body2" style="display:inline-flex">${text}</span></div></div>
  <div class="MuiStack-root">${caption(age)}<div class="MuiStack-root">${iconButton('ArchiveRoundedIcon', '', 'Small', ' aria-label="Archivar"')}</div></div></div>`;
export const summaryAlerts = [
  ['Enfermera(o) Elena  Ejemplo Prueba', 'Pauta de seguimiento pendiente para el próximo turno.', '2 horas'],
  ['Médico Tomás  Ejemplo ', 'Se acordó una visita con la familia.', '4 horas'],
  ['Enfermera(o) Elena  Ejemplo Prueba', 'Evaluación de riesgo de prueba 12/04 ---- repetir la evaluación de la simulación.', '3 días'],
];
const alerts = list => section('alertEntrySection', 'alertEntries', 'Alertas', `<div class="MuiBox-root alerts-list">${list.map(alertRow).join('')}</div>
  <form class="MuiStack-root" onsubmit="return false">${toggle('No reanimación')}${toggle('Gestión de Visitas', true)}
    <div class="MuiStack-root"><div class="MuiBox-root">${textField('Observaciones', 'fixture-alert')}</div>
    <button type="submit" class="MuiButtonBase-root MuiButton-root MuiButton-contained Mui-disabled" disabled>Agregar</button></div></form>`);

// An empty rest is a card without its section. A diet has its value in a chip and its observation below.
const rest = card('rest', 'Reposo', message('No se presenta un Reposo registrado para este paciente'));
const diet = section('nutritionOrderEntrySection', 'nutritionOrder', 'Régimen', `<div class="MuiStack-root care"><div class="MuiStack-root">
    <p class="MuiTypography-root MuiTypography-body1">Régimen:</p>${chip('Común').replace(' MuiChip-sizeSmall', '')}<div class="MuiBox-root">${caption('', true)}</div></div>
  <div class="MuiStack-root"><p class="MuiTypography-root MuiTypography-body1">Observación:</p><div class="MuiBox-root">${caption('Preferir porciones pequeñas.', true)}</div></div></div>`,
  signature('Médico', requester, '10:45:20'));

// The card of Fármacos sits in a second section, and its content opens with who validated the treatment:
// two captions, the second empty while nobody has. The older shape, without both, is `nested:false`.
const medication = ({nested = true, validator = ''} = {}) => {
  const body = (nested ? `<div class="MuiBox-root">${caption('Medico Validador:')}${caption(validator)}</div>` : '') +
    table(['Tiempo', 'Indication', 'Posología', 'Indicaciones específicas', 'Solicitante', 'Acciones'], summaryMedications.map(medicationRow)) +
    // The card closes with a form that draws nothing (read 26-11-2026).
    (nested ? '<form class="MuiStack-root"></form>' : '');
  const content = card('medicationEntry', 'Fármacos', body, '',
    `<button type="button" class="MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedSecondary">validar tratamiento</button>${toggle('Mostrar Suspendidos')}` +
    iconButton('LocalPrintshopRoundedIcon', 'Imprimir fármacos', 'Medium'));
  return `<section class="MuiBox-root" id="medicationEntrySection">${nested ? `<section class="MuiBox-root" id="dilutionEntrySection">${content}</section>` : content}</section>`;
};
const noPharma = section('noPharmaEntrySection', 'noPharmaEntry', 'Producto no Farmacológico', message('No presenta productos no farmacológicos registrados'), '', toggle('Mostrar Suspendidos'));
const free = section('freeIndicationEntrySection', 'freeIndicationEntry', 'Indicaciones Libres', table(['Indication', 'Programación', 'Solicitante', 'Acciones'],
  summaryFree.map(([name, schedule]) => [`<div class="MuiStack-root">${readable(name)}</div>`, caption(schedule), caption(requester + ' Prueba'), rowActions()])),
  '', toggle('Mostrar Suspendidos'));
// A state that can still change is a native select, as the state of a diagnosis; a closed one is its word.
const stateSelect = (id, value) => `<div class="MuiFormControl-root"><div class="MuiInputBase-root MuiOutlinedInput-root"><div role="combobox" tabindex="0" aria-expanded="false" aria-haspopup="listbox" id="${id}">${caption(value)}</div>` +
  `<input aria-hidden="true" tabindex="-1" value="${value}">${icon('ArrowDropDownIcon')}</div></div>`;
// The four sections below with records. Their columns and controls were read on screenshots of 26-11-2026, not
// on an exported structure: the table is the one Eloísa draws everywhere else. To be calibrated with the page.
export const summaryProcedures = [
  ['Curación de prueba de la simulación', 'Solicitada', '11-04-2026', 'Enfermera(o)', '1', 'Se realiza una curación ficticia con apósito de prueba, sin hallazgos en el caso simulado.', 'Elena Ejemplo'],
  ['Toma de muestra de prueba', 'Realizada', '10-04-2026', 'Enfermera(o)', '1', 'Muestra ficticia para el laboratorio de la simulación.', 'Elena Ejemplo'],
];
const procedures = list => section('procedureEntrySection', 'procedureEntry', 'Procedimientos', list.length ?
  table(['Indicación', 'Estado', 'Fecha solicitud', 'Para', 'Nº de sesiones', 'Fundamentos', 'Solicitante', 'Acciones'], list.map(([name, state, date, target, sessions, reason, by], at) =>
    [caption(name), state === 'Solicitada' ? stateSelect('select-procedure-status-' + at, state) : caption(state), caption(date), caption(target), caption(sessions), readable(reason), caption(by), rowActions()])) :
  message('No presenta procedimientos registrados'), '', list.length ? toggle('Mostrar suspendidos') : '');
// Without records Eloísa writes a sentence in place of the table, «diagnosticos» without its accent.
const diagnosis = list => section('diagnosisEntrySection', 'diagnosisEntry', 'Diagnóstico', list.length ?
  table(['', 'Diagnóstico', 'Estado', 'Fecha', 'GES', 'Eno', 'Acciones'], list.map(diagnosisRow)) : message('No se presentan diagnosticos registrados para este paciente'),
  list.length ? signature('Médico', requester, '09:05:10') : '');
export const summaryReferrals = [
  ['Especialidad de prueba', 'Interna', 'Solicitada', '12-04-2026 13:35', 'Pendiente asignar', 'Control por especialidad de la simulación'],
  ['Segunda especialidad de prueba', 'Interna', 'Solicitada', '13-04-2026 09:00', 'Pendiente asignar', 'Control por especialidad de la simulación'],
];
const printActions = () => `<div class="MuiStack-root"><div class="MuiStack-root">${iconButton('ArchiveRoundedIcon', 'Archivar')}${iconButton('LocalPrintshopRoundedIcon', 'Imprimir')}</div>` +
  `<div>${iconButton('MoreVertIcon', '', 'Medium', ` id="fixture-menu-${menus++}" aria-haspopup="true"`)}</div></div>`;
const referral = list => section('referralRequestEntrySection', 'referralRequestEntry', 'Solicitud interconsulta', list.length ?
  table(['Especialidad', 'Destino', 'Estado', 'Fecha solicitud', 'Interconsultor', 'Motivo', 'Acciones'], list.map(cells => [...cells.map(text => caption(text)), printActions()])) :
  message('No presenta interconsultas solicitadas'), list.length ? signature('Médico', requester) : '');
export const summaryCareOrders = [
  ['Kinesiólogo(a)', 'Solicitada', '15-04-2026', 'Pendiente asignar', 'Tratamiento', 'Evaluar la marcha con apoyo antes del próximo turno.'],
  ['Terapeuta ocupacional', 'Realizada', '14-04-2026', 'Pendiente asignar', 'Tratamiento', 'Revisar el uso de cubiertos adaptados durante el almuerzo.'],
];
const orders = list => section('procedureOrderEntrySection', 'procedureOrderEntry', 'Órdenes de atención', list.length ?
  table(['Profesional', 'Estado', 'Fecha solicitud', 'Asignado', 'Motivo', 'Indicaciones', 'Acciones'],
    list.map(cells => [...cells.map(text => caption(text)), iconButton('LocalPrintshopRoundedIcon', 'Imprimir orden')])) :
  message('No se presenta orden de atención solicitada para este paciente'), list.length ? signature('Médico', requester) : '');
export const summaryTests = [
  ['Grupo de prueba A', '31001', 'Solicitado', '09-04-2026', 'Examen ficticio de la simulación', '', 'Solicitado'],
  ['Grupo de prueba B', '31002', 'Solicitado', '09-04-2026', 'Segundo examen ficticio, con un nombre largo que ocupa más de una línea en una columna estrecha', '', 'Solicitado'],
];
// The button that prints the selected orders sits above the table, inside the content of the card.
const tests = list => section('diagnosisTestEntrySection', 'diagnosisTestEntry', 'Solicitud de examen', list.length ?
  `<div class="MuiBox-root" style="display:flex;justify-content:flex-end"><button type="button" class="MuiButtonBase-root MuiButton-root MuiButton-contained" id="fixture-print-tests">imprimir selección (2-3 órdenes)</button></div>` +
  table(['Grupo de exámenes', 'Nro. Orden', 'Estado Orden', 'Fecha solicitud', 'Examen(es)', 'Observaciones', 'Estado', 'Acciones'], list.map(([group, number, order, date, names, notes, state], at) =>
    [caption(group), caption(number), stateSelect('select-test-status-' + at, order), caption(date), caption(names), caption(notes), caption(state), printActions()])) :
  message('No presenta solicitudes de exámenes registradas'));
const reactions = section('ramEntrySection', 'ramEntry', 'RAM', message('No presenta RAM registradas'));
const allergies = section('allergyEntrySection', 'allergyEntry', 'Alergias', message('No presenta alergias registradas'));
// React writes this sentence in three text nodes, around the name of the section. The script below splits it.
export const summarySurgeries = [
  ['Urgente', 'Ingresada', 'Diagnóstico de prueba de la simulación', 'Intervención ficticia del caso simulado', '10-04-2026', '10-04-2026'],
];
const surgery = list => section('operationTheaterRequestEntrySection', 'operationTheaterRequestEntry', 'Solicitudes de intervención quirúrgica', list.length ?
  table(['Tipo de solicitud', 'Estado', 'Diagnóstico', 'Intervención', 'Fecha solicitud', 'Fecha estimada', 'Acciones'], list.map(cells => [...cells.map(text => caption(text)), printActions()])) :
  `<p class="MuiTypography-root MuiTypography-body2" data-fixture-split>No se presentan |Solicitudes de intervención quirúrgica| registradas para este paciente</p>`);
// Balance Hídrico: a switch and a disabled print icon in its heading; four small fields and «Filtrar» in a row; a sentence below.
const select = (id, label, value, disabled = false) => `<div class="MuiBox-root"><div class="MuiFormControl-root MuiFormControl-fullWidth select">
  <label class="MuiFormLabel-root MuiInputLabel-root MuiInputLabel-shrink" id="${id}-label">${label}</label>
  <div class="MuiInputBase-root MuiOutlinedInput-root${disabled ? ' Mui-disabled' : ''}"><div class="MuiSelect-select MuiSelect-outlined MuiInputBase-input MuiOutlinedInput-input${disabled ? ' Mui-disabled' : ''}" role="combobox" ${disabled ? 'aria-disabled="true"' : 'tabindex="0"'} aria-expanded="false" aria-haspopup="listbox" aria-labelledby="${id}-label" id="mui-component-select-${id}">${value}</div>` +
  `<input aria-hidden="true" tabindex="-1" class="MuiSelect-nativeInput" value="1">${icon('ArrowDropDownIcon')}</div></div></div>`;
const when = (id, value, day) => `<div class="MuiBox-root"><div class="MuiFormControl-root MuiTextField-root"><div class="MuiInputBase-root MuiOutlinedInput-root">` +
  `<input class="MuiInputBase-input MuiOutlinedInput-input" id="${id}" type="text" placeholder="DD/MM/YYYY hh:mm" value="${value}">` +
  `<div class="MuiInputAdornment-root">${iconButton('CalendarIcon', '', 'Medium', ` aria-label="Choose date, selected date is ${day}"`)}</div></div></div></div>`;
const balance = section('inputOutputHydricBalanceEntrySection', 'inputOutputHydricBalanceEntry', 'Balance Hídrico',
  `<div class="MuiStack-root balance">${select('type', 'Tipo de Registro', 'Todos')}${select('item', 'Item', '<em>Seleccione un tipo</em>', true)}` +
  `${when('fixture-balance-from', '14/04/2026 08:00', '14 abr 2026')}${when('fixture-balance-to', '15/04/2026 08:00', '15 abr 2026')}` +
  `<div class="MuiBox-root"><button type="submit" class="MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary">Filtrar</button></div></div>` +
  message('No se presentan registros de balance hídrico para este paciente'), '',
  toggle('Balance Hídrico Indicado') + iconButton('LocalPrintshopRoundedIcon', 'Imprimir ingresos y egresos', 'Medium', ' disabled').replace('MuiButtonBase-root ', 'MuiButtonBase-root Mui-disabled '));
const adverse = section('adverseEventEntrySection', 'adverseEventEntry', 'Eventos Adversos', message('No tiene permiso para visualizar'));
const gyneco = section('obstetricGynecologicalExaminationEntrySection', 'obstetricGynecologicalExaminationEntry', 'Examen Gíneco Obstétrico', message('No tiene permiso para visualizar'));

const daily = `<div class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-12 daily"><p class="MuiTypography-root MuiTypography-body2">Última actualización: 15-04-2026, 09:12 - ${requester}</p>
  <div class="MuiStack-root"><form class="MuiStack-root" onsubmit="return false">${textField('Resumen diario paciente', 'fixture-daily', ' placeholder="dd/mm/aaaa" value="15/04/2026"',
    `<div class="MuiInputAdornment-root">${iconButton('CalendarIcon', '', 'Medium', ' aria-label="Elegir fecha"')}</div>`)}
    <button type="submit" class="MuiButtonBase-root MuiButton-root MuiButton-contained">Imprimir</button></form>
  <hr class="MuiDivider-root MuiDivider-vertical">${iconButton('LocalPrintshopRoundedIcon', 'Imprimir', 'Medium')}</div></div>`;
// «Imprimir indicaciones» is an icon button alone on its line, at the end.
const printOrders = `<div class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-12 print">${iconButton('LocalPrintshopRoundedIcon', 'Imprimir indicaciones', 'Medium', ' id="fixture-print"')}</div>`;
const grid = 'MuiGrid-root MuiGrid-container MuiGrid-spacing-xs-2';
const frame = ({alertList = summaryAlerts, diagnoses = summaryDiagnoses, careOrders = summaryCareOrders, procedureList = [], referralList = [], testList = [], surgeryList = [], ...shape} = {}) => `<div class="${grid} frame">${daily}
  ${item(`<div class="${grid}">${item(discharge)}${item(evolution)}</div>`, 'xs-6')}
  ${item(handoff, 'xs-12 md-6')}
  ${item(card('encounterFormEntry', 'Instrumentos de evaluación', message('No presentan instrumentos de evaluación registrados')))}
  ${item(section('physicalExaminationEntry', 'physicalExaminationEntry', 'Examen físico', message('No presenta exámenes físicos registrados')))}
  ${item(vitals)}${printOrders}
  ${item(`<div class="MuiGrid-root MuiGrid-container">${item(rest)}${item(diet)}</div>`, 'xs-6')}
  ${item(alerts(alertList), 'xs-12 md-6')}
  ${[medication(shape), noPharma, free, procedures(procedureList), diagnosis(diagnoses), referral(referralList), orders(careOrders), tests(testList), reactions, allergies, surgery(surgeryList), balance, adverse, gyneco]
    .map(content => item(content)).join('')}</div>`;

// The section links in the order Eloísa gives them, which is not the order of the page.
export const summaryLinks = ['Alertas', 'Diagnóstico', 'Solicitud de examen', 'Indicaciones (Indicación Libre)', 'Indicaciones (Medicamento)', 'Indicaciones (Régimen)',
  'Evolución', 'Solicitudes de intervención quirúrgica', 'Procedimientos', 'Órdenes de atención', 'Solicitud interconsulta', 'Signos vitales'];
const tabs = [['summary', 'Resumen'], ['antecedents', 'Antecedentes'], ['care-plan', 'Plan de tratamiento'], ['history', 'Historial'], ['discharge', 'Alta']];
// Stand-in for the floating Centro HHR bar, as in the other fictional summaries. It has no controls.
const floatingBar = `<div id="hhr-clinical-operations-bar" aria-hidden="true"><style>
  #hhr-clinical-operations-bar{position:fixed;top:58px;right:18px;z-index:2147483000;display:flex;align-items:center;gap:6px;box-sizing:border-box;width:350px;height:38px;
    padding:3px 8px;border:1px solid rgba(16,42,67,.14);border-radius:13px;background:rgba(255,255,255,.98);box-shadow:0 1px 2px rgba(16,42,67,.08),0 9px 24px rgba(16,42,67,.14)}
  #hhr-clinical-operations-bar i{flex:none;width:26px;height:24px;border-radius:8px;background:#e3efec}#hhr-clinical-operations-bar i:first-of-type{background:#2f8f84}
  #hhr-clinical-operations-bar b{flex:1;height:10px;border-radius:5px;background:#e3e9e7}
  @media(max-width:1280px){#hhr-clinical-operations-bar{width:250px}#hhr-clinical-operations-bar b{display:none}}
</style><i></i><i></i><i></i><i></i><i></i><b></b><i></i></div>`;

/** The page. `alertList` and `diagnoses` replace the default lists (an empty array is an empty card);
 *  `procedureList`, `referralList`, `testList` and `surgeryList` fill the sections that are empty by default. */
export const summaryPage = options => `<!doctype html><html lang="es"><meta charset="utf-8"><style>
  /* Inter is not installed where the captures run. Eloísa's own fallback, as next/font writes it, is Arial
     scaled to Inter's width; Liberation Sans and Arimo have Arial's metrics on Linux. Both platforms then draw
     the same widths, close to the page. */
  @font-face{font-family:"Inter Fallback";src:local("Arial"),local("ArialMT"),local("Liberation Sans"),local("LiberationSans"),local("Arimo");
    ascent-override:90.49%;descent-override:22.56%;line-gap-override:0%;size-adjust:107.06%}
  *{box-sizing:border-box}body{margin:0;background:#f1f1f1;color:rgba(0,0,0,.87);font:16px/1.5 Inter,"Inter Fallback",system-ui,sans-serif}
  .banner{position:sticky;top:0;z-index:30;background:#218b80;color:white;padding:15px 24px;font-size:16px;font-weight:600}.banner small{margin-left:18px;font-size:12px;font-weight:400}
  main{padding:64px 32px 16px}main>.MuiAppBar-root{position:fixed;top:54px;left:0;right:0;z-index:20;padding:0 24px;background:white}.MuiTabs-root [role=tablist]{display:flex}
  .MuiTab-root{min-height:48px;padding:12px 16px;border:0;background:none;font:500 14px/1.25 Inter,"Inter Fallback",system-ui,sans-serif;text-transform:uppercase;color:rgba(0,0,0,.6);cursor:pointer}
  .MuiTab-root[aria-selected=true]{color:#086b63;box-shadow:inset 0 -2px #086b63}
  main>.MuiStack-root{display:flex;flex-direction:column}
  .MuiGrid-container{display:flex;flex-wrap:wrap;width:100%}.MuiGrid-spacing-xs-2{width:calc(100% + 16px);margin-left:-16px;margin-top:-16px}
  .MuiGrid-spacing-xs-2>.MuiGrid-item{padding-left:16px;padding-top:16px}.MuiGrid-item{min-width:0}
  .MuiGrid-grid-xs-12{flex:0 0 100%;max-width:100%}.MuiGrid-grid-xs-6{flex:0 0 50%;max-width:50%}
  @media(min-width:900px){.MuiGrid-grid-md-6{flex:0 0 50%;max-width:50%}}
  .rail{flex-wrap:nowrap;align-items:center;gap:8px;padding:8px 0}.rail>.MuiGrid-item{flex:none}.MuiBadge-root{position:relative;display:inline-flex}
  .MuiTypography-root{font-family:Inter,"Inter Fallback",system-ui,sans-serif}.MuiTypography-caption{font-size:12px;line-height:1.66}.MuiTypography-body2{margin:0;font-size:14px;line-height:1.43}.MuiTypography-body1{margin:0;font-size:16px;line-height:1.5}
  .MuiTypography-h6{font-size:20px;font-weight:500;line-height:1.6}.MuiTypography-h5{margin:0;font-size:24px;font-weight:400;line-height:1.334}
  .MuiStack-root{display:flex;flex-direction:column}.MuiCard-root{border-radius:12px;background:white;box-shadow:none;height:100%}section.MuiBox-root{height:100%}
  .MuiCardHeader-root{display:flex;align-items:center;padding:16px 16px 0}.MuiCardHeader-content{flex:1 1 auto;min-width:0}.MuiCardHeader-title,.MuiCardHeader-subheader{display:block}
  .MuiCardHeader-subheader{color:rgba(0,0,0,.6)}.MuiCardHeader-action{flex:none;align-self:flex-start;margin:-4px -8px -4px 0}.MuiCardHeader-action>.MuiStack-root{flex-direction:row;align-items:center;gap:8px}
  .MuiCardContent-root{padding:16px}.MuiCardContent-root:last-child{padding-bottom:24px}
  .MuiSvgIcon-root{display:inline-block;flex:none;width:1em;height:1em;font-size:1.5rem;fill:currentColor}
  .MuiIconButton-root{display:inline-flex;flex:none;align-items:center;justify-content:center;padding:8px;border:0;border-radius:50%;background:none;color:rgba(0,0,0,.54);cursor:pointer}
  .MuiIconButton-sizeSmall{padding:5px}.MuiIconButton-root:disabled{color:rgba(0,0,0,.26);cursor:default}
  .MuiButton-root{display:inline-flex;align-items:center;justify-content:center;min-width:64px;padding:6px 16px;border:0;border-radius:4px;background:none;color:#218b80;
    font:500 14px/1.75 Inter,"Inter Fallback",system-ui,sans-serif;text-transform:uppercase;cursor:pointer}.MuiButton-contained{background:#218b80;color:white;box-shadow:0 3px 1px -2px rgba(0,0,0,.2)}
  .MuiButton-containedSecondary{background:#e64a19}.MuiButton-root:disabled{background:rgba(0,0,0,.12);color:rgba(0,0,0,.26);box-shadow:none}
  .MuiButton-text{background:none}.MuiButton-textSizeSmall{padding:4px 5px;font-size:13px}
  .MuiFormControlLabel-root{display:inline-flex;align-items:center;margin:0 16px 0 -11px;cursor:pointer}
  .MuiSwitch-root{position:relative;display:inline-flex;flex:none;width:58px;height:38px;padding:12px}.MuiSwitch-root>span:last-child{flex:1;border-radius:7px;background:#a7afac}
  .PrivateSwitchBase-root{position:absolute;top:0;left:0;z-index:1;padding:9px}.PrivateSwitchBase-root>span{display:block;width:20px;height:20px;border-radius:50%;background:white;box-shadow:0 1px 3px rgba(0,0,0,.4)}
  .PrivateSwitchBase-root:has(:checked){left:20px}.PrivateSwitchBase-root:has(:checked)>span{background:#247d71}
  .MuiSwitch-input{position:absolute;top:0;left:-100%;width:300%;height:100%;margin:0;opacity:0;cursor:pointer}
  .MuiTextField-root{position:relative;display:inline-flex;flex-direction:column;min-width:0}
  .MuiInputLabel-root{position:absolute;top:-7px;left:9px;z-index:1;max-width:calc(100% - 18px);overflow:hidden;padding:0 4px;background:white;color:rgba(0,0,0,.6);font-size:12px;line-height:1.2;white-space:nowrap;text-overflow:ellipsis}
  .MuiOutlinedInput-root{display:inline-flex;align-items:center;border:1px solid rgba(0,0,0,.23);border-radius:4px;background:white}
  .MuiOutlinedInput-input{width:100%;min-width:0;height:40px;padding:8.5px 14px;border:0;background:none;font:inherit}.MuiInputAdornment-root{display:flex;margin-right:4px}
  .MuiDivider-vertical{align-self:stretch;width:0;height:auto;margin:0;border:0;border-left:1px solid rgba(0,0,0,.12)}
  .MuiChip-root{display:inline-flex;align-items:center;height:32px;border-radius:16px;background:rgba(0,0,0,.08);font-size:13px}.MuiChip-sizeSmall{height:24px}.MuiChip-label{padding:0 12px}.MuiChip-sizeSmall .MuiChip-label{padding:0 8px}
  .daily{display:flex;align-items:center;justify-content:space-between;gap:8px}.daily>.MuiStack-root,.daily form{flex-direction:row;align-items:center;gap:8px}.daily .MuiInputLabel-root{background:#eff1f0}
  .daily .MuiOutlinedInput-input{padding-right:0}.daily .MuiTextField-root{width:180px}.print{display:flex;justify-content:flex-end}
  #estimatedDischarge section.MuiStack-root,#estimatedDischarge form{flex-direction:row;align-items:center;gap:16px}
  #evolution .MuiBox-root>.MuiTypography-caption{white-space:pre-line;font-size:14px}#evolution .MuiCardContent-root>.MuiStack-root>.MuiStack-root+.MuiStack-root>.MuiStack-root{flex-direction:row;justify-content:flex-end}
  #shiftChangeObservation form,#alertEntries form>.MuiStack-root{flex-direction:row;align-items:center;gap:8px}#shiftChangeObservation .MuiTextField-root,#alertEntries form .MuiBox-root{flex:1}#alertEntries .MuiTextField-root{width:100%}
  .vitals-grid{flex-flow:row wrap;gap:16px}.tile{width:170px;height:auto;background:#f5f5f5;box-shadow:none}.tile .MuiCardContent-root{padding:12px}.numeric{flex-direction:row;gap:4px}
  .alerts-list{max-height:250px;overflow-y:auto}.alert-row{flex-direction:row;justify-content:space-between;gap:16px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,.12)}
  .alert-row>.MuiStack-root:last-child{flex:none;align-items:flex-end}#alertEntries form{gap:8px;margin-top:16px}
  .care{gap:8px}.care>.MuiStack-root{flex-direction:row;align-items:center;gap:8px}
  .MuiTableContainer-root{overflow-x:auto}.MuiPaper-root:has(>.MuiTableContainer-root){box-shadow:none}table{width:100%;border-collapse:separate;border-spacing:0}
  .MuiTableCell-root{padding:16px;border-bottom:1px solid rgba(224,224,224,1);text-align:left;vertical-align:inherit;font-size:14px;line-height:1.43}
  .MuiTableCell-head{position:sticky;top:0;z-index:2;background:white;font-weight:500}
  td .MuiStack-root:has(>.MuiStack-root>.MuiIconButton-root){flex-direction:row;align-items:center}td .MuiStack-root>.MuiStack-root:has(>.MuiIconButton-root){flex-direction:row}
  td>.MuiStack-root:has(>.markers){flex-direction:row;align-items:center;gap:8px}.markers{flex-direction:row;gap:4px}
  :is(#diagnosisEntry,#procedureEntry,#diagnosisTestEntry) [role=combobox]{min-width:196px;padding:8.5px 32px 8.5px 14px;cursor:pointer}:is(#diagnosisEntry,#procedureEntry,#diagnosisTestEntry) .MuiOutlinedInput-root{position:relative}
  :is(#diagnosisEntry,#procedureEntry,#diagnosisTestEntry) .MuiOutlinedInput-root>input{position:absolute;bottom:0;left:0;width:100%;opacity:0;pointer-events:none}:is(#diagnosisEntry,#procedureEntry,#diagnosisTestEntry) .MuiOutlinedInput-root>svg{position:absolute;right:7px;pointer-events:none}
  .balance{flex-direction:row;align-items:center;gap:8px;margin-bottom:16px}.balance>.MuiBox-root{width:200px}.balance>.MuiBox-root:last-child{width:auto}
  .select{position:relative;display:flex}.select .MuiOutlinedInput-root{position:relative;width:100%}.select [role=combobox]{width:100%;height:40px;padding:8.5px 32px 8.5px 14px;font-size:16px;line-height:23px;cursor:pointer}
  .select .Mui-disabled{color:rgba(0,0,0,.38);cursor:default}.select .MuiOutlinedInput-root>input{position:absolute;bottom:0;left:0;width:100%;opacity:0;pointer-events:none}.select .MuiOutlinedInput-root>svg{position:absolute;right:7px;pointer-events:none}
  .balance .MuiTextField-root{width:100%}.balance .MuiOutlinedInput-root{width:100%}.balance .MuiButton-root{height:40px}
</style><header class="MuiPaper-root MuiAppBar-root banner" id="menu-app-bar-element">Ficha de hospitalizados <small>Resumen médico · Episodio ficticio</small></header>
<main class="MuiBox-root"><header class="MuiPaper-root MuiAppBar-root"><div class="MuiBox-root"><div class="MuiTabs-root"><div><div role="tablist" aria-label="Pestañas de prueba">${tabs.map(([id, label]) =>
  `<button type="button" class="MuiButtonBase-root MuiTab-root" role="tab" id="encounter-event-tab-${id}" aria-selected="${id === 'summary'}">${label}</button>`).join('')}</div></div></div></div></header>
<div class="MuiStack-root"><div class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-12"><div class="MuiGrid-root MuiGrid-container rail">${summaryLinks.map(label =>
  `<div class="MuiGrid-root MuiGrid-item"><span class="MuiBadge-root"><span class="MuiTypography-root MuiTypography-caption">${label}</span><span></span></span></div>`).join('')}</div></div>
${frame(options)}</div></main>${floatingBar}<script>
  // React builds a p > div tree for the name of a measurement. The parser alone would close the p.
  for (const label of document.querySelectorAll('[data-fixture-paragraph]')) {
    const paragraph = document.createElement('p');
    paragraph.className = label.className;
    paragraph.append(...label.childNodes);
    label.replaceWith(paragraph);
  }
  // Eloísa's own disclosure: the cut text and «Leer más», or the whole text and «Leer menos».
  for (const text of document.querySelectorAll('[data-fixture-full]')) {
    const button = text.nextElementSibling.querySelector('button'), full = text.dataset.fixtureFull, short = text.textContent;
    text.removeAttribute('data-fixture-full');
    button.addEventListener('click', () => {
      const open = button.textContent === 'Leer más';
      text.textContent = open ? full : short;
      button.textContent = open ? 'Leer menos' : 'Leer más';
      queueMicrotask(() => document.dispatchEvent(new Event('fixture-refresh')));
    });
  }
  const noteText = document.querySelector('#evolution .MuiBox-root > .MuiTypography-caption'), noteButton = noteText.nextElementSibling.querySelector('button'), fullNote = noteText.textContent;
  noteButton.addEventListener('click', () => {
    const open = noteButton.textContent === 'Leer más';
    noteText.textContent = open ? fullNote : fullNote.slice(0, 140).trimEnd() + '…';
    noteButton.textContent = open ? 'Leer menos' : 'Leer más';
    queueMicrotask(() => document.dispatchEvent(new Event('fixture-refresh')));
  });
  document.getElementById('fixture-print').addEventListener('click', event => { event.currentTarget.dataset.fixturePrint = 'clicked'; });
  for (const sentence of document.querySelectorAll('[data-fixture-split]')) {
    sentence.removeAttribute('data-fixture-split');
    sentence.replaceChildren(...sentence.textContent.split('|'));
  }
  // Eloísa focuses the empty alert field when the summary opens.
  document.getElementById('fixture-alert').focus();
</script></html>`;
