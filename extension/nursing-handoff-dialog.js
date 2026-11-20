(() => {
  'use strict';
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
  let table;

  function watchTable(panel) {
    const entries = new Map();
    let opening = 0;
    let redraw;
    const send = (entry, type, value) => entry.frame?.contentWindow?.postMessage({ type, value }, extensionOrigin);
    const resize = message => {
      if (message.origin !== extensionOrigin || message.data?.type !== 'hhr-handoff-row-height' ||
          !Number.isFinite(message.data.value)) return;
      const row = [...entries.values()].find(entry => entry.frame?.contentWindow === message.source);
      if (row) row.frame.style.height = String(Math.max(80, Math.min(880, Math.ceil(message.data.value)))) + 'px';
    };
    const drain = () => {
      if (!panel.isConnected || panel.querySelector('[data-hhr-handoff-toggle]')?.ariaExpanded !== 'true') return;
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
        window.removeEventListener('message', resize);
        for (const [host, entry] of entries) cleanup(host, entry);
        if (table?.panel === panel) table = undefined;
        return;
      }
      for (const [host, entry] of entries) if (!panel.contains(host)) cleanup(host, entry);
      for (const host of panel.querySelectorAll('[data-hhr-handoff-inline]')) {
        if (entries.has(host)) continue;
        entries.set(host, { host, visible: false, started: false });
        observer.observe(host);
      }
      drain();
    };
    const changes = new MutationObserver(records => {
      if (panel.isConnected && !records.some(record => panel.contains(record.target))) return;
      if (redraw === undefined) redraw = requestAnimationFrame(reconcile);
    });
    changes.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-expanded'] });
    window.addEventListener('message', resize);
    reconcile();
    return { panel };
  }

  document.addEventListener('click', async event => {
    if (!event.isTrusted || !sourcePath.test(location.pathname)) return;
    const toggle = event.target.closest?.('[data-hhr-handoff-toggle]');
    const panel = toggle?.closest('.hhr-hospitalized-panel');
    if (panel && 'IntersectionObserver' in window && table?.panel !== panel) table = watchTable(panel);
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
