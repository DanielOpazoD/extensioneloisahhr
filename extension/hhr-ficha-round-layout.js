// Mark native layout branches without moving React-owned controls.
(() => {
  'use strict';
  const attribute = 'data-hhr-round';
  const isLayout = node => node.matches(':is(div,section):not(.MuiCard-root,.MuiPaper-root,[role],[tabindex],[contenteditable],[hidden],[aria-hidden],[aria-label],[aria-labelledby])');
  const hasOwnText = node => [...node.childNodes].some(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim());
  const controls = 'a,button,input,select,textarea,summary,[tabindex],[contenteditable],[onclick],[role=button],[role=link]';
  function surface(main, selector) {
    const matches = [...main.querySelectorAll(selector)].filter(el => !el.closest('dialog,[role=dialog],[hidden],[inert],[aria-hidden=true]'));
    const painted = matches.find(el => el.getClientRects().length);
    if (painted) return painted;
    // A duplicate for printing or a hidden panel must not become visible when
    // its wrapper takes part in the grid. A folded HHR request may be reopened.
    return matches.find(node => {
      for (let el = node; el !== main; el = el.parentElement) {
        if (!el.matches('[data-hhr-ficha-folded],[data-hhr-round="date"]') && getComputedStyle(el).display === 'none') return false;
      }
      return true;
    });
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

  function layout(main) {
    const marks = new Map();
    if (!main) return marks;
    // The discharge card also occurs on its own or before the note finishes loading.
    const date = surface(main, '#estimatedDischargeSection') || surface(main, '#estimatedDischarge');
    const hidden = date && branchOf(date, main).at(-1);
    if (hidden) marks.set(hidden, 'date');
    const note = surface(main, '#observationEntrySection');
    const handoff = surface(main, '#shiftChangeEntrySection');
    if (!note || !handoff) return marks;
    const vitals = surface(main, '#vitalSignsEntry'), alerts = surface(main, '#alertEntrySection');
    const rest = surface(main, '#restEntrySection'), diet = surface(main, '#nutritionOrderEntrySection');
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

  // Sibling cards belong to React. Keep them in place on a shared CSS grid row
  // and use their intrinsic heights to stack the two reading columns independently.
  function create() {
    let previous = new Map(), frame, columns = [], halves = [], peers = [], pending = 0;
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
        if (role === 'before' && peer.getClientRects().length) {
          if (!used || used + span > 12) { leadingRows++; used = 0; }
          used = (used + span) % 12;
        }
      }
      set(frame, '--hhr-round-line', String(leadingRows + 1));
      const offsets = [];
      // A column is a stack of rows. The two halves of a row start at the same height.
      for (const column of columns) {
        let top = 0;
        for (const row of column) {
          let height = 0;
          for (const item of row) {
            offsets.push([item, top]);
            height = Math.max(height, item.getBoundingClientRect().height);
          }
          top += height;
        }
      }
      for (const [el, top] of offsets) set(el, '--hhr-round-offset', top + 'px');
    }
    function resetColumns() {
      if (pending) cancelAnimationFrame(pending);
      pending = 0;
      resize?.disconnect();
      content.disconnect();
      if (frame) {
        desktop?.removeEventListener('change', schedule);
        frame.removeAttribute('data-hhr-round-columns');
        frame.style.removeProperty('--hhr-round-line');
      }
      for (const item of columns.flat(2)) item.style.removeProperty('--hhr-round-offset');
      for (const item of halves) item.removeAttribute('data-hhr-round-half');
      for (const [peer] of peers) peer.style.removeProperty('--hhr-round-span');
      columns = []; halves = []; peers = []; frame = null;
    }
    function refresh(main) {
      const next = layout(main);
      for (const el of previous.keys()) if (!next.has(el)) el.removeAttribute(attribute);
      for (const [el, value] of next) if (previous.get(el) !== value) el.setAttribute(attribute, value);
      const changed = previous.size !== next.size || [...next].some(([el, role]) => previous.get(el) !== role);
      previous = next;
      if (!changed && frame) { schedule(); return; }
      resetColumns();
      const roles = new Map([...next].map(([el, role]) => [role, el]));
      if ((!roles.has('vitals') && !roles.has('alerts')) || !resize || !desktop) return;
      frame = roles.get('frame');
      const note = roles.get('note'), handoff = roles.get('handoff');
      const items = (...roles) => [...next].filter(([,value]) => roles.includes(value)).map(([el]) => el);
      peers = [...next].filter(([,role]) => role === 'peer' || role === 'before');
      // Two requests without records share the last line of the side column.
      const requests = items('empty-request');
      halves = requests.length === 2 ? requests : [];
      halves.forEach((item, index) => item.setAttribute('data-hhr-round-half', index ? 'end' : 'start'));
      const single = item => [item];
      columns = [[note, ...items('vitals'), ...items('care', 'care-card')].map(single),
        [handoff, ...items('alerts')].map(single).concat(halves.length ? [halves] : requests.map(single))];
      frame.setAttribute('data-hhr-round-columns','');
      desktop.addEventListener('change', schedule);
      for (const item of columns.flat(2)) {
        resize.observe(item, {box:'border-box'});
        content.observe(item, {childList:true, subtree:true});
      }
      pack();
    }
    return {refresh, clear:() => refresh(null)};
  }
  globalThis.HhrFichaRoundLayout = Object.freeze({create});
})();
