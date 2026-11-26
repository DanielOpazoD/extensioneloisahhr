import assert from 'node:assert/strict';
import path from 'node:path';

export async function captureDesktopRound(page, directory, width, verifyLayout, round = false, reading = false) {
  const note = page.locator('#evolution');
  const text = note.locator('.MuiBox-root > .MuiTypography-caption');
  const disclosure = note.locator('button[data-hhr-note-disclosure]');
  if (round) {
    if (verifyLayout) await page.waitForFunction(() =>
      document.querySelector('#evolution button[data-hhr-note-disclosure]')?.getAttribute('aria-expanded') === 'true');
    else if (await disclosure.getAttribute('aria-expanded') === 'false') await disclosure.click();
  }
  const original = await text.innerText();
  if (round) assert.match(original,/Reevaluar movilidad en la próxima visita/, 'La nota inicial debe estar completa');
  const heights = [];
  for (const expanded of [false, true]) {
    await disclosure.press('Enter');
    await page.waitForFunction(isExpanded =>
      document.querySelector('#evolution [data-hhr-note-disclosure]')?.getAttribute('aria-expanded') === String(isExpanded), expanded);
    assert.equal(await disclosure.evaluate(el => document.activeElement === el), true);
    assert.equal((await text.innerText()) === original, expanded);
    await page.evaluate(async () => {
      window.scrollTo(0, 0);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const metrics = await page.evaluate(() => {
      const bounds = selector => document.querySelector(selector).getBoundingClientRect();
      const tiles = [...document.querySelectorAll('.vitals-grid > .tile')];
      const values = tiles.map(tile => tile.querySelector('[data-hhr-reading="vital-value"]'));
      for (const [i, value] of values.entries()) {
        if (!value) throw Error('Medición ausente en la franja');
        const v = value.getBoundingClientRect(), card = tiles[i].getBoundingClientRect();
        if (v.width < 1 || v.height < 1 || v.left < card.left - 1 || v.right > card.right + 1 ||
            v.top < card.top - 1 || v.bottom > card.bottom + 1) throw Error('Medición fuera de su celda');
      }
      return {
        width:innerWidth, expanded:document.querySelector('#evolution [data-hhr-note-disclosure]').getAttribute('aria-expanded'),
        pageWidth:document.documentElement.scrollWidth,
        titleInsets:['section#vitalSignsEntry','#alertEntrySection','#medicationEntrySection'].map(selector =>
          Math.round(bounds(selector + ' .MuiCardHeader-title').left - bounds(selector).left)),
        noteWidth:Math.round(bounds('#evolution').width),
        noteHeight:Math.round(bounds('#evolution').height),
        noteTop:Math.round(bounds('#evolution').top),
        handoffTop:Math.round(bounds('#shiftChangeObservation').top),
        restTop:Math.round(bounds('#rest').top),
        vitalsTop:Math.round(bounds('section#vitalSignsEntry').top),
        vitalsRows:new Set(tiles.map(tile => Math.round(tile.getBoundingClientRect().top))).size,
        valueTopSpread:Math.round(Math.max(...values.map(value => value.getBoundingClientRect().top))
          - Math.min(...values.map(value => value.getBoundingClientRect().top))),
        medicationsTop:Math.round(bounds('#medication').top),
        firstMedicationBottom:Math.round(bounds('#medication tbody tr').bottom),
        viewportHeight:innerHeight,
        values:values.map(value => value.textContent.trim()),
      };
    });
    const band = round && await page.evaluate(() => {
      const box = id => {
        const node = document.querySelector(id);
        const {left,right,top,bottom,height} = node.getBoundingClientRect();
        return {left,right,top,bottom,height};
      };
      const pressure = document.querySelector('[data-hhr-reading="vital-pressure-group"] [data-hhr-reading="vital-value"]');
      const pressureFragments = [...pressure.children].flatMap(el => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return [...range.getClientRects()].map(rect => ({top:rect.top,bottom:rect.bottom,right:rect.right}));
      });
      const pressureTime = pressure.closest('.tile').querySelector('[data-hhr-reading="vital-time"]').getBoundingClientRect();
      return {pressureLines:new Set(pressureFragments.map(rect => Math.round(rect.top))).size,
        pressureClearOfTime:pressureFragments.every(rect => rect.top >= pressureTime.bottom ||
          rect.bottom <= pressureTime.top + 1 || rect.right <= pressureTime.left + 1),
        note:box('#evolution'),signs:box('section#vitalSignsEntry'),handoff:box('#shiftChangeObservation'),
        alerts:box('#alerts'),rest:box('#rest'),diet:box('#diet'),exam:box('#diagnosisTestEntrySection'),
        surgery:box('#operationTheaterRequestEntrySection'),orders:box('#procedureOrder'), medication:box('#medication'),
        orderRowHeights:[...document.querySelectorAll('#procedureOrder tbody tr')].map(tr => Math.round(tr.getBoundingClientRect().height))};
    });
    heights.push(metrics.noteHeight);
    assert.equal(metrics.pageWidth,width);
    assert.ok(metrics.vitalsRows <= (round ? 2 : 1));
    assert.deepEqual(metrics.values,['118/72','78','96','38,1','17','15','21','104','2']);
    console.log(JSON.stringify(round ? {...metrics, band} : metrics));
    if (verifyLayout) {
      assert.deepEqual(metrics.titleInsets, [10,10,10], 'Signos, Alertas y Fármacos deben compartir el mismo margen de lectura');
      if (round) {
        const aligned = (a,b) => Math.abs(a.left-b.left) <= 1 && Math.abs(a.right-b.right) <= 1;
        assert.ok(aligned(band.note,band.signs) && Math.abs(band.signs.top - band.note.bottom) < 2,
          'Signos debe quedar debajo de Evolución y compartir ambos bordes');
        assert.ok(aligned(band.handoff,band.alerts) && Math.abs(band.alerts.top - band.handoff.bottom) < 2,
          'Observaciones debe compartir ambos bordes con Alertas y aparecer primero');
        // Two short instructions share a line. Otherwise each one uses the whole width.
        const stacked = aligned(band.rest,band.signs) && aligned(band.diet,band.rest) && Math.abs(band.diet.top - band.rest.bottom) < 2;
        const sharedLine = Math.abs(band.diet.top - band.rest.top) < 2 && Math.abs(band.diet.left - band.rest.right) <= 1 &&
          Math.abs(band.rest.left - band.signs.left) <= 1 && Math.abs(band.diet.right - band.signs.right) <= 1;
        assert.ok((stacked || sharedLine) && Math.abs(band.rest.top - band.signs.bottom) < 2,
          'Reposo y Régimen deben continuar el margen izquierdo sin crear otro hueco');
        // The fonts of each system decide the widths. The line is shared exactly when both instructions fit.
        const fit = await page.evaluate(() => {
          const line = document.querySelector('#rest').closest('.MuiGrid-container');
          const items = [...line.children], styles = items.map(item => item.getAttribute('style'));
          for (const item of items) item.style.setProperty('flex', '0 0 max-content', 'important');
          const needed = items.reduce((sum, item) => sum + item.getBoundingClientRect().width - 1, 0);
          items.forEach((item, index) => styles[index] === null ? item.removeAttribute('style') : item.setAttribute('style', styles[index]));
          return {needed, available:line.getBoundingClientRect().width};
        });
        if (Math.abs(fit.needed - fit.available) > 2) {
          assert.equal(sharedLine, fit.needed < fit.available, 'Reposo y Régimen comparten línea siempre que caben, y solo entonces');
        }
        assert.ok(Math.abs(band.surgery.top - band.exam.top) < 2 && Math.abs(band.surgery.left - band.exam.right) <= 2 &&
          Math.abs(band.exam.left - band.alerts.left) <= 1 && Math.abs(band.surgery.right - band.alerts.right) <= 1 &&
          Math.abs(band.exam.top - band.alerts.bottom) < 2 && Math.abs(band.exam.height - band.surgery.height) < 1,
          'Las dos solicitudes vacías comparten la última línea del lateral');
        for (const side of [band.exam,band.surgery]) {
          assert.ok(side.left >= band.handoff.left - 1 && side.right <= band.handoff.right + 1 && side.height > 0,
            'Las solicitudes explícitamente vacías deben quedar visibles en el lateral');
        }
        assert.equal(band.pressureLines,1,'La sistólica, la barra y la diastólica deben leerse en la misma línea');
        assert.equal(band.pressureClearOfTime,true,'El tiempo no debe tapar los dígitos de la presión');
        assert.ok(band.exam.height < 36 && band.surgery.height < 36, 'Cada solicitud vacía debe caber en una fila');
        assert.ok(band.orderRowHeights.every(height => height <= 42), 'Las órdenes han de compactarse incluso con controles');
      } else {
        assert.ok(metrics.firstMedicationBottom <= metrics.viewportHeight, 'La primera fila del fármaco debe caber completa');
      }
    }
    if (round ? expanded : (width === 1280 && !expanded) || (width === 1440 && expanded)) {
      if (round) await disclosure.evaluate(button => button.blur());
      await page.screenshot({fullPage:round && !reading && width === 1440, path:path.join(directory,width + (expanded ? '-expandida.png' : '-contraida.png'))});
    }
  }
  assert.ok(heights[1] > heights[0], 'Al desplegar, la nota completa debe ocupar más alto que el extracto');

  if (round && verifyLayout) {
    const tiles = page.locator('.vitals-grid > .tile');
    const expectedLabels = ['PA','FC','SatO₂','T° ax.','FR','Glasgow','Sup. Oxígeno','HGT','EVA'];
    for (const [index, expected] of expectedLabels.entries()) {
      const tile = tiles.nth(index);
      const label = tile.locator('[data-hhr-reading="vital-label"]');
      const short = tile.locator('[data-hhr-vital-short]');
      if (!await short.count()) {
        assert.equal((await label.textContent()).trim(), expected);
        continue;
      }
      assert.equal(await short.getAttribute('data-hhr-vital-short'), expected);
      assert.ok(await short.evaluate((node, text) =>
        getComputedStyle(node,'::before').content.startsWith(JSON.stringify(text)), expected));
      await short.hover();
      assert.ok(await short.evaluate(node => node.matches(':hover')));
      const fullName = await short.getAttribute('title');
      assert.ok(fullName && fullName !== expected, 'La abreviatura necesita un nombre completo al pasar el cursor');
      const announced = await tile.ariaSnapshot();
      const nodeText = (await label.textContent()).replace(/\s+/g,' ').trim();
      assert.ok(announced.includes(fullName) || (nodeText.length > 0 && announced.includes(nodeText)),
        'La lectura accesible debe conservar el nombre del signo ' + expected);
    }
  }
  if (verifyLayout) {
    // The overflow menu has no name in Eloísa. The two tools take theirs from their icons.
    const tools = [note.getByRole('button', {name:'Ver evoluciones', exact:true}), note.locator('.MuiCardHeader-action .MuiIconButton-root'),
      note.getByRole('button', {name:'Enmendar', exact:true}), note.getByRole('button', {name:'Ver enmendados', exact:true})];
    const boxes = await Promise.all(tools.map(tool => tool.boundingBox()));
    assert.ok(boxes.every(box => box && Math.abs(box.y - boxes[0].y) < 2 && box.width >= 28 && box.height >= 28),
      'Las acciones de la nota deben compartir una fila y tener al menos 28 px de área activa');
    // Eloísa keeps its overflow menu in the card header, so Tab reaches it before the writing tools.
    const [entryBox, moreBox, editBox, amendBox] = boxes;
    assert.ok(entryBox.x + entryBox.width <= editBox.x + 1 && editBox.x + editBox.width <= amendBox.x + 1 &&
      amendBox.x + amendBox.width <= moreBox.x + 1, 'La lectura va de las evoluciones a las herramientas y termina en el menú');
    const captions = await Promise.all(tools.map(tool => tool.evaluate(el => ({
      action:el.getAttribute('data-hhr-evo-action'),
      icon:getComputedStyle(el,'::before').maskImage !== 'none', caption:getComputedStyle(el,'::after').content,
    }))));
    assert.deepEqual(captions.map(tool => tool.action), [null,'more','amend','amended']);
    assert.ok(captions.every(tool => tool.icon), 'Cada acción de la nota usa un icono de la misma familia');
    assert.match(captions[2].caption, /^"Enmendar"/, 'El lápiz lleva el nombre que le da Eloísa');
    assert.match(captions[3].caption, /^"Enmendados"/, 'La lista de notas enmendadas se nombra junto a su icono');
    assert.deepEqual(await Promise.all(tools.slice(1).map(tool => tool.getAttribute('title'))), ['Más opciones','Enmendar','Ver enmendados'],
      'Con el cursor encima, cada botón muestra el nombre que Eloísa solo da a su icono');
    await tools[0].focus();
    for (const next of [...tools.slice(1),disclosure]) {
      await page.keyboard.press('Tab');
      assert.ok(await next.evaluate(el => el === document.activeElement), 'El foco debe seguir la lectura de la nota');
    }
    const alertRows = page.locator('#alertEntrySection .alert-row');
    for (const row of await alertRows.all()) {
      const [message, author, time] = await Promise.all([':scope > :first-child > :last-child',
        ':scope > :first-child > :first-child', ':scope > :last-child > :first-child']
        .map(selector => row.locator(selector).boundingBox()));
      assert.ok(message && author && time && message.y + message.height <= author.y + 1 &&
        Math.abs(author.y - time.y) < 3 && time.x >= author.x + author.width - 1,
        'Cada aviso debe presentar primero el mensaje y reunir autor y antigüedad debajo');
    }
  }
  if (reading) await checkReadingRound(page, directory, width, verifyLayout);
  if (reading && verifyLayout && width === 1280) await checkFocusedEntryRefresh(page);
  if (reading && verifyLayout) {
    // Eloísa can restore a draft by assigning .value without emitting an input event.
    for (const id of ['#shiftChangeObservation','#alerts']) {
      const section = page.locator(id);
      const field = section.locator('input:not([type=checkbox])');
      const opener = section.locator('[data-hhr-entry-open]');
      assert.ok(await opener.isVisible(), 'Debe existir una acción para abrir el campo en ' + id);
      await field.evaluate(input => { input.value = 'Borrador recuperado'; });
      assert.ok(await field.isVisible() && !await opener.isVisible());
      assert.equal(await field.inputValue(),'Borrador recuperado');
      await field.evaluate(input => { input.value = ''; });
      assert.ok(await opener.isVisible() && !await field.isVisible());
    }
  }
  const handoffCard = page.locator('#shiftChangeObservation');
  const handoff = handoffCard.locator('input');
  const openHandoff = handoffCard.locator('[data-hhr-entry-open]');
  if (await openHandoff.isVisible()) {
    assert.ok(!await handoff.isVisible(), 'Entrega empieza en modo lectura');
    await openHandoff.click();
    assert.ok(await handoff.evaluate(el => el === document.activeElement), 'Un clic deja el cursor en Entrega');
  } else if (reading && verifyLayout) assert.fail('Falta el botón para escribir la entrega');
  const draft = 'Entrega de prueba';
  await handoff.fill(draft);
  await handoff.press('Tab');
  const history = page.locator('section#vitalSignsEntry').getByRole('button',{name:/historial/i});
  if (round && verifyLayout) assert.ok(await page.getByRole('button',{name:'Archivar alerta'}).first()
    .evaluate(el => el === document.activeElement), 'Tras entrega, Tab llega a la primera alerta del mismo lateral');
  else if (!round) assert.equal(await history.evaluate(el => el === document.activeElement), true,
    'Tras entrega, Tab llega al historial de signos');
  if (verifyLayout) {
    await page.emulateMedia({forcedColors:'active'});
    try {
      assert.ok(await history.evaluate(el => {
        const icon = getComputedStyle(el, '::before');
        return icon.maskImage !== 'none' && icon.backgroundColor !== getComputedStyle(el).backgroundColor;
      }), 'El icono del historial debe distinguirse del botón en alto contraste');
    } finally {
      await page.emulateMedia({forcedColors:'none'});
    }
  }
  await history.press('Enter');
  await page.getByRole('dialog',{name:'Historial de signos'}).waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await history.evaluate(el => el === document.activeElement),true);
  const alerts = page.locator('#alertEntrySection');
  const noResuscitation = alerts.getByRole('checkbox',{name:'No reanimación'});
  const visits = alerts.getByRole('checkbox',{name:'Gestión de Visitas'});
  assert.equal(await noResuscitation.isChecked(),false);
  assert.equal(await visits.isChecked(),true);
  await alerts.getByRole('button',{name:'Archivar alerta'}).last().press('Tab');
  assert.equal(await noResuscitation.evaluate(el => el === document.activeElement),true);
  await noResuscitation.press('Space');
  assert.equal(await noResuscitation.isChecked(),true);
  assert.equal(await visits.isChecked(),true);
  await noResuscitation.press('Tab');
  assert.equal(await visits.evaluate(el => el === document.activeElement),true);
  await visits.press('Tab');
  const openAlert = alerts.locator('[data-hhr-entry-open]');
  if (await openAlert.isVisible()) {
    assert.ok(!await alerts.locator('input:not([type=checkbox])').isVisible(), 'Nueva alerta empieza en modo lectura');
    assert.ok(await openAlert.evaluate(el => el === document.activeElement), 'Tab desde Gestión de Visitas llega a Nueva alerta');
    await openAlert.press('Enter');
  } else if (reading && verifyLayout) assert.fail('Falta el botón para escribir una alerta');
  const alertText = alerts.getByRole('textbox');
  assert.equal(await alertText.evaluate(el => el === document.activeElement),true);
  await alertText.fill('Aviso de prueba');
  assert.equal(await alertText.inputValue(),'Aviso de prueba');
  assert.equal(await handoff.inputValue(),draft);
  if (reading && verifyLayout) {
    for (const [field, expected] of [[handoff,draft],[alertText,'Aviso de prueba']]) {
      // Delete at the end of an input and Escape both leave the native draft untouched.
      await field.press('End');
      await field.press('Delete');
      await field.press('Escape');
      await page.evaluate(() => document.dispatchEvent(new Event('fixture-refresh')));
      assert.ok(await field.isVisible(), 'Un borrador debe seguir visible después de actualizar la ficha');
      assert.equal(await field.inputValue(),expected);
    }
    assert.ok(await alerts.getByRole('button',{name:'Archivar alerta'}).first().isVisible());
    assert.ok(await alerts.getByText('Pauta de seguimiento pendiente para el próximo turno.').isVisible());
    assert.equal(await visits.isChecked(),true);
  }
  if (round && verifyLayout) {
    const select = page.getByRole('combobox',{name:'Estado de la orden'});
    await select.selectOption('Realizada');
    assert.equal(await select.inputValue(),'Realizada');
    assert.equal(await page.locator('#procedureOrder').getByRole('button',{name:'Imprimir orden'}).count(),reading ? 2 : 3);
    const exam = page.locator('#diagnosisTestEntrySection');
    const surgery = page.locator('#operationTheaterRequestEntrySection');
    assert.ok(await exam.evaluate(el => el.hasAttribute('data-hhr-empty-request')));
    assert.ok(await surgery.evaluate(el => el.hasAttribute('data-hhr-empty-request')));
    await exam.locator('.MuiCardContent-root').evaluate(node => {
      node.replaceChildren(Object.assign(document.createElement('button'), {textContent:'Ver solicitud de examen de prueba'}));
      document.dispatchEvent(new Event('fixture-refresh'));
    });
    assert.ok(!await exam.evaluate(el => el.hasAttribute('data-hhr-empty-request') || !!el.closest('[data-hhr-round="empty-request"]')));
    assert.ok(await surgery.evaluate(el => el.hasAttribute('data-hhr-empty-request')));
    assert.ok(await exam.getByRole('button',{name:'Ver solicitud de examen de prueba'}).isVisible());
    const contents = await exam.boundingBox();
    assert.ok(contents.width > (await handoff.boundingBox()).width * 1.8, 'La solicitud poblada recupera su ancho');
    assert.equal(await handoff.inputValue(),draft);
  }
}

