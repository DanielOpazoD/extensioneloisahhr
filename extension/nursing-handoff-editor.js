(() => {
  'use strict';
  const id = location.hash.slice(1);
  const byId = id => document.getElementById(id);
  const edit = byId('edit');
  const note = byId('note');
  const conflict = byId('conflict');
  const status = byId('status');
  const discard = byId('discard');
  const save = byId('save');
  const connect = byId('connect');
  const disconnect = byId('disconnect');
  let slot;
  let base;
  let pendingVersion;
  let remote;
  let saving = false;
  let available = false;
  let ready = false;
  let hosted = false;
  let inline = false;
  let rowVisible = true;
  let refresh;
  let draftVersion;
  let polling = 0;
  const dirty = () => base && note.value !== base.text.replace(/\r\n?/g, '\n');
  const show = (text, tone = '') => {
    status.textContent = text;
    status.dataset.tone = tone;
  };
  const pinSlot = value => {
    if (slot || !/^\d{4}-\d{2}-\d{2}$/.test(value?.date) ||
        !['day', 'night'].includes(value.shift)) return;
    const { date, shift } = value;
    slot = { date, shift };
    byId('slot').textContent = (shift === 'day' ? 'Día' : 'Noche') + ' · ' + date.split('-').reverse().join('-');
  };
  const send = (action, data = {}) => chrome.runtime.sendMessage({
    type: HhrRayenMessageContract.types.NURSING_HANDOFF_EDITOR, id, action, ...data,
  }).catch(() => ({ error: 'Se perdió la conexión con la extensión.', code: 'UNAVAILABLE' }));
  const saveDraft = () => {
    if (!inline || !base) return;
    void send('draft', { ...slot, version: draftVersion, text: dirty() ? note.value : undefined });
  };

  const updateButtons = () => {
    save.hidden = edit.hidden;
    save.disabled = saving || !available || !ready || Boolean(remote) || !dirty();
    disconnect.disabled = saving;
    note.readOnly = saving;
  };
  const close = () => window.parent.postMessage('hhr-nursing-handoff-close', 'https://fichamedico.rayensalud.cl');
  const requestClose = () => {
    if (saving) return;
    if (!dirty()) {
      close();
      return;
    }
    discard.hidden = false;
    byId('continue').focus();
  };
  byId('close').addEventListener('click', requestClose);
  byId('confirm-close').addEventListener('click', close);
  byId('continue').addEventListener('click', () => {
    discard.hidden = true;
    note.focus();
  });
  document.addEventListener('keydown', event => {
    if (!inline && event.key === 'Escape') {
      event.preventDefault();
      requestClose();
    }
  });
  note.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.isComposing) {
      event.preventDefault();
      if (!save.disabled) edit.requestSubmit(save);
    }
  });
  const accept = (value, replaceText) => {
    pinSlot(value);
    base = value;
    draftVersion = value.version;
    pendingVersion = value.version;
    remote = undefined;
    conflict.hidden = true;
    if (replaceText) note.value = value.text;
    edit.hidden = false;
    updateButtons();
  };
  const raise = result => {
    if (result.code === 'HHR_LINK_REQUIRED') {
      ready = false;
      disconnect.hidden = true;
      connect.hidden = false;
    }
    if (['UNAUTHENTICATED', 'PERMISSION_DENIED', 'SOURCE_SESSION_CHANGED'].includes(result.code)) {
      available = false;
      edit.hidden = conflict.hidden = true;
      connect.hidden = disconnect.hidden = true;
      byId('patient').textContent = '';
      byId('slot').textContent = '';
    }
    if (result.code === 'FAILED_PRECONDITION') available = false;
    if (result.code === 'NOT_FOUND') {
      pinSlot(result.slot);
      ready = false;
    }
    show(result.error, 'error');
    updateButtons();
  };
  const notifyRemote = value => {
    remote = value;
    byId('remote').value = value.text;
    conflict.hidden = false;
    show('Hay cambios en HHR. Revisa ambas versiones antes de guardar.', 'error');
    updateButtons();
  };

  async function follow(generation, wait = false) {
    if (generation !== polling || !available || (inline && (!rowVisible || document.hidden))) return;
    const result = await send('read', { ...slot, since: wait ? pendingVersion : undefined });
    if (generation !== polling) return;
    if (result.error) {
      raise(result);
      if (available) refresh = setTimeout(() => void follow(generation), inline ? 12000 : 2000);
      return;
    }
    ready = true;
    connect.hidden = true;
    disconnect.hidden = !hosted;
    if (!base && inline && result.draft) {
      accept(result, true);
      if (note.value !== result.draft.text.replace(/\r\n?/g, '\n')) {
        note.value = result.draft.text;
        draftVersion = result.draft.version;
        if (draftVersion !== result.version) notifyRemote(result);
        else show('Borrador recuperado');
      } else saveDraft();
      updateButtons();
    } else if (pendingVersion !== result.version) {
      pendingVersion = result.version;
      if (dirty() && note.value !== result.text.replace(/\r\n?/g, '\n')) notifyRemote(result);
      else {
        accept(result, true);
        show(inline ? '' : 'Nota al día');
      }
    } else {
      edit.hidden = false;
      conflict.hidden = !remote;
      if (status.dataset.tone === 'error' && !remote) show(dirty() ? 'Sin guardar' : '');
      updateButtons();
    }
    if (!inline || document.activeElement === note) void follow(generation, true);
    else refresh = setTimeout(() => void follow(generation), 30000 + Math.random() * 10000);
  }

  const resumeRow = () => {
    if (inline && rowVisible && available && !saving) {
      clearTimeout(refresh);
      void follow(++polling);
    }
  };
  window.addEventListener('message', event => {
    if (!inline || event.source !== window.parent || event.origin !== 'https://fichamedico.rayensalud.cl') return;
    if (event.data?.type === 'hhr-handoff-row-visible') {
      const visible = event.data.value === true;
      if (visible !== rowVisible) {
        rowVisible = visible;
        if (visible) resumeRow();
        else clearTimeout(refresh);
      }
    }
  });
  note.addEventListener('focus', resumeRow);
  note.addEventListener('input', () => {
    if (!remote) show(dirty() ? 'Sin guardar' : '');
    updateButtons();
    saveDraft();
  });
  connect.addEventListener('click', async () => {
    connect.disabled = true;
    try {
      const result = await send('connect');
      if (result.error) show(result.error, 'error');
    } finally {
      connect.disabled = false;
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && inline) resumeRow();
    else if (document.visibilityState === 'visible' && !connect.hidden && available && !saving) {
      void follow(++polling);
    }
  });
  disconnect.addEventListener('click', async () => {
    if (saving) return;
    const generation = ++polling;
    disconnect.hidden = true;
    ready = false;
    updateButtons();
    show('Desconectando…');
    const result = await send('disconnect');
    raise(result.error ? result : {
      code: 'HHR_LINK_REQUIRED',
      error: dirty() ? 'Desconectado. Tu nota sigue abierta.' :
        result.remoteConfirmed === false ? 'Desconectado en este navegador.' : 'Desconectado de HHR.',
    });
    if (available) setTimeout(() => void follow(generation), 2000);
  });
  byId('keep').addEventListener('click', () => {
    if (remote) accept(remote, false);
    saveDraft();
    show(dirty() ? 'Sin guardar' : '');
    note.focus();
  });
  byId('use-remote').addEventListener('click', () => {
    if (remote) accept(remote, true);
    saveDraft();
    show('Nota al día');
    note.focus();
  });
  edit.addEventListener('submit', async event => {
    event.preventDefault();
    if (save.disabled) return;
    clearTimeout(refresh);
    ++polling;
    saving = true;
    updateButtons();
    show('Guardando…');
    const { date, shift, version } = base;
    const result = await send('save', { date, shift, version, text: note.value });
    saving = false;
    if (result.confirmed && result.error) {
      raise(result);
      show('✓ HHR guardó la entrega. Vuelve a abrirla desde la lista.', 'ok');
    } else if (result.confirmed) {
      accept(result, true);
      saveDraft();
      show('✓ Guardado en HHR', 'ok');
    } else raise(result.error ? result : { error: 'HHR todavía no confirmó el guardado.' });
    if (available) void follow(++polling, Boolean(result.confirmed));
  });
  void (async () => {
    const context = await send('context');
    if (context.error) return raise(context);
    inline = context.inline === true;
    if (inline) {
      document.body.classList.add('hhr-handoff-row');
      const main = document.querySelector('main');
      new ResizeObserver(() => window.parent.postMessage({
        type: 'hhr-handoff-row-height', value: main.offsetHeight,
      }, 'https://fichamedico.rayensalud.cl')).observe(main);
    }
    hosted = context.hosted === true;
    byId('environment').textContent = hosted ? 'HHR' : 'Pruebas HHR';
    byId('patient').textContent = context.name;
    available = true;
    show('Cargando entrega…');
    void follow(++polling);
  })();
})();
