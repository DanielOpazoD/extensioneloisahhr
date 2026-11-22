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
    let opening = 0;
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
    const toggle = () => panel.querySelector('[data-hhr-handoff-toggle]');
    const isExpanded = () => panel.isConnected && sourcePath.test(location.pathname) &&
      toggle()?.ariaExpanded === 'true';
    let state = 'closed';
    let checkId = 0;
    const placeConnection = () => {
      const button = toggle();
      if (!connection.hidden && button && connection.nextElementSibling !== button) button.before(connection);
    };
    const setState = (next, message = '') => {
      state = next;
      panel.dataset.hhrHandoffState = next;
      connection.hidden = next === 'closed' || next === 'ready';
      if (connectionStatus.textContent !== message) connectionStatus.textContent = message;
      connect.hidden = next === 'checking';
      if (next === 'link') connect.textContent = 'Conectar HHR';
      else if (next === 'error') connect.textContent = 'Reintentar';
      placeConnection();
    };
    const requestAccess = action => chrome.runtime.sendMessage({ type: types.NURSING_HANDOFF_TABLE, action })
      .catch(() => ({ error: 'No se pudo comprobar la conexión a HHR. Intenta de nuevo.' }));
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
        setState('link', 'Conecta tu cuenta de HHR para editar las entregas.');
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
        // A receipt may supersede a status request issued just before the grant.
        void checkConnection(true);
      }
    };
    const send = (entry, type, value) => entry.frame?.contentWindow?.postMessage({ type, value }, extensionOrigin);
    const updatePending = () => {
      const count = [...entries.values()].filter(entry => entry.dirty).length;
      const pending = panel.querySelector('[data-hhr-handoff-pending]');
      const label = count === 1 ? '1 borrador' : count ? count + ' borradores' : '';
      if (pending && pending.textContent !== label) pending.textContent = label;
    };
    const receiveRow = message => {
      if (message.origin !== extensionOrigin ||
          !['hhr-handoff-row-height', 'hhr-handoff-row-dirty', 'hhr-handoff-row-link'].includes(message.data?.type)) return;
      const row = [...entries.values()].find(entry => entry.frame?.contentWindow === message.source);
      if (!row || !panel.contains(row.host)) return;
      const { type, value } = message.data;
      if (type === 'hhr-handoff-row-height' && Number.isFinite(value)) {
        row.frame.style.height = String(Math.max(24, Math.min(880, Math.ceil(value)))) + 'px';
      } else if (type === 'hhr-handoff-row-dirty' && typeof value === 'boolean') {
        row.dirty = value;
        updatePending();
      } else if (type === 'hhr-handoff-row-link' && value === true && state === 'ready') {
        void checkConnection();
      }
    };
    const drain = () => {
      if (state !== 'ready' || !isExpanded()) return;
      for (const entry of entries.values()) {
        if (opening >= 3) return;
        if (entry.visible && !entry.started) {
          entry.started = true;
          opening += 1;
          void mount(entry).finally(() => {
            opening -= 1;
            drain();
          });
        }
      }
    };
    async function mount(entry) {
      const { host } = entry;
      const episode = host.dataset.hhrHandoffInline;
      const rowEpisode = () => host.closest('tr')?.querySelector('[data-hhr-handoff-episode]')?.dataset.hhrHandoffEpisode;
      if (rowEpisode() !== episode) return;
      const status = document.createElement('p');
      status.setAttribute('role', 'status');
      status.textContent = 'Cargando entrega…';
      host.replaceChildren(status);
      const opened = await openEditor(episode, true);
      if (!host.isConnected || entries.get(host) !== entry || rowEpisode() !== episode ||
          host.dataset.hhrHandoffInline !== episode) {
        if (opened?.id) void revoke(opened.id);
        return;
      }
      if (state !== 'ready' || opened?.code === 'HHR_LINK_REQUIRED') {
        if (opened?.id) void revoke(opened.id);
        host.replaceChildren();
        entry.started = false;
        if (state === 'ready') void checkConnection();
        return;
      }
      if (!opened?.id) {
        status.textContent = opened?.error || 'No se pudo abrir la entrega.';
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.textContent = 'Reintentar';
        retry.addEventListener('click', event => {
          if (!event.isTrusted) return;
          entry.started = false;
          drain();
        });
        host.append(retry);
        return;
      }
      entry.id = opened.id;
      const frame = document.createElement('iframe');
      entry.frame = frame;
      frame.title = 'Entrega de turno de esta fila';
      frame.src = editorUrl + '#' + opened.id;
      frame.addEventListener('load', () => send(entry, 'hhr-handoff-row-visible', entry.visible));
      host.replaceChildren(frame);
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
    };
    const reconcile = () => {
      redraw = undefined;
      if (!panel.isConnected || !sourcePath.test(location.pathname)) {
        observer.disconnect();
        changes.disconnect();
        connection.remove();
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
