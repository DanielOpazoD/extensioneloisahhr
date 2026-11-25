// Fictional records. The nested MUI grid and heading/body boundaries follow the medical summary.
const stamp = 'Última actualización: 15-04-2026, 09:12:35, Médico Tomás Ejemplo';
const section = (id, cardId, title, body, byline = '', action = '') => {
  const card = `<div ${cardId ? 'id="' + cardId + '"' : ''} class="MuiCard-root MuiPaper-root">
    <div class="MuiCardHeader-root"><div class="MuiCardHeader-content">
      <span class="MuiCardHeader-title MuiTypography-root MuiTypography-h6">${title}</span>
      <span class="MuiCardHeader-subheader MuiTypography-root">${byline}</span>
    </div><div class="MuiCardHeader-action"><div class="MuiStack-root">${action}</div></div></div>
    <div class="MuiCardContent-root">${body}</div></div>`;
  return id ? `<section id="${id}" class="MuiBox-root">${card}</section>` : card;
};
const item = (content, size = '12') =>
  `<div class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-${size}">${content}</div>`;
const note = `Paciente de simulación en control de ronda. Refiere descanso adecuado y tolerancia a la alimentación.
Se sienta en el sillón con asistencia. Sin cambios respecto de la revisión previa.

Plan de la ronda
• Registrar tolerancia al levantarse durante el turno.
• Revisar con enfermería la planificación de cuidados.
• Reevaluar movilidad en la próxima visita.`;
const discharge = section('estimatedDischargeSection', 'estimatedDischarge', 'Fecha estimada de alta',
  '<section class="MuiStack-root"><form><input aria-label="Fecha estimada de alta" placeholder="Fecha estimada de alta"><button disabled>Modificar</button></form></section>');
const evolution = section('observationEntrySection','evolution','Evolución',
  `<div class="MuiStack-root"><div class="MuiStack-root"><div class="MuiBox-root">
    <span class="MuiTypography-caption">${note}</span><div class="MuiBox-root"><button class="MuiButton-root">Leer menos</button></div>
  </div></div><div class="MuiStack-root"><div class="MuiStack-root"><button aria-label="Editar evolución">✎</button><button aria-label="Enmendamientos">☷</button></div></div></div>`, stamp, '<button aria-label="Opciones de evolución">⋮</button>');
const handoff = section('shiftChangeEntrySection','shiftChangeObservation','Observaciones de entrega de turno',
  '<div class="MuiStack-root"><form><input aria-label="Observaciones" placeholder="Observaciones"><button disabled>Agregar</button></form></div>');

