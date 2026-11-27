// The compact preview of the current native note: a note longer than its card scrolls inside it, as a
// region the keyboard can reach. The owner asked to drop the «Nota completa» button and its window
// (27-11-2026): the whole note is read in its card, or in «Ver evoluciones».
(() => {
  'use strict';
  function create() {
    let source = null, episode = null;
    const attributes = {role:'region', tabindex:'0', 'aria-label':'Texto de la evolución, desplazable'};
    const owned = new Set();
    function clearScroll() {
      for (const name of owned) {
        if (source?.getAttribute(name) === attributes[name]) source.removeAttribute(name);
      }
      owned.clear();
      source?.removeAttribute('data-hhr-note-scroll');
    }
    function measure() {
      if (!source) return;
      if (!source.clientHeight || source.scrollHeight <= source.clientHeight + 1) { clearScroll(); return; }
      source.toggleAttribute('data-hhr-note-scroll', true);
      for (const [name, value] of Object.entries(attributes)) {
        if (!source.hasAttribute(name)) { source.setAttribute(name, value); owned.add(name); }
      }
    }
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    function refresh(next, encounter) {
      if (next !== source || encounter !== episode) {
        resize?.disconnect();
        clearScroll();
        source?.removeAttribute('data-hhr-note-text');
        source = next; episode = encounter;
        if (source) {
          source.setAttribute('data-hhr-note-text', '');
          source.scrollTop = 0;
          resize?.observe(source);
        }
      }
      measure();
    }
    return {refresh};
  }
  globalThis.HhrFichaNoteReader = Object.freeze({create});
})();
