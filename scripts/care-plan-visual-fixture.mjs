// A fictional Plan de tratamiento with the structure of the real one (docs/estructura-eloisa.md):
// a switch and four scheduling cards. Each card has its header with a switch, a collapsible box
// with three icon tools named on their icons, and a table with a sticky header: «Indicación» with
// the page controls, then the hours of each day in boxes of 100 px, grouped by day. A scheduled hour holds an
// icon button without a name, in a box Eloísa paints salmon with an orange edge (read 27-11-2026). The card
// has a padding of its own of 16px 32px. Sizes follow what was measured: header padding 24px 16px with a
// 24 px title, cells with 16 px of padding and 16 px text, a table container of at most 600 px.
const paths = {
  AccessTimeRoundedIcon:'<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  TouchAppIcon:'<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11l5.2 1.1a2 2 0 0 1 1.5 2.4L17.5 20H11l-4.3-5.2a1.3 1.3 0 0 1 2-1.7z"/>',
  MoreVertIcon:'<circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>',
  CheckRoundedIcon:'<path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  TimerOffIcon:'<circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 2h6M4 4l16 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  CloseIcon:'<path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  ChevronLeftRoundedIcon:'<path d="m14.5 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  ChevronRightRoundedIcon:'<path d="m9.5 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
};
// Eloísa names a tool on its icon, never on the button.
const icon = (id, name = '') => `<svg class="MuiSvgIcon-root" data-testid="${id}" viewBox="0 0 24 24" focusable="false"${name ? ` aria-label="${name}"` : ' aria-hidden="true"'}>${paths[id]}</svg>`;
const iconButton = (id, name, size = 'Medium') => `<button type="button" class="MuiButtonBase-root MuiIconButton-root MuiIconButton-size${size}">${icon(id, name)}</button>`;
const toggle = label => `<label class="MuiFormControlLabel-root"><span class="MuiSwitch-root"><span class="MuiSwitch-switchBase PrivateSwitchBase-root"><input class="MuiSwitch-input" type="checkbox"><span class="MuiSwitch-thumb"></span></span><span class="MuiSwitch-track"></span></span><span class="MuiTypography-root MuiFormControlLabel-label">${label}</span></label>`;
const chip = label => `<div class="MuiChip-root MuiChip-sizeSmall"><span class="MuiChip-label">${label}</span></div>`;

// Seven hours per page, split by day as Eloísa does.
// Fourteen hours, as the compact view asks for when the window has room (or the owner chooses so).
export const planDays14 = [['Ayer (14/04/2026)', ['08:00 p. m.', '10:00 p. m.']], ['Hoy (15/04/2026)', ['12:00 a. m.', '02:00 a. m.', '04:00 a. m.', '06:00 a. m.', '08:00 a. m.', '10:00 a. m.', '12:00 p. m.', '02:00 p. m.', '04:00 p. m.', '06:00 p. m.', '08:00 p. m.']], ['Jue (16/04/2026)', ['12:00 a. m.']]];
export const planDays = [['Ayer (14/04/2026)', ['08:00 p. m.', '10:00 p. m.']], ['Hoy (15/04/2026)', ['12:00 a. m.', '02:00 a. m.', '04:00 a. m.', '06:00 a. m.', '08:00 a. m.']]];
const states = {done:'CheckRoundedIcon', due:'AccessTimeRoundedIcon', off:'TimerOffIcon'};
// A free indication repeats its name on its second line, in two boxes (read on the page 27-11-2026).
const repeated = ({name, slots}, select) => `<tr class="MuiTableRow-root">${select ? selector('td') : ''}
  <td class="MuiTableCell-root MuiTableCell-body"><div class="MuiBox-root"><p class="MuiTypography-root MuiTypography-body2">${name}</p></div><div class="MuiBox-root"><p class="MuiTypography-root MuiTypography-body2">${name}</p></div></td>
  <td class="MuiTableCell-root MuiTableCell-body"><div class="MuiBox-root slots">${slots.map(state =>
    `<div class="MuiStack-root">${state ? `<div class="MuiBox-root">${iconButton(states[state])}</div>` : ''}</div>`).join('')}</div></td></tr>`;
