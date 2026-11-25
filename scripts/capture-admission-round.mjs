import assert from 'node:assert/strict';
import path from 'node:path';
import { freeInstruction, lastAdmissionLine, medicationInstructions } from './admission-round-visual-fixture.mjs';

async function readLastLineWithKeyboard(page, target) {
  await page.keyboard.press('End');
  const source = await target.elementHandle();
  try {
    await page.waitForFunction(({source,last}) => {
      const text = source.firstChild;
      const line = document.createRange();
      line.setStart(text,text.length - last.length);
      line.setEnd(text,text.length);
      const end = [...line.getClientRects()].at(-1);
      const viewport = document.activeElement.getBoundingClientRect();
      return end.top >= viewport.top - 1 && end.bottom <= viewport.bottom + 1;
    }, {source,last:lastAdmissionLine}, {timeout:3000});
  } finally {
    await source.dispose();
  }
}

async function verifyAdmissionReader(page, noteText, directory, width) {
  const opener = page.getByRole('button', {name:'Leer nota completa', exact:true});
  const reader = page.getByRole('dialog', {name:'Evolución completa', exact:true});
  const text = await noteText.textContent();
  const columnBounds = () => page.evaluate(() =>
    ['#evolution', 'section#vitalSignsEntry', '#shiftChangeObservation', '#alerts'].map(selector => {
      const {x,y,width,height} = document.querySelector(selector).getBoundingClientRect();
      return [x,y,width,height];
    }));
  // Start at the native note text. The host may place its own disclosure before the reader action.
  for (let step = 0; step < 4; step++) {
    await page.keyboard.press('Tab');
    if (await opener.evaluate(el => el === document.activeElement)) break;
  }
  assert.ok(await opener.evaluate(el => el === document.activeElement), 'El lector entra en la secuencia de Tab');
  const initialColumns = await columnBounds();
  await page.keyboard.press('Enter');
  await reader.waitFor();
  assert.ok(await reader.evaluate(el => el.matches('dialog:modal') && el.contains(document.activeElement)));
  assert.ok(await reader.getByRole('heading', {name:'Evolución completa',exact:true}).isVisible());
  const body = reader.getByText(lastAdmissionLine, {exact:false});
  assert.equal(await body.textContent(), text, 'El lector conserva los párrafos, incluidos el inicio y cierre del ingreso');
  const close = reader.getByRole('button', {name:'Cerrar', exact:true});
  assert.ok(await close.isVisible());
  assert.deepEqual(await columnBounds(), initialColumns, 'Abrir el lector mantiene las dos columnas en su posición');
  assert.ok(await reader.getByText('Más texto abajo ↓', {exact:true}).isVisible());
  if (width === 1440) await page.screenshot({path:path.join(directory, '1440-lector.png')});
  await readLastLineWithKeyboard(page, body);
  await reader.getByText('Fin de la evolución',{exact:true}).waitFor();
  await page.keyboard.press('Escape');
  await reader.waitFor({state:'hidden'});
  assert.ok(await opener.evaluate(el => el === document.activeElement), 'Escape devuelve el foco al botón del lector');
  assert.deepEqual(await columnBounds(), initialColumns, 'Cerrar el lector conserva los bordes de las dos columnas');
  await page.keyboard.press('Enter');
  await reader.waitFor();
  await close.press('Enter');
  await reader.waitFor({state:'hidden'});
  assert.ok(await opener.evaluate(el => el === document.activeElement), 'Cerrar también devuelve el foco al botón del lector');
}

