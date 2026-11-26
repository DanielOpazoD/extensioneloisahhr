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
      // An age shared by the whole strip is said once beside its title: here it is kept for a screen reader only.
      const pressureTimeShown = pressureTime.width > 1 && pressureTime.height > 1;
      return {pressureLines:new Set(pressureFragments.map(rect => Math.round(rect.top))).size,
        pressureClearOfTime:!pressureTimeShown || pressureFragments.every(rect => rect.top >= pressureTime.bottom ||
          rect.bottom <= pressureTime.top + 1 || rect.right <= pressureTime.left + 1),
        note:box('#evolution'),signs:box('section#vitalSignsEntry'),handoff:box('#shiftChangeObservation'),
        alerts:box('#alerts'),rest:box('#rest'),diet:box('#diet'),exam:box('#diagnosisTestEntrySection'),
        surgery:box('#operationTheaterRequestEntrySection'),orders:box('#procedureOrder'), medication:box('#medication'),
        requestCards:['#diagnosisTestEntrySection','#operationTheaterRequestEntrySection'].map(id => box(id + ' .MuiCard-root')),
        orderRowHeights:[...document.querySelectorAll('#procedureOrder tbody tr')].map(tr => Math.round(tr.getBoundingClientRect().height))};
    });
    heights.push(metrics.noteHeight);
    assert.equal(metrics.pageWidth,width);
    // Beside the care instructions the nine measurements take half the line: three rows at most.
    assert.ok(metrics.vitalsRows <= (round ? 3 : 1));
    assert.deepEqual(metrics.values,['118/72','78','96','38,1','17','15','21','104','2']);
    console.log(JSON.stringify(round ? {...metrics, band} : metrics));
    if (verifyLayout) {
      assert.deepEqual(metrics.titleInsets, [16,16,16], 'Signos, Alertas y Fármacos deben compartir el mismo margen de lectura');
      if (round) {
        const aligned = (a,b) => Math.abs(a.left-b.left) <= 1 && Math.abs(a.right-b.right) <= 1;
        // The space between two blocks of the ficha.
        const gap = 12, middle = box => (box.top + box.bottom) / 2;
        assert.ok(Math.abs(band.signs.left - band.note.left) <= 1 && band.signs.right <= band.exam.left + 2 && Math.abs(band.signs.top - band.note.bottom - gap) < 2,
          'Signos debe quedar debajo de Evolución, en la primera mitad de la línea');
        assert.ok(Math.abs(band.alerts.bottom - band.note.bottom) < 2, 'Alertas debe terminar donde termina Evolución');
        assert.ok(aligned(band.handoff,band.alerts) && Math.abs(band.alerts.top - band.handoff.bottom) < 2,
          'Observaciones debe compartir ambos bordes con Alertas y aparecer primero');
        // Two short instructions share a line. Otherwise each one uses the whole width.
        // The care instructions follow under the signs, in their half. The other half, from the end of the signs to
        // the edge of the round, is for what has no records.
        const side = {left:band.signs.right, right:band.alerts.right}, under = {left:band.signs.left, right:band.signs.right};
        const inSide = box => box.left >= under.left - 1 && box.right <= under.right + 2;
        const stacked = Math.abs(band.rest.left - band.diet.left) <= 1 && Math.abs(band.rest.right - band.diet.right) <= 1 && Math.abs(band.diet.top - band.rest.bottom) < 2;
        // On a shared line the shorter instruction is read at the middle of the taller one.
        const sharedLine = Math.abs(middle(band.diet) - middle(band.rest)) < 2 && Math.abs(band.diet.left - band.rest.right) <= 1;
        const careTop = Math.min(band.rest.top, band.diet.top);
        assert.ok((stacked || sharedLine) && inSide(band.rest) && inSide(band.diet) && Math.abs(band.diet.right - under.right) <= 2 && Math.abs(careTop - band.signs.bottom - gap) < 2,
          'Reposo y Régimen deben leerse bajo Signos, en su misma mitad de la línea');
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
        assert.ok(Math.abs(band.surgery.top - band.exam.top) < 2 && Math.abs(band.surgery.left - band.exam.right) <= 2 && Math.abs(band.exam.left - side.left) <= 2 &&
          Math.abs(band.surgery.right - side.right) <= 1 && band.exam.top >= band.signs.top && band.exam.top <= band.signs.top + 32 && Math.abs(band.exam.height - band.surgery.height) < 1,
          'Las dos solicitudes vacías comparten una línea junto a Signos, bajo su rótulo');
        for (const request of [band.exam,band.surgery]) assert.ok(request.left >= side.left - 1 && request.right <= side.right + 1 && request.height > 0, 'Las solicitudes explícitamente vacías deben quedar visibles junto a Signos');
        assert.equal(band.pressureLines,1,'La sistólica, la barra y la diastólica deben leerse en la misma línea');
        assert.equal(band.pressureClearOfTime,true,'El tiempo no debe tapar los dígitos de la presión');
        assert.ok(band.requestCards.every(card => card.height > 0 && card.height < 36), 'Cada solicitud vacía debe caber en una fila');
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
  // In the two columns of the desktop round the note keeps one height. Elsewhere the whole note is taller than its excerpt.
  if (round && verifyLayout) assert.equal(heights[1], heights[0], 'En la ronda de escritorio la nota conserva su alto al desplegarse');
  else assert.ok(heights[1] >= heights[0], 'Al desplegar, la nota completa no debe ocupar menos que el extracto');

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
      icon:getComputedStyle(el,'::before').maskImage !== 'none', caption:getComputedStyle(el,'::after').content, hint:el.title,
    }))));
    assert.deepEqual(captions.map(tool => tool.action), [null,'more','amend','amended']);
    assert.ok(captions.every(tool => tool.icon), 'Cada acción de la nota usa un icono de la misma familia');
    // Only the actions that open something to read carry a word. A writing tool is its icon, with Eloísa's name for the pointer.
    assert.deepEqual(captions.slice(2).map(tool => [tool.caption, tool.hint]), [['none', 'Enmendar'], ['none', 'Ver enmendados']],
      'El lápiz y la lista de enmendadas son un icono cada uno, con el nombre que les da Eloísa');
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
      // Delete at the end of an input and Escape both leave the native draft untouched. The caret is put
      // there by its range: the End key moves it on Linux and scrolls the page instead on macOS.
      await field.focus();
      await field.evaluate(input => input.setSelectionRange(input.value.length, input.value.length));
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