const row = (item, select) => item.repeat ? repeated(item, select) : rowWithPosology(item, select);
const rowWithPosology = ({name, posology, chips = [], slots}, select) => `<tr class="MuiTableRow-root">${select ? selector('td') : ''}
  <td class="MuiTableCell-root MuiTableCell-body"><div class="MuiStack-root"><div class="MuiStack-root"><p class="MuiTypography-root MuiTypography-body1">${name}</p>${chips.map(chip).join('')}</div>
    <div class="MuiBox-root"><p class="MuiTypography-root MuiTypography-body1">${posology}</p></div></div></td>
  <td class="MuiTableCell-root MuiTableCell-body"><div class="MuiBox-root slots">${slots.map(state =>
    `<div class="MuiStack-root">${state ? `<div class="MuiBox-root">${iconButton(states[state])}</div>` : ''}</div>`).join('')}</div></td></tr>`;
// In the ficha of Gestión de cuidados a table opens with a column that selects its rows (read 27-11-2026).
const selector = tag => `<${tag} class="MuiTableCell-root MuiTableCell-${tag === 'th' ? 'head MuiTableCell-stickyHeader' : 'body'} MuiTableCell-paddingCheckbox">` +
  `<span class="MuiButtonBase-root MuiCheckbox-root"><input class="PrivateSwitchBase-input" type="checkbox"><svg class="MuiSvgIcon-root" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg></span></${tag}>`;
const emptyRow = `<tr class="MuiTableRow-root"><td class="MuiTableCell-root MuiTableCell-body" colspan="3"><p class="MuiTypography-root MuiTypography-body1">No se registra un plan de tratamiento.</p></td></tr>`;

export const planCards = [
  {title:'Programación de procedimientos', filter:'Mostrar realizados, no realizados, archivados y suspendidos', rows:[
    {name:'Curación simple de prueba', posology:'Cada 24 horas', slots:['', '', '', '', '', '', 'due']},
    {name:'Control de glicemia capilar de prueba', posology:'Cada 6 horas', slots:['done', '', 'done', '', '', 'off', '']},
  ]},
  {title:'Programación de indicaciones libres', filter:'Mostrar Suspendidos', rows:[
    {name:'Levantar al sillón con ayuda', posology:'Dos veces al día', slots:['', '', '', '', '', '', 'due']},
    {name:'Ronda de seguridad de prueba', repeat:true, slots:['', 'done', '', '', 'done', '', '']},
    {name:'Registrar tolerancia a la alimentación', posology:'En cada comida', chips:['Externo'], slots:['done', '', '', '', '', '', 'due']},
  ]},
  {title:'Programación de medicamentos', filter:'Mostrar Suspendidos', rows:[
    {name:'Preparación de prueba A 500 mg comprimido', posology:'1 comprimido cada 8 horas - oral', slots:['', 'done', '', '', '', 'done', '']},
    {name:'Preparación de prueba B 40 mg solución inyectable', posology:'1 ampolla cada 24 horas - subcutánea', slots:['done', '', '', '', '', '', '']},
    {name:'Preparación de prueba C 1 g polvo', posology:'1 g cada 12 horas - endovenosa', chips:['SOS'], slots:['', '', 'off', '', '', '', 'due']},
    {name:'Preparación de prueba D 20 mg cápsula', posology:'1 cápsula cada 24 horas - oral', slots:['', '', '', '', '', '', 'due']},
    {name:'Preparación de prueba E 5 mg comprimido', posology:'1 comprimido cada 12 horas - oral', chips:['SOS', 'Externo'], slots:['done', '', '', '', '', '', 'due']},
  ]},
  {title:'Programación de cuidados', filter:'Mostrar Finalizados', rows:[]},
];

// The ficha of Gestión de cuidados: the same cards, all but Programación de procedimientos with their column of checkboxes.
export const careFichaPlanCards = planCards.map((item, at) => ({...item, select:at > 0}));
// The same ficha with a medication chosen: its card opens the bar of plannings.
export const careFichaChosenCards = careFichaPlanCards.map(item => ({...item, chosen:/medicamentos/.test(item.title)}));

// The window «Planificación estandar» as Eloísa draws it (read on the page 27-11-2026), to be added to a page.
const field = (id, name, value) => `<div class="MuiBox-root"><div class="MuiFormControl-root MuiFormControl-fullWidth"><label id="${id}-label" class="MuiFormLabel-root MuiInputLabel-root MuiInputLabel-formControl MuiInputLabel-shrink">${name}</label>
  <div class="MuiInputBase-root MuiOutlinedInput-root"><div id="mui-component-select-${id}" role="combobox" tabindex="0" aria-labelledby="${id}-label" class="MuiSelect-select MuiSelect-outlined MuiInputBase-input">${value}</div>
  <input aria-hidden="true" tabindex="-1" class="MuiSelect-nativeInput" value=""><fieldset aria-hidden="true" class="MuiOutlinedInput-notchedOutline"><legend><span>${name}</span></legend></fieldset></div></div></div>`;
