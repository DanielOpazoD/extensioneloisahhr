/** Navigate the date groups already rendered by Eloísa's native Historial. */
(() => {
  'use strict';
  const HOST_ID = 'hhr-history-date-navigation';
  const FILTER_ATTR = 'data-hhr-history-filtered';
  const FILTERS = [
    ['medical', 'Evoluciones médicas'], ['nursing', 'Enfermería'],
    ['medication', 'Medicamentos'], ['procedure', 'Procedimientos'],
  ];
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const categoriesOf = card => {
    // Read category headings and the native professional role, never the note body.
    const body = card.querySelector(':scope > .MuiCardContent-root');
    const headings = Array.from(body?.children || []).flatMap(child =>
      child.matches('p.MuiTypography-root') ? [child] :
        child.matches('.MuiStack-root') && child.firstElementChild?.matches('p.MuiTypography-root') ? [child.firstElementChild] : []
    ).map(element => normalize(element.textContent));
    const roles = Array.from(card.querySelectorAll(':scope > .MuiCardHeader-root .MuiCardHeader-title, :scope > .MuiCardHeader-root .MuiCardHeader-subheader'))
      .map(element => normalize(element.textContent));
    const tags = [];
    if (headings.includes('evolucion') && roles.some(role => /^medic[oa](?:\b|\()/.test(role))) tags.push('medical');
    if (roles.some(role => /^(?:enfermer[oa]|paramedic[oa]|tens\b|tecnic[oa].*enfermer)/.test(role))) tags.push('nursing');
    if (headings.some(label => ['farmacos', 'administrador de medicamentos', 'administracion de medicamentos'].includes(label))) tags.push('medication');
    if (headings.some(label => ['procedimientos', 'procedimiento'].includes(label))) tags.push('procedure');
    return tags;
  };
  const dateLabel = label => {
    if (/^(Hoy|Ayer)$/i.test(label)) {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Pacific/Easter', year: 'numeric', month: '2-digit', day: '2-digit',
      }).formatToParts(new Date());
      const part = type => Number(parts.find(item => item.type === type)?.value);
      const day = new Date(Date.UTC(part('year'), part('month') - 1, part('day')));
      if (/^Ayer$/i.test(label)) day.setUTCDate(day.getUTCDate() - 1);
      return label + ' · ' + new Intl.DateTimeFormat('es-CL', {
        timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric',
      }).format(day);
    }
    return /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(label) ? label : '';
  };
  const create = () => {
    let host = null;
    let groups = [];
    let allGroups = [];
    const filters = new Set();
    const filtered = new Set();
    let filterStyle = null;
    let encounterId = '';
    let tab = null;
    let selected = -1;
    let frame = 0;
    let scroller = window;
    let disposed = false;
    const clear = (resetFilters = true) => {
      filtered.forEach(element => element.removeAttribute(FILTER_ATTR));
      filtered.clear();
      if (resetFilters) filters.clear();
      host?.remove();
      host = null;
      groups = [];
      allGroups = [];
      selected = -1;
    };
    const markFiltered = (element, hide) => {
      if (hide) { element.setAttribute(FILTER_ATTR, ''); filtered.add(element); }
      else { element.removeAttribute(FILTER_ATTR); filtered.delete(element); }
    };
    const applyFilters = () => {
      const cards = allGroups.flatMap(group => Array.from(group.element.children).filter(element => element.matches('.MuiCard-root') && !element.hidden));
      const current = new Set([...cards, ...allGroups.map(group => group.element)]);
      [...filtered].filter(element => !current.has(element)).forEach(element => markFiltered(element, false));
      const tags = new Map(cards.map(card => [card, categoriesOf(card)]));
      cards.forEach(card => markFiltered(card, filters.size > 0 && !tags.get(card).some(tag => filters.has(tag))));
      allGroups.forEach(group => markFiltered(group.element,
        filters.size > 0 && !cards.some(card => card.parentElement === group.element && !filtered.has(card))));
      const nextGroups = allGroups.filter(group => !filtered.has(group.element));
      const changed = groups.length !== nextGroups.length || nextGroups.some((group, index) =>
        group.element !== groups[index]?.element || group.label !== groups[index]?.label);
      groups = nextGroups;
      const shadow = host.shadowRoot;
      if (changed || !shadow.querySelector('select').options.length) {
        const select = shadow.querySelector('select');
        select.replaceChildren(...groups.map((group, index) => {
          const option = document.createElement('option'); option.value = String(index); option.textContent = group.label; return option;
        }));
        if (!groups.length) select.append(new Option('Sin coincidencias', ''));
        selected = -1;
      }
      shadow.querySelector('select').disabled = !groups.length;
      FILTERS.forEach(([key, label]) => {
        const button = shadow.querySelector('[data-filter="' + key + '"]');
        const active = filters.has(key);
        button.setAttribute('aria-pressed', String(active));
        button.setAttribute('aria-label', (active ? 'Quitar filtro: ' : 'Filtrar: ') + label);
        button.textContent = label + ' · ' + cards.filter(card => tags.get(card).includes(key)).length + (active ? ' ×' : '');
      });
      shadow.querySelector('[data-clear]').hidden = !filters.size;
      shadow.querySelector('[role="status"]').textContent = 'Mostrando ' + cards.filter(card => !filtered.has(card)).length +
        ' de ' + cards.length + ' eventos cargados' + (filters.size > 1 ? ' · Coincide con cualquiera de los filtros.' : '.');
      scheduleUpdate();
    };
    const update = () => {
      frame = 0;
      if (!host?.isConnected) return;
      const scrollTop = scroller === window ? 0 : scroller.getBoundingClientRect().top;
      const tabs = tab.closest('[role="tablist"]') || tab;
      const bar = document.getElementById('hhr-clinical-operations-bar');
      const rect = host.getBoundingClientRect();
      const barRect = bar?.getBoundingClientRect();
      const top = Math.max(scrollTop + 8, tabs.getBoundingClientRect().bottom + 8);
      const barBottom = barRect && barRect.left < rect.right && barRect.right > rect.left &&
        barRect.top < top + rect.height && barRect.bottom > top ? barRect.bottom + 8 : 0;
      host.style.top = Math.max(top, barBottom) - scrollTop + 'px';
      const boundary = host.getBoundingClientRect().bottom + 16;
      let index = 0;
      groups.forEach((group, candidate) => {
        if (group.element.getBoundingClientRect().top <= boundary) index = candidate;
      });
      if (selected !== index) {
        selected = index;
        host.shadowRoot.querySelector('select').value = String(index);
      }
      host.shadowRoot.querySelector('[data-step="-1"]').disabled = !groups.length || index === 0;
      host.shadowRoot.querySelector('[data-step="1"]').disabled = !groups.length || index === groups.length - 1;
    };
    const scheduleUpdate = () => {
      if (!disposed && !frame) frame = window.requestAnimationFrame(update);
    };
    const jump = index => {
      const group = groups[index];
      if (!host?.isConnected || !group?.element.isConnected) return;
      const align = () => scroller.scrollBy({
        top: group.element.getBoundingClientRect().top - host.getBoundingClientRect().bottom - 12,
        behavior: 'instant',
      });
      align();
      // The first scroll can pin the toolbar. Align again using its settled position.
      window.cancelAnimationFrame(frame);
      update();
      align();
      scheduleUpdate();
    };
    const mount = timeline => {
      if (!filterStyle) {
        filterStyle = document.createElement('style');
        filterStyle.textContent = '[' + FILTER_ATTR + '] { display:none !important; }';
        document.head.append(filterStyle);
      }
      host = document.createElement('div');
      host.id = HOST_ID;
      host.style.cssText = 'position:sticky;display:block;z-index:20;padding-bottom:12px;';
      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <style>
          :host { color-scheme: light; }
          nav { display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border:1px solid #d7e1df;border-radius:10px;background:#fff;box-shadow:0 3px 12px #102a4310;font:13px/1.4 system-ui,sans-serif;color:#22333a; }
          strong { margin-right:auto;font-size:12px;font-weight:600; }
          .dates { display:flex;align-items:center;gap:6px;max-width:100%;flex:0 1 280px; }
          button,select { box-sizing:border-box;min-height:34px;border:1px solid #d7e1df;border-radius:7px;background:#fff;color:#0b6e66;font:inherit; }
          button { flex:none;cursor:pointer;padding:5px 10px; }
          [data-step] { width:34px;padding:0;font-size:20px; }
          select { width:200px;min-width:0;flex:1;max-width:100%;padding:0 8px;cursor:pointer; }
          .filters { flex-basis:100%;display:flex;gap:6px;flex-wrap:wrap; }
          [data-filter] { border-radius:18px;font-size:12px; }
          [aria-pressed="true"] { background:#dff2ec;border-color:#0b6e66;font-weight:600; }
          [role="status"] { flex-basis:100%;font-size:12px;color:#526762; }
          [hidden] { display:none !important; }
          button:hover:not(:disabled),select:hover { background:#edf7f4; }
          button:disabled { opacity:.4;cursor:default; }
          :focus-visible { outline:2px solid #0b6e66;outline-offset:2px; }
        </style>
        <nav aria-label="Navegar por fechas del historial">
          <strong>Historial</strong><div class="dates">
            <button type="button" data-step="-1" aria-label="Fecha más reciente">‹</button>
            <select aria-label="Fecha del historial" title="Fechas cargadas en el historial"></select>
            <button type="button" data-step="1" aria-label="Fecha anterior">›</button>
          </div><div class="filters" aria-label="Filtros rápidos del historial">
            ${FILTERS.map(([key, label]) => '<button type="button" data-filter="' + key + '" aria-pressed="false">' + label + '</button>').join('')}
            <button type="button" data-clear hidden>Quitar todos</button>
          </div><div role="status" aria-live="polite"></div>
        </nav>`;
      shadow.querySelectorAll('[data-step]').forEach(button => {
        button.addEventListener('click', () => jump(selected + Number(button.dataset.step)));
      });
      shadow.querySelector('.filters').addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;
        const previous = groups[selected]?.element;
        if (button.hasAttribute('data-clear')) filters.clear();
        else if (filters.has(button.dataset.filter)) filters.delete(button.dataset.filter);
        else filters.add(button.dataset.filter);
        applyFilters();
        const index = groups.findIndex(group => group.element === previous);
        if (groups.length) jump(Math.max(0, index));
      });
      shadow.querySelector('select').addEventListener('change', event => jump(Number(event.target.value)));
      timeline.insertBefore(host, allGroups[0].element);
      scroller = window;
      for (let parent = timeline; parent && parent !== document.body; parent = parent.parentElement) {
        if (/(auto|scroll)/.test(window.getComputedStyle(parent).overflowY)) {
          scroller = parent;
          break;
        }
      }
    };
    const refresh = nextEncounterId => {
      if (disposed) return;
      if (encounterId !== nextEncounterId) clear();
      encounterId = nextEncounterId;
      tab = Array.from(document.querySelectorAll('[role="tab"][aria-selected="true"]'))
        .find(element => element.textContent.trim() === 'Historial' && element.getClientRects().length);
      if (!nextEncounterId || !tab) { clear(); return; }
      // Native groups: a date Chip in its own Stack, followed by event Cards.
      // Ignore dates inside cards (birth dates, orders, notes) and hidden tab panels.
      const candidates = Array.from(document.querySelectorAll('.MuiChip-label')).flatMap(chip => {
        const label = dateLabel(chip.textContent.trim());
        const divider = chip.closest('.MuiChip-root')?.parentElement;
        const element = divider?.parentElement;
        if (!label || !element?.matches('.MuiBox-root') ||
            element.firstElementChild !== divider || divider.children.length !== 1 ||
            !divider.nextElementSibling?.matches('.MuiCard-root') ||
            !(chip.getClientRects().length || (filtered.has(element) && element.parentElement.getClientRects().length)) ||
            element.hidden || chip.closest('#hhr-prescription-print-modal')) return [];
        return [{ element, label }];
      });
      const timeline = candidates[0]?.element.parentElement;
      const nextGroups = candidates.filter(group => group.element.parentElement === timeline);
      if (!timeline || !nextGroups.length) { clear(); return; }
      if (host?.parentElement !== timeline) clear(false);
      allGroups = nextGroups;
      if (!host) mount(timeline);
      applyFilters();
    };
    window.addEventListener('scroll', scheduleUpdate, true);
    window.addEventListener('resize', scheduleUpdate);
    return Object.freeze({
      refresh,
      dispose: () => {
        disposed = true;
        clear();
        filterStyle?.remove();
        window.cancelAnimationFrame(frame);
        window.removeEventListener('scroll', scheduleUpdate, true);
        window.removeEventListener('resize', scheduleUpdate);
      },
    });
  };
  globalThis.HhrHistoryDateNavigation = Object.freeze({ create, categoriesOf });
})();
