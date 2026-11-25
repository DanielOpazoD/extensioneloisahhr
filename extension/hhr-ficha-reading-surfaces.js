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
    ['solicitud de examen', 'solicitudes de examenes registradas'],
    ['solicitudes de exámenes', 'solicitudes de examenes registradas'],
    ['solicitud interconsulta', 'interconsultas solicitadas'],
    ['solicitud de interconsulta', 'interconsultas solicitadas'],
    ['solicitudes de intervención quirúrgica', 'solicitudes de intervencion quirurgica registradas'],
    ['solicitud de intervención quirúrgica', 'solicitudes de intervencion quirurgica registradas'],
    ['prestaciones', 'prestaciones registradas'],
  ]);
  const requestAnchors = new Map([
    ['solicitud de examen', ['diagnosisTestEntrySection', 'exam']],
    ['solicitudes de exámenes', ['diagnosisTestEntrySection', 'exam']],
    ['solicitudes de intervención quirúrgica', ['operationTheaterRequestEntrySection', 'surgery']],
    ['solicitud de intervención quirúrgica', ['operationTheaterRequestEntrySection', 'surgery']],
  ]);
  const retainedStates = new Map([
    ['ram','ram registradas'], ['alergias','alergias registradas'], ['eventos adversos','eventos adversos registrados'],
  ]);
  const statusGuard = 'button,input,label,select,textarea,a,svg,img,canvas,table,iframe,details,[role],[tabindex],[contenteditable],[title],[aria-label],[aria-labelledby],[aria-live],[aria-busy=true],.MuiSkeleton-root,.MuiAlert-root,.MuiCircularProgress-root,.MuiLinearProgress-root';
  function markStatus(title, name, next, requests) {
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
    const request = requestAnchors.get(name);
    const messageKind = request ? record?.[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '') : record?.[1];
    if (!denied && messageKind !== expected) return;
    next.set(card,'status-card');
    if (message.parentElement !== card) next.set(message.parentElement,'status-message');
    if (denied || filter || !optionalStates.has(name)) return;
    if (request) {
      const section = title.closest('#' + request[0]) || card;
      // A request may wrap its card in several MUI layout elements. Never move
      // or fold a notice if another control or record belongs to that section.
      for (let item = card; item !== section; item = item.parentElement) {
        const parent = item.parentElement;
        if (!parent || parent.children.length !== 1 || parent.matches(statusGuard) ||
            [...parent.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())) return;
      }
      requests.set(section,request[1]);
    }
    next.set(title,'empty-section-title');
  }
  const anchors = { diagnosisEntrySection:'diagnosis', vitalSignsEntry:'vitals', medicationEntrySection:'orders', freeIndicationEntrySection:'orders', procedureOrderEntrySection:'care-orders' };
  const label = el => el.textContent.trim().toLowerCase();
  function vitalLabel(el, compact) {
    const identify = globalThis.HhrFichaVitalStrip.identify;
    const children = [...el.children];
    // The native medical card puts its caption beside the label's text node, in a MUI Box.
    // Read the name separately so a unit or extra detail in that Box remains on screen.
    if (compact && el.matches('.MuiTypography-root') && children.some(child => child.matches('.MuiBox-root')) &&
        children.every(child => child.matches('.MuiBox-root,sup,sub'))) {
      const name = [...el.childNodes].filter(node =>
        node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE && node.matches('sup,sub')
      ).map(node => node.textContent).join('').trim();
      const sign = identify(name);
      if (sign) return sign;
    }
    // A unit may be typeset inside the label, e.g. O<sub>2</sub>.
    if (children.every(child => child.matches('sub,sup,b,strong,em,span')) &&
        !children.some(child => identify(child.textContent))) return identify(el.textContent);
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
  function markTiles(card, next, compact, elapsed, older, sources, labelsToShorten, shared) {
    const labels = [...card.querySelectorAll('span,p,dt,h4,h5,h6,div')].filter(el =>
      !el.closest('table,dialog,[role=dialog],.hhr-ficha-vitals') && vitalLabel(el, compact));
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
    let measured = 0;
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
      measured++;
      if (compact) {
        const sign = vitalLabel(nativeLabel,true);
        const isArterialPair = globalThis.HhrFichaVitalStrip.isArterialPair;
        const caption = nativeLabel.querySelector(':scope > .MuiBox-root')?.textContent.trim();
        if (sign.label && (!sign.pairedPressure || isArterialPair(value.textContent,caption) ||
            (value.firstElementChild && isArterialPair(value.firstElementChild.textContent,caption)))) {
          labelsToShorten.set(nativeLabel,sign);
        }
      }
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
    // When every measurement states its age and the newest ones agree, the heading says it once.
    const heading = card.querySelector(':scope > .MuiCardHeader-root > .MuiCardHeader-content, :scope > .MuiCard-root > .MuiCardHeader-root > .MuiCardHeader-content');
    const recent = ages.filter(age => !older.has(age.detail));
    const text = elapsed.get(recent[0]?.detail);
    if (compact && heading && text && recent.length > 1 && ages.length === measured &&
        recent.every(age => elapsed.get(age.detail) === text)) {
      // «2 h», «35 min», «1 día»: the heading has room for a whole word where the tile had none.
      shared.set(heading, text.replace(/^(\d+)(.*)$/, (_, count, unit) => count + ' ' + (unit === 'd' ? (count === '1' ? 'día' : 'días') : unit)));
      for (const age of recent) shared.set(age.detail, '');
    }
  }

  function cardForTitle(title, kind, main, compact) {
    const card = title.closest('.MuiCard-root,.MuiPaper-root,section');
    if (card && !Object.keys(anchors).some(id => card.querySelector('#'+id))) return card;
    // Some nurse screens use Box/Stack for the entire card instead of MuiCard.
    for (let node=title.parentElement; node && node !== main; node=node.parentElement) {
      if (node.matches('body,html') || node.querySelector('nav,[role=tablist]')) break;
      if (!node.matches('.MuiBox-root,.MuiStack-root,.MuiGrid-item')) continue;
      if (kind === 'vitals' ? [...node.querySelectorAll('p,span')].some(el => vitalLabel(el, compact)) : node.querySelector('table')) {
        if (node.querySelectorAll('table').length > 1) return null;
        return node;
      }
    }
    return null;
  }

  function create() {
    const orderDetails = globalThis.HhrFichaOrderDetails.create();
    let previous = new Map(), previousRequests = new Map(), previousLabels = new Map();
    let previousShared = new Map(), previousActions = new Set();
    function refresh(main, compact) {
      const next = new Map(), cards = new Map(), elapsed = new Map();
      const older = new Set(), sources = new Map(), requests = new Map(), labelsToShorten = new Map();
      const orderCells = new Map(), shared = new Map(), actions = new Set();
      if (main) {
        for (const [id,kind] of Object.entries(anchors)) {
          const el = document.getElementById(id);
          if (el && main.contains(el) && (compact || kind !== 'care-orders')) cards.set(el,kind);
        }
        for (const title of main.querySelectorAll('h2,h3,h4,h5,h6,.MuiCardHeader-title,.MuiTypography-h6,p.MuiTypography-root')) {
          if (title.closest('dialog,[role=dialog],table,nav')) continue;
          const name = label(title);
          if (compact) markStatus(title,name,next,requests);
          const kind = compact && name === 'órdenes de atención' ? 'care-orders' : names.get(name);
          if (!kind) continue;
          const card = cardForTitle(title,kind,main,compact);
          if (card) cards.set(card,kind);
        }
        for (const [card,kind] of cards) {
          next.set(card,kind);
          if (kind === 'vitals') {
            markTiles(card,next,compact,elapsed,older,sources,labelsToShorten,shared);
            if (compact) for (const button of card.querySelectorAll('button')) {
              if (label(button) === 'ver historial completo' && !button.closest('dialog,[role=dialog]')) next.set(button,'vital-history');
            }
          }
          if (kind !== 'orders' && kind !== 'care-orders') continue;
          for (const table of card.querySelectorAll('table')) {
            if (table.tHead?.rows.length !== 1) continue;
            const head = [...table.tHead.rows[0].cells], rows = [...table.rows];
            if (rows.some(row => row.cells.length !== head.length || [...row.cells].some(c => c.colSpan !== 1 || c.rowSpan !== 1))) continue;
            head.forEach((th,index) => {
              const heading = label(th);
              if (compact && kind === 'orders' && !table.closest('dialog,[role=dialog],td')) {
                for (const body of table.tBodies) for (const row of body.rows) orderCells.set(row.cells[index], heading);
              }
              if (kind === 'care-orders' && heading === 'indicaciones') next.set(th,'order-instructions');
              if (!/^(tiempo|hora|horario|acciones)$/.test(heading)) return;
              // The buttons below already say what the column is for.
              if (compact && heading === 'acciones' && !th.childElementCount && !th.closest('dialog,[role=dialog],td')) actions.add(th);
              for (const row of rows) {
                const cell = row.cells[index];
                next.set(cell,'narrow');
                const marker = cell.firstElementChild;
                if (heading === 'tiempo' && marker && cell.childElementCount === 1 &&
                    marker.matches('div,span,svg') && !marker.querySelector('button,a,[tabindex]') &&
                    (marker.matches('svg') || marker.querySelector('svg')) && /^\d{1,3}$/.test(cell.textContent.trim())) next.set(marker,'time-symbol');
              }
            });
          }
        }
      }
      orderDetails.refresh(orderCells, next);
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
      for (const section of previousRequests.keys()) if (!requests.has(section)) section.removeAttribute('data-hhr-empty-request');
      for (const [section,kind] of requests) if (previousRequests.get(section) !== kind) section.setAttribute('data-hhr-empty-request',kind);
      for (const [el,sign] of previousLabels) if (labelsToShorten.get(el) !== sign || el.title !== sign.full) {
        el.removeAttribute('data-hhr-vital-short');
        if (el.title === sign.full) el.removeAttribute('title');
        previousLabels.delete(el);
      }
      for (const [el,sign] of labelsToShorten) if (!previousLabels.has(el) && !el.hasAttribute('title')) {
        el.dataset.hhrVitalShort = sign.label;
        el.title = sign.full;
        previousLabels.set(el,sign);
      }
      for (const [el,text] of previousShared) if (shared.get(el) !== text) el.removeAttribute('data-hhr-vital-shared');
      for (const [el,text] of shared) if (previousShared.get(el) !== text) el.setAttribute('data-hhr-vital-shared', text);
      for (const th of previousActions) if (!actions.has(th)) th.removeAttribute('data-hhr-actions-heading');
      for (const th of actions) if (!previousActions.has(th)) th.setAttribute('data-hhr-actions-heading', '');
      previousShared = shared; previousActions = actions;
      previousRequests = requests;
      previous = next;
    }
    return { refresh, clear:() => refresh(null) };
  }
  globalThis.HhrFichaReadingSurfaces = Object.freeze({create});
})();
