// A fictional Historial with the structure of the real one (docs/estructura-eloisa.md): a
// stack of MUI Boxes, most of them with a single event Card. The first box of a day opens with
// a date Chip in its own Stack. Each card has an avatar letter, the role and the name in its
// header, the time as «hh:mm hrs» in the header action, and the category either as the first
// paragraph of the content or as the first paragraph of its only stack.
const chip = label => `<div class="MuiChip-root"><span class="MuiChip-label">${label}</span></div>`;
const pair = ([label, value]) => `<span class="MuiTypography-root"><span class="MuiTypography-root">${label}</span><span class="MuiTypography-root">${value}</span></span>`;
const bodies = {
  // Category first, then a stack with one row of text and its chips.
  note:({body, isNew}) => `<div class="MuiStack-root"><div class="MuiStack-root"><p class="MuiTypography-root">${body}</p>${isNew ? chip('Nuevo') : ''}${chip('Médica')}</div><p class="MuiTypography-root"></p></div>`,
  // One row per administered drug, each with its labelled details.
  administration:({rows}) => `<div class="MuiStack-root">${rows.map(([drug, ...details]) =>
    `<div class="MuiStack-root"><p class="MuiTypography-root">${drug}</p>${details.map(pair).join('')}</div>`).join('')}</div>`,
  text:({body, isNew}) => `<div class="MuiStack-root"><div class="MuiStack-root"><p class="MuiTypography-root">${body}</p>${isNew ? chip('Nuevo') : ''}</div></div>`,
};
const event = ({time, name, role, category, shape = 'text', nameFirst = false, inStack = false, ...rest}) => {
  const body = bodies[shape](rest);
  const label = `<p class="MuiTypography-root MuiTypography-body2">${category}</p>`;
  return `<div class="MuiPaper-root MuiCard-root">
  <div class="MuiCardHeader-root">
    <div class="MuiCardHeader-avatar"><div class="MuiAvatar-root">${role[0]}</div></div>
    <div class="MuiCardHeader-content"><span class="MuiCardHeader-title MuiTypography-root">${nameFirst ? name : role}</span>
      <span class="MuiCardHeader-subheader MuiTypography-root">${nameFirst ? role : name}</span></div>
    <div class="MuiCardHeader-action"><p class="MuiTypography-root">${time} hrs</p></div>
  </div>
  <div class="MuiCardContent-root">${inStack ? body.replace('<div class="MuiStack-root">', '<div class="MuiStack-root">' + label) : label + body}</div></div>`;
};
const box = (cards, date) => `<div class="MuiBox-root">${date ? `<div class="MuiStack-root day">${chip(date)}</div>` : ''}${cards.map(event).join('')}</div>`;
// A day opens a dated box with its first event. Later events get their own box, or share one when `withPrevious` is set.
const day = (label, events) => {
  const groups = [];
  for (const item of events) {
    if (item.withPrevious && groups.length) groups.at(-1).push(item);
    else groups.push([item]);
  }
  return groups.map((cards, index) => box(cards, index ? '' : label)).join('');
};

