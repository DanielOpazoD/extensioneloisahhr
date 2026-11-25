/** Recognise the native cards even when the nursing summary omits a section anchor. */
(() => {
  'use strict';
  const names = new Map([
    ['diagnóstico','diagnosis'],['signos vitales','vitals'],['fármacos','orders'],
    ['indicaciones libres','orders'],['indicaciones (indicación libre)','orders'],
  ]);
  // Match each native message to its own heading before it can be folded.
  const optionalStates = new Map([
    ['instrumentos de evaluación', 'instrumentos de evaluación registrados'],
    ['examen físico', 'exámenes físicos registrados'],
    ['producto no farmacológico', 'productos no farmacológicos registrados'],
    ['procedimientos', 'procedimientos registrados'],
    ['dispositivos invasivos', 'dispositivos invasivos solicitados'],
    ['solicitud de examen', 'solicitudes de exámenes registradas'],
    ['solicitud interconsulta', 'interconsultas solicitadas'],
    ['solicitud de interconsulta', 'interconsultas solicitadas'],
    ['solicitudes de intervención quirúrgica', 'solicitudes de intervención quirúrgica registradas'],
    ['prestaciones', 'prestaciones registradas'],
  ]);
  const retainedStates = new Map([
    ['ram','ram registradas'], ['alergias','alergias registradas'], ['eventos adversos','eventos adversos registrados'],
  ]);
  const statusGuard = 'button,input,label,select,textarea,a,svg,img,canvas,table,iframe,details,[role],[tabindex],[contenteditable],[title],[aria-label],[aria-labelledby],[aria-live],[aria-busy=true],.MuiSkeleton-root,.MuiAlert-root,.MuiCircularProgress-root,.MuiLinearProgress-root';
  function markStatus(title, name, next) {
    const expected = optionalStates.get(name) || retainedStates.get(name);
    if (!expected || title.closest('dialog,[role=dialog],[role=alert],[aria-busy=true],nav')) return;
    const card = title.closest('section,.MuiPaper-root,.MuiCard-root') || title.closest('.MuiGrid-item');
    if (!card || card.matches(statusGuard)) return;
    const labels = card.querySelectorAll('label');
    const filter = labels.length === 1 && /^mostrar suspendidos$/i.test(labels[0].textContent.trim()) &&
      labels[0].querySelector('input[type="checkbox"]') ? labels[0] : null;
    if ([...card.querySelectorAll(statusGuard)].some(el => !filter?.contains(el))) return;
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    let message;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim() || title.contains(node) || filter?.contains(node)) continue;
      if (message) return;
      message = node;
    }
    if (!message) return;
    const text = message.textContent.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\.$/,'');
    const denied = text === 'no tiene permiso para visualizar';
    const record = /^no (?:se )?presentan? (.*?)(?: para este paciente)?$/.exec(text);
    if (!denied && record?.[1] !== expected) return;
    next.set(card,'status-card');
    if (message.parentElement !== card) next.set(message.parentElement,'status-message');
    if (!denied && !filter && optionalStates.has(name)) next.set(title,'empty-section-title');
  }
  const anchors = { diagnosisEntrySection:'diagnosis', vitalSignsEntry:'vitals', medicationEntrySection:'orders', freeIndicationEntrySection:'orders' };
  const label = el => el.textContent.trim().toLowerCase();
  const vitalNames = /^(?:presi[oó]n(?: arterial)?|(?:fre\.?|frec\.?|frecuencia)\s*(?:card[ií]aca|respiratoria)|saturaci[oó]n(?: (?:de ox[ií]geno|o[2₂]))?|t[°º]? axilar|temperatura|glasgow|sup\. ox[ií]geno|hemoglucotest|eva)$/i;
  function isVitalLabel(el, compact) {
    const children = [...el.children];
    // The native medical card puts its caption beside the label's text node, in a MUI Box.
    // Read the name separately so a unit or extra detail in that Box remains on screen.
    if (compact && el.matches('p.MuiTypography-root') && children.some(child => child.matches('.MuiBox-root'))) {
      const name = [...el.childNodes].filter(node =>
        node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE && node.matches('sup,sub')
      ).map(node => node.textContent).join('').trim();
      if (vitalNames.test(name)) return true;
    }
    // A unit may be typeset inside the label, e.g. O<sub>2</sub>.
    return children.every(child => child.matches('sub,sup,b,strong,em,span')) &&
      vitalNames.test(el.textContent.trim()) &&
      !children.some(child => vitalNames.test(child.textContent.trim()));
  }
  const elapsedUnits = { minuto:'min',min:'min',hora:'h',h:'h',día:'d',dia:'d' };
  const minutesPerUnit = {min:1, h:60, d:1440};
  const hospitalClock = new Intl.DateTimeFormat('es-CL', {
    timeZone:'Pacific/Easter', dateStyle:'short', timeStyle:'short',
  });
  function measurementSource(detail) {
    // Metadata belongs to this measurement only. The card header describes the section update.
    const time = detail.matches('time') ? detail : detail.querySelector(':scope > time:only-child');
    const hint = (time?.getAttribute('title') || detail.getAttribute('title') || '').trim();
    if (/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/.test(hint)) return hint;
    const author = /^(?:autor(?:a)?|profesional|registrad[oa] por)\s*:/i.test(hint) ? hint : '';
    const iso = time?.dateTime;
    if (!iso || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/i.test(iso)) return author;
    const instant = new Date(iso);
    return Number.isFinite(instant.getTime()) ? [hospitalClock.format(instant), author].filter(Boolean).join(' · ') : author;
  }
  function markTiles(card, next, compact, elapsed, older, sources) {
    const labels = [...card.querySelectorAll('span,p,dt,h4,h5,h6,div')].filter(el =>
      isVitalLabel(el, compact) && !el.closest('table,dialog,[role=dialog]'));
    if (labels.length < 2) return;
    let grid = labels[0].parentElement;
    while (grid !== card && !labels.every(el => grid.contains(el))) grid = grid.parentElement;
    // Leave observations, the history button and any unknown siblings in their native position.
    const tiles = [...grid.children];
    const tileLabels = tiles.map(tile => labels.filter(el => tile.contains(el)));
    if (!tiles.every((tile,index) => tileLabels[index].length === 1 ||
        (compact && !tileLabels[index].length && tile.matches('.MuiCard-root') && tile.querySelector(':scope > .MuiCardContent-root')))) return;
    next.set(grid,'vital-grid');
    const ages = [];
    for (const [index,tile] of tiles.entries()) {
      next.set(tile,'vital-tile');
      // Keep an unrecognised native card intact alongside known measurements.
      if (!tileLabels[index].length) continue;
      let shell = tile;
      while (shell.childElementCount === 1 && !labels.includes(shell.firstElementChild)) {
        shell = shell.firstElementChild;
        next.set(shell,'vital-inner');
      }
      const [title, value, ...details] = shell.children;
      const nativeLabel = labels.find(label => title?.contains(label));
      if (!(compact ? nativeLabel : labels.includes(title)) || !value || !/^[−+<>≤≥-]?\s*\d/.test(value.textContent.trim()) ||
          shell.querySelector('button,input,select,textarea,a,svg,[contenteditable],[role="button"]') ||
          [...shell.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())) continue;
      next.set(title,'vital-label');
      // Pressure has a value row (two numbers separated by a slash) and a separate PAM row.
      const [pressure,pam] = value.children;
      if (compact && value.childElementCount === 2 && /^\s*\d+\s*\/\s*\d+\s*$/.test(pressure.textContent) &&
          /^\s*pam\s*:\s*\d+(?:[.,]\d+)?\s*$/i.test(pam.textContent)) {
        next.set(value,'vital-pressure-group');
        next.set(pressure,'vital-value');
        next.set(pam,'vital-pam');
      } else next.set(value,'vital-value');
      const tileAges = [];
      for (const detail of details) {
        if (/^pam\s*:/i.test(detail.textContent.trim())) next.set(detail,'vital-pam');
        else {
          const time = /^(?:hace\s+)?(\d+)\s*(minuto|min|hora|h|d[ií]a)s?\.?$/i.exec(detail.textContent.trim());
          if (!time) continue;
          next.set(detail,'vital-time');
          if (!compact) continue;
          const unit = elapsedUnits[time[2].toLowerCase()];
          if (!detail.childElementCount) elapsed.set(detail, time[1] + unit);
          const precision = minutesPerUnit[unit];
          const minutes = Number(time[1]) * precision;
          if (Number.isSafeInteger(minutes + precision)) tileAges.push({ detail, minutes, precision });
        }
      }
      if (tileAges.length === 1) {
        ages.push(tileAges[0]);
        const source = measurementSource(tileAges[0].detail);
        if (source) sources.set(shell, source);
      }
    }
    // Relative labels have limited precision: 1 h and 65 min can describe the same reading.
    const newestEnd = Math.min(...ages.map(age => age.minutes + age.precision));
    for (const age of ages) {
      if (age.minutes >= newestEnd) older.add(age.detail);
    }
  }

  function cardForTitle(title, kind, main, compact) {
    const card = title.closest('.MuiCard-root,.MuiPaper-root,section');
    if (card && !Object.keys(anchors).some(id => card.querySelector('#'+id))) return card;
    // Some nurse screens use Box/Stack for the entire card instead of MuiCard.
    for (let node=title.parentElement; node && node !== main; node=node.parentElement) {
      if (node.matches('body,html') || node.querySelector('nav,[role=tablist]')) break;
      if (!node.matches('.MuiBox-root,.MuiStack-root,.MuiGrid-item')) continue;
      if (kind === 'vitals' ? [...node.querySelectorAll('p,span')].some(el => isVitalLabel(el, compact)) : node.querySelector('table')) {
        if (node.querySelectorAll('table').length > 1) return null;
        return node;
      }
    }
    return null;
  }

  function create() {
    let previous = new Map();
    function refresh(main, compact) {
      const next = new Map(), cards = new Map(), elapsed = new Map();
      const older = new Set(), sources = new Map();
      if (main) {
        for (const [id,kind] of Object.entries(anchors)) {
          const el = document.getElementById(id);
          if (el && main.contains(el)) cards.set(el,kind);
        }
        for (const title of main.querySelectorAll('h2,h3,h4,h5,h6,.MuiCardHeader-title,.MuiTypography-h6,p.MuiTypography-root')) {
          if (title.closest('dialog,[role=dialog],table,nav')) continue;
          const name = label(title);
          if (compact) markStatus(title,name,next);
          const kind = names.get(name);
          if (!kind) continue;
          const card = cardForTitle(title,kind,main,compact);
          if (card) cards.set(card,kind);
        }
        for (const [card,kind] of cards) {
          next.set(card,kind);
          if (kind === 'vitals') {
            markTiles(card,next,compact,elapsed,older,sources);
            if (compact) for (const button of card.querySelectorAll('button')) {
              if (label(button) === 'ver historial completo' && !button.closest('dialog,[role=dialog]')) next.set(button,'vital-history');
            }
          }
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
      for (const [el,kind] of previous) {
        if (kind === 'vital-history' && !next.has(el) && el.hasAttribute('data-hhr-history-hint')) {
          if (el.title === 'Ver historial completo') el.removeAttribute('title');
          el.removeAttribute('data-hhr-history-hint');
        }
        if (kind === 'vital-time') {
          if (!elapsed.has(el)) el.removeAttribute('data-hhr-vital-elapsed');
          if (!older.has(el)) el.removeAttribute('data-hhr-vital-older');
        }
        if ((kind === 'vital-tile' || kind === 'vital-inner') && !sources.has(el)) el.removeAttribute('data-hhr-vital-source');
        if (!next.has(el)) el.removeAttribute('data-hhr-reading');
      }
      for (const time of older) time.toggleAttribute('data-hhr-vital-older', true);
      for (const [el,source] of sources) {
        if (el.dataset.hhrVitalSource !== source) el.dataset.hhrVitalSource = source;
      }
      for (const [el,text] of elapsed) {
        if (el.dataset.hhrVitalElapsed !== text) el.dataset.hhrVitalElapsed = text;
      }
      for (const [el,kind] of next) {
        if (previous.get(el) !== kind) el.setAttribute('data-hhr-reading',kind);
        if (kind === 'vital-history' && !el.hasAttribute('title')) {
          el.title = 'Ver historial completo';
          el.setAttribute('data-hhr-history-hint','');
        }
      }
      previous = next;
    }
    return { refresh, clear:() => refresh(null) };
  }
  globalThis.HhrFichaReadingSurfaces = Object.freeze({create});
})();
