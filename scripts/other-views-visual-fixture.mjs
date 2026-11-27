// Fictional Alta and Ejecución de cuidados with the structure read on the page (docs/estructura-eloisa.md,
// 27-11-2026). Alta: a title, a Paper with the steps of the discharge and a Paper with the form of the step
// (two selects, a switch) and «Continuar». Ejecución de cuidados: a Paper of filters («Ejecución SOS», two
// dates, four selects, «Buscar», «Reiniciar») and, beside it, a card per hour under the day, each with a
// table that opens with a column of checkboxes. Sizes follow what was measured: 20 px title, corners of
// 12 px, 16 px text, 14 px cells, 38 px switch, contained buttons in capitals.
const checkbox = tag => `<${tag} class="MuiTableCell-root MuiTableCell-paddingCheckbox"><span class="MuiButtonBase-root MuiCheckbox-root">` +
  `<input class="PrivateSwitchBase-input" type="checkbox"><svg class="MuiSvgIcon-root" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg></span></${tag}>`;
const select = (id, label, value = '') => `<div class="MuiFormControl-root MuiFormControl-fullWidth"><label class="MuiFormLabel-root MuiInputLabel-root MuiInputLabel-outlined${value ? ' MuiInputLabel-shrink' : ''}" id="${id}-label">${label}</label>` +
  `<div class="MuiInputBase-root MuiOutlinedInput-root"><div class="MuiSelect-select MuiSelect-outlined MuiInputBase-input MuiOutlinedInput-input" role="combobox" tabindex="0" aria-labelledby="${id}-label">${value || '<span>&#8203;</span>'}</div>` +
  `<input class="MuiSelect-nativeInput" tabindex="-1" aria-hidden="true" value="${value}"><svg class="MuiSvgIcon-root MuiSelect-icon" viewBox="0 0 24 24"><path d="m7 10 5 5 5-5z"/></svg>` +
  `<fieldset class="MuiOutlinedInput-notchedOutline"><legend><span>${label}</span></legend></fieldset></div></div>`;
const date = (id, label, value) => `<div class="MuiFormControl-root MuiTextField-root"><label class="MuiFormLabel-root MuiInputLabel-root MuiInputLabel-outlined MuiInputLabel-shrink" for="${id}">${label}</label>` +
  `<div class="MuiInputBase-root MuiOutlinedInput-root"><input id="${id}" class="MuiInputBase-input MuiOutlinedInput-input" value="${value}">` +
  `<div class="MuiInputAdornment-root"><button type="button" class="MuiButtonBase-root MuiIconButton-root" aria-label="Elegir fecha"><svg class="MuiSvgIcon-root" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2m0 16H5V9h14z"/></svg></button></div>` +
  `<fieldset class="MuiOutlinedInput-notchedOutline"><legend><span>${label}</span></legend></fieldset></div></div>`;
const toggle = label => `<label class="MuiFormControlLabel-root"><span class="MuiSwitch-root"><span class="MuiSwitch-switchBase PrivateSwitchBase-root"><input class="MuiSwitch-input" type="checkbox">` +
  `<span class="MuiSwitch-thumb"></span></span><span class="MuiSwitch-track"></span></span><span class="MuiTypography-root MuiFormControlLabel-label">${label}</span></label>`;
const button = (label, kind = 'contained', disabled = false) => `<button type="button" class="MuiButtonBase-root MuiButton-root MuiButton-${kind}${disabled ? ' Mui-disabled' : ''}"${disabled ? ' disabled' : ''}>${label}</button>`;

