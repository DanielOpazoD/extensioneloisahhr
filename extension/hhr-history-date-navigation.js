/** Navigate the date groups already rendered by Eloísa's native Historial. */
(() => {
  'use strict';
  const HOST_ID = 'hhr-history-date-navigation';
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
    let encounterId = '';
    let tab = null;
    let selected = -1;
    let frame = 0;
    let scroller = window;
    let disposed = false;
    const clear = () => {
      host?.remove();
      host = null;
      groups = [];
      selected = -1;
    };
    const update = () => {
      frame = 0;
      if (!host?.isConnected || !groups.length) return;
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
      const scrollElement = scroller === window ? document.scrollingElement : scroller;
      const viewportHeight = scroller === window ? innerHeight : scrollElement.clientHeight;
      const offset = scroller === window ? window.scrollY : scrollElement.scrollTop;
      const bottom = scroller === window ? innerHeight : scrollElement.getBoundingClientRect().top + scrollElement.clientTop + viewportHeight;
      const last = groups[groups.length - 1].element.getBoundingClientRect();
      if (scrollElement.scrollHeight > viewportHeight + 2 && offset + viewportHeight >= scrollElement.scrollHeight - 2 &&
          last.top < bottom && last.bottom > boundary) index = groups.length - 1;
      if (selected !== index) {
        selected = index;
        host.shadowRoot.querySelector('select').value = String(index);
      }
      host.shadowRoot.querySelector('[data-step="-1"]').disabled = index === 0;
      host.shadowRoot.querySelector('[data-step="1"]').disabled = index === groups.length - 1;
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
      host = document.createElement('div');
      host.id = HOST_ID;
      host.style.cssText = 'position:sticky;display:block;width:max-content;max-width:100%;z-index:20;padding-bottom:6px;';
      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <style>
          :host { color-scheme: light; }
          nav { display:flex;align-items:center;gap:4px;padding:3px 4px;max-width:100%;border:1px solid #d7e1df;border-radius:8px;background:#fff;box-shadow:0 3px 12px #102a4310;font:12px/1.4 system-ui,sans-serif;color:#22333a; }
          .dates { display:flex;align-items:center;gap:4px;max-width:100%; }
          button,select { box-sizing:border-box;height:28px;border:1px solid #d7e1df;border-radius:7px;background:#fff;color:#0b6e66;font:inherit; }
          button { width:28px;flex:none;cursor:pointer;font-size:20px; }
          select { width:170px;min-width:0;max-width:calc(100vw - 110px);padding:0 8px;cursor:pointer; }
          button:hover:not(:disabled),select:hover { background:#edf7f4; }
          button:disabled { opacity:.4;cursor:default; }
          :focus-visible { outline:2px solid #0b6e66;outline-offset:2px; }
        </style>
        <nav aria-label="Navegar por fechas del historial">
          <div class="dates">
            <button type="button" data-step="-1" aria-label="Fecha más reciente">‹</button>
            <select aria-label="Fecha del historial" title="Fechas cargadas en el historial"></select>
            <button type="button" data-step="1" aria-label="Fecha anterior">›</button>
          </div>
        </nav>`;
      shadow.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => jump(selected + Number(button.dataset.step)));
      });
      shadow.querySelector('select').addEventListener('change', event => jump(Number(event.target.value)));
      timeline.insertBefore(host, groups[0].element);
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
            !chip.getClientRects().length || chip.closest('#hhr-prescription-print-modal')) return [];
        return [{ element, label }];
      });
      const timeline = candidates[0]?.element.parentElement;
      const nextGroups = candidates.filter(group => group.element.parentElement === timeline);
      if (!timeline || !nextGroups.length) { clear(); return; }
      if (host?.parentElement !== timeline) clear();
      const changed = groups.length !== nextGroups.length || nextGroups.some((group, index) =>
        group.element !== groups[index]?.element || group.label !== groups[index]?.label);
      groups = nextGroups;
      if (!host) mount(timeline);
      if (changed) {
        const select = host.shadowRoot.querySelector('select');
        select.replaceChildren(...groups.map((group, index) => {
          const option = document.createElement('option');
          option.value = String(index);
          option.textContent = group.label;
          return option;
        }));
        selected = -1;
      }
      scheduleUpdate();
    };
    window.addEventListener('scroll', scheduleUpdate, true);
    window.addEventListener('resize', scheduleUpdate);
    return Object.freeze({
      refresh,
      dispose: () => {
        disposed = true;
        clear();
        window.cancelAnimationFrame(frame);
        window.removeEventListener('scroll', scheduleUpdate, true);
        window.removeEventListener('resize', scheduleUpdate);
      },
    });
  };
  globalThis.HhrHistoryDateNavigation = Object.freeze({ create });
})();
