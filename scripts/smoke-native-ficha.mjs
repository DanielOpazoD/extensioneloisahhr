import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const event = (id, role, category) => `<div id="${id}" class="MuiCard-root" style="background:white;border-radius:10px;margin-bottom:12px;padding:16px">
  <div class="MuiCardHeader-root"><span class="MuiCardHeader-title">Profesional de prueba</span><span class="MuiCardHeader-subheader">${role}</span>
    <span class="MuiCardHeader-action">${id === 'medical-today' ? '09:10 hrs' : '10:07 hrs'}</span></div>
  <div class="MuiCardContent-root"><p class="MuiTypography-root">${category}</p><div class="MuiStack-root"><div class="MuiStack-root" style="display:flex;gap:8px">
    <p class="MuiTypography-root" style="flex:1;margin:0">${'Texto sintético para verificar el ancho de lectura de una evolución. '.repeat(8)}</p>
    <div class="MuiChip-root" style="flex:none">Etiqueta</div></div></div></div></div>`;
const group = (date, cards) => `<div class="MuiBox-root"><div class="MuiStack-root"><div class="MuiChip-root"><span class="MuiChip-label">${date}</span></div></div>${cards}</div>`;
const fixture = `
  <style>
    main { font:14px/1.5 system-ui,sans-serif; }
    .MuiCardHeader-root,.MuiCardContent-root { padding:16px; }
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
    <div class="MuiTabs-root"><div class="MuiTabs-scroller" style="overflow:hidden"><div role="tablist" style="display:flex;white-space:nowrap">
      ${[['summary','Resumen'],['antecedents','Antecedentes'],['care-plan','Plan de tratamiento'],['history','Historial'],['discharge','Alta']].map(([id,label])=>
        `<button role="tab" id="encounter-event-tab-${id}" aria-selected="${id==='summary'}">${label}</button>`).join('')}
    </div></div></div>
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
      ${group('Hoy',event('nurse','Enfermera(o)','Evolución')+event('medication','Médico','Fármacos')+event('medical-today','Médico','Evolución')+event('administration','Paramédico','Administrador de medicamentos')+event('procedure-today','Médico','Procedimientos'))}
      ${group('Ayer',event('procedure-yesterday','Médico','Procedimientos'))}
      ${group('01-01-2025',event('medical-old','Médico','Evolución'))}
    </div></div></div>`;

function bindNativeTabs(main) {
  main.querySelectorAll('[role="tab"]').forEach(tab=>tab.addEventListener('click',()=>{
    main.querySelectorAll('[role="tab"]').forEach(other=>other.setAttribute('aria-selected',String(other===tab)));
    main.querySelector('#native-summary-view').hidden=tab.id!=='encounter-event-tab-summary';
    main.querySelector('#native-history-view').hidden=tab.id!=='encounter-event-tab-history';
    window.scrollTo(0,0);
  }));
}

