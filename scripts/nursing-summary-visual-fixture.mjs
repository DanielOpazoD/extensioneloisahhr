// Fictional entries only. Used for browser regression and release comparisons.
const actions = ['Descartar','Comentario','Más opciones'].map((name,index) =>
  `<button class="MuiIconButton-root" aria-label="${name}">${['×','≡','⋮'][index]}</button>`).join(' ');

const orderRows = Array.from({length:8}, (_, index) => {
  const short = index === 7;
  const instruction = index % 2 && !short
    ? 'Instrucción de ejemplo con un texto más largo que puede ocupar dos líneas.'
    : 'Indicación de prueba.';
  return `<tr><td><span class="time-marker"><svg viewBox="0 0 44 36" width="44" height="36"><path d="M22 3L41 33H3Z" fill="none" stroke="currentColor" stroke-width="4"/><text x="22" y="27" text-anchor="middle" font-size="14">${index+1}</text></svg></span></td>
    <td>${short ? 'Preparación H' : 'Preparación '+String.fromCharCode(65+index)+' de prueba'}</td>
    <td>${short ? 'Dato breve' : 'Posología de ejemplo para revisión visual'}</td>
    <td>${instruction}</td><td>${short ? 'Equipo' : 'Equipo de prueba'}</td><td>${actions}</td></tr>`;
}).join('');

export const visualSummary = `
<style>
#nursing-test section { background:white;padding:16px;margin-bottom:12px; }
#nursing-test .MuiCardHeader-root,#nursing-test .MuiCardContent-root { padding:14px; }
#nursing-test .readings { display:flex;flex-wrap:wrap;gap:14px; }
#nursing-test .reading { box-sizing:border-box;width:168px;min-height:122px;background:#eee;padding:14px; }
#nursing-test .reading p { margin:4px 0; }
#nursing-test td,#nursing-test th { padding:13px; }
#nursing-test table { width:100%; }

    *{box-sizing:border-box}body{margin:0;background:#f1f2f2;color:#25322f;font-family:Arial,sans-serif}
    #nursing-test {font:14px/1.4 Arial,sans-serif;padding:0 16px 12px}
    .patient-banner{margin-inline:-16px;padding:12px 20px;background:#20877d;color:white;font-size:17px;font-weight:600}
    .patient-banner span{font-size:12px;font-weight:400;margin-left:16px}
    .MuiTabs-root{background:#fff;display:flex;align-items:center;gap:18px;flex-wrap:wrap;font-size:13px}
    button{font:inherit;color:#176c62;cursor:pointer;border:0;background:#edf5f2;border-radius:4px;padding:4px 8px}
    #nursing-test .MuiGrid-container{display:flex;gap:12px;padding:2px 6px;color:#52645f;font-size:12px}
    #nursing-test section{border-radius:8px}h3{font-size:16px}.meta{color:#54635e;font-size:12px}
    table{border-collapse:collapse;text-align:left}th{background:#edf1ef;font-weight:500}
    td{border-bottom:1px solid #dee5e2}strong{font-size:18px}
    .reading p{font-size:13px}.reading{border-radius:8px}.time-marker{display:inline-block;color:#687670}
    .MuiIconButton-root{background:transparent;color:#52645e}
    @media(max-width:600px){#nursing-test{padding:0 8px 8px}.patient-banner{margin-inline:-8px}.patient-banner span{display:block;margin:0}.MuiTabs-root{gap:6px}}
  </style>
<div id="nursing-test"><header class="patient-banner">Ficha de hospitalizados <span>Enfermería · Ficha de prueba</span></header><div class="MuiTabs-root"><button role="tab" id="nurse-tab-summary" aria-selected="true">Resumen</button><span>Plan de tratamiento</span><span>Ejecución de cuidados</span><span>Historial</span></div>
<div><nav class="MuiGrid-container"><span class="MuiTypography-caption">Diagnóstico</span><span class="MuiTypography-caption">Valoración</span></nav></div>
<section class="MuiCard-root"><div class="MuiCardHeader-root"><h3 class="MuiCardHeader-title">Diagnóstico</h3><span class="meta">Última actualización · Profesional de prueba</span></div>
<div class="MuiCardContent-root"><table><thead><tr><th>Diagnóstico</th><th>Estado</th></tr></thead><tbody><tr><td>Registro sintético</td><td>En estudio</td></tr></tbody></table></div></section>
<section id="vitalSignsEntry" class="MuiCard-root"><div class="MuiCardHeader-root"><h3 class="MuiCardHeader-title">Signos vitales</h3></div><div class="MuiCardContent-root">
<div class="readings">${[['Presión','120/75','PAM: 90','50 minutos'],['Fre. Cardíaca','72','50 minutos'],['Saturación O<sub>2</sub>','98','50 minutos'],['T° axilar','37,9','50 minutos'],['Frec. respiratoria','16','50 minutos'],['Glasgow','15','50 minutos'],['Sup. Oxígeno','21','50 minutos'],['Hemoglucotest','110','2 horas'],['EVA','0','50 minutos']].map(([name,val,...extra]) =>
  '<div class="reading"><p>'+name+'</p><strong style="color:'+(name==='T° axilar'?'red':'inherit')+'">'+val+'</strong>'+extra.map(v=>'<p>'+v+'</p>').join('')+'</div>').join('')}</div>
<p>Observaciones de prueba</p><button type="button">Ver historial completo</button></div></section>
<section class="MuiCard-root"><h3>Fármacos</h3><table><thead><tr><th>Tiempo</th><th>Indicación</th><th>Posología</th><th>Indicaciones específicas</th><th>Solicitante</th><th>Acciones</th></tr></thead>
<tbody>${orderRows}</tbody></table></section></div>`;
