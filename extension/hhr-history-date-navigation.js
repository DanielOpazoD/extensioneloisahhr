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
      const barBottom = barRect && barRect.left < rect.right && barRect.right > rect.left
        ? barRect.bottom : 0;
      host.style.top = Math.max(8, Math.max(tabs.getBoundingClientRect().bottom, barBottom) - scrollTop + 8) + 'px';
      const boundary = host.getBoundingClientRect().bottom + 16;
      let index = 0;
      groups.forEach((group, candidate) => {
        if (group.element.getBoundingClientRect().top <= boundary) index = candidate;
      });
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
      host.style.cssText = 'position:sticky;display:block;z-index:20;padding-bottom:12px;';
      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <style>
          :host { color-scheme: light; }
          nav { display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border:1px solid #d7e1df;border-radius:10px;background:#fff;box-shadow:0 3px 12px #102a4310;font:13px/1.4 system-ui,sans-serif;color:#22333a; }
          strong { margin-right:auto;font-size:12px;font-weight:600; }
          .dates { display:flex;align-items:center;gap:6px;max-width:100%; }
          button,select { box-sizing:border-box;height:34px;border:1px solid #d7e1df;border-radius:7px;background:#fff;color:#0b6e66;font:inherit; }
          button { width:34px;flex:none;cursor:pointer;font-size:20px; }
          select { width:200px;max-width:calc(100vw - 160px);padding:0 8px;cursor:pointer; }
          button:hover:not(:disabled),select:hover { background:#edf7f4; }
          button:disabled { opacity:.4;cursor:default; }
          :focus-visible { outline:2px solid #0b6e66;outline-offset:2px; }
        </style>
        <nav aria-label="Navegar por fechas del historial">
          <strong>Historial</strong><div class="dates">
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