export const planDialog = `<div class="MuiDialog-root" role="presentation"><div class="MuiPaper-root MuiDialog-paper" role="dialog" aria-labelledby="dialog-title">
  <h2 id="dialog-title" class="MuiTypography-root MuiTypography-h6 MuiDialogTitle-root">Planificación estandar</h2>
  <button type="button" class="MuiButtonBase-root MuiIconButton-root MuiIconButton-sizeMedium" aria-label="close">${icon('CloseIcon')}</button>
  <div class="MuiDialogContent-root MuiDialogContent-dividers"><form class="MuiStack-root" onsubmit="return false">
    ${field('periodicity', 'Periodicidad', 'Seleccione una opción')}${field('rule', 'Regla de administración', 'Seleccione una opción')}${field('start', 'Hora de inicio', 'Seleccione una opción')}
    <div class="MuiBox-root"><button type="submit" class="MuiButtonBase-root MuiButton-root MuiButton-contained Mui-disabled" disabled>LISTO</button></div>
  </form></div></div></div>`;

// In Gestión de cuidados a chosen row opens a bar: how many are chosen, «Cancelar» and the tools, named on the
// button, on a salmon band of 72 px (read on the page 27-11-2026).
const named = (id, name) => `<button type="button" class="MuiButtonBase-root MuiIconButton-root MuiIconButton-sizeMedium"${name ? ` aria-label="${name}"` : ''}>${icon(id)}</button>`;
const selectionBar = `<div class="MuiStack-root selection"><div class="MuiStack-root"><h6 class="MuiTypography-root MuiTypography-subtitle1">1 item(s) seleccionado(s)</h6>
    <button type="button" class="MuiButtonBase-root MuiButton-root MuiButton-text">Cancelar</button></div>
  <div class="MuiStack-root">${named('AccessTimeRoundedIcon', 'Planificación estandar')}${named('TouchAppIcon', 'Planificación única')}${named('MoreVertIcon')}</div></div>`;
const card = ({title, filter, rows, select = false, chosen = false, days = null}) => `<div class="MuiPaper-root MuiCard-root">
  <div class="MuiCardHeader-root"><div class="MuiCardHeader-content"><span class="MuiTypography-root MuiTypography-h5 MuiCardHeader-title">${title}</span></div>
    <div class="MuiCardHeader-action">${toggle(filter)}</div></div>
  <div class="MuiBox-root"><div class="MuiCollapse-root MuiCollapse-entered"><div class="MuiCollapse-wrapper"><div class="MuiCollapse-wrapperInner">${chosen ? selectionBar : `<div class="MuiStack-root tools">
    ${iconButton('AccessTimeRoundedIcon', 'Planificación estandar')}${iconButton('TouchAppIcon', 'Planificación única')}${iconButton('MoreVertIcon')}</div>`}</div></div></div></div>
  <div class="MuiCardContent-root"><div class="MuiTableContainer-root"><table class="MuiTable-root MuiTable-stickyHeader">
    <thead class="MuiTableHead-root"><tr class="MuiTableRow-root MuiTableRow-head">${select ? selector('th') : ''}
      <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-stickyHeader"><p class="MuiTypography-root MuiTypography-body1">Indicación</p>
        <div class="MuiStack-root pages"><button type="button" class="MuiButtonBase-root MuiButton-root MuiButton-text">Ir a Hoy</button>
          ${iconButton('ChevronLeftRoundedIcon', '', 'Small')}<p class="MuiTypography-root MuiTypography-body1">3 / 5</p>${iconButton('ChevronRightRoundedIcon', '', 'Small')}</div></th>
      <th class="MuiTableCell-root MuiTableCell-head MuiTableCell-stickyHeader" style="width:1000px"><div class="MuiStack-root days">${(days || planDays).map(([day, hours]) =>
        `<div class="MuiBox-root day"><div class="MuiBox-root"><span class="MuiTypography-root MuiTypography-caption">${day}</span></div><div class="MuiStack-root hours">${hours.map(hour =>
          `<div class="MuiBox-root"><span class="MuiTypography-root MuiTypography-caption">${hour}</span></div>`).join('')}</div></div>`).join('')}</div></th></tr></thead>
    <tbody class="MuiTableBody-root">${rows.length ? rows.map(item => row(item, select)).join('') : emptyRow}</tbody>
    <tfoot class="MuiTableFooter-root"><tr class="MuiTableRow-root"><td class="MuiTableCell-root"></td><td class="MuiTableCell-root"></td><td class="MuiTableCell-root"></td></tr></tfoot>
  </table></div></div></div>`;

