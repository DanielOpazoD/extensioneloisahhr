// Mark native layout branches without moving React-owned controls.
(() => {
  'use strict';
  const attribute = 'data-hhr-round';
  const isLayout = node => node.matches('div:not([role],[tabindex],[contenteditable],[hidden],[aria-hidden])');

  // A wrapper is disposable for layout only if every other child is the hidden
  // discharge card. Stop at independent content, actions or the edge of main.
  function branchOf(section, main, hidden) {
    const branch = [section];
    let node = section;
    while (node.parentElement && node.parentElement !== main) {
      const parent = node.parentElement;
      if (!isLayout(parent) || [...parent.children].some(child => child !== node && child !== hidden) ||
          [...parent.childNodes].some(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim())) break;
      branch.push(parent);
      node = parent;
    }
    return branch;
  }

  const isFullRow = el => el.matches('.MuiGrid-item') && ![...el.classList].some(name =>
    /^MuiGrid-grid-(?:xs|sm|md|lg|xl)-/.test(name) && !name.endsWith('-12'));

  // Only the two read-only care instructions may move ahead of another section.
  // Leave native controls, independent siblings and unfamiliar column layouts in place.
  function bedsideInstructions(frame, left, right, hidden) {
    const rest = frame.querySelector('#restEntrySection');
    const diet = frame.querySelector('#nutritionOrderEntrySection');
    if (!rest || !diet) return null;
    const pair = branchOf(rest, frame).at(-1).parentElement;
    if (pair === frame || !pair.matches('.MuiGrid-container') || pair.children.length !== 2 ||
        pair !== branchOf(diet, frame).at(-1).parentElement) return null;
    const group = branchOf(pair, frame).at(-1);
    if (group.parentElement !== frame || ![left,right,group].every(el => el.matches('.MuiGrid-item')) ||
        group.querySelector('a,button,input,select,textarea,summary,[tabindex],[contenteditable],[onclick],[role=button],[role=link]')) return null;

    const alert = frame.querySelector('#alertEntrySection');
    const known = new Set([left, right, hidden, group, alert && branchOf(alert, frame).at(-1)]);
    const ordinary = [...frame.children].filter(el => !known.has(el));
    if (!ordinary.every(isFullRow)) return null;
    return group;
  }

  function leadingLabel(row, text) {
    const label = row?.firstElementChild;
    return label?.matches('strong,b,span,p') && !label.childElementCount &&
      label.textContent.trim() === text && row.textContent.trim() !== text &&
      [...row.childNodes].find(n => n.textContent.trim()) === label ? label : null;
  }

  // Keep each instruction, its free text and its own byline in the native card.
  function careRow(section, name) {
    const card = section.querySelector(':scope > .MuiCard-root');
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
    if (!label) return null;
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
    const date = main.querySelector('#estimatedDischargeSection') || main.querySelector('#estimatedDischarge');
    const hidden = date && branchOf(date, main).at(-1);
    if (hidden) marks.set(hidden, 'date');

    const note = main.querySelector('#observationEntrySection');
    const handoff = main.querySelector('#shiftChangeEntrySection');
    if (!note || !handoff) return marks;
    const noteBranch = branchOf(note, main, hidden);
    const handoffBranch = branchOf(handoff, main, hidden);
    const left = noteBranch.at(-1), right = handoffBranch.at(-1);
    const frame = left.parentElement;
    if (!frame?.matches('.MuiGrid-container') || frame !== right.parentElement) return marks;
    const siblings = [...frame.children].filter(el => el !== hidden);
    if (Math.abs(siblings.indexOf(left) - siblings.indexOf(right)) !== 1) return marks;

    marks.set(frame, 'frame');
    for (const [branch, name] of [[noteBranch, 'note'], [handoffBranch, 'handoff']]) {
      // Flatten only intermediate spacers (MUI grids may have negative margins).
      for (const wrapper of branch.slice(1, -1)) marks.set(wrapper, 'spacer');
      marks.set(branch.at(-1), name);
    }
    const instructions = bedsideInstructions(frame, left, right, hidden);
    if (instructions) {
      marks.set(instructions, 'care');
      const rest = careRow(instructions.querySelector('#restEntrySection'), 'Reposo');
      const diet = careRow(instructions.querySelector('#nutritionOrderEntrySection'), 'Régimen');
      if (rest && diet) {
        for (const [element, role] of [...rest, ...diet]) marks.set(element, role);
        const stamps = instructions.querySelectorAll('.MuiCardHeader-subheader[data-hhr-update-label]');
        if (stamps.length === 2 && stamps[0].textContent && stamps[0].textContent === stamps[1].textContent &&
            ![...stamps].some(el => el.childElementCount)) {
          // Compare the complete native attribution, including seconds and professional role.
          marks.set(stamps[0], 'same-stamp');
          marks.set(stamps[1], 'shared-stamp');
        }
      }
    }
    const isolated = section => {
      const item = section && branchOf(section, frame).at(-1);
      return item?.parentElement === frame && item.matches('.MuiGrid-item') ? item : null;
    };
    const vitals = isolated(frame.querySelector('#vitalSignsEntry'));
    const alerts = isolated(frame.querySelector('#alertEntrySection'));
    if (vitals && alerts && left.matches('.MuiGrid-item') && right.matches('.MuiGrid-item')) {
      const requests = [...frame.querySelectorAll('[data-hhr-empty-request]')].map(isolated).filter(Boolean);
      const known = new Set([left, right, vitals, alerts, instructions, hidden, ...requests]);
      if ([...frame.children].every(el => known.has(el) || isFullRow(el))) {
        marks.set(vitals, 'vitals');
        marks.set(alerts, 'alerts');
        for (const item of requests) marks.set(item, 'empty-request');
      }
    }
    return marks;
  }

  // Sibling cards belong to React. Keep them in place on a shared CSS grid row
  // and use their intrinsic heights to stack the two reading columns independently.
  function create() {
    let previous = new Map(), frame, first, columns = [], pending = 0;
    const desktop = globalThis.matchMedia?.('(min-width:1100px)');
    // Updating margins does not resize the observed border boxes. Repack before paint.
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(pack) : null;
    function schedule() {
      if (frame && !pending) pending = requestAnimationFrame(() => { pending = 0; pack(); });
    }
    function set(el, name, value) {
      if (el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value);
    }
    function pack() {
      if (!frame?.isConnected || !desktop?.matches) return;
      const siblings = [...frame.children];
      const preceding = siblings.slice(0, siblings.indexOf(first)).filter(node => node.getClientRects().length);
      set(frame, '--hhr-round-line', String(preceding.length + 1));
      const offsets = [];
      for (const column of columns) {
        let top = 0;
        for (const item of column) {
          offsets.push([item, top]);
          top += item.getBoundingClientRect().height;
        }
      }
      for (const [el, top] of offsets) set(el, '--hhr-round-offset', top + 'px');
    }
    function resetColumns() {
      if (pending) cancelAnimationFrame(pending);
      pending = 0;
      resize?.disconnect();
      if (frame) {
        desktop?.removeEventListener('change', schedule);
        frame.removeAttribute('data-hhr-round-columns');
        frame.style.removeProperty('--hhr-round-line');
      }
      for (const item of columns.flat()) item.style.removeProperty('--hhr-round-offset');
      columns = []; first = frame = null;
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
      if (!roles.has('vitals') || !resize || !desktop) return;
      frame = roles.get('frame');
      const note = roles.get('note'), handoff = roles.get('handoff');
      first = [...frame.children].find(el => el === note || el === handoff);
      columns = [[note, roles.get('vitals'), roles.get('care')].filter(Boolean), [handoff, roles.get('alerts'),
        ...[...next].filter(([,role]) => role === 'empty-request').map(([el]) => el)].filter(Boolean)];
      frame.setAttribute('data-hhr-round-columns','');
      desktop.addEventListener('change', schedule);
      for (const item of columns.flat()) resize.observe(item);
      pack();
    }
    return {refresh, clear:() => refresh(null)};
  }
  globalThis.HhrFichaRoundLayout = Object.freeze({create});
})();