// With the round laid out the line of section links is not shown, as the owner asked. The daily date and
// its print action ride on the line of tabs where that line stays in view. In this page it scrolls away
// with the summary, so the row keeps its native place over the note, without the byline it repeats.
async function checkDailyRow(page) {
  const settle = () => page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
  const refresh = async () => {
    await page.evaluate(() => { document.dispatchEvent(new Event('fixture-refresh')); window.dispatchEvent(new Event('resize')); });
    await settle();
    await settle();
  };
  const measure = () => page.evaluate(() => {
    const box = el => { const {top,bottom,left,right,width,height} = el.getBoundingClientRect(); return {top,bottom,left,right,width,height}; };
    const row = document.querySelector('.toolbar'), date = row.querySelector('form input'), print = row.querySelector('button[type="submit"]');
    // What a pointer finds on each control: a floating bar above it would be returned instead.
    const reachable = el => { const {left,top,width,height} = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(left + width / 2, top + height / 2)); };
    return {
      links:document.querySelector('[data-hhr-ficha-sections]').getClientRects().length, slot:box(document.querySelector('[data-hhr-ficha-section-slot]')).height,
      docked:row.hasAttribute('data-hhr-ficha-dock'), position:getComputedStyle(row).position, row:box(row), stamp:box(row.querySelector('[data-hhr-update-label]')),
      date:box(date), print:box(print), reachable:reachable(date) && reachable(print), note:box(document.querySelector('#evolution')),
    };
  });
  await page.evaluate(() => window.scrollTo(0,0));
  await refresh();
  const shown = await measure();
  assert.ok(shown.links === 0 && shown.slot === 0, 'Con la ronda, la línea de enlaces de sección no se muestra ni deja su hueco');
  assert.ok(!shown.docked && shown.position !== 'fixed' && shown.note.top >= shown.row.bottom - 1 && shown.reachable,
    'Donde la línea de pestañas se desplaza con la ficha, la fila diaria conserva su lugar sobre la nota: ' + JSON.stringify(shown));
  assert.ok(shown.stamp.width <= 1 && shown.date.width > 80 && shown.print.width > 30 && shown.print.left >= shown.date.right,
    'La firma repetida de la nota no se muestra junto a la fecha, e «Imprimir» sigue a la fecha sin taparla');

  // Leaving the compact view returns the row, the links, their styles and every «once» mark to Eloísa.
  const leftovers = () => page.evaluate(() => ({
    marks:document.querySelectorAll('[data-hhr-ficha-dock],[data-hhr-ficha-docked],[data-hhr-vital-shared],[data-hhr-update-repeat],[data-hhr-actions-heading]').length,
    styles:document.querySelectorAll('[style*="--hhr-dock"]').length, position:getComputedStyle(document.querySelector('.toolbar')).position,
  }));
  assert.ok((await leftovers()).marks > 3, 'La vista compacta deja sus marcas mientras está activa');
  await page.evaluate(() => { document.dispatchEvent(new CustomEvent('fixture-theme', {detail:'off'})); });
  await settle();
  assert.deepEqual(await leftovers(), {marks:0, styles:0, position:'static'}, 'Al desactivar la vista no queda rastro de sus marcas');
  await page.evaluate(() => { document.dispatchEvent(new CustomEvent('fixture-theme', {detail:'compact'})); });
  await refresh();
  const again = await measure();
  assert.ok(again.links === 0 && Math.abs(again.note.top - shown.note.top) < 1, 'Al volver a la vista compacta, la ficha queda igual');
  return false;
}