async function checkFocusedEntryRefresh(page) {
  const section = page.locator('#shiftChangeObservation');
  const open = section.locator('[data-hhr-entry-open]');
  const field = section.locator('input');
  const outside = page.locator('#evolution button[data-hhr-note-disclosure]');
  const refresh = () => page.evaluate(() => document.dispatchEvent(new Event('fixture-refresh')));
  const assertPendingFocus = async () => {
    // The media query and :placeholder-shown have already painted when the delayed host refresh arrives.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.ok(await open.isVisible() && await open.evaluate(el => el === document.activeElement),
      'El botón debe retener el foco hasta que la ficha lo entregue al campo');
    assert.ok(await field.isVisible());
  };
  const viewport = page.viewportSize();
  await open.focus();
  await page.setViewportSize({...viewport,width:1099});
  await assertPendingFocus();
  await refresh();
  assert.equal(await open.count(),0);
  assert.ok(await field.evaluate(el => el === document.activeElement), 'Al salir de escritorio el foco debe llegar al campo de entrega');
  await outside.focus();
  await page.setViewportSize(viewport);
  await refresh();
  await open.focus();
  await field.evaluate(input => { input.value = 'Observación recuperada en la ficha'; });
  await assertPendingFocus();
  await refresh();
  assert.ok(await field.evaluate(el => el === document.activeElement), 'La recuperación entrega el foco al borrador nativo');
  assert.equal(await field.inputValue(),'Observación recuperada en la ficha');
  assert.ok(!await open.isVisible());
  await field.fill('');
  await outside.focus();
  await refresh();
  assert.ok(await open.isVisible());
}

