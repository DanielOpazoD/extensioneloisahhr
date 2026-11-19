(() => {
  'use strict';
  const id = location.hash.slice(1);
  const byId = id => document.getElementById(id);
  const pair = byId('pair');
  const edit = byId('edit');
  const note = byId('note');
  const conflict = byId('conflict');
  const status = byId('status');
  const save = edit.querySelector('button[type=submit]');
  let base;
  let pendingVersion;
  let remote;
  let saving = false;
  let linked = false;
  let polling = 0;
  const dirty = () => base && note.value !== base.text.replace(/\r\n?/g, '\n');
  const show = (text, tone = '') => {
    status.textContent = text;
    status.dataset.tone = tone;
  };
  const send = (action, data = {}) => chrome.runtime.sendMessage({
    type: HhrRayenMessageContract.types.NURSING_HANDOFF_EDITOR, id, action, ...data,
  }).catch(() => ({ error: 'Se perdió la conexión con la extensión.', code: 'UNAVAILABLE' }));

  const updateButtons = () => {
    save.disabled = saving || !linked || Boolean(remote) || !dirty();
    byId('disconnect').disabled = saving || !linked;
    note.readOnly = saving;
  };
  const accept = (value, replaceText) => {
    base = value;
    pendingVersion = value.version;
    remote = undefined;
    conflict.hidden = true;
    if (replaceText) note.value = value.text;
    byId('slot').textContent = (value.shift === 'day' ? 'Día' : 'Noche') + ' · ' + value.date.split('-').reverse().join('-');
    edit.hidden = false;
    updateButtons();
  };
  const raise = result => {
    if (result.code === 'UNAUTHENTICATED' || result.code === 'PERMISSION_DENIED') {
      edit.hidden = conflict.hidden = true;
      pair.hidden = false;
      linked = false;
    }
    if (result.code === 'FAILED_PRECONDITION') linked = false;
    if (result.code === 'SOURCE_SESSION_CHANGED') {
      linked = false;
      edit.hidden = conflict.hidden = pair.hidden = true;
      byId('patient').textContent = '';
      byId('slot').textContent = '';
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
    if (generation !== polling || !linked) return;
    const result = await send('read', base && {
      date: base.date, shift: base.shift, since: wait ? pendingVersion : undefined,
    });
    if (generation !== polling) return;
    if (result.error) {
      raise(result);
      if (linked) setTimeout(() => void follow(generation), 2000);
      return;
    }
    if (pendingVersion !== result.version) {
      pendingVersion = result.version;
      if (dirty() && note.value !== result.text.replace(/\r\n?/g, '\n')) notifyRemote(result);
      else {
        accept(result, true);
        show('Nota al día');
      }
    } else {
      edit.hidden = false;
      conflict.hidden = !remote;
      if (status.dataset.tone === 'error' && !remote) show(dirty() ? 'Sin guardar' : '');
    }
    void follow(generation, true);
  }

  function start() {
    linked = true;
    pair.hidden = true;
    show('Cargando entrega…');
    void follow(++polling);
  }
  pair.addEventListener('submit', async event => {
    event.preventDefault();
    const code = byId('code');
    const button = pair.querySelector('button');
    button.disabled = true;
    try {
      const result = await send('connect', { code: code.value });
      if (result.error) raise(result);
      else {
        code.value = '';
        start();
      }
    } finally { button.disabled = false; }
  });
  byId('disconnect').addEventListener('click', async () => {
    if (dirty()) {
      show('Guarda tu edición antes de desvincular.', 'error');
      return;
    }
    const result = await send('disconnect');
    if (result.error && result.code !== 'UNAUTHENTICATED') return raise(result);
    ++polling;
    linked = false;
    base = remote = pendingVersion = undefined;
    note.value = '';
    byId('slot').textContent = '';
    edit.hidden = conflict.hidden = true;
    pair.hidden = false;
    show('');
  });
  note.addEventListener('input', () => {
    if (!remote) show(dirty() ? 'Sin guardar' : '');
    updateButtons();
  });
  byId('keep').addEventListener('click', () => {
    if (remote) accept(remote, false);
    show(dirty() ? 'Sin guardar' : '');
    note.focus();
  });
  byId('use-remote').addEventListener('click', () => {
    if (remote) accept(remote, true);
    show('Nota al día');
    note.focus();
  });
  edit.addEventListener('submit', async event => {
    event.preventDefault();
    if (save.disabled) return;
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
      show('✓ Guardado en HHR', 'ok');
    } else raise(result.error ? result : { error: 'HHR todavía no confirmó el guardado.' });
    if (linked) void follow(++polling, Boolean(result.confirmed));
  });
  void (async () => {
    const context = await send('context');
    if (context.error) return raise(context);
    byId('patient').textContent = context.name;
    if (context.paired) start();
    else pair.hidden = false;
  })();
})();