async function checkReadingRound(page, directory, width, verifyLayout) {
  const dailyDocked = verifyLayout && await checkDailyRow(page, width);
  const rail = page.locator('[data-hhr-ficha-sections]');
  // With the round laid out, the section links are not shown. Without it, they keep their line.
  const railShown = await rail.evaluate(el => el.getClientRects().length > 0);
  const nav = !railShown ? null : await rail.evaluate(el => {
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
      below:signature.top >= content.bottom - 1 && signature.top <= content.bottom + 6,
      stampFits:signature.width > 0 && signature.right <= box.right && signature.bottom <= box.bottom,
    };
  }));
  assert.deepEqual(care.map(card => card.value),['Relativo','Común']);
  assert.match(care[0].stamp,/09:12.*Tomás Ejemplo/);
  assert.match(care[1].stamp,/10:45.*Elena Ejemplo/);
  // In half the line a byline may take the line under its own value, never the line of another instruction.
  if (verifyLayout) assert.ok(care.every(card => card.stampFits && (card.sharedBaseline ? card.horizontalGap >= 0 : card.below)),
    'Cada autoría debe poder leerse junto al valor de su propia indicación, o justo debajo');
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
    // The view has two weights. The older age takes the strong one.
    assert.ok(Number(ages.shown[0][1]) >= 600 && ages.inHeading, 'La medición anterior se lee en negrita: ' + ages.shown[0][1]);
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
  if (railShown) assert.ok(nav.links >= 7 && nav.visible > 0);
  assert.equal(vitals.pam,'PAM:87');
  const toggle = page.getByRole('button',{name:/ver vacías/i});
  if (!railShown) {
    assert.ok(await toggle.evaluate(el => Boolean(el.closest('[data-hhr-round="frame"]')) && el.getClientRects().length > 0),
      'Sin la línea de secciones, «Ver vacías» queda en la ronda, con lo que despliega');
  } else {
    const lastLink = rail.locator('[data-hhr-ficha-link]:visible').last();
    await lastLink.press('Tab');
    assert.ok(await toggle.evaluate(el => el === document.activeElement));
  }
  if (verifyLayout && railShown) {
    // Docked or in its native place, the date is the next stop after the section links.
    await toggle.press('Tab');
    assert.ok(await page.getByLabel('Resumen diario paciente').evaluate(el => el === document.activeElement),
      'Después de los enlaces, Tab llega a la fecha del resumen' + (dailyDocked ? ' acoplada en la misma línea' : ''));
    await toggle.focus();
  }
  await toggle.press('Space');
  const hide = page.getByRole('button',{name:/ocultar vacías/i});
  assert.equal(await hide.getAttribute('aria-expanded'),'true');
  await hide.click();
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  if (railShown) {
    const navOrders = rail.getByRole('link',{name:'Órdenes de atención'});
    await navOrders.press('Enter');
    await rail.locator('[data-hhr-ficha-link="procedureOrderEntrySection"][aria-current="location"]').waitFor();
    assert.equal(await rail.locator('[aria-current="location"]').count(),1);
    assert.ok(nav.toggleAfterLast >= 0);
    if (verifyLayout) assert.ok(parseFloat(nav.separator) >= 1 && nav.toggleAfterLast >= 6);
  }

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
    await (railShown ? rail.getByRole('link',{name:'Órdenes de atención'}) : toggle).focus();
    assert.deepEqual(await paint(rows.last()),idleLast, 'Al salir el foco desaparece la guía de la segunda fila');
    assert.ok(parseFloat(vitals.elapsedFont) >= 12 && parseFloat(vitals.pamFont) >= 12);
  }
}
