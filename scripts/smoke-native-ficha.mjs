import assert from 'node:assert/strict';
import { medicalRoundWithControls } from './medical-round-visual-fixture.mjs';
import { verifyNursingSummary } from './smoke-nursing-summary-density.mjs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const event = (id, role, category) => `<div id="${id}" class="MuiCard-root" style="background:white;border-radius:10px;margin-bottom:12px;padding:16px">
  <div class="MuiCardHeader-root"><span class="MuiCardHeader-title">${id === 'nurse' ? 'Autora de prueba' : 'Profesional de prueba'}</span><span class="MuiCardHeader-subheader">${role}</span>
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
      ${[['alertEntrySection','Alertas'],['diagnosisEntrySection','Diagnóstico'],['procedureEntrySection','Procedimientos'],['vitalSignsEntry','Signos vitales'],['nutritionOrderEntrySection','Régimen'],['restEntrySection','Reposo']].map(([id,label])=>`<section id="${id}"><h2>${label}</h2>Contenido sintético</section>`).join('')}
      <section id="freeIndicationEntrySection"><h2>Indicaciones</h2><p>Primera indicación de prueba.</p><p>Segunda indicación de prueba.</p></section>
      <section id="physicalExaminationEntry"><h2>Examen físico</h2><p>Primer registro.</p><p>Segundo registro.</p></section>
      <section id="medicationEntrySection"><div class="MuiCard-root"><div class="MuiCardHeader-root"><h2 class="MuiCardHeader-title">Fármacos</h2></div>
        <div class="MuiCardContent-root"><table><tbody><tr><td>Preparación A</td><td>Registro 1</td></tr><tr><td>Preparación B</td><td>Registro 2</td></tr></tbody></table></div>
        <div class="MuiCardActions-root"><button aria-label="Imprimir fármacos" type="button">Imprimir</button></div></div></section>
      <section id="observationEntrySection"><div id="evolution" class="MuiCard-root"><span class="MuiCardHeader-title">Evolución</span><div class="MuiCardHeader-action"></div>
        <div class="MuiCardContent-root"><div class="MuiStack-root"><div class="MuiStack-root" style="width:100%;display:flex">
          <div class="MuiBox-root" style="width:350px"><span class="MuiTypography-caption">Profesional de prueba</span><div class="MuiBox-root">${'Texto sintético de evolución que debe aprovechar todo el ancho disponible. '.repeat(28)}</div></div>
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

