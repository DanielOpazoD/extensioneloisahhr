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
    return marks;
  }

  function create() {
    let previous = new Map();
    function refresh(main) {
      const next = layout(main);
      for (const el of previous.keys()) if (!next.has(el)) el.removeAttribute(attribute);
      for (const [el, value] of next) if (previous.get(el) !== value) el.setAttribute(attribute, value);
      previous = next;
    }
    return {refresh, clear:() => refresh(null)};
  }
  globalThis.HhrFichaRoundLayout = Object.freeze({create});
})();