const tabs = [['summary','Resumen'],['antecedents','Antecedentes'],['care-plan','Plan de tratamiento'],['history','Historial'],['discharge','Alta']];
export const carePlanPage = (cards = planCards, days = null) => `<!doctype html><html lang="es"><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;background:#eff1f0;color:#263432;font:16px/1.5 Arial,sans-serif}
  .banner{background:#218b80;color:white;padding:15px 24px;font-size:16px;font-weight:600}.banner small{margin-left:18px;font-size:12px;font-weight:400}
  .MuiAppBar-root{position:sticky;top:0;z-index:20;background:white}
  .MuiTabs-root [role=tablist]{display:flex;gap:8px;align-items:center}.MuiTabs-root button{background:none;border:0;font:inherit;font-size:13px;padding:10px 12px;cursor:pointer}
  main{padding:16px 24px}.MuiStack-root{display:flex;flex-direction:column}.plan>*+*{margin-top:16px}
  .MuiFormControlLabel-root{display:inline-flex;align-items:center;margin:0 16px 0 -11px;cursor:pointer}
  .MuiSwitch-root{position:relative;display:inline-flex;flex:none;width:58px;height:38px;padding:12px}.MuiSwitch-track{flex:1;border-radius:7px;background:#a7afac}
  .MuiSwitch-switchBase{position:absolute;top:0;left:0;padding:9px}.MuiSwitch-thumb{display:block;width:20px;height:20px;border-radius:50%;background:white;box-shadow:0 1px 3px rgba(0,0,0,.4)}
  .MuiSwitch-input{position:absolute;top:0;left:-100%;width:300%;height:100%;margin:0;opacity:0;cursor:pointer}
  .MuiSwitch-switchBase:has(:checked){transform:translateX(20px)}.MuiSwitch-switchBase:has(:checked) .MuiSwitch-thumb{background:#247d71}
  .MuiCard-root{overflow:hidden;padding:16px 32px;border-radius:8px;background:white;box-shadow:0 1px 3px rgba(0,0,0,.12)}
  .MuiCardHeader-root{display:flex;align-items:center;padding:24px 16px}.MuiCardHeader-content{flex:1 1 auto;min-width:0}
  .MuiCardHeader-title{display:block;font-size:24px;line-height:1.334}.MuiCardHeader-action{flex:none;align-self:flex-start;margin:-4px -8px -4px 0}
  .tools{flex-direction:row;justify-content:flex-end;gap:8px;padding:0 16px 8px}
  .MuiIconButton-root{display:inline-flex;flex:none;align-items:center;justify-content:center;width:40px;height:40px;padding:8px;border:0;border-radius:50%;background:none;color:rgba(0,0,0,.54);cursor:pointer}
  .MuiIconButton-sizeSmall{width:34px;height:34px;padding:5px}.MuiIconButton-root svg{width:24px;height:24px;fill:currentColor}
  .MuiCardContent-root{padding:16px}.MuiCardContent-root:last-child{padding-bottom:24px}.MuiTableContainer-root{max-height:600px;overflow:auto}
  table{width:100%;border-collapse:separate;border-spacing:0}th,td{padding:16px;border-bottom:1px solid #e0e0e0;text-align:left;vertical-align:middle;font-size:14px;line-height:1.5}
  .MuiTableCell-paddingCheckbox{width:48px;padding:0 0 0 4px}.MuiCheckbox-root{position:relative;display:inline-flex;padding:9px;border-radius:50%}
  .MuiCheckbox-root input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}.MuiCheckbox-root svg{width:24px;height:24px;fill:rgba(0,0,0,.6)}
  th{position:sticky;top:0;z-index:2;background:white;font-weight:500}th p,td p{margin:0;font-size:16px}
  .pages{flex-direction:row;align-items:center;gap:8px}.MuiButton-text{min-width:64px;padding:6px 8px;border:0;border-radius:4px;background:none;color:#218b80;font:500 14px/1.75 Arial,sans-serif;text-transform:uppercase;white-space:nowrap;cursor:pointer}
  .days{flex-direction:row}.days .MuiTypography-caption{display:block;font-size:12px;line-height:1.66;text-align:center}.hours{flex-direction:row}.hours>.MuiBox-root{flex:none;width:100px;text-align:center}
  td>.MuiStack-root{gap:4px}td>.MuiStack-root>.MuiStack-root{flex-flow:row wrap;align-items:center;gap:8px}
  .MuiChip-root{display:inline-flex;align-items:center;height:24px;border-radius:16px;background:#e4e9e7;color:#344841;font-size:13px}.MuiChip-label{padding:0 8px}
  .selection{flex-direction:row;justify-content:space-between;align-items:center;margin-top:8px;padding:16px;border-radius:8px;background:rgb(241,216,208)}
  .selection>.MuiStack-root{flex-direction:row;align-items:center;gap:16px}.selection h6{margin:0;color:rgb(230,74,25);font-size:16px;font-weight:400}
  .selection .MuiButton-text{text-transform:uppercase;font-size:13px}
  .MuiDialog-root{position:fixed;inset:0;z-index:1300;background:rgba(0,0,0,.5)}.MuiSelect-nativeInput{position:absolute;bottom:0;left:0;width:100%;opacity:0;pointer-events:none}
  .MuiDialog-paper{position:fixed;top:120px;left:50%;transform:translateX(-50%);width:600px;border-radius:12px;background:white;box-shadow:0 11px 15px rgba(0,0,0,.2);overflow:hidden}
  .MuiDialogTitle-root{margin:0;padding:16px 120px 16px 16px;background:rgb(21,149,136);color:white;font-size:20px;font-weight:500}
  .MuiDialog-paper>.MuiIconButton-root{position:absolute;top:8px;right:8px;color:white}
  .MuiDialogContent-root{padding:16px 24px;border-top:1px solid rgba(0,0,0,.12);border-bottom:1px solid rgba(0,0,0,.12)}
  .MuiDialog-paper form{display:flex;flex-direction:column;gap:16px}.MuiDialog-paper .MuiFormControl-root{position:relative;display:flex;flex-direction:column}
  .MuiDialog-paper .MuiInputLabel-root{position:absolute;left:0;top:0;transform:translate(14px,-9px) scale(.75);transform-origin:top left;color:rgba(0,0,0,.6);font-size:16px}
  .MuiDialog-paper .MuiInputBase-root{position:relative;display:flex;align-items:center;height:40px;font-size:16px}
  .MuiDialog-paper .MuiSelect-select{flex:1;padding:8.5px 32px 8.5px 14px;font-style:italic}.MuiDialog-paper .MuiOutlinedInput-notchedOutline{position:absolute;inset:-5px 0 0;margin:0;padding:0 8px;border:1px solid rgba(0,0,0,.23);border-radius:4px;pointer-events:none}
  .MuiDialog-paper legend{height:11px;padding:0;font-size:.75em;visibility:hidden}.MuiDialog-paper .MuiButton-contained{height:42px;padding:6px 16px;border:0;border-radius:6px;background:rgba(0,0,0,.12);color:rgba(0,0,0,.26);font-size:15px;text-transform:uppercase}
  .slots{display:flex}.slots>.MuiStack-root{flex:none;align-items:center;justify-content:center;width:100px;min-height:49px}
  .slots>.MuiStack-root>.MuiBox-root{display:flex;align-items:center;justify-content:center;width:100px;height:49px;background:rgb(241,216,208);border-right:1px solid rgb(230,74,25)}
</style><header class="banner">Ficha de hospitalizados <small>Plan de tratamiento · Episodio ficticio</small></header>
<div class="MuiAppBar-root"><div class="MuiTabs-root"><div class="MuiTabs-scroller"><div role="tablist">${tabs.map(([id,label]) =>
  `<button role="tab" id="encounter-event-tab-${id}" aria-selected="${id === 'care-plan'}">${label}</button>`).join('')}</div></div></div></div>
<main class="MuiBox-root"><div class="MuiStack-root"><div class="MuiStack-root plan"><div class="MuiBox-root">${toggle('Mostrar todos los ocultos')}</div>
${cards.map(item => card({...item, days, rows:days ? item.rows.map(row => ({...row, slots:[...row.slots, ...row.slots]})) : item.rows})).join('')}</div></div></main></html>`;
