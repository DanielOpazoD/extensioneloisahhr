import assert from 'node:assert/strict';

export const nursingSummary = `
<style>
#nursing-test { font:14px/1.45 system-ui; }
#nursing-test section { background:white;padding:16px;margin-bottom:12px; }
#nursing-test .MuiCardHeader-root,#nursing-test .MuiCardContent-root { padding:14px; }
#nursing-test .readings { display:flex;flex-wrap:wrap;gap:14px; }
#nursing-test .reading { box-sizing:border-box;width:168px;min-height:122px;background:#eee;padding:14px; }
#nursing-test .reading p { margin:4px 0; }
#nursing-test td,#nursing-test th { padding:13px; }
#nursing-test table { width:100%; }
</style>
<div id="nursing-test"><div class="MuiTabs-root"><button role="tab" id="nurse-tab-summary" aria-selected="true">Resumen</button></div>
<nav class="MuiGrid-container"><span class="MuiTypography-caption">Diagnóstico</span><span class="MuiTypography-caption">Valoración</span></nav>
<section class="MuiCard-root"><div class="MuiCardHeader-root"><h3 class="MuiCardHeader-title">Diagnóstico</h3></div>
<div class="MuiCardContent-root"><table><thead><tr><th>Diagnóstico</th><th>Estado</th></tr></thead><tbody><tr><td>Registro sintético</td><td>En estudio</td></tr></tbody></table></div></section>
<section id="vitalSignsEntry" class="MuiCard-root"><div class="MuiCardHeader-root"><h3 class="MuiCardHeader-title">Signos vitales</h3></div><div class="MuiCardContent-root">
<div class="readings">${[['Presión','120/75','PAM: 90','50 minutos'],['Fre. Cardíaca','72','50 minutos'],['Saturación O2','98','50 minutos'],['T° axilar','37,9','50 minutos'],['Frec. respiratoria','16','50 minutos'],['Glasgow','15','50 minutos'],['Sup. Oxígeno','21','50 minutos'],['Hemoglucotest','110','2 horas'],['EVA','0','50 minutos']].map(([name,val,...extra]) =>
  '<div class="reading"><p>'+name+'</p><strong style="color:'+(name==='T° axilar'?'red':'inherit')+'">'+val+'</strong>'+extra.map(v=>'<p>'+v+'</p>').join('')+'</div>').join('')}</div>
<p>Observaciones de prueba</p><button type="button">Ver historial completo</button></div></section>
<section class="MuiCard-root"><h3>Fármacos</h3><table><thead><tr><th>Tiempo</th><th>Indicación</th><th>Posología</th><th>Acciones</th></tr></thead>
<tbody><tr><td><span style="display:inline-grid;width:48px;height:48px"><svg width="48" height="48"><text x="16" y="30">7</text></svg></span></td>
<td>Preparación de prueba</td><td>Texto de indicación</td><td><button>Leer más</button></td></tr></tbody></table></section></div>`;

export async function verifyNursingSummary(page) {
  await page.setViewportSize({width:1366,height:768});
  await page.locator('main').evaluate((main, html) => { main.innerHTML = html; }, nursingSummary);
  const grid = page.locator('[data-hhr-reading="vital-grid"]');
  await grid.waitFor();
  const tiles = grid.locator(':scope > *');
  assert.equal(await tiles.count(),9);
  const rects = await tiles.evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().toJSON()));
  assert.ok(rects.every(r => r.top === rects[0].top && r.height < 86),JSON.stringify(rects));
  assert.equal(await tiles.nth(3).locator('strong').evaluate(el=>getComputedStyle(el).color),'rgb(255, 0, 0)');
  assert.ok(await page.getByRole('button',{name:'Ver historial completo'}).isVisible());
  assert.ok((await page.locator('#nursing-test tbody tr').last().boundingBox()).height < 46);
  // Partial navigation must not undo density while the section itself is still mounted.
  await page.locator('#nursing-test nav').evaluate(el=>el.remove());
  await page.waitForFunction(()=>!document.querySelector('[data-hhr-ficha-sections]'));
  assert.equal(await tiles.count(),9);
  await page.setViewportSize({width:390,height:844});
  assert.ok(await tiles.last().evaluate(el=>el.getBoundingClientRect().right <= innerWidth));
}