const metric = (label, value, time, flagged) => {
  const valueMarkup = label === 'Presión' ? `<div><div class="MuiStack-root numeric">
    <h5>118</h5><h5>/</h5><h5>72</h5></div><div class="MuiStack-root numeric"><p>PAM:</p><p>87</p></div></div>` :
    `<h5 class="MuiTypography-root MuiTypography-h5"${flagged ? ' style="color:#cc2424"' : ''}>${value}</h5>`;
  return `<div class="MuiPaper-root MuiCard-root tile"><div class="MuiCardContent-root">
    <div class="MuiTypography-root MuiTypography-body1"><div class="MuiBox-root">
    <span class="MuiTypography-root MuiTypography-caption">${label}</span></div></div>
    ${valueMarkup}<p class="MuiTypography-root MuiTypography-body1">${time}</p></div></div>`;
};
const vitals = section('vitalSignsEntry','vitalSignsEntry','Signos vitales', `<div class="MuiStack-root vitals-grid">${[
  ['Presión','','2 horas'],['Fre. Cardíaca','78','2 horas'],['Saturación O<sub>2</sub>','96','2 horas'],
  ['Tº axilar','38,1','2 horas',true],['Frec. respiratoria','17','2 horas'],['Glasgow','15','2 horas'],
  ['Sup. Oxígeno','21','2 horas'],['Hemoglucotest','104','4 horas'],['EVA','2','2 horas']
].map(args=>metric(...args)).join('')}</div><p>Observaciones: mediciones de prueba.</p><button>Ver historial completo</button>`, 'Última actualización: 15-04-2026, 08:15:02, Enfermera Elena Ejemplo');
const grid = 'MuiGrid-root MuiGrid-container MuiGrid-spacing-xs-2';
const summaryBody = `<div class="${grid} round-grid">
  <div class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-12 toolbar"><p class="MuiTypography-root MuiTypography-body2">Última actualización: 15-04-2026, 09:12 - Tomás Ejemplo</p><div><input aria-label="Resumen diario paciente" type="date" value="2026-04-15"> <button>Imprimir</button></div></div>
  ${item(`<div class="${grid}">${item(discharge)}${item(evolution)}</div>`,'6')}
  <div class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-12 MuiGrid-grid-md-6">${handoff}</div>
  ${item(item(section(null,'encounterFormEntry','Instrumentos de evaluación','<p>No presentan instrumentos de evaluación registrados</p>')))}
  ${item(section('physicalExaminationEntry','physicalExam','Examen físico','<p>No presenta exámenes físicos registrados</p>'))}
  ${item(vitals)}
  ${item(section('alertEntrySection','alerts','Alertas','<p>Revisar la evaluación del turno en el próximo control.</p>'))}
  ${item(section('medicationEntrySection','medication','Fármacos','<table><thead><tr><th>Indicación</th><th>Posología</th><th>Acciones</th></tr></thead><tbody><tr><td>Preparación de ejemplo</td><td>Según indicación de prueba</td><td><button aria-label="Ver comentario">···</button></td></tr></tbody></table>',stamp))}
</div>`;
const tabs = ['Resumen', 'Antecedentes', 'Plan de tratamiento', 'Historial', 'Alta'];
export const medicalRound = `<!doctype html><html lang="es"><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;background:#eff1f0;color:#263432;font:14px/1.45 Arial,sans-serif}
  .banner{background:#218b80;color:white;padding:15px 24px;font-size:16px;font-weight:600}.banner small{margin-left:18px;font-size:12px;font-weight:400}
  .MuiTabs-root{display:flex;gap:8px;background:white}.MuiTabs-root button{background:none;border:0;font-size:13px}.MuiChip-root{display:inline-flex;border-radius:12px;padding:3px 11px;background:#e4e9e7;color:#344841;font-size:12px}
  main{padding:12px 24px}button,input{font:inherit}button{color:#166d63;background:#e8f2ef;border:0;border-radius:4px;padding:5px 9px;cursor:pointer}
  button:disabled{color:#79807e;background:#eeefee}.MuiGrid-container{display:flex;flex-wrap:wrap;gap:12px}
  .round-grid{padding-top:80px;margin-top:-16px}.round-grid>.MuiGrid-item{padding-top:16px}
  .MuiGrid-item{min-width:0}.MuiGrid-grid-xs-12{width:100%}.MuiGrid-grid-xs-6,.MuiGrid-grid-md-6{width:calc(50% - 6px)}
  .MuiCard-root{background:white;border-radius:8px;height:100%}section.MuiBox-root{height:100%}
  .MuiCardHeader-root{display:flex;justify-content:space-between;padding:12px 16px 4px}.MuiCardHeader-title{display:block;font-size:17px;font-weight:500}
  .MuiCardHeader-subheader{display:block;color:#61716c;font-size:12px}.MuiCardContent-root{padding:8px 16px 13px}
  .MuiCardContent-root p{margin:3px 0}.MuiTypography-caption{font-size:13px}
  #evolution .MuiBox-root>.MuiTypography-caption{white-space:pre-line;line-height:1.75}
  #evolution .MuiBox-root>.MuiBox-root{text-align:right}
  .vitals-grid{display:flex;gap:12px;flex-wrap:wrap}.tile{background:#f1f3f2;width:160px;height:auto}
  .tile h5{font-size:21px;font-weight:500;margin:2px 0}.tile p,.tile span{color:#5a6965;font-size:12px}
  .numeric{display:flex;gap:3px}.numeric h5{display:inline}
  .toolbar{margin:0;display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;color:#50635b}
  .subnav{flex-wrap:nowrap;align-items:center;overflow:auto;min-width:0}
  form{display:flex;gap:8px;align-items:center}input{border:1px solid #cbd4d0;padding:7px 9px;border-radius:4px;min-width:0;max-width:100%}
  #shiftChangeEntrySection input{flex:1}table{width:100%;border-collapse:collapse;text-align:left}td,th{padding:7px;border-bottom:1px solid #dae1dd}
  @media(max-width:700px){main{padding:8px}.MuiGrid-grid-xs-6,.MuiGrid-grid-md-6{width:100%}.MuiTabs-root{flex-wrap:wrap}.banner small{display:block;margin:0}.toolbar{align-items:flex-end}}
</style><header class="banner">Ficha de hospitalizados <small>Resumen médico · Episodio ficticio</small></header>
<div class="MuiTabs-root"><div role="tablist">${tabs.map((tab,i)=>`<button role="tab" id="encounter-event-tab-${['summary','antecedents','care-plan','history','discharge'][i]}" aria-selected="${i===0}">${tab}</button>`).join('')}</div></div>
<main class="MuiBox-root"><div class="MuiStack-root"><div class="MuiGrid-item MuiGrid-grid-xs-12"><div class="MuiGrid-container subnav">${['Alertas','Indicaciones (Medicamento)','Evolución','Signos vitales'].map(t=>`<div class="MuiGrid-item"><span class="MuiBadge-root"><span class="MuiTypography-caption">${t}</span></span></div>`).join('')}</div></div>
${summaryBody}</div></main><script>
  // React builds this p > div tree directly. The HTML parser alone would close the p.
  for (const label of document.querySelectorAll('.tile .MuiCardContent-root > div.MuiTypography-body1')) {
    const paragraph = document.createElement('p');
    paragraph.className = label.className;
    paragraph.append(...label.childNodes);
    label.replaceWith(paragraph);
  }
</script></html>`;

const historyCard = (name, role, time, type, note) => `<article class="MuiCard-root"><div class="MuiCardHeader-root">
  <div class="MuiCardHeader-content"><span class="MuiCardHeader-title">${name}</span><span class="MuiCardHeader-subheader">${role}</span></div>
  <div class="MuiCardHeader-action">${time}</div></div><div class="MuiCardContent-root">
  <p class="MuiTypography-root">${type}</p><div class="MuiStack-root"><div class="MuiStack-root"><p class="MuiTypography-root">${note}</p></div></div></div></article>`;
export const medicalHistory = `<div class="MuiStack-root"><div class="MuiBox-root"><div class="MuiStack-root">
  <span class="MuiChip-root"><span class="MuiChip-label">15-04-2026</span></span></div>
  ${historyCard('Elena Ejemplo','Enfermera(o)','13:40','Evolución de enfermería','Tolera la movilización al sillón. Participa en las actividades acordadas durante la ronda.')}
  ${historyCard('Tomás Ejemplo','Médico','09:12','Evolución','Control de la mañana. Se revisan el descanso, la alimentación y el plan de la jornada.')}
  ${historyCard('Tomás Ejemplo','Médico','09:05','Fármacos','Indicación de prueba.')}
</div></div>`;
