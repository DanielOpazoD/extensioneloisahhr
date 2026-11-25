// A fictional Historial. The structure follows what the readers recognize in Eloísa: one
// MUI Box per day, opened by a date Chip in its own Stack and followed by event Cards. Each
// card states the author and role in its header, the time as the header action, and the
// category as the first paragraph of its content.
const initials = name => name.split(' ').map(word => word[0]).join('');
const event = ({time, name, role, category, body, isNew = false}) => `<div class="MuiPaper-root MuiCard-root">
  <div class="MuiCardHeader-root">
    <div class="MuiCardHeader-avatar"><div class="MuiAvatar-root">${initials(name)}</div></div>
    <div class="MuiCardHeader-content"><span class="MuiCardHeader-title MuiTypography-root">${name}</span>
      <span class="MuiCardHeader-subheader MuiTypography-root">${role}</span></div>
    <div class="MuiCardHeader-action">${time}</div>
  </div>
  <div class="MuiCardContent-root"><p class="MuiTypography-root MuiTypography-body2">${category}</p>
    <div class="MuiStack-root"><div class="MuiStack-root"><p class="MuiTypography-root">${body}</p>${isNew
      ? '<div class="MuiChip-root"><span class="MuiChip-label">Nuevo</span></div>' : ''}</div></div>
  </div></div>`;
const day = (label, events) => `<div class="MuiBox-root"><div class="MuiStack-root day"><div class="MuiChip-root"><span class="MuiChip-label">${label}</span></div></div>
  ${events.map(event).join('')}</div>`;

const doctor = {name:'Tomás Ejemplo', role:'Médico'}, nurse = {name:'Elena Ejemplo', role:'Enfermera(o)'};
const therapist = {name:'Luis Ejemplo', role:'Kinesiólogo(a)'}, resident = {name:'Marta Ejemplo', role:'Médico'};
export const historyDays = [
  ['Hoy', [
    {...nurse, time:'13:40', category:'Evolución de enfermería',
      body:'Tolera la movilización al sillón con ayuda de una persona. Participa en las actividades acordadas durante la ronda y descansa después del almuerzo.'},
    {...nurse, time:'12:05', category:'Signos vitales', body:'Control de mediodía registrado en la hoja del turno, sin observaciones.'},
    {...doctor, time:'09:12', category:'Evolución', isNew:true,
      body:'Control de la mañana. Refiere descanso adecuado y tolerancia a la alimentación.\nSe sienta en el sillón con asistencia. Sin cambios respecto de la revisión previa.\n\nPlan de la ronda\n• Registrar tolerancia al levantarse durante el turno.\n• Reevaluar movilidad en la próxima visita.'},
    {...doctor, time:'08:50', category:'Evolución', body:'Visita breve antes de la ronda. Se acuerda con la familia el horario de acompañamiento.'},
    {...doctor, time:'08:45', category:'Fármacos', body:'Preparación de prueba A · vía oral · pauta simulada.'},
  ]],
  ['Ayer', [
    {...therapist, time:'17:20', category:'Procedimientos', body:'Evaluación de la marcha con apoyo. Camina doce pasos bajo supervisión y vuelve a sentarse sin incidentes.'},
    {...doctor, time:'10:30', category:'Evolución', body:'Segundo día de observación. Mantiene la tolerancia a la movilización asistida y la alimentación oral.'},
    {...doctor, time:'10:10', category:'Indicaciones (Régimen)', body:'Régimen común, porciones pequeñas.'},
  ]],
  ['13-04-2026', [
    {...resident, time:'16:00', category:'Evolución',
      body:'INGRESO MÉDICO · CASO FICTICIO\nMotivo de ingreso: observación de tolerancia a la movilización.\nPersona de simulación que acude a valoración de marcha. Vive con familia y dispone de apoyo.\nPlan: registrar tolerancia, revisar con enfermería la comodidad y el descanso.'},
    {...resident, time:'15:45', category:'Solicitud de examen', body:'Evaluación funcional de prueba solicitada para el día siguiente.'},
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
  main{padding:16px 24px}.layout{display:grid;grid-template-columns:220px minmax(0,1fr);gap:16px;align-items:start}
  aside{background:white;border-radius:8px;padding:16px}aside h6{margin:0 0 8px;font-size:14px}aside label{display:flex;gap:8px;align-items:center;font-size:13px;margin:6px 0}
  .day{display:flex;justify-content:center;margin:8px 0 12px}
  .MuiChip-root{display:inline-flex;align-items:center;border-radius:16px;height:32px;padding:0 12px;background:#e4e9e7;color:#344841;font-size:13px}
  .MuiCard-root{background:white;border-radius:8px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.12)}
  .MuiCardHeader-root{display:flex;align-items:center;gap:16px;padding:16px}.MuiCardHeader-content{flex:1;min-width:0}
  .MuiAvatar-root{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:#bdc8c4;color:white;font-size:15px}
  .MuiCardHeader-title{display:block;font-size:14px}.MuiCardHeader-subheader{display:block;color:#61716c;font-size:14px}
  .MuiCardHeader-action{color:#61716c;font-size:13px}
  .MuiCardContent-root{padding:0 16px 24px}.MuiCardContent-root>p{margin:0 0 8px;color:#0b6e66;font-weight:500}
  .MuiCardContent-root .MuiStack-root .MuiStack-root{display:flex;gap:12px;align-items:flex-start}
  .MuiCardContent-root .MuiStack-root p{margin:0;white-space:pre-line}
  #hhr-clinical-operations-bar{position:fixed;top:58px;right:18px;z-index:2147483000;display:flex;align-items:center;gap:6px;width:350px;height:38px;
    padding:3px 8px;border:1px solid rgba(16,42,67,.14);border-radius:13px;background:rgba(255,255,255,.98);box-shadow:0 1px 2px rgba(16,42,67,.08),0 9px 24px rgba(16,42,67,.14)}
  #hhr-clinical-operations-bar i{flex:none;width:26px;height:24px;border-radius:8px;background:#e3efec}#hhr-clinical-operations-bar i:first-of-type{background:#2f8f84}
  #hhr-clinical-operations-bar b{flex:1;height:10px;border-radius:5px;background:#e3e9e7}
  @media(max-width:1280px){#hhr-clinical-operations-bar{width:250px}#hhr-clinical-operations-bar b{display:none}}
</style><header class="banner">Ficha de hospitalizados <small>Historial · Episodio ficticio</small></header>
<div class="MuiAppBar-root"><div class="MuiTabs-root"><div class="MuiTabs-scroller"><div role="tablist">${tabs.map(([id,label]) =>
  `<button role="tab" id="encounter-event-tab-${id}" aria-selected="${id === 'history'}">${label}</button>`).join('')}</div></div></div></div>
<main class="MuiBox-root"><div class="layout"><aside class="MuiPaper-root"><h6>Filtros</h6>${['Evolución','Fármacos','Procedimientos','Signos vitales']
  .map(name => `<label><input type="checkbox" checked> ${name}</label>`).join('')}</aside>
<div class="MuiStack-root timeline">${days.map(([label, events]) => day(label, events)).join('')}</div></div></main>${floatingBar}</html>`;
