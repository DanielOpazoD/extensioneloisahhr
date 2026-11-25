import assert from 'node:assert/strict';
import path from 'node:path';

export async function captureDesktopRound(page, directory, width, verifyLayout) {
  const note = page.locator('#evolution');
  const text = note.locator('.MuiBox-root > .MuiTypography-caption');
  const disclosure = note.locator('button[data-hhr-note-disclosure]');
  const original = await text.innerText();
  const heights = [];
  for (const expanded of [false, true]) {
    await disclosure.press('Enter');
    await page.waitForFunction(isExpanded =>
      document.querySelector('#evolution [data-hhr-note-disclosure]')?.getAttribute('aria-expanded') === String(isExpanded), expanded);
    assert.equal(await disclosure.evaluate(el => document.activeElement === el), true);
    assert.equal((await text.innerText()) === original, expanded);
    await page.evaluate(() => window.scrollTo(0, 0));
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
    heights.push(metrics.noteHeight);
    assert.equal(metrics.pageWidth,width);
    assert.equal(metrics.vitalsRows,1);
    assert.deepEqual(metrics.values,['118/72','78','96','38,1','17','15','21','104','2']);
    if (verifyLayout) {
      assert.deepEqual(metrics.titleInsets, [10,10,10], 'Signos, Alertas y Fármacos deben compartir el mismo margen de lectura');
      assert.ok(metrics.firstMedicationBottom <= metrics.viewportHeight, 'La primera fila del fármaco debe caber completa');
    }
    console.log(JSON.stringify(metrics));
    if ((width === 1280 && !expanded) || (width === 1440 && expanded)) {
      await page.screenshot({path:path.join(directory,width + (expanded ? '-expandida.png' : '-contraida.png'))});
    }
  }
  assert.ok(heights[1] > heights[0], 'Al desplegar, la nota completa debe ocupar más alto que el extracto');

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
  assert.equal(await history.evaluate(el => el === document.activeElement), true, 'Tras entrega, Tab llega al historial de signos');
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
}
