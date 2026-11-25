import assert from 'node:assert/strict';
import path from 'node:path';

export async function captureDesktopRound(page, directory, width, verifyLayout, round = false) {
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
        assert.ok(aligned(band.rest,band.signs) && aligned(band.diet,band.rest) &&
          Math.abs(band.rest.top - band.signs.bottom) < 2 && Math.abs(band.diet.top - band.rest.bottom) < 2,
          'Reposo y Régimen deben continuar el margen izquierdo sin crear otro hueco');
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
      await page.screenshot({fullPage:round && width === 1440, path:path.join(directory,width + (expanded ? '-expandida.png' : '-contraida.png'))});
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
    const tools = ['Ver evoluciones','Opciones de evolución','Editar evolución','Enmendamientos'].map(name =>
      note.getByRole('button', {name, exact:true}));
    const boxes = await Promise.all(tools.map(tool => tool.boundingBox()));
    assert.ok(boxes.every(box => box && Math.abs(box.y - boxes[0].y) < 2 && box.width >= 28 && box.height >= 28),
      'Las acciones de la nota deben compartir una fila y tener al menos 28 px de área activa');
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
  const handoff = page.locator('#shiftChangeObservation input');
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
  const alertText = alerts.getByRole('textbox');
  assert.equal(await alertText.evaluate(el => el === document.activeElement),true);
  await alertText.fill('Aviso de prueba');
  assert.equal(await alertText.inputValue(),'Aviso de prueba');
  assert.equal(await handoff.inputValue(),draft);
  if (round && verifyLayout) {
    const select = page.getByRole('combobox',{name:'Estado de la orden'});
    await select.selectOption('Realizada');
    assert.equal(await select.inputValue(),'Realizada');
    assert.equal(await page.locator('#procedureOrder').getByRole('button',{name:'Imprimir orden'}).count(),3);
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