export const nativeFichaFixture = () =>
  `<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body><main>${fixture}</main><script>(${bindNativeTabs.toString()})(document.querySelector('main'));</script></body></html>`;

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
  },fixture);
  await page.locator('main').evaluate(bindNativeTabs);
  for(const width of [1280,840,707,390]) {
    await page.setViewportSize({width,height:900});
    await page.getByRole('tab',{name:'Resumen',exact:true}).click();
    await page.locator('[data-hhr-ficha-sections]').waitFor();
    const link=page.locator('[data-hhr-ficha-link]').filter({hasText:'Evolución'});
    if (width === 1280) {
      const optional = page.locator('#procedureEntrySection');
      await optional.evaluate(el => el.lastChild.textContent = 'Sin registros');
      const showEmpty = page.getByRole('button', { name:'Ver vacías (1)' });
      await showEmpty.waitFor();
      assert.equal(await optional.isVisible(), false);
      await showEmpty.press('Enter');
      assert.equal(await optional.isVisible(), true);
      await page.getByRole('button', { name:'Ocultar vacías (1)' }).click();
      await optional.evaluate(el => el.lastChild.textContent = 'Procedimiento de prueba');
      await optional.waitFor();
      await showEmpty.waitFor({state:'detached'});
    }
    const summaryLayout = await page.evaluate(() => {
      const grid = document.querySelector('[data-hhr-ficha-summary-grid]');
      const section = document.getElementById('observationEntrySection');
      return { columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length, width:grid.clientWidth,
        evolutionWidth:section.getBoundingClientRect().width, cardHeight:document.getElementById('diagnosisEntrySection').offsetHeight };
    });
    assert.equal(summaryLayout.columns, width >= 1100 ? 2 : 1);
    assert.ok(summaryLayout.cardHeight < 180, 'La tarjeta breve sigue reservando altura vacía');
    assert.ok(Math.abs(summaryLayout.evolutionWidth-summaryLayout.width) < 2);
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
    const date=toolbar.getByRole('combobox',{name:'Fecha del historial'});
    await date.waitFor();
    const inline = await toolbar.evaluate(host => {
      const row = host.parentElement;
      const history = row.querySelector('#encounter-event-tab-history').getBoundingClientRect();
      const discharge = row.querySelector('#encounter-event-tab-discharge').getBoundingClientRect();
      const scroller = row.closest('.MuiTabs-scroller').getBoundingClientRect();
      const dates = host.getBoundingClientRect();
      return dates.left >= history.right && dates.left - history.right <= 10 && dates.right <= discharge.left &&
        dates.top >= history.top - 1 && dates.bottom <= history.bottom + 1 &&
        dates.left >= scroller.left && dates.right <= scroller.right + 1;
    });
    assert.ok(inline, `Date controls not visible next to Historial at ${width}px`);
    assert.equal(await date.locator('option').count(),3);
    assert.equal(await toolbar.getByRole('button').count(),2);
    assert.equal(await toolbar.locator('[data-filter],[role="status"]').count(),0);
    assert.equal(await page.locator('#native-timeline .MuiCard-root').count(),7);
    await date.selectOption('2');
    await page.waitForFunction(()=>document.querySelector('#hhr-history-date-navigation')?.shadowRoot?.querySelector('select')?.value==='2').catch(async error=>{
      const geometry=await page.evaluate(()=>({ width:innerWidth,height:innerHeight,scrollY,scrollHeight:document.scrollingElement.scrollHeight,
        selected:document.querySelector('#hhr-history-date-navigation')?.shadowRoot?.querySelector('select')?.value,
        groups:[...document.querySelectorAll('#native-timeline > .MuiBox-root')].map(e=>({top:e.getBoundingClientRect().top,height:e.getBoundingClientRect().height})),
        toolbar:document.querySelector('#hhr-history-date-navigation')?.getBoundingClientRect().toJSON() }));
      throw new Error('Date jump did not settle: '+JSON.stringify(geometry),{cause:error});
    });
    await page.waitForFunction(()=>{
      const host=document.querySelector('#hhr-history-date-navigation'),r=host.getBoundingClientRect();
      const controls=host.shadowRoot.querySelector('nav').getBoundingClientRect();
      const operations=document.querySelector('#hhr-clinical-operations-bar').getBoundingClientRect();
      const overlaps=controls.left<operations.right && controls.right>operations.left &&
        controls.top<operations.bottom && controls.bottom>operations.top;
      return r.top>=0 && r.bottom<=innerHeight && r.height<=44 && r.width<=270 && host.scrollWidth<=host.clientWidth+1 && !overlaps;
    });
    await screenshot(page,'ficha-historial-'+width);
    const text=page.locator('#medical-today [data-hhr-evolution-text]');
    assert.ok(await text.evaluate(e=>Math.abs(e.getBoundingClientRect().width-e.parentElement.getBoundingClientRect().width)<2));
  }
  // Native filtering still controls the available dates and events.
  const toolbar=page.locator('#hhr-history-date-navigation');
  await page.locator('#native-timeline').evaluate((node,html)=>{node.innerHTML=html;},group('Hoy',event('only-procedure','Médico','Procedimientos')));
  await page.waitForFunction(()=>document.querySelector('#hhr-history-date-navigation')?.shadowRoot?.querySelector('select')?.options.length===1);
  assert.equal(await page.locator('#only-procedure').isVisible(),true);
  await page.getByRole('tab',{name:'Resumen',exact:true}).click();
  await toolbar.waitFor({state:'detached'});
  assert.equal(await page.locator('[data-hhr-history-filtered]').count(),0);
  await page.locator('main').evaluate((main,html)=>{main.innerHTML=html;main.style.removeProperty('background');},original);
  await page.setViewportSize(viewport);await page.evaluate(()=>window.scrollTo(0,0));
};