export async function captureAdmissionRound(page, directory, width, verify) {
  const noteText = page.locator('#evolution .MuiBox-root > .MuiTypography-caption');
  await page.waitForFunction(last => document.querySelector('#evolution .MuiTypography-caption').textContent.endsWith(last), lastAdmissionLine);
  assert.ok((await noteText.textContent()).split('\n').length > 40);
  const settle = () => page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
  await settle();
  const measured = await page.evaluate(() => {
    const box = selector => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return {x:r.x, y:r.y, width:r.width, height:r.height};
    };
    return {
      viewport:[innerWidth, innerHeight], pageWidth:document.documentElement.scrollWidth,
      note:box('#evolution'), signs:box('section#vitalSignsEntry'), observations:box('#shiftChangeObservation'),
      alerts:box('#alerts'), exam:box('#diagnosisTestEntry'), surgery:box('#operationTheaterRequest'),
      rest:box('#rest'), diet:box('#diet'), medication:box('#medication'), print:box('#fixture-print'),
      indications:[...document.querySelectorAll('[data-fixture-text]')].map(el => el.textContent.length),
    };
  });
  console.info('Ingreso sintético', JSON.stringify(measured));
  await page.screenshot({path:path.join(directory, width + '-ingreso.png')});
  // Folded into its pill, the floating bar leaves the end of the section line free in the smaller window.
  if (width === 1280) {
    const floating = page.locator('#hhr-clinical-operations-bar');
    const resize = () => page.evaluate(() => { window.dispatchEvent(new Event('resize')); });
    await floating.evaluate(el => { el.style.width = '36px'; });
    await resize(); await settle(); await settle();
    await page.screenshot({path:path.join(directory, width + '-barra-plegada.png')});
    await floating.evaluate(el => { el.style.removeProperty('width'); });
    await resize(); await settle(); await settle();
  }
  await page.locator('#medication').evaluate(card => window.scrollBy(0, card.getBoundingClientRect().top - 40));
  await settle();
  await page.screenshot({path:path.join(directory, width + '-indicaciones.png')});
  if (!verify) return;

  for (const [index, expected] of [...medicationInstructions, freeInstruction].entries()) {
    const text = page.locator('[data-fixture-text]').nth(index);
    assert.equal(await text.innerText(), expected);
    assert.ok(await text.evaluate(el => {
      const r = document.createRange();
      r.selectNodeContents(el);
      const cell = el.closest('td').getBoundingClientRect();
      return [...r.getClientRects()].every(rect => rect.left >= cell.left - 1 && rect.right <= cell.right + 1 &&
        rect.top >= cell.top - 1 && rect.bottom <= cell.bottom + 1);
    }), 'La última palabra debe caber dentro de su propia celda');
  }

  const print = page.getByRole('button',{name:'Imprimir indicaciones',exact:true});
  assert.ok(await print.isVisible());
  await print.press('Enter');
  assert.equal(await print.getAttribute('data-fixture-print'),'clicked');
  const chips = page.locator('#medication .MuiChip-root');
  assert.deepEqual(await chips.allTextContents(),['SOS',width === 1280 ? 'Antimicrobiano' : 'Antimic.']);
  for (const chip of await chips.all()) {
    const metrics = await chip.evaluate(marker => {
      const luminance = color => {
        const linear = color.match(/\d+(?:\.\d+)?/g).slice(0,3).map(value => {
          const channel = Number(value) / 255;
          return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
        });
        return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
      };
      const medication = document.createRange();
      medication.selectNodeContents(marker.previousElementSibling);
      const mark = marker.getBoundingClientRect();
      const name = [...medication.getClientRects()].at(-1);
      const style = getComputedStyle(marker);
      const ink = luminance(style.color), surface = luminance(style.backgroundColor);
      return {height:mark.height, inline:mark.top < name.bottom - 2 && mark.bottom > name.top + 2,
        gap:mark.left - name.right, rule:style.borderInlineStartWidth, contrast:(surface + .05) / (ink + .05)};
    });
    assert.ok(metrics.height > 0 && metrics.height <= 22, 'El marcador tiene altura de texto');
    assert.ok(!metrics.inline || (metrics.gap >= 5 && metrics.gap <= 7), 'La marca deja entre 5 y 7 px desde el nombre');
    assert.equal(metrics.rule,'2px');
    assert.ok(metrics.contrast >= 4.5, 'El texto de cada marca mantiene contraste con su propia superficie');
  }

  await page.evaluate(() => window.scrollTo(0,0));
  // With the guideline menu mounted, the five note actions and the byline still share one line.
  const toolbar = await page.locator('#evolution').evaluate(card => {
    const box = el => el.getBoundingClientRect();
    const tools = ['.hhr-evo-entry','button:has(> svg[aria-label="Enmendar"])','button:has(> svg[aria-label="Ver enmendados"])','.hhr-checklist-trigger',
      '.MuiCardHeader-action .MuiIconButton-root'].map(selector => card.querySelector(selector));
    return {
      lefts:tools.map(tool => box(tool).left), tops:tools.map(tool => Math.round(box(tool).top)),
      sizes:tools.map(tool => [box(tool).width, box(tool).height]),
      captions:tools.map(tool => getComputedStyle(tool,'::after').content),
      inside:box(tools.at(-1)).right <= box(card).right + 1,
      heading:box(card.querySelector('.MuiCardHeader-title')), byline:box(card.querySelector('[data-hhr-update-label]')),
    };
  });
  assert.deepEqual(toolbar.lefts, [...toolbar.lefts].sort((a,b) => a - b), 'Las acciones se leen de las evoluciones al menú');
  assert.equal(new Set(toolbar.tops).size, 1, 'Las cinco acciones de la nota comparten una línea');
  assert.ok(toolbar.sizes.every(([w,h]) => w >= 28 && h >= 28) && toolbar.inside, 'Cada acción conserva su área activa dentro de la tarjeta');
  assert.deepEqual(toolbar.captions.slice(1,4).map(text => text.split('"')[1]), ['Enmendar','Enmendados','Pautas'],
    'Cada acción nativa lleva el nombre que le da Eloísa');
  assert.ok(toolbar.byline.top < toolbar.heading.bottom && toolbar.byline.left >= toolbar.heading.right,
    'La fecha y el profesional siguen al título en su misma línea');
  const focusStart = page.getByRole('button',{name:'Ver evoluciones',exact:true});
  await focusStart.focus();
  const noteOwnsFocusedScroller = () => noteText.evaluate(text => {
    const el = document.activeElement;
    return (el === text || el.contains(text)) && el.closest('#evolution') &&
      /^(auto|scroll)$/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight;
  });
  let keyboardScroll = false;
  for (let step = 0; step < 16; step++) {
    await page.keyboard.press('Tab');
    if (await noteOwnsFocusedScroller()) { keyboardScroll = true; break; }
  }
  assert.ok(keyboardScroll, 'Tab debe llegar al texto desplazable de la evolución');
  await readLastLineWithKeyboard(page, noteText);
  await verifyAdmissionReader(page, noteText, directory, width);
  const {note, signs, observations, alerts, exam, surgery, rest, diet} = measured;
  const right = r => r.x + r.width;
  const bottom = r => r.y + r.height;
  const aligned = (a,b) => Math.abs(a.x - b.x) < 2 && Math.abs(right(a) - right(b)) < 2;
  assert.equal(measured.pageWidth,width);
  assert.ok(note.height < measured.viewport[1] * 0.62, 'El ingreso largo deja espacio para Signos en el primer pantallazo');
  assert.ok(aligned(note,signs) && Math.abs(signs.y - bottom(note)) < 2, 'Signos sigue a la nota con ambos bordes alineados');
  assert.ok(aligned(observations,alerts) && Math.abs(alerts.y - bottom(observations)) < 2, 'Alertas sigue a Observaciones sin hueco');
  for (const request of [exam,surgery]) {
    assert.ok(request.x >= alerts.x - 1 && right(request) <= right(alerts) + 1 && request.height > 0 && request.height <= 36,
      'La solicitud vacía se lee en una fila lateral');
  }
  assert.ok(Math.abs(exam.x - alerts.x) < 2 && Math.abs(right(surgery) - right(alerts)) < 2 &&
    Math.abs(surgery.x - right(exam)) <= 2 && Math.abs(exam.y - surgery.y) < 2 && Math.abs(exam.y - bottom(alerts)) < 2 &&
    Math.abs(exam.height - surgery.height) < 1, 'Las dos solicitudes comparten una línea debajo de Alertas');
  // Without a rest order, both instructions fit on one line below the measurements.
  assert.ok(Math.abs(rest.x - signs.x) < 2 && Math.abs(right(diet) - right(signs)) < 2 && Math.abs(diet.x - right(rest)) < 2 &&
    Math.abs(rest.y - bottom(signs)) < 2 && Math.abs(diet.y - rest.y) < 2, 'Reposo y Régimen comparten la línea debajo de Signos');
  assert.ok(rest.height > 0 && rest.height <= 36 && diet.height > 0 && diet.height <= 52, 'Reposo vacío y Régimen con observación y firma son compactos');
  const emptyRest = await page.locator('#rest [data-hhr-round="care-empty"]').evaluate(el => getComputedStyle(el,'::after').content);
  assert.match(emptyRest, /^"Sin registro"/, 'Un reposo sin registro se resume en dos palabras');
  assert.ok(await page.getByText('No se presenta un Reposo registrado para este paciente').isVisible());
  assert.ok(await page.getByText('Preferir porciones pequeñas.').isVisible());

  // Three prescription cards signed in one act say so once. A different byline is shown in full.
  const bylines = () => page.evaluate(() => ['#medication','#freeIndication','#procedureOrder'].map(id => {
    const byline = document.querySelector(id + ' .MuiCardHeader-subheader');
    return [byline.getAttribute('data-hhr-update-repeat'), getComputedStyle(byline,'::after').content.split('"')[1], byline.title];
  }));
  const signature = '15-04-2026 · 09:12 · Tomás Ejemplo';
  assert.deepEqual(await bylines(), [[null,signature,''],['above','↑ misma firma',signature],['above','↑ misma firma',signature]]);
  const free = page.locator('#freeIndication .MuiCardHeader-subheader');
  const nativeByline = await free.textContent();
  await free.evaluate(el => {
    el.textContent = 'Última actualización: 15-04-2026, 12:05:10, Enfermera Elena Ejemplo';
    document.dispatchEvent(new Event('fixture-refresh'));
  });
  assert.deepEqual(await bylines(), [[null,signature,''],[null,'15-04-2026 · 12:05 · Elena Ejemplo',''],[null,signature,'']],
    'Una firma distinta separa las tarjetas de arriba y de abajo');
  await free.evaluate((el, text) => { el.textContent = text; document.dispatchEvent(new Event('fixture-refresh')); }, nativeByline);
  const actions = page.locator('#medication').getByRole('columnheader',{name:'Acciones',exact:true});
  assert.equal(await actions.count(), 1, 'La columna de acciones conserva su nombre para los lectores de pantalla');
  assert.equal(await actions.evaluate(el => getComputedStyle(el).fontSize), '0px');
  assert.ok((await actions.boundingBox()).width < 60, 'Sin su rótulo, la columna de acciones cede ancho a las indicaciones');

  const viewport = page.viewportSize();
  await page.setViewportSize({width:1100, height:viewport.height});
  await page.evaluate(() => { document.documentElement.style.fontSize = '125%'; });
  await settle();
  await settle();
  const halves = await page.evaluate(() => ['exam','surgery'].map(kind => {
    const half = document.querySelector('[data-hhr-round-half] [data-hhr-empty-request="' + kind + '"]').closest('[data-hhr-round-half]');
    const card = half.querySelector('[data-hhr-reading="status-card"]');
    const box = half.getBoundingClientRect();
    return {top:box.top, bottom:box.bottom, clipped:card.scrollWidth - card.clientWidth};
  }));
  assert.ok(halves.every(half => half.clipped <= 0), 'Con letra más grande, ninguna solicitud vacía queda recortada');
  assert.ok(Math.abs(halves[0].top - halves[1].top) < 1 && Math.abs(halves[0].bottom - halves[1].bottom) < 1,
    'Las dos mitades empiezan y terminan en la misma línea aunque solo una salte de renglón');
  await page.evaluate(() => { document.documentElement.style.removeProperty('font-size'); });
  await page.setViewportSize(viewport);
  await settle();
}