// Names as Eloísa writes them in the header of an event (read 26-11-2026): first name, second name, first surname and
// second surname joined by a space, each empty field leaving its own. None of these has a second name.
const doctor = {name:'Tomás  Ejemplo Prueba', role:'Médico'}, nurse = {name:'Elena  Ejemplo ', role:'Enfermera(o)'};
const therapist = {name:'Luis  Ejemplo ', role:'Kinesiólogo(a)'}, resident = {name:'Marta  Ejemplo Prueba', role:'Médico'};
const aide = {name:'Luis  Ejemplo ', role:'Paramédico'};
export const historyDays = [
  ['Hoy', [
    {...nurse, time:'13:40', category:'Evolución', shape:'note',
      body:'Tolera la movilización al sillón con ayuda de una persona. Participa en las actividades acordadas durante la ronda y descansa después del almuerzo.'},
    {...aide, time:'12:05', category:'Administrador de medicamentos', shape:'administration', rows:[
      ['Preparación de prueba A 500 mg comprimido', ['Hora de administración', '12:00:00'], ['Comentario breve de administración:', ''], ['Posología:', '1 comprimido cada 12 horas - oral'], ['Dosis:', '1']],
      ['Preparación de prueba B 40 mg solución', ['Hora de administración', '12:02:00'], ['Comentario breve de administración:', 'Sin incidentes'], ['Posología:', '1 ampolla cada 24 horas - subcutánea'], ['Dosis:', '1']]]},
    {...aide, time:'12:00', category:'Signos vitales', inStack:true, body:'Control de mediodía registrado en la hoja del turno, sin observaciones.'},
    {...doctor, time:'09:12', category:'Evolución', shape:'note', isNew:true,
      body:'Control de la mañana. Refiere descanso adecuado y tolerancia a la alimentación.\nSe sienta en el sillón con asistencia. Sin cambios respecto de la revisión previa.\n\nPlan de la ronda\n• Registrar tolerancia al levantarse durante el turno.\n• Reevaluar movilidad en la próxima visita.'},
    {...doctor, time:'08:50', category:'Evolución', shape:'note', withPrevious:true, body:'Visita breve antes de la ronda. Se acuerda con la familia el horario de acompañamiento.'},
    {...doctor, time:'08:45', category:'Fármacos', inStack:true, isNew:true, body:'Preparación de prueba A · vía oral · pauta simulada.'},
  ]],
  ['Ayer', [
    {...therapist, time:'17:20', category:'Procedimiento', body:'Evaluación de la marcha con apoyo. Camina doce pasos bajo supervisión y vuelve a sentarse sin incidentes.'},
    {...doctor, time:'10:30', category:'Evolución', shape:'note', nameFirst:true, body:'Segundo día de observación. Mantiene la tolerancia a la movilización asistida y la alimentación oral.'},
    {...doctor, time:'10:10', category:'Indicación libre', inStack:true, body:'Régimen común, porciones pequeñas.'},
  ]],
  ['13-04-2026', [
    {...resident, time:'16:00', category:'Evolución', shape:'note',
      body:'INGRESO MÉDICO · CASO FICTICIO\nMotivo de ingreso: observación de tolerancia a la movilización.\nPersona de simulación que acude a valoración de marcha. Vive con familia y dispone de apoyo.\nPlan: registrar tolerancia, revisar con enfermería la comodidad y el descanso.'},
    {...resident, time:'15:45', category:'Orden de atención', body:'Evaluación funcional de prueba solicitada para el día siguiente.'},
  ]],
];

