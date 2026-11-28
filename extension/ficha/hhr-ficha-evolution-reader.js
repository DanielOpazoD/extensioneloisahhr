// The evolutions of the episode, of every profession, read without leaving the Resumen.
// The window belongs to the extension: Eloísa's own note and its Historial stay as they are.
(() => {
  'use strict';
  const WINDOW_LABELS = new Map([[14, 'Últimos 14 días'], [60, 'Últimos 60 días'], [365, 'Último año']]);
  const el = (tag, className, textContent) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (textContent) node.textContent = textContent;
    return node;
  };
  const button = (label, className) => Object.assign(el('button', className, label), { type: 'button' });
  // Eloísa may keep a note with the marks of its editor. Only those marks are removed: a «<» the
  // author wrote, as in «PAM <65», is text and stays.
  const MARKUP = /<\/?(?:p|div|span|br|strong|b|em|i|u|ul|ol|li|h[1-6]|font|table|tbody|tr|td)(?:\s[^<>]*)?\/?>/gi;
  const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
  const readable = note => String(note || '')
    .replace(/<br\s*\/?>|<\/(?:p|div|li|h[1-6]|tr)>/gi, '\n').replace(MARKUP, '')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, entity => ENTITIES[entity])
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const roleOf = note => note.role || 'Sin profesión';
  const flagsOf = note => [[note.crossedOut, 'Tachada'], [note.archived, 'Archivada'], [note.amended, 'Enmendada']];
  const views = ['Evoluciones', 'Scores'];
  const scoreColumns = ['Escala', 'Fecha de valoración', 'Puntaje', 'Riesgo', 'Próxima valoración'];
  const asTime = ({date, time}) => {
    const node = Object.assign(el('time'), {dateTime: date + (time ? 'T' + time : '')});
    node.append(el('span', 'hhr-score-date', date.split('-').reverse().join('-')));
    if (time) node.append(el('span', 'hhr-score-time-separator', ' · '), el('span', 'hhr-score-hour', time));
    return node;
  };

  function partition(notes) {
    const evolutions = [], scores = [];
    for (const note of notes) {
      const text = readable(note.note);
      const value = globalThis.HhrClinicalBradenNotes?.parse(text, note) || globalThis.HhrChecklistFalls?.parse(text, note);
      if (value) scores.push({ ...value, note, text });
      else evolutions.push({ ...note, text });
    }
    const stamp = row => row.valuation.date + 'T' + row.valuation.time;
    scores.sort((a, b) => stamp(b).localeCompare(stamp(a)));
    return { evolutions, scores };
  }

  function scoresTable(scores) {
    const table = el('table', 'hhr-scores-table');
    table.createCaption().textContent = 'Valoraciones del episodio';
    const header = table.createTHead().insertRow();
    for (const label of scoreColumns) header.append(Object.assign(el('th', '', label), { scope: 'col' }));
    const rows = table.createTBody();
    for (const [index, score] of scores.entries()) {
      const row = rows.insertRow();
      const name = Object.assign(el('th'), { scope: 'row' });
      const show = button(score.scale, 'hhr-score-note-link');
      const date = asTime(score.valuation);
      const details = rows.insertRow();
      details.className = 'hhr-score-detail';
      details.id = 'hhr-score-detail-' + index;
      details.hidden = true;
      show.setAttribute('aria-expanded', 'false');
      show.setAttribute('aria-controls', details.id);
      show.setAttribute('aria-label', score.scale + ', nota del ' + date.textContent);
      show.addEventListener('click', () => {
        details.hidden = !details.hidden;
        show.setAttribute('aria-expanded', String(!details.hidden));
      });
      name.append(show);
      for (const [on, label] of flagsOf(score.note)) {
        if (on) name.append(el('span', 'hhr-score-flag', label));
      }
      row.append(name);
      row.insertCell().append(date);
      row.insertCell().textContent = score.points + ' / ' + score.maximum;
      row.insertCell().textContent = score.risk;
      const due = row.insertCell();
      if (score.nextDate) due.append(asTime({date: score.nextDate}));
      else due.textContent = '—';
      const detailCell = details.insertCell();
      detailCell.colSpan = scoreColumns.length;
      const author = [score.note.role, score.note.author].filter(Boolean).join(' · ');
      if (author) detailCell.append(el('strong', '', author));
      detailCell.append(el('p', '', score.text));
    }
    return table;
  }

  function create({ readNotes, openHistory } = {}) {
    let dialog = null, episode = null, opener = null, request = 0;
    let notes = [], scores = [], days = 14, older = null, selected = '', state = 'idle', failure = '';
    let chosenView = views[0], pendingDays = 14;
    let heading, scope, viewButtons, filters, feed, scoreFeed, history, status, more, retry;

    const close = () => {
      if (!dialog) return;
      request += 1;
      if (typeof dialog.close === 'function') dialog.close();
      dialog.remove();
      dialog = null;
      notes = []; scores = [];
      feed.replaceChildren();
      scoreFeed.replaceChildren();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      opener = null;
    };
    function drawEvolutions() {
      const roles = new Map();
      for (const note of notes) roles.set(roleOf(note), (roles.get(roleOf(note)) || 0) + 1);
      if (selected && !roles.has(selected)) selected = '';
      const choices = [['', 'Todas', notes.length], ...[...roles].sort(([a], [b]) => a.localeCompare(b, 'es')).map(([role, count]) => [role, role, count])];
      const focused = filters.contains(document.activeElement) ? document.activeElement.dataset.role : null;
      filters.replaceChildren(...(notes.length ? choices : []).map(([role, label, count]) => {
        const choice = button(label, 'hhr-evo-reader-filter');
        choice.dataset.role = role;
        choice.setAttribute('aria-pressed', String(role === selected));
        choice.append(el('span', '', String(count)));
        return choice;
      }));
      if (focused !== null) [...filters.children].find(choice => choice.dataset.role === focused)?.focus({ preventScroll: true });
      const shown = notes.filter(note => !selected || roleOf(note) === selected);
      feed.replaceChildren(...shown.map(note => {
        const item = el('article', 'hhr-evo-reader-note');
        if (note.crossedOut || note.archived) item.dataset.state = 'void';
        const head = el('header');
        head.append(el('strong', '', roleOf(note)));
        if (note.author) head.append(el('span', '', note.author));
        head.append(el('time', '', note.day ? note.day + ' · ' + note.time : 'Sin hora legible'));
        for (const [on, label] of flagsOf(note)) {
          if (on) head.append(el('mark', '', label));
        }
        item.append(head, el('p', '', note.text));
        return item;
      }));
      feed.hidden = !shown.length;
    }
    function draw() {
      if (!dialog) return;
      const showingScores = chosenView === 'Scores';
      heading.textContent = chosenView;
      dialog.setAttribute('aria-label', chosenView + ' del episodio');
      dialog.toggleAttribute('data-hhr-scores-view', showingScores);
      for (const choice of viewButtons.children) choice.setAttribute('aria-pressed', String(choice.textContent === chosenView));
      history.hidden = showingScores;
      scope.textContent = (WINDOW_LABELS.get(days) || '') + ' · hora de Rapa Nui';
      filters.hidden = showingScores;
      scoreFeed.hidden = !showingScores || !scores.length;
      if (showingScores) {
        feed.hidden = true;
        filters.replaceChildren();
        feed.replaceChildren();
        scoreFeed.replaceChildren(...(scores.length ? [scoresTable(scores)] : []));
      } else {
        scoreFeed.replaceChildren();
        drawEvolutions();
      }
      const hasResults = showingScores ? scores.length : notes.length;
      const subject = showingScores ? 'valoraciones' : 'evoluciones';
      const period = (WINDOW_LABELS.get(days) || '').toLowerCase();
      const message = state === 'loading' ? 'Cargando ' + subject + '…' : state === 'failed' ? failure :
        hasResults ? '' : 'Sin ' + subject + ' en ' + (days === 365 ? 'el ' : 'los ') + period + '.';
      if (status.textContent !== message) status.textContent = message;
      status.hidden = !message;
      retry.hidden = state !== 'failed';
      more.hidden = state !== 'ready' || !older;
      if (older) more.textContent = 'Ver más antiguas (' + (WINDOW_LABELS.get(older) || '').toLowerCase() + ')';
    }
    async function load(window) {
      const turn = ++request, target = episode;
      pendingDays = window;
      state = 'loading';
      draw();
      let answer;
      try { answer = await readNotes(target, window); } catch { answer = null; }
      // The window was closed, or the ficha moved to another episode, while Eloísa answered.
      if (turn !== request || !dialog || target !== episode) return;
      if (!answer?.ok || !Array.isArray(answer.notes) || String(answer.encId) !== String(target)) {
        state = 'failed';
        failure = answer?.error || 'No se pudieron leer las evoluciones.';
      } else {
        state = 'ready';
        ({ days, older } = answer);
        ({ evolutions: notes, scores } = partition(answer.notes));
      }
      draw();
      if (state === 'ready') feed.scrollTop = scoreFeed.scrollTop = 0;
    }
    function open(encounter, from) {
      if (dialog || !encounter || typeof readNotes !== 'function') return false;
      episode = encounter; opener = from || null;
      notes = []; scores = []; days = 14; older = null; selected = ''; state = 'idle'; chosenView = views[0];
      dialog = el('dialog', 'hhr-evo-reader');
      dialog.setAttribute('aria-label', chosenView + ' del episodio');
      const header = el('header');
      heading = el('h2', '', chosenView);
      scope = el('small');
      history = button('Ver en Historial', 'hhr-evo-reader-history');
      const leave = button('Cerrar', 'hhr-evo-reader-close');
      header.append(heading, scope, history, leave);
      viewButtons = el('div', 'hhr-evo-reader-views');
      viewButtons.setAttribute('role', 'group');
      viewButtons.setAttribute('aria-label', 'Vista de la ficha');
      for (const view of views) {
        const choice = button(view, 'hhr-evo-reader-filter');
        choice.addEventListener('click', () => {
          if (chosenView === view) return;
          chosenView = view;
          draw();
        });
        viewButtons.append(choice);
      }
      filters = el('div', 'hhr-evo-reader-filters');
      filters.setAttribute('role', 'group');
      filters.setAttribute('aria-label', 'Evoluciones por profesión');
      feed = el('div', 'hhr-evo-reader-feed');
      feed.tabIndex = 0;
      feed.setAttribute('role', 'region');
      feed.setAttribute('aria-label', 'Evoluciones, de la más reciente a la más antigua');
      scoreFeed = el('div', 'hhr-evo-reader-scores');
      scoreFeed.tabIndex = 0;
      scoreFeed.setAttribute('role', 'region');
      scoreFeed.setAttribute('aria-label', 'Historial de Scores');
      const footer = el('footer');
      status = el('span');
      status.setAttribute('role', 'status');
      retry = button('Reintentar', 'hhr-evo-reader-retry');
      more = button('', 'hhr-evo-reader-more');
      footer.append(status, retry, more);
      dialog.append(header, viewButtons, filters, feed, scoreFeed, footer);
      leave.addEventListener('click', close);
      history.addEventListener('click', () => { close(); openHistory?.(); });
      retry.addEventListener('click', () => load(pendingDays));
      more.addEventListener('click', () => { if (older) load(older); });
      filters.addEventListener('click', event => {
        const choice = event.target.closest?.('.hhr-evo-reader-filter');
        if (!choice) return;
        selected = choice.dataset.role;
        draw();
        feed.scrollTop = 0;
      });
      dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
      document.body.append(dialog);
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
      leave.focus({ preventScroll: true });
      load(days);
      return true;
    }
    return {
      open, close,
      get isOpen() { return Boolean(dialog); },
      // Another episode, or the view turned off: the notes of the previous one leave the page.
      refresh(encounter) { if (dialog && encounter !== episode) close(); },
    };
  }
  globalThis.HhrFichaEvolutionReader = Object.freeze({ create, readable });
})();
