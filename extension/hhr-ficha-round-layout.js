// Mark native layout branches without moving React-owned controls.
(() => {
  'use strict';
  const attribute = 'data-hhr-round';
  const isLayout = node => node.matches(':is(div,section):not(.MuiCard-root,.MuiPaper-root,[role],[tabindex],[contenteditable],[hidden],[aria-hidden],[aria-label],[aria-labelledby])');
  const hasOwnText = node => [...node.childNodes].some(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim());
  const controls = 'a,button,input,select,textarea,summary,[tabindex],[contenteditable],[onclick],[role=button],[role=link]';
  // A hidden part of the summary is not a section of the round. The whole page hidden from a screen reader is
  // another matter: Eloísa's menu, or any of its windows, marks everything behind it `aria-hidden` while
  // it is open, and the round behind stays as it was. Only what is hidden inside `main` counts.
  function surface(main, selector) {
    const matches = [...main.querySelectorAll(selector)].filter(el => !el.closest('dialog,[role=dialog],[hidden],main [inert],main [aria-hidden=true]'));
    const painted = matches.find(el => el.getClientRects().length);
    if (painted) return painted;
    // A duplicate for printing or a hidden panel must not become visible when
    // its wrapper takes part in the grid. A folded HHR request may be reopened.
    return matches.find(node => {
      for (let el = node; el !== main; el = el.parentElement) {
        if (!el.matches('[data-hhr-round="date"]') && getComputedStyle(el).display === 'none') return false;
      }
      return true;
    });
  }

  // While a section loads, Eloísa draws a card in its place: its title and grey bars (read 26-11-2026).
  // It stands for the section in the round, so the page is laid out before its data arrives and
  // each section then appears where it is read.
  const plain = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  function stand(main, ...titles) {
    for (const bar of main.querySelectorAll('.MuiCard-root > .MuiCardContent-root > .MuiSkeleton-root:first-child')) {
      const body = bar.parentElement, card = body.parentElement;
      if ([...body.children].some(el => !el.matches('.MuiSkeleton-root')) || !card.getClientRects().length ||
          card.closest('dialog,[role=dialog],[hidden],main [inert],main [aria-hidden=true]')) continue;
      const title = card.querySelector(':scope > .MuiCardHeader-root .MuiCardHeader-title');
      if (title && titles.includes(plain(title.textContent))) return card;
    }
    return null;
  }

  // A wrapper is disposable for layout only if every other child is the hidden
  // discharge card. Stop at independent content, actions or the edge of main.
  function branchOf(section, main, hidden) {
    const branch = [section];
    let node = section;
    while (node.parentElement && node.parentElement !== main) {
      const parent = node.parentElement;
      if (!isLayout(parent) || [...parent.children].some(child => child !== node && child !== hidden) ||
          hasOwnText(parent)) break;
      branch.push(parent);
      node = parent;
    }
    return branch;
  }

  // A nested MUI row sometimes contains both a reading card and an independent
  // printing control. Expose its layout slots to CSS, keeping the control and its
  // React parents intact. Never flatten an arbitrary card, form or text block.
  function placement(section, frame, hidden) {
    if (!section || section === frame || !frame.contains(section)) return null;
    const branch = branchOf(section, frame, hidden);
    const item = branch.at(-1), bridges = [];
    for (let el = item.parentElement; el !== frame; el = el.parentElement) {
      if (!isLayout(el) || hasOwnText(el) || (el.children.length > 1 &&
          ![...el.children].every(child => child === hidden || child.matches('.MuiGrid-item,.MuiGrid-container,section.MuiBox-root')))) return null;
      bridges.push(el);
    }
    return {item, branch, bridges};
  }

  // Keep two adjacent read-only instructions together. Each instruction can
  // also be rendered alone or in its own full-width MUI slot.
  function careSections(frame, rest, diet) {
    const sections = [rest,diet].filter(el => el && !el.querySelector(controls));
    if (sections.length === 2) {
      const parents = sections.map(el => branchOf(el, frame).at(-1).parentElement);
      if (parents[0] === parents[1] && parents[0] !== frame && isLayout(parents[0]) && parents[0].children.length === 2) {
        return [parents[0]];
      }
    }
    return sections;
  }

  function leadingLabel(row, text) {
    const label = row?.firstElementChild;
    return label?.matches('strong,b,span,p') && !label.childElementCount &&
      label.textContent.trim() === text && row.textContent.trim() !== text &&
      [...row.childNodes].find(n => n.textContent.trim()) === label ? label : null;
  }

  // Keep each instruction, its free text and its own byline in the native card.
  function careRow(section, name) {
    const card = section.matches('.MuiCard-root') ? section : section.querySelector('.MuiCard-root');
    if (!card || (card !== section && branchOf(card, section).at(-1).parentElement !== section)) return null;
    const heading = card?.querySelector(':scope > .MuiCardHeader-root > .MuiCardHeader-content > .MuiCardHeader-title');
    const body = card?.querySelector(':scope > .MuiCardContent-root');
    if (heading?.textContent.trim() !== name || !body || card.children.length !== 2) return null;
    const header = heading.parentElement.parentElement;
    if ([...header.children].some(el => el !== heading.parentElement &&
        (!el.matches('.MuiCardHeader-action') || el.textContent.trim() ||
         [...el.querySelectorAll('*')].some(child => !isLayout(child) || child.hasAttribute('aria-label')))) ||
        [...heading.parentElement.children].some(el => el !== heading && !el.matches('.MuiCardHeader-subheader'))) return null;

    // Eloísa can put its two label/value lines inside an extra Stack.
    let lines = body;
    while (lines.children.length === 1 && lines.firstElementChild.matches('div.MuiStack-root,div.MuiBox-root') &&
        ![...lines.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim())) {
      if (lines.firstElementChild.firstElementChild?.textContent.trim() === name + ':') break;
      lines = lines.firstElementChild;
    }
    const [value, observation] = lines.children;
    if (!value || lines.children.length > 2 ||
        [...lines.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim())) return null;
    const label = leadingLabel(value, name + ':');
    if (!label) {
      // A solitary read-only status needs the same compact row as an instruction.
      if (observation || value.querySelector(controls + ',img,svg,[role],[aria-live],[aria-busy=true],table') ||
          !/^no (?:se )?presenta(?:n)? .+registrad[oa]s?(?: para este paciente)?\.?$/i.test(value.textContent.trim())) return null;
      return [[card, 'care-row'], [value, 'care-empty']];
    }
    const marks = [[card, 'care-row'], [value, 'care-value'], [label, 'care-label']];
    if (observation?.textContent.trim()) {
      const prefix = leadingLabel(observation, 'Observación:');
      const valueText = observation.textContent.slice(prefix ? observation.textContent.indexOf(prefix.textContent) + prefix.textContent.length : 0).trim();
      const isPlaceholder = valueText === '-' && !observation.matches('[title],[aria-label]') &&
        !observation.querySelector('img,svg,[title],[aria-label],time');
      marks.push([observation, isPlaceholder ? 'care-placeholder' : 'care-observation']);
      if (prefix) marks.push([prefix, 'care-label']);
    }
    return marks;
  }

  // The line that holds nothing but the icon «Imprimir indicaciones», when the card of Fármacos is
  // the next thing drawn after it. With anything else in between, the line stays where Eloísa put it.
  function printLine(frame, marks) {
    const flow = parent => [...parent.children].flatMap(child => marks.get(child) === 'bridge' ? flow(child) : [child]);
    const items = flow(frame);
    const at = items.findIndex(item => {
      const button = item.children.length === 1 && item.firstElementChild;
      return button && item.matches('.MuiGrid-item') && !marks.has(item) && button.matches('button.MuiIconButton-root:enabled') &&
        !hasOwnText(item) && item.querySelectorAll(controls).length === 1 &&
        button.querySelector(':scope > svg[aria-label]')?.getAttribute('aria-label').trim().toLowerCase() === 'imprimir indicaciones';
    });
    if (at < 0) return null;
    // A folded empty section is not drawn. Anything else between the line and the card is.
    const next = items.slice(at + 1).find(item => !marks.has(item) && getComputedStyle(item).display !== 'none');
    // The button takes the room after the title. A byline there, which Eloísa does not write today, keeps it.
    // Eloísa can wrap the card in a second section of its own, #dilutionEntrySection.
    const heading = next?.querySelector(':scope > #medicationEntrySection > .MuiCard-root > .MuiCardHeader-root > .MuiCardHeader-content,' +
      ':scope > #medicationEntrySection > #dilutionEntrySection:only-child > .MuiCard-root > .MuiCardHeader-root > .MuiCardHeader-content');
    return heading?.querySelector(':scope > .MuiCardHeader-title') && !heading.querySelector(':scope > .MuiCardHeader-subheader')?.textContent.trim() ? items[at] : null;
  }

  function diagnosisTable(section) {
    const card = section.querySelector(':scope > .MuiCard-root');
    const tables = card?.querySelectorAll(':scope > .MuiCardContent-root table') || [];
    const headings = tables.length === 1 && tables[0].tHead?.rows.length === 1 ? [...tables[0].tHead.rows[0].cells] : [];
    return Boolean(card?.querySelector(':scope > .MuiCardHeader-root .MuiCardHeader-title')) && card.children.length === 2 &&
      headings.length > 2 && headings[1].textContent.trim() === 'Diagnóstico';
  }

  function layout(main) {
    const marks = new Map();
    if (!main) return marks;
    // The discharge card also occurs on its own or before the note finishes loading.
    const date = surface(main, '#estimatedDischargeSection') || surface(main, '#estimatedDischarge');
    const note = surface(main, '#observationEntrySection') || stand(main, 'evolucion', 'valoracion');
    let hidden = date && branchOf(date, main).at(-1);
    // The discharge card shares the column of the note. Until it loads its place is an empty item.
    const vacant = !hidden && note?.closest('.MuiGrid-item')?.previousElementSibling;
    if (vacant && vacant.matches('.MuiGrid-item') && !vacant.childElementCount && !vacant.textContent.trim()) hidden = vacant;
    if (hidden) marks.set(hidden, 'date');
    const handoff = surface(main, '#shiftChangeEntrySection') || stand(main, 'observaciones de entrega de turno');
    if (!note || !handoff) return marks;
    const vitals = surface(main, '#vitalSignsEntry') || stand(main, 'signos vitales'), alerts = surface(main, '#alertEntrySection') || stand(main, 'alertas');
    // Without an order, Reposo is its card alone: Eloísa adds the section once there is one.
    const rest = surface(main, '#restEntrySection') || surface(main, '#rest.MuiCard-root') || stand(main, 'reposo');
    const diet = surface(main, '#nutritionOrderEntrySection') || stand(main, 'regimen');
    const requests = ['exam','surgery'].map(kind => surface(main, '[data-hhr-empty-request="' + kind + '"]')).filter(Boolean);
    const nodes = [note, handoff, vitals, alerts, rest, diet, ...requests].filter(Boolean);
    // Find the smallest shared native grid that can expose these cards. An
    // optional section inside a different view cannot invalidate a usable grid.
    let frame, left, right, score = 0;
    for (let grid = note.parentElement.closest('.MuiGrid-container'); grid && main.contains(grid);
         grid = grid.parentElement.closest('.MuiGrid-container')) {
      if (!grid.contains(handoff)) continue;
      const noteSlot = placement(note, grid, hidden), handoffSlot = placement(handoff, grid, hidden);
      if (!noteSlot || !handoffSlot || noteSlot.item === handoffSlot.item) continue;
      if (grid.querySelector('[data-hhr-ficha-sections],[role=tablist]')) continue;
      const count = nodes.filter(node => grid.contains(node)).length;
      if (count > score) {
        frame = grid; left = noteSlot; right = handoffSlot; score = count;
      }
      if (count === nodes.length) break;
    }
    if (!frame) return marks;
    function markSlot(slot, role) {
      for (const wrapper of slot.bridges) marks.set(wrapper, 'bridge');
      for (const wrapper of slot.branch.slice(1, -1)) marks.set(wrapper, role === 'note' || role === 'handoff' ? 'spacer' : 'inner');
      marks.set(slot.item, role);
    }
    marks.set(frame, 'frame');
    markSlot(left, 'note'); markSlot(right, 'handoff');
    const signs = placement(vitals, frame, hidden), notices = placement(alerts, frame, hidden);
    if (signs) markSlot(signs, 'vitals');
    if (notices) markSlot(notices, 'alerts');
    const grouped = careSections(frame, frame.contains(rest) ? rest : null, frame.contains(diet) ? diet : null);
    for (const section of grouped) {
      const slot = placement(section, frame, hidden);
      if (!slot) continue;
      markSlot(slot, 'care');
      const rows = [];
      for (const [node, name] of [[rest, 'Reposo'], [diet, 'Régimen']]) {
        if (!node || !section.contains(node)) continue;
        const row = careRow(node, name);
        if (row) {
          rows.push(node);
          for (const [el, role] of row) marks.set(el, el === slot.item ? 'care-card' : role);
        }
      }
      if (rows.length === 2) {
        const stamps = rows.map(node => node.querySelector('.MuiCardHeader-subheader[data-hhr-update-label]'));
        if (stamps.every(el => el && !el.childElementCount) && stamps[0].textContent && stamps[0].textContent === stamps[1].textContent) {
          marks.set(stamps[0], 'same-stamp');
          marks.set(stamps[1], 'shared-stamp');
        }
      }
    }
    for (const request of requests) {
      const slot = placement(request, frame, hidden);
      if (slot) markSlot(slot, 'empty-request');
    }
    if (signs || notices) {
      // The diagnosis says why the patient is here. Its card opens the ones under the round when it
      // is the table Eloísa draws: a heading and one table whose second column is «Diagnóstico».
      const diagnosis = surface(main, '#diagnosisEntrySection'), loading = !diagnosis && stand(main, 'diagnostico');
      const reason = loading ? placement(loading, frame, hidden) : diagnosis && diagnosisTable(diagnosis) && placement(diagnosis, frame, hidden);
      if (reason && !reason.bridges.length) markSlot(reason, 'diagnosis');
      const printing = printLine(frame, marks);
      if (printing) marks.set(printing, 'print');
      // These are the actual CSS grid items after display:contents. Preserve
      // unrelated MUI columns, including controls next to a promoted section.
      let leading = true;
      function markPeers(parent) {
        for (const child of parent.children) {
          const role = marks.get(child);
          if (role === 'bridge') markPeers(child);
          else if (role === 'note' || role === 'handoff') leading = false;
          else if (!role) marks.set(child, leading ? 'before' : 'peer');
        }
      }
      markPeers(frame);
    }
    return marks;
  }

  // Sibling cards belong to React. Keep them in place on the lines of a shared CSS grid: the
  // note with the handoff and the alerts beside it, the signs, the care instructions with the
  // empty requests. Cards that share a line and a column stack by their intrinsic heights.
  function create() {
    let previous = new Map(), frame, stacks = [], halves = [], peers = [], requests = [], placed = [], signs = null, lead = null, fill = null, pending = 0;
    const desktop = globalThis.matchMedia?.('(min-width:1100px)');
    // Updating margins does not resize the observed border boxes. Repack before paint.
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(pack) : null;
    // A card can insert another control from its own ResizeObserver, after
    // this observer measured it. Reconcile that content change before paint.
    const content = new MutationObserver(pack);
    function schedule() {
      if (frame && !pending) pending = requestAnimationFrame(() => { pending = 0; pack(); });
    }
    function set(el, name, value) {
      if (el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value);
    }
    function pack() {
      if (!frame?.isConnected || !desktop?.matches) return;
      let leadingRows = 0, used = 0;
      for (const [peer, role] of peers) {
        let span = 12;
        const fraction = getComputedStyle(peer).flexBasis;
        if (/^\d+(?:\.\d+)?%$/.test(fraction)) span = Math.max(1, Math.min(12, Math.round(parseFloat(fraction) * 12 / 100)));
        else {
          for (const [size,min] of [['xs',0],['sm',600],['md',900],['lg',1200],['xl',1536]]) {
            const width = [...peer.classList].find(name => name.startsWith('MuiGrid-grid-' + size + '-'))?.split('-').at(-1);
            if (+width >= 1 && +width <= 12 && innerWidth >= min) span = +width;
          }
        }
        if (span !== 12 || peer.style.getPropertyValue('--hhr-round-span')) set(peer, '--hhr-round-span', String(span));
        // A leading row docked on the section links takes no line of the round.
        if (role === 'before' && peer.getClientRects().length && !peer.hasAttribute('data-hhr-ficha-dock')) {
          if (!used || used + span > 12) { leadingRows++; used = 0; }
          used = (used + span) % 12;
        }
      }
      set(frame, '--hhr-round-line', String(leadingRows + 1));
      const offsets = new Map();
      for (const stack of stacks) {
        let top = 0;
        for (const item of stack) {
          offsets.set(item, top);
          top += item.getBoundingClientRect().height;
        }
      }
      for (const [el, top] of offsets) set(el, '--hhr-round-offset', top + 'px');
      // The side column ends where the note ends: its last card takes the height the handoff leaves.
      // The note never reads the height of that card, so the two cannot chase each other.
      if (fill) set(fill, '--hhr-round-fill', Math.max(0, lead.getBoundingClientRect().height - offsets.get(fill)) + 'px');
      // With signs, two columns on their line. At the start the signs and, under them, the care
      // instructions. At the end a heading and the sections without records or without permission, two
      // to a row, in the order Eloísa gives them. Every item sits on the same line of the grid: this
      // stacks each column, so that neither card is stretched to the height of the other column.
      const drawn = el => el.getBoundingClientRect().height > 0;
      const tiles = signs ? [...requests, ...peers.filter(([, role]) => role === 'peer').map(([el]) => el).filter(el =>
        el.querySelector(':scope > section > [data-hhr-reading="status-card"]:only-child, :scope > [data-hhr-reading="status-card"]:only-child'))]
        .filter(drawn).sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1) : [];
      const care = signs && stacks[2].some(drawn) ? 1 : 0;
      const side = [care && 'care', tiles.length && 'tiles'].filter(Boolean).join(' ');
      for (const tile of placed) if (!tiles.includes(tile)) { tile.removeAttribute('data-hhr-round-tile'); tile.style.removeProperty('--hhr-round-tile'); }
      placed = tiles;
      if (!side) { frame.removeAttribute('data-hhr-round-side'); frame.style.removeProperty('--hhr-round-under'); return; }
      if (frame.getAttribute('data-hhr-round-side') !== side) frame.setAttribute('data-hhr-round-side', side);
      // A section with a filter of its own takes a whole line of the column. The others pair up.
      const rows = [];
      let open = null;
      for (const tile of tiles) {
        if (tile.querySelector('label')) rows.push([tile]);
        else if (open) { open.push(tile); open = null; }
        else rows.push(open = [tile]);
      }
      for (const row of rows) row.forEach((tile, at) => {
        const place = row.length === 1 && tile.querySelector('label') ? 'whole' : at ? 'end' : 'start';
        if (tile.getAttribute('data-hhr-round-tile') !== place) tile.setAttribute('data-hhr-round-tile', place);
      });
      // Heights are read once every tile has its width. The first row starts under the heading.
      const gap = parseFloat(getComputedStyle(frame).rowGap) || 0;
      let top = tiles.length ? parseFloat(getComputedStyle(frame, '::before').height) || 20 : 0;
      for (const row of rows) {
        for (const tile of row) set(tile, '--hhr-round-tile', top + 'px');
        top += Math.max(...row.map(tile => tile.getBoundingClientRect().height)) + 4;
      }
      set(frame, '--hhr-round-under', signs.getBoundingClientRect().height + gap + 'px');
    }
    function resetColumns() {
      if (pending) cancelAnimationFrame(pending);
      pending = 0;
      resize?.disconnect();
      content.disconnect();
      if (frame) {
        desktop?.removeEventListener('change', schedule);
        frame.removeAttribute('data-hhr-round-columns');
        frame.removeAttribute('data-hhr-round-side');
        frame.style.removeProperty('--hhr-round-line');
        frame.style.removeProperty('--hhr-round-under');
      }
      for (const tile of placed) { tile.removeAttribute('data-hhr-round-tile'); tile.style.removeProperty('--hhr-round-tile'); }
      placed = [];
      for (const item of stacks.flat()) item.style.removeProperty('--hhr-round-offset');
      fill?.style.removeProperty('--hhr-round-fill');
      for (const item of halves) item.removeAttribute('data-hhr-round-half');
      for (const [peer] of peers) peer.style.removeProperty('--hhr-round-span');
      stacks = []; halves = []; peers = []; requests = []; signs = lead = fill = frame = null;
    }
    function refresh(main) {
      const next = layout(main);
      for (const el of previous.keys()) if (!next.has(el)) el.removeAttribute(attribute);
      for (const [el, value] of next) if (previous.get(el) !== value) el.setAttribute(attribute, value);
      const changed = previous.size !== next.size || [...next].some(([el, role]) => previous.get(el) !== role);
      previous = next;
      // Packed now: the caller runs before the paint, and a frame later a card would be seen out of place.
      if (!changed && frame) { pack(); return; }
      resetColumns();
      const roles = new Map([...next].map(([el, role]) => [role, el]));
      if ((!roles.has('vitals') && !roles.has('alerts')) || !resize || !desktop) return;
      frame = roles.get('frame');
      const note = roles.get('note'), handoff = roles.get('handoff');
      const items = (...roles) => [...next].filter(([,value]) => roles.includes(value)).map(([el]) => el);
      peers = [...next].filter(([,role]) => role === 'peer' || role === 'before');
      // Two requests without records share their end of the last line of the round.
      requests = items('empty-request');
      signs = roles.get('vitals') || null;
      halves = requests.length === 2 ? requests : [];
      halves.forEach((item, index) => item.setAttribute('data-hhr-round-half', index ? 'end' : 'start'));
      // The signs and the requests take a line of the grid each. The handoff and the alerts share the
      // line of the note, and two care instructions drawn apart share theirs.
      const alerts = items('alerts');
      stacks = [[note], [handoff, ...alerts], items('care', 'care-card')];
      lead = note; fill = alerts.at(-1) || null;
      frame.setAttribute('data-hhr-round-columns','');
      desktop.addEventListener('change', schedule);
      // The signs head a column of their own: what is under them follows their height.
      for (const item of [...stacks.flat(), ...(signs ? [signs] : [])]) {
        resize.observe(item, {box:'border-box'});
        content.observe(item, {childList:true, subtree:true});
      }
      pack();
    }
    // For a caller that changes which leading rows take a line, before the next paint.
    return {refresh, clear:() => refresh(null), repack:pack};
  }
  globalThis.HhrFichaRoundLayout = Object.freeze({create});
})();