const tabs = [['summary','Resumen'],['antecedents','Antecedentes'],['care-plan','Plan de tratamiento'],['history','Historial'],['discharge','Alta']];
// The floating Centro HHR bar, as in the summary fixture: 5 px below the banner, 18 px from the edge.
const floatingBar = `<div id="hhr-clinical-operations-bar" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><b></b><i></i></div>`;
export const historyPage = (days = historyDays) => `<!doctype html><html lang="es"><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;background:#eff1f0;color:#263432;font:14px/1.45 Arial,sans-serif}
  .banner{background:#218b80;color:white;padding:15px 24px;font-size:16px;font-weight:600}.banner small{margin-left:18px;font-size:12px;font-weight:400}
  .MuiAppBar-root{position:sticky;top:0;z-index:20;background:white}
  .MuiTabs-root [role=tablist]{display:flex;gap:8px;align-items:center}.MuiTabs-root button{background:none;border:0;font:inherit;font-size:13px;padding:10px 12px;cursor:pointer}
  main{padding:16px 24px}.layout{display:flex;gap:16px;align-items:flex-start}.layout>.MuiGrid-item{flex:0 0 calc(75% - 8px);min-width:0}
  .layout>.filters{flex-basis:calc(25% - 8px)}.filters form{display:flex;flex-direction:column;gap:12px}
  .MuiCardHeader-root{display:flex;align-items:center;padding:16px}.MuiCardHeader-content{flex:1}.MuiCardHeader-title{font-size:20px;font-weight:600}
  .MuiIconButton-root{display:inline-flex;padding:8px;border:0;border-radius:50%;background:none;color:#555}.MuiIconButton-root svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2}
  .MuiCardContent-root{padding:16px}.filters form>*{flex:none}
  .MuiFormControlLabel-root{display:inline-flex;align-items:center;font-size:16px}.MuiSwitch-root{position:relative;display:inline-flex;width:58px;height:38px;padding:12px;box-sizing:border-box}
  .MuiSwitch-switchBase{position:absolute;top:9px;left:9px;width:20px;height:20px;border-radius:50%;background:#fafafa;box-shadow:0 1px 3px rgba(0,0,0,.4)}.MuiSwitch-input{opacity:0;position:absolute;inset:0;margin:0}
  .MuiSwitch-track{width:100%;height:100%;border-radius:7px;background:#000;opacity:.38}
  .MuiFormControl-root{position:relative;display:inline-flex;flex-direction:column;min-width:0;margin-top:8px}
  .MuiInputLabel-root{position:absolute;left:0;top:0;transform:translate(14px,-9px) scale(.75);transform-origin:top left;color:rgba(0,0,0,.6);font-size:16px;z-index:1;background:none}
  .MuiInputBase-root{position:relative;display:inline-flex;align-items:center;font-size:16px;border-radius:4px}
  .MuiSelect-select{flex:1;padding:16.5px 32px 16.5px 14px;min-height:1.4375em;cursor:pointer}.MuiSelect-nativeInput{position:absolute;bottom:0;left:0;opacity:0;pointer-events:none;width:100%}
  .MuiSelect-icon{position:absolute;right:7px;width:24px;height:24px;fill:rgba(0,0,0,.54)}
  .MuiOutlinedInput-notchedOutline{position:absolute;inset:-5px 0 0;margin:0;padding:0 8px;border:1px solid rgba(0,0,0,.23);border-radius:inherit;pointer-events:none}
  .MuiOutlinedInput-notchedOutline legend{float:unset;width:auto;max-width:100%;height:11px;padding:0;font-size:.75em;visibility:hidden}.MuiOutlinedInput-notchedOutline legend span{padding:0 5px}
  .filters .MuiButton-root{font:inherit;padding:8px;width:100%;border:0;border-radius:4px;background:#218b80;color:#fff;text-transform:uppercase}
  .day{display:flex;justify-content:center;margin:8px 0 12px}
  .MuiChip-root{display:inline-flex;align-items:center;border-radius:16px;height:32px;padding:0 12px;background:#e4e9e7;color:#344841;font-size:13px}
  .MuiCard-root{background:white;border-radius:8px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.12)}
  .MuiCardHeader-root{display:flex;align-items:center;gap:16px;padding:16px}.MuiCardHeader-content{flex:1;min-width:0}
  .MuiAvatar-root{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:#bdc8c4;color:white;font-size:15px}
  .MuiCardHeader-title{display:block;font-size:14px}.MuiCardHeader-subheader{display:block;color:#61716c;font-size:14px}
  .MuiCardHeader-action{color:#61716c;font-size:13px}
  .MuiCardContent-root{padding:0 16px 24px}.MuiCardContent-root>p{margin:0 0 8px;color:#0b6e66;font-weight:500}
  .timeline{display:flex;flex-direction:column}.timeline .MuiBox-root{margin:0}.MuiCardContent-root .MuiStack-root{display:flex;flex-direction:column;gap:8px}
  .MuiCardContent-root .MuiStack-root .MuiStack-root{flex-direction:row;flex-wrap:wrap;gap:4px 12px;align-items:flex-start}
  .MuiCardContent-root .MuiStack-root p{margin:0;white-space:pre-line}.MuiCardContent-root span.MuiTypography-root{display:block;width:100%}
  .MuiCardContent-root span.MuiTypography-root>span{display:inline;width:auto;margin-right:6px}.MuiCardHeader-action p{margin:0}
  #hhr-clinical-operations-bar{position:fixed;top:58px;right:18px;z-index:2147483000;display:flex;align-items:center;gap:6px;width:350px;height:38px;
    padding:3px 8px;border:1px solid rgba(16,42,67,.14);border-radius:13px;background:rgba(255,255,255,.98);box-shadow:0 1px 2px rgba(16,42,67,.08),0 9px 24px rgba(16,42,67,.14)}
  #hhr-clinical-operations-bar i{flex:none;width:26px;height:24px;border-radius:8px;background:#e3efec}#hhr-clinical-operations-bar i:first-of-type{background:#2f8f84}
  #hhr-clinical-operations-bar b{flex:1;height:10px;border-radius:5px;background:#e3e9e7}
  @media(max-width:1280px){#hhr-clinical-operations-bar{width:250px}#hhr-clinical-operations-bar b{display:none}}
</style><header class="banner">Ficha de hospitalizados <small>Historial · Episodio ficticio</small></header>
<div class="MuiAppBar-root"><div class="MuiTabs-root"><div class="MuiTabs-scroller"><div role="tablist">${tabs.map(([id,label]) =>
  `<button role="tab" id="encounter-event-tab-${id}" aria-selected="${id === 'history'}">${label}</button>`).join('')}</div></div></div></div>
<main class="MuiBox-root"><div class="MuiGrid-root MuiGrid-container layout"><div class="MuiGrid-root MuiGrid-item filters"><div class="MuiPaper-root MuiCard-root">
  <div class="MuiCardHeader-root"><div class="MuiCardHeader-content"><span class="MuiTypography-root MuiTypography-h5 MuiCardHeader-title">Filtros</span></div>
    <div class="MuiCardHeader-action"><button type="button" class="MuiButtonBase-root MuiIconButton-root MuiIconButton-sizeMedium" aria-label="Imprimir"><svg class="MuiSvgIcon-root" viewBox="0 0 24 24" width="24" height="24"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z"/></svg></button></div></div>
  <div class="MuiCardContent-root"><form class="MuiStack-root filter-form">
    <label class="MuiFormControlLabel-root"><span class="MuiSwitch-root"><span class="MuiSwitch-switchBase"><input type="checkbox" class="MuiSwitch-input"></span><span class="MuiSwitch-track"></span></span><span class="MuiTypography-root MuiFormControlLabel-label">Ir a ingreso</span></label>
    ${[['addDays','Rango de fecha','2 Semanas'],['roles','Roles','Todos'],['categories','Categorías','Todos']].map(([id, name, value]) =>
    `<div class="MuiFormControl-root MuiFormControl-fullWidth"><label id="${id}-label" class="MuiFormLabel-root MuiInputLabel-root MuiInputLabel-formControl MuiInputLabel-shrink MuiInputLabel-outlined">${name}</label>
      <div class="MuiInputBase-root MuiOutlinedInput-root MuiInputBase-formControl"><div id="mui-component-select-${id}" role="combobox" aria-labelledby="${id}-label" tabindex="0" class="MuiSelect-select MuiSelect-outlined MuiInputBase-input MuiOutlinedInput-input">${value}</div>
      <input aria-hidden="true" tabindex="-1" class="MuiSelect-nativeInput" value="${value}"><svg class="MuiSvgIcon-root MuiSelect-icon" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
      <fieldset aria-hidden="true" class="MuiOutlinedInput-notchedOutline"><legend><span>${name}</span></legend></fieldset></div></div>`).join('')}
    <div class="MuiStack-root"><button type="submit" class="MuiButtonBase-root MuiButton-root MuiButton-contained">Filtrar</button></div></form></div></div></div>
<div class="MuiGrid-root MuiGrid-item"><div class="MuiStack-root timeline">${days.map(([label, events]) => day(label, events)).join('')}</div></div></div></main>${floatingBar}</html>`;