const discharge = `<div class="MuiStack-root"><div class="MuiBox-root"><h6 class="MuiTypography-root MuiTypography-h6">Alta</h6>
  <div class="MuiBox-root"><form class="MuiPaper-root MuiCard-root steps"><div class="MuiStepper-root">${['Destino', 'Tratamiento', 'Próximo control'].map((step, at) =>
    `<div class="MuiStep-root"><span class="MuiStepLabel-root"><span class="MuiStepLabel-iconContainer"><svg class="MuiSvgIcon-root MuiStepIcon-root${at ? '' : ' Mui-active'}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="12">${at + 1}</text></svg></span>` +
    `<span class="MuiStepLabel-labelContainer"><span class="MuiStepLabel-label${at ? '' : ' Mui-active'}">${step}</span></span></span></div>${at < 2 ? '<div class="MuiStepConnector-root"><span></span></div>' : ''}`).join('')}</div></form>
  <div class="MuiPaper-root MuiCard-root step"><form class="MuiBox-root"><div class="MuiGrid-root MuiGrid-container">
    <div class="MuiGrid-root MuiGrid-item half">${select('reason', 'Motivo de alta *')}</div><div class="MuiGrid-root MuiGrid-item half">${select('destination', 'Destino *')}</div>
    <div class="MuiGrid-root MuiGrid-item whole"><div class="MuiGrid-root MuiGrid-container"><label class="MuiFormLabel-root">Traslado en ambulancia*</label>${toggle('Traslado en ambulancia*')}</div></div></div>
    <div class="MuiBox-root actions">${button('Continuar', 'contained', true)}</div></form></div></div></div></div>`;

const hours = [['01:00', 1], ['05:00', 2], ['08:00', 2]];
const execution = `<div class="MuiStack-root"><div class="MuiGrid-root MuiGrid-container execution">
  <div class="MuiGrid-root MuiGrid-item filters"><div class="MuiPaper-root"><div class="MuiPaper-root"><form class="MuiStack-root">
    <h6 class="MuiTypography-root MuiTypography-h6">Filtros</h6>${button('Ejecución SOS')}<p class="MuiTypography-root">Rango de fechas</p>
    ${date('sent', 'Fecha de envío', '27/11/2026 00:00')}${date('end', 'Fecha de término', '27/11/2026 23:59')}<p class="MuiTypography-root">Datos</p>
    ${select('station', 'Estación de enfermería', 'Todas')}${select('department', 'Departamento', 'Todos')}${select('entry', 'Tipo de entrada', 'Todos')}${select('state', 'Estado', 'Pendiente')}
    ${button('Buscar')}${button('Reiniciar', 'text')}</form></div></div></div>
  <div class="MuiGrid-root MuiGrid-item list"><div class="MuiStack-root">${hours.map(([hour, rows], at) => `<div class="MuiBox-root">${at ? '' : '<p class="MuiTypography-root">Hoy, 27 de noviembre</p>'}
    <div class="MuiPaper-root MuiCard-root"><div class="MuiStack-root head"><p class="MuiTypography-root">${hour}</p><button type="button" class="MuiButtonBase-root MuiIconButton-root" aria-label="Imprimir">` +
    `<svg class="MuiSvgIcon-root" data-testid="PrintRoundedIcon" viewBox="0 0 24 24"><path d="M19 8H5a3 3 0 0 0-3 3v4a2 2 0 0 0 2 2h2v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2h2a2 2 0 0 0 2-2v-4a3 3 0 0 0-3-3m-4 11H9a1 1 0 0 1-1-1v-4h8v4a1 1 0 0 1-1 1M17 3H7v3h10z"/></svg></button></div>
    <div class="MuiCardContent-root"><table class="MuiTable-root"><thead><tr>${checkbox('th')}${['Ubicación', 'Paciente', 'Indicación', 'Observación en', 'Indicación específica', 'Dosis Aplic.', 'Comentarios'].map(label =>
      `<th class="MuiTableCell-root MuiTableCell-head">${label}</th>`).join('')}</tr></thead>
    <tbody>${Array.from({length:rows}, (_, row) => `<tr>${checkbox('td')}<td class="MuiTableCell-root"><div class="MuiStack-root"><span class="MuiTypography-root">Sala ficticia</span><span class="MuiTypography-root">Cama ${row + 1}</span></div></td>` +
      `<td class="MuiTableCell-root"><span class="MuiTypography-root">Paciente de prueba</span></td><td class="MuiTableCell-root"><span class="MuiTypography-root">Control de signos vitales de prueba</span></td>` +
      `<td class="MuiTableCell-root"><span class="MuiTypography-root">${hour}</span></td><td class="MuiTableCell-root"><span class="MuiTypography-root">Registrar en la hoja</span></td>` +
      `<td class="MuiTableCell-root"><span class="MuiTypography-root">1</span></td><td class="MuiTableCell-root"><div class="MuiFormControl-root MuiTextField-root"><label class="MuiFormLabel-root MuiInputLabel-root MuiInputLabel-outlined" for="c${at}${row}">Comentario</label>` +
      `<div class="MuiInputBase-root MuiOutlinedInput-root"><input id="c${at}${row}" class="MuiInputBase-input MuiOutlinedInput-input"><fieldset class="MuiOutlinedInput-notchedOutline"><legend><span>Comentario</span></legend></fieldset></div></div></td></tr>`).join('')}</tbody></table></div></div></div>`).join('')}
  </div></div></div></div>`;

const tabsOf = {discharge:[['summary','Resumen'],['antecedents','Antecedentes'],['care-plan','Plan de tratamiento'],['history','Historial'],['discharge','Alta']],
  'care-plan-execute':[['summary','Resumen'],['care-plan','Plan de tratamiento'],['care-plan-execute','Ejecución de cuidados'],['history','Historial']]};

/** The page of one view: `discharge` (ficha médica) or `care-plan-execute` (ficha de Gestión de cuidados). */
export const otherViewPage = view => `<!doctype html><html lang="es"><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;background:#eff1f0;color:rgba(0,0,0,.87);font:16px/1.5 Arial,sans-serif}
  .banner{background:#218b80;color:white;padding:15px 24px;font-size:16px;font-weight:600}
  .MuiAppBar-root{position:sticky;top:0;z-index:20;background:white}
  .MuiTabs-root [role=tablist]{display:flex;gap:8px;align-items:center}.MuiTabs-root button{background:none;border:0;font:inherit;font-size:13px;padding:10px 12px;cursor:pointer}
  main{padding:16px 44px}.MuiStack-root{display:flex;flex-direction:column}
  h6{margin:0 0 16px;font-size:20px;font-weight:500;line-height:1.6}
  .MuiPaper-root.MuiCard-root,.filters>.MuiPaper-root{border-radius:12px;background:white}
  .steps{padding:16px;margin-bottom:16px}.MuiStepper-root{display:flex;align-items:center}.MuiStep-root{padding:0 8px}.MuiStepLabel-root{display:flex;align-items:center;gap:8px;font-size:14px}
  .MuiStepIcon-root{width:24px;height:24px;fill:#9e9e9e}.MuiStepIcon-root.Mui-active{fill:#218b80}.MuiStepLabel-label.Mui-active{font-weight:500}.MuiStepConnector-root{flex:1;border-top:1px solid #bdbdbd}
  .step{padding:64px 32px}.MuiGrid-container{display:flex;flex-wrap:wrap}.half{width:50%;padding:24px 0 0 16px}.whole{width:100%;padding:24px 0 0 16px}.whole>.MuiGrid-container{align-items:center;gap:16px}
  .MuiFormControl-root{position:relative;display:inline-flex;flex-direction:column;width:100%}
  .MuiInputLabel-root{position:absolute;left:0;top:0;transform:translate(14px,16px);color:rgba(0,0,0,.6);font-size:16px;line-height:1.4375em;pointer-events:none;transform-origin:top left}
  .MuiInputLabel-shrink{transform:translate(14px,-9px) scale(.75)}
  .MuiOutlinedInput-root{position:relative;display:flex;align-items:center;border-radius:4px}.MuiOutlinedInput-input,.MuiSelect-select{flex:1;min-height:1.4375em;padding:16.5px 14px;border:0;font:inherit;background:none}
  .MuiSelect-nativeInput{position:absolute;bottom:0;left:0;width:100%;opacity:0;pointer-events:none}.MuiSelect-icon{position:absolute;right:7px;width:24px;height:24px;fill:rgba(0,0,0,.54)}
  .MuiOutlinedInput-notchedOutline{position:absolute;inset:-5px 0 0;margin:0;padding:0 8px;border:1px solid rgba(0,0,0,.23);border-radius:inherit;pointer-events:none}
  .MuiOutlinedInput-notchedOutline legend{visibility:hidden;max-width:.01px;height:11px;padding:0;font-size:.75em;white-space:nowrap}.MuiOutlinedInput-notchedOutline legend>span{padding:0 5px}
  .MuiInputLabel-shrink+.MuiOutlinedInput-root legend{max-width:100%}.MuiFormLabel-root:not(.MuiInputLabel-root){font-size:16px;color:rgba(0,0,0,.6)}
  .MuiInputAdornment-root{margin-right:8px}.MuiIconButton-root{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;padding:8px;border:0;border-radius:50%;background:none;color:rgba(0,0,0,.54)}
  .MuiIconButton-root svg,.MuiCheckbox-root svg{width:24px;height:24px;fill:currentColor}
  .MuiFormControlLabel-root{display:inline-flex;align-items:center;margin-left:-11px}.MuiFormControlLabel-label{font-size:16px}
  .MuiSwitch-root{position:relative;display:inline-flex;width:58px;height:38px;padding:12px}.MuiSwitch-track{flex:1;border-radius:7px;background:#a7afac}
  .MuiSwitch-switchBase{position:absolute;top:0;left:0;padding:9px}.MuiSwitch-thumb{display:block;width:20px;height:20px;border-radius:50%;background:white;box-shadow:0 1px 3px rgba(0,0,0,.4)}
  .MuiSwitch-input{position:absolute;top:0;left:-100%;width:300%;height:100%;margin:0;opacity:0}
  .MuiButton-root{min-width:64px;padding:6px 16px;border:0;border-radius:6px;font:500 14px/1.75 Arial,sans-serif;text-transform:uppercase;cursor:pointer}
  .MuiButton-contained{background:#e8743b;color:white;box-shadow:0 3px 1px -2px rgba(0,0,0,.2)}.MuiButton-contained.Mui-disabled{background:rgba(0,0,0,.12);color:rgba(0,0,0,.26);box-shadow:none}
  .MuiButton-text{background:none;color:#218b80}.actions{display:flex;justify-content:flex-end;margin-top:24px}
  .execution{gap:16px;flex-wrap:nowrap}.filters{flex:0 0 283px}.list{flex:1;min-width:0}.filters form{gap:16px;padding:16px}.filters p{margin:0}
  .list>.MuiStack-root{gap:16px}.list p{margin:0 0 8px}.head{flex-direction:row;align-items:center;justify-content:space-between;padding:8px 16px}.head p{margin:0;color:rgb(128,128,128);font-size:14px}
  table{width:100%;border-collapse:collapse}th,td{padding:16px 0 16px 4px;border-bottom:1px solid #e0e0e0;font-size:14px;text-align:left}th{font-weight:500}
  .MuiTableCell-paddingCheckbox{width:46px}.MuiCheckbox-root{position:relative;display:inline-flex;padding:9px;color:rgba(0,0,0,.6)}.MuiCheckbox-root input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0}
  td .MuiTextField-root{min-width:160px}
</style><header class="banner">Ficha de hospitalizados</header>
<div class="MuiAppBar-root"><div class="MuiTabs-root"><div class="MuiTabs-scroller"><div role="tablist">${tabsOf[view].map(([id, label]) =>
  `<button role="tab" id="encounter-event-tab-${id}" aria-selected="${id === view}">${label}</button>`).join('')}</div></div></div></div>
<main class="MuiBox-root">${view === 'discharge' ? discharge : execution}</main></html>`;