// The daily date and its print action ride on the free end of the section links,
// short of the floating Centro HHR bar when that bar covers the end of the line.
async function checkDailyRow(page, width) {
  const settle = () => page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
  const refresh = async () => {
    await page.evaluate(() => { document.dispatchEvent(new Event('fixture-refresh')); window.dispatchEvent(new Event('resize')); });
    await settle();
    await settle();
  };
  const measure = () => page.evaluate(() => {
    const box = el => { const {top,bottom,left,right,width,height} = el.getBoundingClientRect(); return {top,bottom,left,right,width,height}; };
    const rail = document.querySelector('[data-hhr-ficha-sections]');
    const row = document.querySelector('.toolbar');
    const date = row.querySelector('form input'), print = row.querySelector('button[type="submit"]');
    // What a pointer finds on each control: a floating bar above it would be returned instead.
    const reachable = el => { const {left,top,width,height} = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(left + width / 2, top + height / 2)); };
    return {
      docked:row.hasAttribute('data-hhr-ficha-dock'), position:getComputedStyle(row).position, row:box(row), rail:box(rail),
      lastLink:box([...rail.children].filter(el => el.offsetWidth).at(-1)), stamp:box(row.querySelector('[data-hhr-update-label]')),
      date:box(date), print:box(print), controls:box(row.lastElementChild), reachable:reachable(date) && reachable(print),
      bar:box(document.getElementById('hhr-clinical-operations-bar')),
      note:box(document.querySelector('#evolution')), scrolls:rail.scrollWidth > rail.clientWidth + 1,
    };
  });
  const clearOfLinks = state => state.row.left >= state.lastLink.right + 12 && !state.scrolls;
  const onTheLine = state => state.docked && state.position === 'fixed' && state.row.top >= state.rail.top - 1 &&
    state.row.bottom <= state.rail.bottom + 1 && state.note.top - state.rail.bottom < 16;
  const inPlace = state => !state.docked && state.position !== 'fixed' && state.row.top >= state.rail.bottom - 1 &&
    state.note.top >= state.row.bottom - 1;
  const floating = page.locator('#hhr-clinical-operations-bar');
  await page.evaluate(() => window.scrollTo(0,0));
  await refresh();

  // As the extension draws it: the bar covers the end of the line.
  const beside = await measure();
  assert.ok(beside.bar.bottom > beside.rail.top + 1 && beside.bar.width > 200, 'La ficha de prueba incluye la barra flotante sobre el final de la línea');
  assert.ok(beside.reachable, 'La barra flotante nunca tapa la fecha ni la impresión del resumen');
  if (beside.docked) {
    assert.ok(onTheLine(beside) && clearOfLinks(beside) && beside.row.right <= beside.bar.left - 8,
      'Acoplada, la fila queda entre los enlaces y la barra flotante');
  } else {
    assert.ok(inPlace(beside) && beside.lastLink.right + 28 + beside.controls.width > beside.bar.left - 10,
      'La fila conserva su lugar solo cuando no cabe entre los enlaces y la barra flotante');
  }

  // Scrolling never changes the choice: the round keeps its place under the reader's eyes.
  const sweep = async () => {
    const states = [];
    await page.evaluate(() => { document.body.style.paddingBlockEnd = '600px'; });
    for (const offset of [0, 40, 64, 100, 160, 240]) {
      await page.evaluate(top => window.scrollTo(0, top), offset);
      await settle();
      const state = await measure();
      states.push([state.docked, Math.round(state.note.top + offset), state.reachable]);
    }
    await page.evaluate(() => { document.body.style.removeProperty('padding-block-end'); window.scrollTo(0,0); });
    await settle();
    return states;
  };
  const besideScroll = await sweep();
  // In its native place the row scrolls away with the summary, as it always did. Docked, it must stay reachable.
  assert.ok(besideScroll.every(([docked, noteStart, reachable]) => docked === beside.docked &&
    Math.abs(noteStart - besideScroll[0][1]) <= 1 && (reachable || !docked)),
    'Al desplazar la ficha, la fila no cambia de lugar ni mueve la nota: ' + JSON.stringify(besideScroll));

  // With the bar folded into its pill, the row fits in both windows. No other event announces the change.
  await floating.evaluate(el => { el.style.width = '36px'; });
  await settle();
  await settle();
  const folded = await measure();
  assert.ok(onTheLine(folded) && clearOfLinks(folded) && folded.reachable && folded.row.right <= folded.bar.left - 8,
    'Con la barra flotante plegada, la fecha se acopla también en la ventana menor');

  // Unfolded again, the row is back where it was before the next paint settles.
  await floating.evaluate(el => { el.style.removeProperty('width'); });
  await settle();
  await settle();
  const unfolded = await measure();
  assert.ok(unfolded.docked === beside.docked && Math.abs(unfolded.note.top - beside.note.top) < 1 &&
    Math.abs(unfolded.row.top - beside.row.top) < 1, 'Al desplegar la barra flotante, la fila recupera su lugar anterior');

  // Without the bar on the line, the row takes the end of it.
  await floating.evaluate(el => { el.style.display = 'none'; });
  await refresh();
  const docked = await measure();
  assert.ok(onTheLine(docked) && clearOfLinks(docked) && Math.abs(docked.row.right - docked.rail.right) <= 1,
    'Sin barra flotante en la línea, la fila ocupa su final');
  assert.ok(docked.stamp.width <= 1 && docked.date.width > 80 && docked.print.width > 30,
    'La firma repetida de la nota no se muestra otra vez junto a la fecha');
  // This synthetic summary is shorter than the window: give it room to scroll.
  await page.evaluate(() => { document.body.style.paddingBlockEnd = '600px'; window.scrollTo(0,240); });
  await settle();
  const scrolled = await measure();
  assert.ok(Math.abs(scrolled.row.top - scrolled.rail.top - (docked.row.top - docked.rail.top)) < 1 && scrolled.note.top < docked.note.top - 200,
    'Al desplazar el resumen, la fecha sigue a la vista con la barra de secciones');
  await page.evaluate(() => { document.body.style.removeProperty('padding-block-end'); window.scrollTo(0,0); });
  await settle();

  // A row with one more control is not the recognized daily row.
  await page.evaluate(() => {
    const extra = Object.assign(document.createElement('button'), {type:'button', textContent:'Otra acción'});
    extra.dataset.fixtureExtra = '';
    document.querySelector('.toolbar form').after(extra);
  });
  await refresh();
  assert.ok(inPlace(await measure()), 'Una fila con otro control conserva su lugar nativo');
  await page.evaluate(() => { document.querySelector('.toolbar [data-fixture-extra]').remove(); });
  await refresh();
  assert.ok(onTheLine(await measure()), 'Sin el control añadido, la fila diaria vuelve a la línea');
  // The daily row is known by the name of its form and by its «Imprimir». Another form with a date is not it.
  for (const [selector, other, why] of [['.toolbar form label', 'Fecha de control', 'Un formulario con otro nombre conserva su lugar nativo'],
    ['.toolbar form button[type="submit"]', 'Guardar', 'Un formulario que no imprime conserva su lugar nativo']]) {
    const native = await page.locator(selector).evaluate((element, other) => { const text = element.textContent; element.textContent = other; return text; }, other);
    await refresh();
    assert.ok(inPlace(await measure()), why);
    await page.locator(selector).evaluate((element, text) => { element.textContent = text; }, native);
    await refresh();
    assert.ok(onTheLine(await measure()), 'Con su nombre y su «Imprimir», la fila diaria vuelve a la línea');
  }

  // Another professional updated the summary after the note: that byline is new information.
  const stamp = page.locator('.toolbar > [data-hhr-update-label]');
  const original = await stamp.textContent();
  await stamp.evaluate(el => { el.textContent = 'Última actualización: 15-04-2026, 11:30 - Elena Ejemplo'; });
  await refresh();
  const distinct = await measure();
  assert.ok(distinct.stamp.width > 60 && distinct.stamp.right <= distinct.date.left + 1, 'Una firma distinta se lee antes de la fecha');
  assert.ok(distinct.docked ? clearOfLinks(distinct) : inPlace(distinct), 'Con la firma a la vista, la fila tampoco tapa los enlaces');
  await stamp.evaluate((el, text) => { el.textContent = text; }, original);

  // A line full of section links keeps the row in its native place.
  await page.evaluate(() => {
    const rail = document.querySelector('[data-hhr-ficha-sections]');
    for (let index = 0; index < 8; index++) {
      const item = document.createElement('div');
      item.className = 'MuiGrid-item';
      item.dataset.fixtureExtra = '';
      item.innerHTML = '<span class="MuiBadge-root"><span class="MuiTypography-caption">Sección de prueba ' + index + '</span></span>';
      rail.insertBefore(item, rail.querySelector('.hhr-ficha-empty-toggle'));
    }
  });
  await refresh();
  const crowded = await measure();
  assert.ok(inPlace(crowded), 'Sin sitio en la barra de secciones, la fila conserva su lugar sobre la nota');
  assert.ok(crowded.date.right <= crowded.row.right + 1 && crowded.controls.right >= crowded.row.right - 2,
    'En su lugar nativo, la fecha y la impresión conservan el borde derecho');
  await page.evaluate(() => { for (const item of document.querySelectorAll('[data-fixture-extra]')) item.remove(); });
  await refresh();
  const again = await measure();
  assert.ok(onTheLine(again) && Math.abs(again.note.top - docked.note.top) < 1, 'Al recuperar el sitio, la fila vuelve a la barra');

  // Leaving the compact view returns the row, its styles and every «once» mark to Eloísa.
  const leftovers = () => page.evaluate(() => ({
    marks:document.querySelectorAll('[data-hhr-ficha-dock],[data-hhr-ficha-docked],[data-hhr-vital-shared],[data-hhr-update-repeat],[data-hhr-actions-heading]').length,
    styles:document.querySelectorAll('[style*="--hhr-dock"]').length, position:getComputedStyle(document.querySelector('.toolbar')).position,
  }));
  assert.ok((await leftovers()).marks > 4, 'La vista compacta deja sus marcas mientras está activa');
  await page.evaluate(() => { document.dispatchEvent(new CustomEvent('fixture-theme', {detail:'off'})); });
  await settle();
  assert.deepEqual(await leftovers(), {marks:0, styles:0, position:'static'}, 'Al desactivar la vista no queda rastro del acople ni de las marcas');
  await page.evaluate(() => { document.dispatchEvent(new CustomEvent('fixture-theme', {detail:'compact'})); });
  await refresh();
  assert.ok(onTheLine(await measure()), 'Al volver a la vista compacta, la fila se acopla de nuevo');

  // Leave the floating bar as the extension draws it for the checks and captures that follow.
  await floating.evaluate(el => { el.style.removeProperty('width'); el.style.removeProperty('display'); });
  await refresh();
  return (await measure()).docked;
}

