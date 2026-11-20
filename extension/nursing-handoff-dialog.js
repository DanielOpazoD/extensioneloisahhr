(() => {
  'use strict';
  const { types } = HhrRayenMessageContract;
  const extensionOrigin = chrome.runtime.getURL('').slice(0, -1);
  const editorUrl = chrome.runtime.getURL('nursing-handoff-editor.html');
  const sourcePath = /^\/dashboard\/encounter-list-nurse\/?$/;
  let active;

  document.addEventListener('click', async event => {
    const button = event.target.closest?.('button[data-hhr-handoff-episode]');
    if (!event.isTrusted || !button || !sourcePath.test(location.pathname) ||
        !button.closest('.hhr-hospitalized-panel')) return;
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

    const opened = await chrome.runtime.sendMessage({
      type: types.NURSING_HANDOFF_OPEN, encId: button.dataset.hhrHandoffEpisode,
    }).catch(() => ({ error: 'Recarga la ficha y vuelve a abrir la entrega.' }));
    if (opened?.id) {
      const revoke = () => chrome.runtime.sendMessage({
        type: types.NURSING_HANDOFF_EDITOR, id: opened.id, action: 'close',
      }).catch(() => {});
      if (!dialog.open || !sourcePath.test(location.pathname)) {
        void revoke();
        if (dialog.open) dialog.close();
        return;
      }
      dialog.addEventListener('close', revoke, { once: true });
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
