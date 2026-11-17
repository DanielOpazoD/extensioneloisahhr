import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const event = (id, role, category) => `<div id="${id}" class="MuiCard-root" style="background:white;border-radius:10px;margin-bottom:12px;padding:16px">
  <div class="MuiCardHeader-root"><span class="MuiCardHeader-title">Profesional de prueba</span><span class="MuiCardHeader-subheader">${role}</span></div>
  <div class="MuiCardContent-root"><p class="MuiTypography-root">${category}</p><div class="MuiStack-root"><div class="MuiStack-root" style="display:flex;gap:8px">
    <p class="MuiTypography-root" style="flex:1;margin:0">${'Texto sintético para verificar el ancho de lectura de una evolución. '.repeat(8)}</p>
    <div class="MuiChip-root" style="flex:none">Etiqueta</div></div></div></div></div>`;
const group = (date, cards) => `<div class="MuiBox-root"><div class="MuiStack-root"><div class="MuiChip-root"><span class="MuiChip-label">${date}</span></div></div>${cards}</div>`;
const fixture = `
  <style>
    main { font:14px/1.5 system-ui,sans-serif; }
    .MuiCardHeader-root { display:flex;gap:12px;align-items:center;margin-bottom:10px; }
    .MuiCardHeader-subheader { font-size:12px;color:#526762; }
    .MuiCardContent-root > p { color:#0b6e66; }
    #native-summary { display:grid;grid-template-columns:1fr 1fr;gap:16px; }
    #native-summary > section { min-width:0;min-height:260px;padding:16px;background:white;border-radius:10px;box-sizing:border-box; }
    #native-history-layout { display:grid;grid-template-columns:220px minmax(0,1fr);gap:16px; }
    #native-history-layout > aside { padding:16px;background:white;align-self:start; }
    [hidden] { display:none !important; }
    @media(max-width:800px) { #native-summary,#native-history-layout { grid-template-columns:minmax(0,1fr); } }
  </style>
  <header class="MuiAppBar-root" style="position:fixed;top:48px;left:0;width:100%;height:48px;z-index:1100;background:white">
    <div class="MuiTabs-root"><div role="tablist" style="display:flex;overflow-x:auto;white-space:nowrap">
      ${[['summary','Resumen'],['antecedents','Antecedentes'],['care-plan','Plan de tratamiento'],['history','Historial'],['discharge','Alta']].map(([id,label])=>
        `<button role="tab" id="encounter-event-tab-${id}" aria-selected="${id==='summary'}">${label}</button>`).join('')}
    </div></div>
  </header>
  <div id="native-summary-view" style="padding-top:104px">
    <div><div class="MuiGrid-root MuiGrid-container" style="position:fixed;top:94px;width:1500px;display:flex">
      ${['Alertas','Diagnóstico','Indicaciones (Medicamento)','Procedimientos','Signos vitales','Evolución'].map(label=>
        `<div class="MuiGrid-item"><span class="MuiBadge-root"><span class="MuiTypography-caption">${label}</span></span></div>`).join('')}
    </div></div>
    <div id="native-summary">
      ${[['alertEntrySection','Alertas'],['diagnosisEntrySection','Diagnóstico'],['medicationEntrySection','Fármacos'],['procedureEntrySection','Procedimientos'],['vitalSignsEntry','Signos vitales']].map(([id,label])=>`<section id="${id}"><h2>${label}</h2>Contenido sintético</section>`).join('')}
      <section id="observationEntrySection"><div id="evolution" class="MuiCard-root"><span class="MuiCardHeader-title">Evolución</span>
        <div class="MuiCardContent-root"><div class="MuiStack-root"><div class="MuiStack-root" style="width:100%;display:flex">
          <div class="MuiBox-root" style="width:350px"><span class="MuiTypography-caption">Profesional de prueba</span><div class="MuiBox-root">${'Texto sintético de evolución que debe aprovechar todo el ancho disponible. '.repeat(6)}</div></div>
        </div></div></div></div></section>
    </div><div style="height:600px"></div>
  </div>
  <div id="native-history-view" style="padding-top:104px" hidden><div id="native-history-layout">
    <aside>Filtros nativos</aside><div id="native-timeline">
      ${group('Hoy',event('medical-today','Médico','Evolución')+event('nurse','Enfermera(o)','Evolución')+event('administration','Paramédico','Administrador de medicamentos')+event('medication','Médico','Fármacos')+event('procedure-today','Médico','Procedimientos'))}
      ${group('Ayer',event('procedure-yesterday','Médico','Procedimientos'))}
      ${group('01-01-2025',event('medical-old','Médico','Evolución'))}
    </div></div></div>`;

