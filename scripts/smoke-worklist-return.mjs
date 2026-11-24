import assert from 'node:assert/strict';

export async function verifyRoundReturn(context, origin) {
  for (const [route, tab, back] of [
    ['/dashboard/encounter-list', 'Mis pacientes', true],
    ['/dashboard/encounter-list-nurse', 'Pacientes con novedad', false],
  ]) {
    const page = await context.newPage();
    try {
      await page.setViewportSize({ width: 1100, height: 540 });
      await page.goto(origin + route);
      await page.getByRole('tab', { name: tab, exact: true }).click();
      await page.locator('table[data-hhr-compact-worklist]').waitFor();
      const search = page.locator('#search-encounter-list');
      await search.fill('sintético 1');
      const row = page.locator('tr').filter({ has: page.locator('[data-hhr-worklist-episode="2013"]') });
      const name = row.getByRole('link', { name: /Paciente sintético 13/ });
      await name.scrollIntoViewIfNeeded();
      if (back) await name.press('Enter');
      else await name.click();
      await page.waitForURL(url => url.pathname === route + '/2013');
      await page.evaluate(() => sessionStorage.setItem('fixture-bed-2013', 'R1'));
      if (back) {
        await page.goBack();
      } else {
        // Rayen can also push a new list entry from the open chart.
        await page.evaluate(path => {
          const link = Object.assign(document.createElement('a'), { href: path, textContent: 'Volver a la lista' });
          document.body.prepend(link);
        }, route);
        await page.getByRole('link', { name: 'Volver a la lista' }).click();
      }
      await row.locator('.hhr-location-bed', { hasText: 'R1' }).waitFor();
      await page.waitForFunction(() => document.activeElement?.closest('tr')?.querySelector('[data-hhr-worklist-episode="2013"]') &&
        document.activeElement.closest('tr').hasAttribute('data-hhr-returned-row'));
      // A delayed native update may replace the entire body after the first paint.
      await search.evaluate(input => input.dispatchEvent(new Event('input', { bubbles: true })));
      await page.waitForFunction(() => document.activeElement?.closest('tr')?.querySelector('[data-hhr-worklist-episode="2013"]'));
      assert.equal(await search.inputValue(), 'sintético 1');
      assert.equal(await page.getByRole('tab', { name: tab, exact: true }).getAttribute('aria-selected'), 'true');
      const bounds = await row.boundingBox();
      assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 541);
      const runArea = await page.locator('[data-hhr-copy-run]').first().boundingBox();
      assert.ok(runArea.height >= 24 && runArea.width >= 24);
      if (back) {
        const action = row.locator('[data-hhr-rongorongo-link]');
        assert.ok((await action.boundingBox()).height >= 32);
        assert.equal(await action.locator('.hhr-rongorongo-icon').evaluate(icon => icon.offsetWidth), 16);
      }
      console.info('[ronda] ' + tab + ': búsqueda, fila, foco y cambio de cama verificados');
    } finally {
      await page.close();
    }
  }
  await verifyChangedEpisode(context, origin);
}

async function verifyChangedEpisode(context, origin) {
  const page = await context.newPage();
  try {
    const path = '/dashboard/encounter-list';
    await page.goto(origin + path);
    await page.getByRole('tab', { name: 'Mis pacientes', exact: true }).click();
    const search = page.locator('#search-encounter-list');
    await search.fill('sintético 13');
    await page.locator('[data-hhr-worklist-episode="2013"]').waitFor();
    // Client-side routing keeps the same document and resets the list while away.
    await page.evaluate(() => document.querySelector('main').addEventListener('click', event => {
      event.preventDefault();
      history.pushState(null, '', event.target.closest('a').href);
    }, { once: true }));
    await page.getByRole('link', { name: /Paciente sintético 13/ }).click();
    await page.waitForURL(url => url.pathname === path + '/2013');
    await page.evaluate(() => {
      sessionStorage.setItem('fixture-encounter-13', '3013');
      document.getElementById('search-encounter-list').value = '';
      document.querySelector('[role="tab"]').click();
    });
    await page.goBack();
    await page.waitForFunction(() => document.getElementById('search-encounter-list').value === 'sintético 13' &&
      document.querySelector('[data-hhr-worklist-episode="3013"]'));
    assert.equal(await page.locator('[data-hhr-returned-row]').count(), 0);
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('tr')), false);
    await search.click();
    await search.fill('sintético 1');
    await page.evaluate(() => {
      sessionStorage.removeItem('fixture-encounter-13');
      document.getElementById('search-encounter-list').dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('[data-hhr-worklist-episode="2013"]').waitFor();
    assert.equal(await search.inputValue(), 'sintético 1');
    assert.equal(await search.evaluate(input => document.activeElement === input), true);
    console.info('[ronda] Otro episodio con el mismo nombre y cama conserva el foco del usuario');
  } finally {
    await page.close();
  }
}
