// The name of the patient in Eloísa's green bar opens the list of hospitalized patients: the owner asked to
// change of patient from the ficha, in the lista de trabajo médico and in Gestión de cuidados. Each patient
// is a link to the same view of its own episode. The list is read once a minute from the active census
// (one read, the service worker owns it); the name keeps its words and its place.
(() => {
  'use strict';
  const NAME = '#menu-app-bar-element .MuiToolbar-root > .MuiStack-root > .MuiStack-root:first-child p.MuiTypography-root';
  const fresh = 60_000;
  const plain = text => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const el = (tag, attributes = {}, text = '') => {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    if (text) node.textContent = text;
    return node;
  };
  // The address of the same view for another episode: the last number of the path is the episode.
  const hrefFor = (encounterId, path = location.pathname) => /\/\d+\/?$/.test(path) ? path.replace(/\/\d+(\/?)$/, '/' + encounterId + '$1') : null;
  // A patient is placed by the code of the bed, which already names its room (H1C1 in room H1): the owner
  // asked for that code alone (27-11-2026). Without a bed, the room.
  const placeOf = patient => String(patient.bed || '').trim() || String(patient.room || '').trim();
  const searchable = patient => [patient.name, patient.room, patient.bed].map(part => String(part || '')).join(' ');

  function create({ readRoster } = {}) {
    let name = null, popover = null, roster = null, readAt = 0, reading = null, current = '', opener = null;

    const close = (restore = true) => {
      if (!popover) return;
      popover.remove(); popover = null;
      document.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('resize', place);
      name?.setAttribute('aria-expanded', 'false');
      if (restore && opener?.isConnected) opener.focus({ preventScroll: true });
    };
    const outside = event => { if (popover && !popover.contains(event.target) && !name?.contains(event.target)) close(false); };
    const place = () => {
      if (!popover || !name?.isConnected) return;
      const box = name.getBoundingClientRect();
      popover.style.setProperty('--hhr-switch-top', Math.round(box.bottom + 6) + 'px');
      popover.style.setProperty('--hhr-switch-left', Math.round(Math.max(8, box.left - 8)) + 'px');
    };

    async function load() {
      if (roster && Date.now() - readAt < fresh) return roster;
      reading ||= Promise.resolve(typeof readRoster === 'function' ? readRoster() : null)
        .then(answer => {
          if (!answer?.ok || !Array.isArray(answer.patients)) throw new Error(answer?.error || 'La lista de hospitalizados no está disponible.');
          roster = answer.patients.filter(patient => /^\d+$/.test(String(patient.encounterId || '')));
          readAt = Date.now();
          return roster;
        })
        .finally(() => { reading = null; });
      return reading;
    }

    function render(list, status, query) {
      const words = plain(query).split(' ').filter(Boolean);
      const shown = (roster || []).filter(patient => words.every(word => plain(searchable(patient)).includes(word)));
      list.replaceChildren(...shown.map(patient => {
        const href = hrefFor(patient.encounterId);
        const link = el('a', { href: href || '#', 'data-hhr-switch-patient': '' });
        if (String(patient.encounterId) === current) link.setAttribute('aria-current', 'page');
        link.append(el('span', { class: 'hhr-switch-place' }, placeOf(patient) || '—'), el('span', { class: 'hhr-switch-name' }, patient.name || 'Paciente sin nombre'));
        const item = el('li'); item.append(link);
        return item;
      }));
      status.textContent = !roster ? status.textContent : shown.length ? shown.length + (shown.length === 1 ? ' paciente' : ' pacientes') : 'Ningún paciente coincide.';
    }

    async function open() {
      if (popover) return close();
      opener = name;
      popover = el('div', { role: 'dialog', 'aria-label': 'Cambiar de paciente', 'data-hhr-patient-switcher': '' });
      const search = el('input', { type: 'search', placeholder: 'Buscar por nombre, sala o cama', 'aria-label': 'Buscar paciente hospitalizado', autocomplete: 'off' });
      const status = el('p', { role: 'status', class: 'hhr-switch-status' }, 'Cargando pacientes hospitalizados…');
      const list = el('ul', { class: 'hhr-switch-list', 'aria-label': 'Pacientes hospitalizados' });
      popover.append(search, status, list);
      document.body.append(popover);
      name.setAttribute('aria-expanded', 'true');
      place();
      document.addEventListener('pointerdown', outside, true);
      window.addEventListener('resize', place);
      search.addEventListener('input', () => render(list, status, search.value));
      popover.addEventListener('keydown', event => {
        const links = [...list.querySelectorAll('a')];
        const at = links.indexOf(document.activeElement);
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        else if (event.key === 'ArrowDown') { event.preventDefault(); links[Math.min(links.length - 1, at + 1)]?.focus(); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); (at <= 0 ? search : links[at - 1]).focus(); }
        else if (event.key === 'Enter' && document.activeElement === search && links.length === 1) { event.preventDefault(); links[0].click(); }
      });
      search.focus({ preventScroll: true });
      const shownFor = popover;
      const show = async () => {
        try {
          await load();
          if (popover !== shownFor) return;
          render(list, status, search.value);
        } catch (error) {
          if (popover !== shownFor) return;
          // A failed read is said, and can be asked again without closing.
          const again = el('button', { type: 'button', class: 'hhr-switch-retry', 'data-hhr-switch-retry': '' }, 'Reintentar');
          again.addEventListener('click', () => { status.textContent = 'Cargando pacientes hospitalizados…'; show(); });
          status.replaceChildren(String(error?.message || error) + ' ', again);
        }
      };
      await show();
    }

    const onClick = event => { event.preventDefault(); event.stopPropagation(); open(); };
    // Pointing at the name already reads the list, so it is there when the name is pressed.
    const warm = () => { load().catch(() => {}); };
    const onKey = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } };
    const release = () => {
      if (!name) return;
      name.removeEventListener('click', onClick);
      name.removeEventListener('keydown', onKey);
      name.removeEventListener('pointerenter', warm);
      name.removeEventListener('focus', warm);
      for (const attribute of ['role', 'tabindex', 'aria-haspopup', 'aria-expanded', 'title', 'data-hhr-patient-switch']) name.removeAttribute(attribute);
      name = null;
    };

    function refresh(encounterId, active = true) {
      current = String(encounterId || '');
      const next = active && hrefFor(current || 0) ? document.querySelector(NAME) : null;
      if (next !== name) {
        close(false);
        release();
        name = next;
        if (name) {
          name.setAttribute('data-hhr-patient-switch', '');
          name.setAttribute('role', 'button');
          name.setAttribute('tabindex', '0');
          name.setAttribute('aria-haspopup', 'dialog');
          name.setAttribute('aria-expanded', 'false');
          name.setAttribute('title', 'Cambiar de paciente');
          name.addEventListener('click', onClick);
          name.addEventListener('keydown', onKey);
          name.addEventListener('pointerenter', warm);
          name.addEventListener('focus', warm);
        }
      }
    }
    return Object.freeze({ refresh, clear: () => { close(false); release(); }, hrefFor });
  }
  globalThis.HhrFichaPatientSwitcher = Object.freeze({ create, hrefFor });
})();