const screenshot = async (page, name) => {
  if (!process.env.HHR_VISUAL_ARTIFACT_DIR) return;
  await mkdir(process.env.HHR_VISUAL_ARTIFACT_DIR, { recursive: true });
  await page.screenshot({ path:path.join(process.env.HHR_VISUAL_ARTIFACT_DIR,name+'.png') });
};

export const verifyNativeFicha = async page => {
  const original = await page.locator('main').innerHTML();
  const viewport = page.viewportSize();
  await page.locator('main').evaluate((main, html) => {
    main.innerHTML=html; main.style.background='#f3f5f4';
    main.querySelectorAll('[role="tab"]').forEach(tab=>tab.addEventListener('click',()=>{
      main.querySelectorAll('[role="tab"]').forEach(other=>other.setAttribute('aria-selected',String(other===tab)));
      main.querySelector('#native-summary-view').hidden=tab.id!=='encounter-event-tab-summary';
      main.querySelector('#native-history-view').hidden=tab.id!=='encounter-event-tab-history';
      window.scrollTo(0,0);
    }));
  },fixture);
  for(const width of [1280,840,390]) {
    await page.setViewportSize({width,height:900});
    await page.getByRole('tab',{name:'Resumen',exact:true}).click();
    await page.locator('[data-hhr-ficha-sections]').waitFor();
    const link=page.locator('[data-hhr-ficha-link]').filter({hasText:'Evolución'});
    await link.focus();
    await link.press('Enter');
    await page.waitForFunction(()=>document.querySelector('[data-hhr-ficha-link][aria-current="location"]')?.textContent==='Evolución');
    const geometry=await page.evaluate(()=>{
      const row=document.querySelector('[data-hhr-ficha-sections]').getBoundingClientRect();
      const block=document.querySelector('[data-hhr-evolution-block]'), rect=block.getBoundingClientRect();
      const target=document.querySelector('#observationEntrySection').getBoundingClientRect();
      return {rowRight:row.right,rowBottom:row.bottom,rowTop:row.top,targetTop:target.top,width:rect.width,parentWidth:block.parentElement.getBoundingClientRect().width,bodyWidth:document.documentElement.scrollWidth};
    });
    assert.ok(Math.abs(geometry.width-geometry.parentWidth)<2,`Unused evolution width at ${width}px`);
    assert.ok(geometry.rowRight<=width+1 && geometry.bodyWidth<=width+1,`Native navigation overflows at ${width}px`);
    assert.ok(geometry.targetTop>=geometry.rowBottom-1,`Section hidden under navigation at ${width}px`);
    if(width===1280) {
      await page.locator('[data-hhr-ficha-section-slot]').evaluate(e=>{e.style.width='70%';});
      await page.waitForFunction(()=>document.querySelector('[data-hhr-ficha-sections]').getBoundingClientRect().width<innerWidth*.75);
      await page.locator('[data-hhr-ficha-section-slot]').evaluate(e=>{e.style.removeProperty('width');});
      await page.waitForFunction(()=>document.querySelector('[data-hhr-ficha-sections]').getBoundingClientRect().width>innerWidth*.9);
    }
    await screenshot(page,'ficha-evolucion-'+width);
    await page.getByRole('tab',{name:'Historial',exact:true}).click();
    const toolbar=page.locator('#hhr-history-date-navigation');
    await toolbar.getByRole('button',{name:'Filtrar: Evoluciones médicas',exact:true}).click();
    await page.waitForFunction(()=>document.querySelectorAll('#native-timeline .MuiCard-root:not([data-hhr-history-filtered])').length===2);
    assert.equal(await toolbar.getByRole('combobox',{name:'Fecha del historial'}).locator('option').count(),2);
    assert.equal(await page.locator('#medical-today').isVisible(),true);
    assert.equal(await page.locator('#nurse').isVisible(),false);
    await toolbar.getByRole('button',{name:'Filtrar: Medicamentos',exact:true}).click();
    assert.equal(await page.locator('#medication').isVisible(),true);
    assert.equal(await page.locator('#administration').isVisible(),true);
    await toolbar.getByRole('button',{name:'Quitar filtro: Evoluciones médicas',exact:true}).click();
    assert.equal(await page.locator('#medical-today').isVisible(),false);
    assert.equal(await toolbar.getByRole('button',{name:'Quitar filtro: Medicamentos',exact:true}).getAttribute('aria-pressed'),'true');
    await toolbar.getByRole('button',{name:'Quitar todos',exact:true}).click();
    await toolbar.getByRole('button',{name:'Filtrar: Enfermería',exact:true}).click();
    assert.equal(await page.locator('#nurse').isVisible(),true);
    assert.equal(await page.locator('#administration').isVisible(),true);
    assert.equal(await page.locator('#medical-today').isVisible(),false);
    await toolbar.getByRole('button',{name:'Quitar todos',exact:true}).click();
    await toolbar.getByRole('button',{name:'Filtrar: Procedimientos',exact:true}).click();
    assert.equal(await page.locator('#procedure-yesterday').isVisible(),true);
    await page.waitForFunction(()=>{
      const host=document.querySelector('#hhr-history-date-navigation'),r=host.getBoundingClientRect();
      return r.top>=0 && r.bottom<=innerHeight && host.scrollWidth<=host.clientWidth+1;
    });
    await screenshot(page,'ficha-historial-'+width);
    await toolbar.getByRole('button',{name:'Quitar todos',exact:true}).click();
    const text=page.locator('#medical-today [data-hhr-evolution-text]');
    assert.ok(await text.evaluate(e=>Math.abs(e.getBoundingClientRect().width-e.parentElement.getBoundingClientRect().width)<2));
  }
  // The native controls can replace all results, including while a quick filter is active.
  const toolbar=page.locator('#hhr-history-date-navigation');
  await toolbar.getByRole('button',{name:'Filtrar: Evoluciones médicas',exact:true}).click();
  await page.locator('#native-timeline').evaluate((node,html)=>{node.innerHTML=html;},group('Hoy',event('only-procedure','Médico','Procedimientos')));
  await page.waitForFunction(()=>document.querySelector('#hhr-history-date-navigation')?.shadowRoot?.querySelector('[role="status"]')?.textContent.includes('Mostrando 0 de 1'));
  assert.equal(await toolbar.getByRole('combobox',{name:'Fecha del historial'}).isDisabled(),true);
  await toolbar.getByRole('button',{name:'Quitar todos',exact:true}).click();
  assert.equal(await page.locator('#only-procedure').isVisible(),true);
  await page.getByRole('tab',{name:'Resumen',exact:true}).click();
  await toolbar.waitFor({state:'detached'});
  assert.equal(await page.locator('[data-hhr-history-filtered]').count(),0);
  await page.locator('main').evaluate((main,html)=>{main.innerHTML=html;main.style.removeProperty('background');},original);
  await page.setViewportSize(viewport);await page.evaluate(()=>window.scrollTo(0,0));
};
