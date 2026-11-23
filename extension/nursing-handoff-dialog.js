(() => {
  'use strict';
  if (globalThis.__hhrNursingHandoffMounted) return;
  globalThis.__hhrNursingHandoffMounted = true;
  const { types } = HhrRayenMessageContract;
  const extensionOrigin = chrome.runtime.getURL('').slice(0, -1);
  const editorUrl = chrome.runtime.getURL('nursing-handoff-editor.html');
  const sourcePath = /^\/dashboard\/encounter-list-nurse\/?$/;
  const openEditor = (encId, inline = false) =>
    chrome.runtime.sendMessage({ type: types.NURSING_HANDOFF_OPEN, encId, inline })
      .catch(() => ({ error: 'Recarga la ficha y vuelve a abrir la entrega.' }));
  const revoke = id => chrome.runtime.sendMessage({
    type: types.NURSING_HANDOFF_EDITOR, id, action: 'close',
  }).catch(() => {});
  let active;
  const tables = new WeakSet();

  function watchTable(panel) {
    const entries = new Map();
    let opening = false;
    let redraw;
    const connection = document.createElement('div');
    connection.className = 'hhr-handoff-connection';
    connection.hidden = true;
    const connectionStatus = document.createElement('span');
    connectionStatus.setAttribute('role', 'status');
    const connect = document.createElement('button');
    connect.type = 'button';
    connect.textContent = 'Conectar HHR';
    connection.append(connectionStatus, connect);
    const controls = document.createElement('div');
    controls.className = 'hhr-handoff-controls';
    controls.hidden = true;
    const dateLabel = document.createElement('span');
    dateLabel.className = 'hhr-handoff-date';
    const shifts = document.createElement('div');
    shifts.className = 'hhr-handoff-shifts';
    shifts.setAttribute('role', 'tablist');
    shifts.setAttribute('aria-label', 'Turno de la entrega');
    const shiftButtons = new Map();
    const feedback = document.createElement('span');
    feedback.setAttribute('role', 'status');
    const saveAll = document.createElement('button');
    saveAll.type = 'button';
    saveAll.className = 'hhr-handoff-save-all';
    saveAll.textContent = 'Guardar cambios';
    const retryRows = document.createElement('button');
    retryRows.type = 'button';
    retryRows.textContent = 'Reintentar carga';
    retryRows.hidden = true;
    controls.append(dateLabel, shifts, feedback, retryRows, saveAll);
    let slot;
    let selected;
    let batchSave;
    let receipt = '';
    const toggle = () => panel.querySelector('[data-hhr-handoff-toggle]');
    const isExpanded = () => panel.isConnected && sourcePath.test(location.pathname) &&
      toggle()?.ariaExpanded === 'true';
    let state = 'closed';
    let checkId = 0;
    const placeConnection = () => {
      const button = toggle();
      if (!button) return;
      if (!connection.hidden && connection.nextElementSibling !== button) button.before(connection);
      if (!controls.hidden && controls.nextElementSibling !== button) button.before(controls);
    };
    const setState = (next, message = '', registration = false) => {
      state = next;
      panel.dataset.hhrHandoffState = next;
      connection.hidden = next === 'closed' || next === 'ready';
      controls.hidden = next !== 'ready';
      if (connectionStatus.textContent !== message) connectionStatus.textContent = message;
      connect.hidden = next === 'checking';
      if (next === 'link') connect.textContent = registration ? 'Registrar equipo' : 'Conectar HHR';
      else if (next === 'error') connect.textContent = 'Reintentar';
      placeConnection();
    };
    const requestAccess = (action, data = {}) => chrome.runtime.sendMessage({ type: types.NURSING_HANDOFF_TABLE, action, ...data })
      .catch(() => ({ error: 'Se perdió la comunicación con la extensión. Intenta de nuevo.' }));
    const checkConnection = async (force = false) => {
      if (!isExpanded() || (!force && state === 'checking')) return;
      const current = ++checkId;
      setState('checking', 'Comprobando conexión…');
      const result = await requestAccess('status');
      if (current !== checkId || !isExpanded()) return;
      if (result?.ok) {
        setState('ready');
        drain();
      } else if (result?.code === 'HHR_LINK_REQUIRED') {
        setState('link', result.registration ? result.error : 'Conecta tu cuenta de HHR para editar las entregas.', result.registration);
      } else {
        setState('error', result?.error || 'No se pudo comprobar la conexión a HHR.');
      }
    };
    connect.addEventListener('click', async event => {
      if (!event.isTrusted || connect.disabled || !isExpanded()) return;
      if (state === 'error') {
        void checkConnection();
        return;
      }
      if (state !== 'link') return;
      connect.disabled = true;
      try {
        const result = await requestAccess('connect');
        if (state === 'link' && isExpanded()) {
          if (result?.error) connectionStatus.textContent = result.error;
          else void checkConnection();
        }
      } finally {
        connect.disabled = false;
      }
    });
    const reconnect = () => {
      if (state === 'link') void checkConnection();
    };
    const receiveAccess = message => {
      if (message?.type === 'RAYEN_NURSING_HANDOFF_ACCESS_CHANGED' && ['checking', 'link'].includes(state)) {
        if (message.registrationError) {
          setState('link', message.registrationError, true);
          return;
        }
        // A receipt may supersede a status request issued just before the grant.
        void checkConnection(true);
      }
    };
    const send = (entry, type, value) => entry.frame?.contentWindow?.postMessage({ type, value }, extensionOrigin);
    const sameShift = (first, second) => first?.date === second?.date && first?.shift === second?.shift;
    const eligibleRows = () => [...entries.values()].filter(entry =>
      entry.id && entry.dirty && entry.canSave && sameShift(entry.slot, slot));
    const broadcastShift = entry => { if (slot) send(entry, 'hhr-handoff-row-shift', { slot, selected }); };
    const updatePending = () => {
      const count = [...entries.values()].filter(entry => entry.dirty).length;
      const pending = panel.querySelector('[data-hhr-handoff-pending]');
      const label = count === 1 ? '1 borrador' : count ? count + ' borradores' : '';
      if (pending && pending.textContent !== label) pending.textContent = label;
      shifts.hidden = !slot;
      saveAll.hidden = !slot;
      saveAll.disabled = Boolean(batchSave) || selected !== slot?.shift || !eligibleRows().length;
      const message = batchSave ? 'Guardando ' + batchSave.total + ' entregas…' :
        opening ? 'Cargando entregas…' : receipt ||
          (slot && selected !== slot.shift ? 'Solo lectura' : '');
      if (feedback.textContent !== message) feedback.textContent = message;
      retryRows.hidden = opening || ![...entries.values()].some(entry => entry.failed);
      for (const [shift, button] of shiftButtons) {
        const active = shift === selected;
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
        button.disabled = Boolean(batchSave);
        button.toggleAttribute('data-vigente', shift === slot?.shift);
        button.title = shift === slot?.shift ? 'Turno vigente' : 'Consultar turno';
      }
    };
    function chooseShift(shift) {
      if (selected !== shift) receipt = '';
      selected = shift;
      for (const entry of entries.values()) broadcastShift(entry);
      updatePending();
    }
    for (const [shift, label] of [['day', 'Día'], ['night', 'Noche']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', event => {
        if (event.isTrusted && !batchSave && slot) chooseShift(shift);
      });
      button.addEventListener('keydown', event => {
        if (!event.isTrusted || batchSave ||
            !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 'day' : event.key === 'End' ? 'night' :
          shift === 'day' ? 'night' : 'day';
        chooseShift(next);
        shiftButtons.get(next).focus();
      });
      shiftButtons.set(shift, button);
      shifts.append(button);
    }
    const formatter = new Intl.DateTimeFormat('es-CL', { timeZone: 'UTC', day: 'numeric', month: 'short' });
    const acceptSlot = next => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(next?.date) || !['day', 'night'].includes(next.shift) ||
          sameShift(slot, next) || (slot && (next.date < slot.date ||
            (next.date === slot.date && slot.shift === 'night')))) return;
      slot = next;
      dateLabel.textContent = formatter.format(new Date(slot.date + 'T00:00:00Z'));
      dateLabel.title = slot.date;
      receipt = '';
      chooseShift(slot.shift);
    };
    function finishSave(batch) {
      if (batchSave !== batch || batch.pending.size) return;
      clearTimeout(batch.timeout);
      const pending = batch.total - batch.saved;
      const saved = batch.saved === 1 ? '1 entrega guardada' : batch.saved + ' entregas guardadas';
      receipt = pending ? saved + ' · ' + pending + ' por revisar' : saved;
      batchSave = undefined;
      updatePending();
    }
    saveAll.addEventListener('click', async event => {
      if (!event.isTrusted || saveAll.disabled || batchSave || !isExpanded()) return;
      const rows = eligibleRows();
      if (!rows.length) return;
      const batch = { pending: new Set(rows), total: rows.length, saved: 0 };
      batchSave = batch;
      updatePending();
      const result = await requestAccess('prepare-save', { ids: rows.map(row => row.id) });
      if (batchSave !== batch) return;
      if (!result?.ticket) {
        receipt = result?.error || 'No se pudieron preparar los guardados.';
        batchSave = undefined;
        updatePending();
        if (result?.code === 'HHR_LINK_REQUIRED') void checkConnection();
        return;
      }
      batch.ticket = result.ticket;
      batch.timeout = setTimeout(() => {
        batch.pending.clear();
        finishSave(batch);
      }, 300000);
      for (const row of batch.pending) send(row, 'hhr-handoff-row-save', batch.ticket);
      finishSave(batch);
    });
    retryRows.addEventListener('click', event => {
      if (!event.isTrusted) return;
      for (const row of entries.values()) if (row.failed) {
        row.failed = false;
        row.started = false;
        delete row.host.dataset.hhrHandoffLoadFailed;
        row.host.replaceChildren();
      }
      receipt = '';
      drain();
      updatePending();
    });
    const receiveRow = message => {
      if (message.origin !== extensionOrigin ||
          !['hhr-handoff-row-height', 'hhr-handoff-row-state', 'hhr-handoff-row-link',
            'hhr-handoff-row-saved'].includes(message.data?.type)) return;
      const row = [...entries.values()].find(entry => entry.frame?.contentWindow === message.source);
      if (!row || !panel.contains(row.host)) return;
      const { type, value } = message.data;
      if (type === 'hhr-handoff-row-height' && Number.isFinite(value)) {
        row.frame.style.height = String(Math.max(24, Math.min(880, Math.ceil(value)))) + 'px';
      } else if (type === 'hhr-handoff-row-state' && typeof value?.dirty === 'boolean') {
        row.dirty = value.dirty;
        row.canSave = value.canSave === true;
        row.slot = value.slot;
        acceptSlot(value.slot);
        broadcastShift(row);
        updatePending();
      } else if (type === 'hhr-handoff-row-saved' && batchSave?.ticket &&
          value?.ticket === batchSave.ticket && batchSave.pending.delete(row)) {
        if (value.confirmed === true) batchSave.saved += 1;
        finishSave(batchSave);
      } else if (type === 'hhr-handoff-row-link' && value === true && state === 'ready') {
        void checkConnection();
      }
    };

    const episodeOf = host => host.dataset.hhrHandoffInline;
    const rowEpisode = host => host.closest('tr')?.querySelector('[data-hhr-handoff-episode]')?.dataset.hhrHandoffEpisode;
    const usable = (entry, episode) => entries.get(entry.host) === entry && panel.contains(entry.host) &&
      episodeOf(entry.host) === episode && rowEpisode(entry.host) === episode;
    const mount = (entry, opened) => {
      if (!usable(entry, opened.episode) || state !== 'ready' || !isExpanded()) {
        if (opened.id) void revoke(opened.id);
        entry.started = false;
        return;
      }
      if (!opened.id) {
        entry.failed = true;
        const status = document.createElement('p');
        status.textContent = opened.error || 'Entrega pendiente de carga';
        entry.host.replaceChildren(status);
        return;
      }
      entry.id = opened.id;
      const frame = document.createElement('iframe');
      entry.frame = frame;
      frame.title = 'Entrega de turno de esta fila';
      frame.src = editorUrl + '#' + opened.id;
      frame.addEventListener('load', () => {
        send(entry, 'hhr-handoff-row-visible', entry.visible);
        broadcastShift(entry);
      });
      entry.host.replaceChildren(frame);
    };
    async function drain() {
      if (state !== 'ready' || !isExpanded() || opening) return;
      const visible = new Map();
      for (const entry of entries.values()) {
        const episode = episodeOf(entry.host);
        if (entry.visible && !entry.started && usable(entry, episode)) visible.set(episode, entry);
        if (visible.size >= 50) break;
      }
      if (!visible.size) return;
      for (const entry of visible.values()) entry.started = true;
      opening = true;
      updatePending();
      try {
        const result = await requestAccess('open-rows', { episodes: [...visible.keys()] });
        if (result?.code === 'HHR_LINK_REQUIRED') {
          for (const entry of visible.values()) entry.started = false;
          if (state === 'ready') void checkConnection(true);
          return;
        }
        if (result.error) {
          receipt = result.error;
          for (const entry of visible.values()) {
            entry.failed = true;
            entry.host.dataset.hhrHandoffLoadFailed = '';
          }
          return;
        }
        const rows = new Map(result.rows?.map(row => [row.episode, row]));
        if (isExpanded() && state === 'ready') acceptSlot(result.slot);
        for (const [episode, entry] of visible) {
          mount(entry, rows.get(episode) || { episode });
        }
      } finally {
        opening = false;
        updatePending();
        void drain();
      }
    }
    const observer = new IntersectionObserver(changes => {
      for (const { target, isIntersecting } of changes) {
        const entry = entries.get(target);
        if (!entry) continue;
        entry.visible = isIntersecting;
        send(entry, 'hhr-handoff-row-visible', isIntersecting);
      }
      drain();
    });
    const cleanup = (host, entry) => {
      observer.unobserve(host);
      entries.delete(host);
      if (entry.id) void revoke(entry.id);
      if (batchSave?.pending.delete(entry)) finishSave(batchSave);
    };
    const reconcile = () => {
      redraw = undefined;
      if (!panel.isConnected || !sourcePath.test(location.pathname)) {
        observer.disconnect();
        changes.disconnect();
        connection.remove();
        controls.remove();
        if (batchSave) clearTimeout(batchSave.timeout);
        delete panel.dataset.hhrHandoffState;
        window.removeEventListener('message', receiveRow);
        window.removeEventListener('focus', reconnect);
        chrome.runtime.onMessage.removeListener(receiveAccess);
        for (const [host, entry] of entries) cleanup(host, entry);
        tables.delete(panel);
        return;
      }
      for (const [host, entry] of entries) if (!panel.contains(host)) cleanup(host, entry);
      for (const host of panel.querySelectorAll('[data-hhr-handoff-inline]')) {
        if (entries.has(host)) continue;
        entries.set(host, { host, visible: false, started: false });
        observer.observe(host);
      }
      updatePending();
      if (!isExpanded()) {
        if (state !== 'closed') {
          checkId += 1;
          setState('closed');
        }
      } else if (state === 'closed') {
        void checkConnection();
      } else {
        placeConnection();
        drain();
      }
    };
    const changes = new MutationObserver(records => {
      if (panel.isConnected && !records.some(record => panel.contains(record.target))) return;
      if (redraw === undefined) redraw = requestAnimationFrame(reconcile);
    });
    changes.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-expanded'] });
    window.addEventListener('message', receiveRow);
    window.addEventListener('focus', reconnect);
    chrome.runtime.onMessage.addListener(receiveAccess);
    reconcile();
  }

  document.addEventListener('click', async event => {
    if (!event.isTrusted || !sourcePath.test(location.pathname)) return;
    const toggle = event.target.closest?.('[data-hhr-handoff-toggle]');
    const panel = toggle?.closest('.hhr-hospitalized-panel');
    if (panel && 'IntersectionObserver' in window && !tables.has(panel)) {
      tables.add(panel);
      watchTable(panel);
    }
    const button = event.target.closest?.('button[data-hhr-handoff-episode]');
    if (!button || !button.closest('.hhr-hospitalized-panel')) return;
    event.stopPropagation();
    if (active) return;

    const dialog = document.createElement('dialog');
    dialog.className = 'hhr-nursing-handoff-dialog';
    dialog.setAttribute('aria-label', 'Entrega de turno');
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = 'Abriendo entrega…';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Cerrar';
    close.addEventListener('click', () => dialog.close());
    dialog.append(status, close);

    let frame;
    const receive = message => {
      if (message.origin === extensionOrigin && message.source === frame?.contentWindow &&
          message.data === 'hhr-nursing-handoff-close') dialog.close();
    };
    dialog.addEventListener('close', () => {
      window.removeEventListener('message', receive);
      dialog.remove();
      active = undefined;
      button.focus();
    }, { once: true });
    dialog.addEventListener('cancel', event => {
      if (!frame) return;
      event.preventDefault();
      frame.focus();
    });
    active = dialog;
    document.body.append(dialog);
    dialog.showModal();

    const opened = await openEditor(button.dataset.hhrHandoffEpisode);
    if (opened?.id) {
      if (!dialog.open || !sourcePath.test(location.pathname)) {
        void revoke(opened.id);
        if (dialog.open) dialog.close();
        return;
      }
      dialog.addEventListener('close', () => revoke(opened.id), { once: true });
      frame = document.createElement('iframe');
      frame.title = 'Editor de entrega de turno';
      frame.src = editorUrl + '#' + opened.id;
      window.addEventListener('message', receive);
      dialog.replaceChildren(frame);
      frame.focus();
    } else {
      status.textContent = opened?.error || 'No se pudo abrir la entrega.';
    }
  }, true);
})();