async function checkReadingRound(page, directory, width, verifyLayout) {
  const dailyDocked = verifyLayout && await checkDailyRow(page, width);
  const rail = page.locator('[data-hhr-ficha-sections]');
  const nav = await rail.evaluate(el => {
    const shown = [...el.querySelectorAll('[data-hhr-ficha-link]')].filter(link => link.offsetWidth);
    const railBox = el.getBoundingClientRect();
    const lastBox = shown.at(-1).getBoundingClientRect();
    const toggle = el.querySelector('.hhr-ficha-empty-toggle');
    const toggleBox = toggle.getBoundingClientRect();
    return {
      links:shown.length, visible:shown.filter(link => {
        const box = link.getBoundingClientRect();
        return box.left >= railBox.left - 1 && box.right <= railBox.right + 1;
      }).length, railHeight:railBox.height, railWidth:railBox.width, scrollWidth:el.scrollWidth,
      toggleAfterLast:toggleBox.left - lastBox.right, toggleHeight:toggleBox.height,
      separator:getComputedStyle(toggle,'::before').borderInlineStartWidth,
    };
  });
  const vitals = await page.locator('.vitals-grid').evaluate(grid => {
    const age = getComputedStyle(grid.querySelector('[data-hhr-vital-elapsed]:not([data-hhr-vital-shared]),[data-hhr-vital-elapsed]'),'::after');
    const pam = getComputedStyle(grid.querySelector('[data-hhr-reading="vital-pam"] p'));
    return {elapsedFont:age.fontSize, elapsedColor:age.color, pamFont:pam.fontSize, pamColor:pam.color,
      pam:grid.querySelector('[data-hhr-reading="vital-pam"]').textContent.trim()};
  });
  const care = await page.locator('#rest,#diet').evaluateAll(cards => cards.map(card => {
    const content = card.querySelector('.MuiCardContent-root').getBoundingClientRect();
    const stamp = card.querySelector('[data-hhr-update-label]');
    const signature = stamp.getBoundingClientRect(), box = card.getBoundingClientRect();
    return {
      value:card.querySelector('.MuiChip-label').textContent, stamp:stamp.dataset.hhrUpdateLabel,
      height:box.height, horizontalGap:signature.left - content.right,
      sharedBaseline:signature.bottom > content.top && content.bottom > signature.top,
      stampFits:signature.width > 0 && signature.right <= box.right && signature.bottom <= box.bottom,
    };
  }));
  assert.deepEqual(care.map(card => card.value),['Relativo','Común']);
  assert.match(care[0].stamp,/09:12.*Tomás Ejemplo/);
  assert.match(care[1].stamp,/10:45.*Elena Ejemplo/);
  if (verifyLayout) assert.ok(care.every(card => card.sharedBaseline && card.horizontalGap >= 0 && card.stampFits),
    'Cada autoría debe poder leerse junto al valor de su propia indicación');
  if (verifyLayout) {
    // One age for the measurements taken together. The older one keeps its own, in bold.
    const ages = await page.locator('section#vitalSignsEntry').evaluate(section => {
      const heading = section.querySelector('.MuiCardHeader-content');
      const times = [...section.querySelectorAll('[data-hhr-reading="vital-time"]')];
      const shown = el => { const {width,height} = el.getBoundingClientRect(); return width > 4 && height > 4; };
      return {heading:getComputedStyle(heading,'::after').content, native:times.map(el => el.textContent.trim()),
        shown:times.filter(shown).map(el => [getComputedStyle(el,'::after').content, getComputedStyle(el).fontWeight]),
        inHeading:heading.getBoundingClientRect().height < 30};
    });
    assert.match(ages.heading, /medidos hace 2 h/, 'La antigüedad común de las mediciones se lee una vez, junto al título de Signos vitales');
    assert.deepEqual(ages.shown.map(([label]) => label.split('"')[1]), ['4h'], 'Solo la medición anterior conserva su propia antigüedad');
    assert.ok(Number(ages.shown[0][1]) >= 700 && ages.inHeading);
    assert.deepEqual(ages.native, ['2 horas','2 horas','2 horas','2 horas','2 horas','2 horas','2 horas','4 horas','2 horas'],
      'El texto nativo de cada antigüedad sigue en la página');
    // The care orders are signed like the prescription card above them.
    const repeats = await page.evaluate(() => ['#medication','#procedureOrder'].map(id => {
      const byline = document.querySelector(id + ' .MuiCardHeader-subheader');
      return [byline.getAttribute('data-hhr-update-repeat'), getComputedStyle(byline,'::after').content.split('"')[1], byline.title];
    }));
    assert.deepEqual(repeats, [[null,'15-04-2026 · 09:12 · Tomás Ejemplo',''],['above','↑ misma firma','15-04-2026 · 09:12 · Tomás Ejemplo']]);
  }
  console.log(JSON.stringify({width,nav,vitals,care}));
  assert.ok(nav.links >= 7 && nav.visible > 0);
  assert.equal(vitals.pam,'PAM:87');
  const toggle = rail.getByRole('button',{name:/ver vacías/i});
  const lastLink = rail.locator('[data-hhr-ficha-link]:visible').last();
  await lastLink.press('Tab');
  assert.ok(await toggle.evaluate(el => el === document.activeElement));
  if (verifyLayout) {
    // Docked or in its native place, the date is the next stop after the section links.
    await toggle.press('Tab');
    assert.ok(await page.getByLabel('Resumen diario paciente').evaluate(el => el === document.activeElement),
      'Después de los enlaces, Tab llega a la fecha del resumen' + (dailyDocked ? ' acoplada en la misma línea' : ''));
    await toggle.focus();
  }
  await toggle.press('Space');
  const hide = rail.getByRole('button',{name:/ocultar vacías/i});
  assert.equal(await hide.getAttribute('aria-expanded'),'true');
  await hide.click();
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  const navOrders = rail.getByRole('link',{name:'Órdenes de atención'});
  await navOrders.press('Enter');
  await rail.locator('[data-hhr-ficha-link="procedureOrderEntrySection"][aria-current="location"]').waitFor();
  assert.equal(await rail.locator('[aria-current="location"]').count(),1);
  assert.ok(nav.toggleAfterLast >= 0);
  if (verifyLayout) assert.ok(parseFloat(nav.separator) >= 1 && nav.toggleAfterLast >= 6);

  const orders = page.locator('#procedureOrder');
  const rows = orders.locator('tbody tr');
  assert.equal(await rows.count(),2);
  assert.match(await rows.first().innerText(),/Evaluar la marcha/);
  assert.match(await rows.last().innerText(),/cubiertos adaptados/);
  const paint = row => row.locator('td').evaluateAll(cells => cells.map(cell => ({
    shadow:getComputedStyle(cell).boxShadow, background:getComputedStyle(cell).backgroundColor,
    color:getComputedStyle(cell).color,
  })));
  await page.mouse.move(0,0);
  const instructions = await orders.getByRole('columnheader',{name:'Indicaciones'}).boundingBox();
  const table = await orders.getByRole('table').boundingBox();
  const idle = await paint(rows.first());
  const idleLast = await paint(rows.last());
  await rows.first().locator('td').nth(5).hover();
  const hover = await paint(rows.first());
  const firstPrint = rows.first().getByRole('button',{name:'Imprimir orden'});
  const lastPrint = rows.last().getByRole('button',{name:'Imprimir orden'});
  await firstPrint.press('Tab');
  await page.mouse.move(0,0);
  assert.ok(await lastPrint.evaluate(el => el === document.activeElement && el.matches(':focus-visible')));
  // This capture keeps both fictional orders, their indications, and the focused print action in view.
  await orders.screenshot({path:path.join(directory,width + '-ordenes.png')});
  const focus = await paint(rows.last());
  const action = await lastPrint.evaluate(el => {
    const style = getComputedStyle(el), {width,height} = el.getBoundingClientRect();
    return {width,height,outline:style.outlineStyle,outlineWidth:style.outlineWidth};
  });
  console.log(JSON.stringify({width, tableWidth:table.width, instructionsWidth:instructions.width, orderAction:action, firstCellHover:hover[0].shadow,
    lastCellFocus:focus.at(-1).shadow, firstCellFocus:focus[0].shadow}));
  if (verifyLayout) {
    assert.ok(instructions.width >= 0.40 * table.width - 1, 'Las indicaciones deben conservar el ancho reservado');
    for (const cell of await rows.locator('td:nth-child(6)').all()) {
      assert.ok(await cell.evaluate(el => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const box = el.getBoundingClientRect();
        return [...range.getClientRects()].every(line => line.left >= box.left - 1 && line.right <= box.right + 1 &&
          line.top >= box.top - 1 && line.bottom <= box.bottom + 1);
      }), 'La indicación completa debe caber en la celda de su orden');
    }
    for (const [active,normal] of [[hover,idle],[focus,idleLast]]) {
      assert.ok(active[0].shadow.includes('inset') && active.at(-1).shadow.includes('inset'));
      assert.notEqual(active[0].shadow,normal[0].shadow);
      assert.notEqual(active.at(-1).shadow,normal.at(-1).shadow);
      assert.notEqual(active[0].shadow,active.at(-1).shadow, 'La primera celda debe señalar el inicio de la fila');
      assert.deepEqual(active.map(cell => [cell.color,cell.background]),normal.map(cell => [cell.color,cell.background]));
    }
    assert.ok(action.width >= 24 && action.height >= 24 && action.outline !== 'none' && parseFloat(action.outlineWidth) > 0);
    assert.deepEqual(await paint(rows.first()),idle, 'Al salir del puntero desaparece la guía de la primera fila');
    await rows.first().locator('td').nth(5).hover();
    assert.deepEqual(await paint(rows.first()),idle, 'El ratón sobre otra orden debe respetar la fila que tiene el foco');
    assert.deepEqual(await paint(rows.last()),focus);
    await page.mouse.move(0,0);
    await navOrders.focus();
    assert.deepEqual(await paint(rows.last()),idleLast, 'Al salir el foco desaparece la guía de la segunda fila');
    assert.ok(parseFloat(vitals.elapsedFont) >= 12 && parseFloat(vitals.pamFont) >= 12);
  }
}
