/** Recognise the native cards even when the nursing summary omits a section anchor. */
(() => {
  'use strict';
  const names = new Map([
    ['diagnóstico','diagnosis'],['signos vitales','vitals'],['fármacos','orders'],
    ['indicaciones libres','orders'],['indicaciones (indicación libre)','orders'],
  ]);
  // Condense only a title and a single explicit native status. Permission messages stay visible.
  const statusTitles = new Set(['instrumentos de evaluación','producto no farmacológico','procedimientos',
    'dispositivos invasivos','solicitud de examen','solicitud interconsulta','prestaciones','ram','alergias','eventos adversos']);
  const statusMessage = /^(?:no tiene permiso para visualizar|no (?:se )?presentan? (?:instrumentos de evaluaci[oó]n|productos? no farmacol[oó]gicos?|procedimientos|dispositivos invasivos|solicitudes de ex[aá]menes|interconsultas|prestaciones)(?: (?:registrad[oa]s?|solicitad[oa]s?))?(?: para este paciente)?)\.?$/i;
  function markStatus(title, next) {
    const card = title.closest('.MuiCard-root,section,.MuiPaper-root');
    if (!card || card.querySelector('table,button,input,a,select,textarea,svg,[role],[contenteditable],[aria-busy=true]')) return;
    const message = [...card.querySelectorAll('p,span,div')].find(el =>
      !el.childElementCount && statusMessage.test(el.textContent.trim()));
    if (!message || card.textContent.replace(/\s+/g,'') !== (title.textContent + message.textContent).replace(/\s+/g,'')) return;
    next.set(card,'status-card');
    next.set(message,'status-message');
  }
  const anchors = { diagnosisEntrySection:'diagnosis', vitalSignsEntry:'vitals', medicationEntrySection:'orders', freeIndicationEntrySection:'orders' };
  const label = el => el.textContent.trim().toLowerCase();
  const vitalNames = /^(?:presi[oó]n(?: arterial)?|(?:fre\.?|frec\.?|frecuencia)\s*(?:card[ií]aca|respiratoria)|saturaci[oó]n(?: (?:de ox[ií]geno|o[2₂]))?|t[°º]? axilar|temperatura|glasgow|sup\. ox[ií]geno|hemoglucotest|eva)$/i;
  function isVitalLabel(el) {
    // A unit may be typeset inside the label, e.g. O<sub>2</sub>.
    return [...el.children].every(child => child.matches('sub,sup,b,strong,em,span')) &&
      vitalNames.test(el.textContent.trim()) &&
      ![...el.children].some(child => vitalNames.test(child.textContent.trim()));
  }
  function markTiles(card, next) {
    const labels = [...card.querySelectorAll('span,p,dt,h4,h5,h6,div')].filter(el =>
      isVitalLabel(el) && !el.closest('table,dialog,[role=dialog]'));
    if (labels.length < 2) return;
    let grid = labels[0].parentElement;
    while (grid !== card && !labels.every(el => grid.contains(el))) grid = grid.parentElement;
    // Leave observations, the history button and any unknown siblings in their native position.
    const tiles = [...grid.children];
    if (!tiles.every(tile => labels.filter(el => tile.contains(el)).length === 1)) return;
    next.set(grid,'vital-grid');
    for (const tile of tiles) {
      next.set(tile,'vital-tile');
      let shell = tile;
      while (shell.childElementCount === 1 && !labels.includes(shell.firstElementChild)) {
        shell = shell.firstElementChild;
        next.set(shell,'vital-inner');
      }
      const [title, value, ...details] = shell.children;
      if (!labels.includes(title) || !value || !/^[−+<>≤≥-]?\s*\d/.test(value.textContent.trim()) ||
          shell.querySelector('button,input,select,textarea,a,svg,[contenteditable],[role="button"]') ||
          [...shell.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())) continue;
      next.set(title,'vital-label');
      next.set(value,'vital-value');
      for (const detail of details) {
        if (/^pam\s*:/i.test(detail.textContent.trim())) next.set(detail,'vital-pam');
        else if (/^(?:hace\s+)?\d+\s*(?:minutos?|min|horas?|h|d[ií]as?)[.]?$/i.test(detail.textContent.trim())) next.set(detail,'vital-time');
      }
    }
  }

  function cardForTitle(title, kind, main) {
    const card = title.closest('.MuiCard-root,.MuiPaper-root,section');
    if (card && !Object.keys(anchors).some(id => card.querySelector('#'+id))) return card;
    // Some nurse screens use Box/Stack for the entire card instead of MuiCard.
    for (let node=title.parentElement; node && node !== main; node=node.parentElement) {
      if (node.matches('body,html') || node.querySelector('nav,[role=tablist]')) break;
      if (!node.matches('.MuiBox-root,.MuiStack-root,.MuiGrid-item')) continue;
      if (kind === 'vitals' ? [...node.querySelectorAll('p,span')].some(isVitalLabel) : node.querySelector('table')) {
        if (node.querySelectorAll('table').length > 1) return null;
        return node;
      }
    }
    return null;
  }

  function create() {
    let previous = new Map();
    function refresh(main, compact) {
      const next = new Map(), cards = new Map();
      if (main) {
        for (const [id,kind] of Object.entries(anchors)) {
          const el = document.getElementById(id);
          if (el && main.contains(el)) cards.set(el,kind);
        }
        for (const title of main.querySelectorAll('h2,h3,h4,h5,h6,.MuiCardHeader-title,.MuiTypography-h6,p.MuiTypography-root')) {
          if (title.closest('dialog,[role=dialog],table,nav')) continue;
          const name = label(title);
          if (compact && statusTitles.has(name)) markStatus(title,next);
          const kind = names.get(name);
          if (!kind) continue;
          const card = cardForTitle(title,kind,main);
          if (card) cards.set(card,kind);
        }
        for (const [card,kind] of cards) {
          next.set(card,kind);
          if (kind === 'vitals') markTiles(card,next);
          if (kind !== 'orders') continue;
          for (const table of card.querySelectorAll('table')) {
            if (table.tHead?.rows.length !== 1) continue;
            const head = [...table.tHead.rows[0].cells], rows = [...table.rows];
            if (rows.some(row => row.cells.length !== head.length || [...row.cells].some(c => c.colSpan !== 1 || c.rowSpan !== 1))) continue;
            head.forEach((th,index) => {
              if (!/^(tiempo|hora|horario|acciones)$/.test(label(th))) return;
              for (const row of rows) {
                const cell = row.cells[index];
                next.set(cell,'narrow');
                const marker = cell.firstElementChild;
                if (label(th) === 'tiempo' && marker && cell.childElementCount === 1 &&
                    marker.matches('div,span,svg') && !marker.querySelector('button,a,[tabindex]') &&
                    (marker.matches('svg') || marker.querySelector('svg')) && /^\d{1,3}$/.test(cell.textContent.trim())) next.set(marker,'time-symbol');
              }
            });
          }
        }
      }
      for (const el of previous.keys()) if (!next.has(el)) el.removeAttribute('data-hhr-reading');
      for (const [el,kind] of next) if (previous.get(el) !== kind) el.setAttribute('data-hhr-reading',kind);
      previous = next;
    }
    return { refresh, clear:() => refresh(null) };
  }
  globalThis.HhrFichaReadingSurfaces = Object.freeze({create});
})();
