import assert from 'node:assert/strict';

// Exercise the rendered list while the accessible foreground and the navigation
// change independently of it. Sample on the next paint to detect a visible jump.
export async function verifyWorklistOverlays(page, total) {
  const result = await page.evaluate(async () => {
    const panel = document.getElementById('worklist');
    const main = panel.closest('main');
    const tabs = main.querySelector('[role=tablist]');
    const drawer = document.createElement('nav');
    drawer.className = 'MuiDrawer-root';
    drawer.setAttribute('aria-label', 'Menú principal');
    drawer.classList.add('MuiDrawer-anchorLeft');
    const paper = document.createElement('div');
    paper.className = 'MuiDrawer-paper';
    paper.style.height = '420px';
    paper.innerHTML = '<ul>' + ['Lista de trabajo médico', 'Gestión de cuidados', 'Ejecución plan de cuidados', 'Informes']
      .map(text => '<li><button>' + text + '</button></li>').join('') + '</ul>';
    drawer.append(paper);
    const menu = document.createElement('div');
    menu.setAttribute('role', 'listbox');
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const sample = () => {
      const table = panel.querySelector('table');
      return {
        heights: [...table.tBodies[0].rows].map(row => row.offsetHeight),
        footer: getComputedStyle(table.tFoot).display,
      };
    };
    const before = sample();
    const samples = {};
    document.body.append(drawer);
    main.setAttribute('aria-hidden', 'true');
    main.inert = true;
    document.body.style.overflow = 'hidden';
    await frame();
    samples.drawer = sample();
    const beds = paper.querySelector('a[data-hhr-bed-link]');
    const bedLink = beds?.href;
    const footerGap = paper.getBoundingClientRect().bottom - beds.getBoundingClientRect().bottom;
    const icons = [...paper.querySelectorAll('[data-hhr-menu-icon]')].map(item => ({
      key: item.dataset.hhrMenuIcon, visible: getComputedStyle(item, '::before').maskImage !== 'none',
    }));

    // The results may stay painted while the responsive tabs are unmounted.
    const anchor = document.createComment('tabs');
    tabs.replaceWith(anchor);
    // Wait for the ordinary operations UI observer to process the same change.
    document.documentElement.removeAttribute('data-hhr-prescription-print-state');
    await new Promise(resolve => {
      const observer = new MutationObserver(() => {
        observer.disconnect();
        resolve();
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-hhr-prescription-print-state'] });
    });
    samples.withoutTabs = sample();

    // A portal can have a second table with the same headings. Never style it.
    menu.append(panel.firstElementChild.cloneNode(true), panel.lastElementChild.cloneNode(true));
    drawer.append(menu);
    const old = panel.querySelector('table');
    const replacement = old.cloneNode(false);
    replacement.removeAttribute('data-hhr-compact-worklist');
    replacement.removeAttribute('data-hhr-complete-worklist');
    replacement.append(...old.childNodes);
    old.replaceWith(replacement);
    await frame();
    samples.replaced = sample();
    const menuStyled = menu.querySelector('table').hasAttribute('data-hhr-compact-worklist');

    drawer.remove();
    anchor.replaceWith(tabs);
    main.removeAttribute('aria-hidden');
    main.inert = false;
    document.body.style.overflow = '';
    await frame();
    samples.closed = sample();

    // Updating a text node in place is distinct from replacing table rows.
    const title = panel.firstElementChild.firstChild;
    const original = title.data;
    title.data = original.replace(/\(\d+\)$/, '(999)');
    await frame();
    const partial = sample();
    title.data = original;
    await frame();
    samples.refreshed = sample();
    return { before, samples, menuStyled, partial, bedLink, footerGap, icons };
  });
  assert.equal(result.before.heights.length, total);
  assert.equal(result.before.footer, 'none');
  for (const [state, layout] of Object.entries(result.samples)) {
    assert.deepEqual(layout, result.before, 'Worklist layout changed: ' + state);
  }
  assert.deepEqual(result.partial.heights, result.before.heights);
  assert.notEqual(result.partial.footer, 'none');
  assert.equal(result.menuStyled, false);
  assert.ok(Math.abs(result.footerGap) < 2, 'Gestión de Camas at the bottom of the drawer');
  assert.deepEqual(result.icons.map(icon => icon.key), ['worklist', 'care', 'plan', 'reports', 'beds']);
  assert.ok(result.icons.every(icon => icon.visible));
  assert.equal(result.bedLink, 'https://hospitalizado.rayensalud.cl/#/bed');
  const viewport = page.viewportSize();
  await page.setViewportSize({ ...viewport, width: 600 });
  const layout = await page.locator('#worklist table').evaluate(table => ({
    padding: getComputedStyle(table.tBodies[0].rows[0].cells[0]).paddingTop,
    footer: getComputedStyle(table.tFoot).display,
    count: table.tBodies[0].rows.length,
  }));
  assert.deepEqual(layout, { padding: '2px', footer: 'none', count: total });
  await page.setViewportSize(viewport);
}
