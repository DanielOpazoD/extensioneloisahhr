// Align the three native round cards without replacing their controls or section anchors.
(() => {
  'use strict';
  const attribute = 'data-hhr-round';
  const isLayout = node => node.matches('div:not([role],[tabindex],[contenteditable],[hidden],[aria-hidden])');

  // Only flatten an uninterrupted chain of layout divs. An extra sibling may be an
  // independent section and must keep its native placement.
  function wrappersBetween(parent, child) {
    if (!parent?.contains(child)) return null;
    const wrappers = [];
    for (let el = parent; el !== child; el = el.firstElementChild) {
      if (!isLayout(el) || el.childElementCount !== 1 ||
          [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim())) return null;
      wrappers.push(el);
    }
    return wrappers;
  }

  function layout(main) {
    const marks = new Map();
    const date = main?.querySelector('#estimatedDischargeSection');
    const note = main?.querySelector('#observationEntrySection');
    const handoff = main?.querySelector('#shiftChangeEntrySection');
    if (!date || !note || !handoff) return marks;
    const dateCell = date.closest('.MuiGrid-item');
    const noteCell = note.closest('.MuiGrid-item');
    const pair = dateCell?.parentElement;
    if (!pair?.matches('.MuiGrid-container') || pair.children.length !== 2 ||
        pair.firstElementChild !== dateCell || pair.lastElementChild !== noteCell) return marks;
    const group = pair.parentElement.closest('.MuiGrid-item');
    const frame = group?.parentElement;
    const side = group?.nextElementSibling;
    if (!frame?.matches('.MuiGrid-container') || !side?.matches('.MuiGrid-item') || !main.contains(frame) ||
        !wrappersBetween(dateCell,date) || !wrappersBetween(noteCell,note) || !wrappersBetween(side,handoff)) return marks;
    const wrappers = wrappersBetween(group,pair);
    if (!wrappers || !isLayout(pair)) return marks;
    marks.set(frame,'frame');
    for (const el of wrappers) marks.set(el,'group');
    marks.set(pair,'pair');
    marks.set(dateCell,'date');
    marks.set(noteCell,'note');
    marks.set(side,'handoff');
    return marks;
  }

  function create() {
    let previous = new Map();
    function refresh(main) {
      const next = layout(main);
      for (const el of previous.keys()) if (!next.has(el)) el.removeAttribute(attribute);
      for (const [el, value] of next) if (previous.get(el) !== value) el.setAttribute(attribute,value);
      previous = next;
    }
    return {refresh, clear:() => refresh(null)};
  }
  globalThis.HhrFichaRoundLayout = Object.freeze({create});
})();