export const verifyNativeFicha = async (page, worker) => {
  const original = await page.locator('main').innerHTML();
  const viewport = page.viewportSize();
  await page.locator('main').evaluate((main, html) => {
    main.innerHTML=html; main.style.background='#f3f5f4';
  },fixture);
  await page.locator('main').evaluate(bindNativeTabs);
  for(const width of [1366,1280,840,707,390]) {
    await page.setViewportSize({width,height:width === 1366 ? 768 : 900});
    await page.getByRole('tab',{name:'Resumen',exact:true}).click();
    await page.locator('[data-hhr-ficha-sections]').waitFor();
    const link=page.locator('[data-hhr-ficha-link]').filter({hasText:'Evolución'});
    if (width === 1280) {
      const optional = page.locator('#procedureEntrySection');
      await optional.evaluate(el => el.lastChild.textContent = 'Sin registros');
      const showEmpty = page.getByRole('button', { name:'Ver vacías (1)' });
      await showEmpty.waitFor();
      assert.equal(await optional.isVisible(), false);
      const procedureLink = page.locator('[data-hhr-ficha-link="procedureEntrySection"]');
      assert.equal(await procedureLink.isVisible(), false);
      await showEmpty.press('Enter');
      assert.equal(await optional.isVisible(), true);
      assert.equal(await procedureLink.isVisible(), true);
      await page.getByRole('button', { name:'Ocultar vacías (1)' }).click();
      await optional.evaluate(el => el.lastChild.textContent = 'Procedimiento de prueba');
      await optional.waitFor();
      await showEmpty.waitFor({state:'detached'});
    }
    const summaryLayout = await page.evaluate(() => {
      const grid = document.querySelector('[data-hhr-ficha-summary-grid]');
      const section = document.getElementById('observationEntrySection');
      const firstTop = grid.firstElementChild.getBoundingClientRect().top;
      const firstRow = [...grid.children].filter(item => Math.abs(item.getBoundingClientRect().top - firstTop) < 1);
      const medium = document.getElementById('freeIndicationEntrySection');
      const meds = document.getElementById('medicationEntrySection');
      const print = meds.querySelector('button').getBoundingClientRect();
      const heading = meds.querySelector('h2').getBoundingClientRect();
      return { columns:firstRow.length, width:grid.clientWidth, gap:parseFloat(getComputedStyle(grid).columnGap), mediumWidth:medium.offsetWidth,
        sameHeader:print.top < heading.bottom && print.bottom > heading.top,
        count:meds.querySelector('h2').dataset.hhrVisibleMedications, medsWidth:meds.offsetWidth,
        evolutionWidth:section.getBoundingClientRect().width, cardHeight:document.getElementById('diagnosisEntrySection').offsetHeight };
    });
    assert.equal(summaryLayout.columns, width >= 1100 ? 3 : width >= 800 ? 2 : 1);
    assert.ok(Math.abs(summaryLayout.medsWidth-summaryLayout.width)<2);
    assert.equal(summaryLayout.count,'2');
    assert.equal(summaryLayout.sameHeader,true);
    if (width >= 1100) assert.ok(Math.abs(summaryLayout.mediumWidth - (summaryLayout.width - summaryLayout.gap) / 2) < 2);
    assert.ok(summaryLayout.cardHeight < 180, 'La tarjeta breve sigue reservando altura vacía');
    assert.ok(Math.abs(summaryLayout.evolutionWidth-summaryLayout.width) < 2);
    await link.focus();
    await link.press('Enter');
    await page.waitForFunction(()=>document.querySelector('[data-hhr-ficha-link][aria-current="location"]')?.textContent==='Evolución').catch(async error => {
      const state = await page.evaluate(() => ({
        width:innerWidth, active:document.querySelector('[data-hhr-ficha-link][aria-current="location"]')?.textContent,
        offset:scrollY, fullHeight:document.scrollingElement.scrollHeight, viewport:innerHeight,
        railBottom:document.querySelector('[data-hhr-ficha-sections]').getBoundingClientRect().bottom,
        targetTop:document.querySelector('#observationEntrySection').getBoundingClientRect().top,
        targets:[...document.querySelectorAll('[data-hhr-ficha-link]')].map(el=>[el.dataset.hhrFichaLink,document.getElementById(el.dataset.hhrFichaLink)?.getBoundingClientRect().top])
      }));
      throw new Error('El enlace de Evolución no se activó: '+JSON.stringify(state), {cause:error});
    });
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
    if (width === 1366) {
      await page.locator('#evolution').getByRole('button',{name:'Ver evoluciones'}).click();
      const authors = page.getByRole('group',{name:'Evoluciones por profesional'});
      const visibleCards = page.locator('#native-timeline .MuiCard-root:visible');
      await authors.getByRole('button',{name:'Todos'}).waitFor();
      assert.equal(await visibleCards.count(),3);
      await authors.getByRole('button',{name:'Autora de prueba'}).click();
      assert.deepEqual(await visibleCards.evaluateAll(cards => cards.map(card => card.id)),['nurse']);
      await page.getByRole('button',{name:'Historial completo',exact:true}).click();
      assert.equal(await visibleCards.count(),7);
    } else {
      await page.getByRole('tab',{name:'Historial',exact:true}).click();
    }
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
    const layout = await page.locator('#medical-today').evaluate(card => {
      const bounds = selector => card.querySelector(selector).getBoundingClientRect();
      const clock = bounds('.MuiCardHeader-action'), category = bounds('.MuiCardContent-root > p'), who = bounds('.MuiCardHeader-title');
      return { compact:card.hasAttribute('data-hhr-history-inline'), inline:clock.left < category.left && category.left < who.left &&
        clock.bottom > category.top && category.bottom > who.top };
    });
    assert.ok(layout.compact);
    if(width >= 800) assert.ok(layout.inline);
    assert.equal(await date.locator('option').count(),3);
    if (width === 1366) {
      const divider = page.locator('#native-timeline > .MuiBox-root').first().locator(':scope > :first-child');
      await page.evaluate(() => window.scrollBy(0,180));
      await page.waitForFunction(() => {
        const divider=document.querySelector('#native-timeline > .MuiBox-root > :first-child').getBoundingClientRect();
        const rail=document.querySelector('[data-hhr-history-rail]').getBoundingClientRect();
        return Math.abs(divider.top-rail.bottom)<2;
      });
      assert.equal(await divider.innerText(),'Hoy');
      await page.evaluate(() => window.scrollTo(0,0));
    }
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
  await page.getByRole('tab',{name:'Resumen',exact:true}).click();
  await page.locator('#native-summary').evaluate(grid => {
    const pair = document.createElement('div');
    const left = document.createElement('div'), right = document.createElement('div');
    grid.before(pair);
    pair.append(left, right);
    left.append(document.getElementById('alertEntrySection'));
    right.append(document.getElementById('observationEntrySection'));
    const table = grid.querySelector('#medicationEntrySection table');
    table.innerHTML = '<tbody><tr><td style="padding:16px">Registro de prueba</td><td style="padding:16px"><button class="MuiIconButton-root" aria-label="Abrir" style="padding:12px"><svg width="24" height="24"></svg></button></td></tr></tbody>';
    document.getElementById('freeIndicationEntrySection').append(table.cloneNode(true));
  });
  const pair = page.locator('[data-hhr-ficha-reading-pair]');
  await pair.waitFor();
  for (const width of [1366,390]) {
    await page.setViewportSize({width,height:768});
    const [alerts, evolution] = await pair.locator(':scope > *').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()));
    assert.ok(evolution.top >= alerts.bottom && evolution.right <= width && Math.abs(evolution.width - alerts.width) < 2);
    for (const id of ['medicationEntrySection','freeIndicationEntrySection']) {
      const row = page.locator('#'+id+' tbody tr').first();
      assert.ok((await row.boundingBox()).height <= 34);
      assert.equal((await row.locator('.MuiIconButton-root').boundingBox()).height,24);
      assert.equal((await row.locator('svg').boundingBox()).height,15);
    }
  }
  await page.setViewportSize({width:1366,height:768});
  await page.locator('#alertEntrySection').evaluate(section => {
    section.innerHTML = '<h2>Alertas</h2><div role="alert">Alerta A</div><div role="alert">Alerta B</div>';
  });
  await page.waitForFunction(() => {
    const [a,e] = [...document.querySelector('[data-hhr-ficha-reading-pair]').children].map(el => el.getBoundingClientRect());
    return e.width > a.width*2 && Math.abs(e.top-a.top)<1;
  });
  await page.locator('#vitalSignsEntry').evaluate(el => {
    el.innerHTML = '<h2>Signos vitales</h2><table><thead><tr><th>Signo</th><th>Valor</th><th>Unidad</th><th>Hora</th></tr></thead>' +
      '<tbody><tr><td>FC</td><td>74</td><td>lpm</td><td>09:45</td></tr><tr><td>FR</td><td>16</td><td>rpm</td><td>08:25</td></tr></tbody></table>';
  });
  const strip = page.locator('.hhr-ficha-vitals');
  await strip.waitFor();
  assert.deepEqual(await strip.locator('dd').allTextContents(),['74 lpm09:45','16 rpm08:25']);
  const nativeVitals = page.locator('#vitalSignsEntry table');
  assert.equal(await nativeVitals.isVisible(),false);
  await strip.getByRole('button',{name:'Ver registros'}).press('Enter');
  assert.equal(await nativeVitals.isVisible(),true);
  await page.locator('#medicationEntrySection table').evaluate(table => {
    table.innerHTML = '<thead><tr><th>Hora</th><th>Fármaco</th><th>Posología</th><th>Indicaciones específicas</th><th>Acciones</th></tr></thead>' +
      '<tbody><tr><td>09:00</td><td>Preparación sintética</td><td>Texto de prueba</td><td>Instrucciones de prueba con espacio para la lectura</td><td><button>Abrir</button></td></tr></tbody>';
  });
  const narrow = page.locator('#medicationEntrySection th[data-hhr-reading="narrow"]');
  await narrow.first().waitFor();
  assert.deepEqual(await narrow.allTextContents(),['Hora','Acciones']);
  const widths = await page.locator('#medicationEntrySection tbody td').evaluateAll(cells => cells.map(cell => cell.offsetWidth));
  assert.ok(widths[3] > widths[0] && widths[3] > widths[4]);
  await page.getByRole('tab',{name:'Historial',exact:true}).click();
  const firstNote = page.locator('#nurse');
  await firstNote.evaluate(note => {
    const other = note.cloneNode(true); other.id = 'second-evolution';
    note.after(other);
  });
  const second = page.locator('#second-evolution[data-hhr-history-inline="evolution"]');
  await second.waitFor();
  assert.equal(await second.evaluate(el => getComputedStyle(el).borderTopWidth),'1px');
  for (const note of [firstNote,second]) {
    const geometry = await note.evaluate(el => {
      const top = sel => el.querySelector(sel).getBoundingClientRect().top;
      return [top('.MuiCardHeader-action'),top('.MuiCardHeader-title'),top('.MuiCardHeader-subheader'),top('.MuiCardContent-root > .MuiStack-root')];
    });
    assert.ok(Math.max(...geometry.slice(0,3))-Math.min(...geometry.slice(0,3)) < 6);
    assert.ok(geometry[3] > Math.max(...geometry.slice(0,3)));
  }
  // Native filtering still controls the available dates and events.
  const toolbar=page.locator('#hhr-history-date-navigation');
  await page.locator('#native-timeline').evaluate((node,html)=>{node.innerHTML=html;},group('Hoy',event('only-procedure','Médico','Procedimientos')));
  await page.waitForFunction(()=>document.querySelector('#hhr-history-date-navigation')?.shadowRoot?.querySelector('select')?.options.length===1);
  assert.equal(await page.locator('#only-procedure').isVisible(),true);
  await page.getByRole('tab',{name:'Resumen',exact:true}).click();
  await toolbar.waitFor({state:'detached'});
  assert.equal(await page.locator('[data-hhr-history-filtered]').count(),0);
  await verifyNursingSummary(page, worker);
  // Load the native-shaped medical cards through the installed extension, including
  // their text-node labels and empty React caption boxes.
  const medical = await page.context().newPage();
  try {
    await medical.setViewportSize({width:1366,height:850});
    await medical.route(page.url(), route => route.fulfill({contentType:'text/html',body:medicalRoundWithControls}));
    await medical.goto(page.url());
    const measurements = medical.locator('section#vitalSignsEntry [data-hhr-reading="vital-value"]');
    await measurements.nth(8).waitFor();
    assert.equal(await measurements.count(),9);
    const tops = await medical.locator('.vitals-grid > *').evaluateAll(tiles =>
      tiles.map(tile => Math.round(tile.getBoundingClientRect().top)));
    assert.equal(new Set(tops).size,1);
    assert.equal(await medical.locator('#estimatedDischargeSection').isVisible(),false);
    await medical.getByRole('button',{name:/ver historial completo/i}).press('Enter');
    await medical.getByRole('dialog',{name:'Historial de signos'}).waitFor();
  } finally {
    await medical.close();
  }
  await page.locator('main').evaluate((main,html)=>{main.innerHTML=html;main.style.removeProperty('background');},original);
  await page.setViewportSize(viewport);await page.evaluate(()=>window.scrollTo(0,0));
};
