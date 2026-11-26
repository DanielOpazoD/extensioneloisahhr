// The compact preview and its optional reading window use the current native note.
(() => {
  'use strict';
  function create() {
    let source = null, episode = null, openButton = null, dialog = null, content = null;
    // The window of the whole note opens from the line of the card's heading. Without one, from under the note.
    const host = () => source?.closest('#evolution')?.querySelector(':scope > .MuiCardHeader-root > .MuiCardHeader-action') || null;
    function place(button) {
      const bar = host();
      if (!bar) { if (button.parentElement !== source.parentElement) source.parentElement.append(button); return; }
      if (button.parentElement === bar) return;
      // After «Ver evoluciones», before whatever Eloísa keeps in the heading.
      const lead = bar.querySelector(':scope > .hhr-evo-entry');
      bar.insertBefore(button, lead ? lead.nextSibling : bar.firstChild);
    }
    const attributes = {role:'region', tabindex:'0', 'aria-label':'Texto de la evolución, desplazable'};
    const owned = new Set();
    const dismiss = () => {
      if (!dialog) return;
      dialog.close();
      dialog.remove();
      dialog = content = null;
    };
    function openReader() {
      if (dialog || !source?.isConnected) return;
      dialog = document.createElement('dialog');
      dialog.className = 'hhr-note-dialog';
      dialog.setAttribute('aria-label','Evolución completa');
      const header = document.createElement('header');
      const heading = document.createElement('h2');
      heading.textContent = 'Evolución completa';
      header.append(heading);
      const stamp = source.closest('#evolution')?.querySelector('[data-hhr-update-label]')?.dataset.hhrUpdateLabel;
      if (stamp) {
        const byline = document.createElement('small');
        byline.textContent = stamp;
        header.append(byline);
      }
      const close = document.createElement('button');
      close.type = 'button'; close.textContent = 'Cerrar';
      close.addEventListener('click', dismiss);
      header.append(close);
      content = document.createElement('div');
      content.className = 'hhr-note-content';
      content.tabIndex = 0;
      content.textContent = source.innerText;
      const position = document.createElement('small');
      position.className = 'hhr-note-position';
      const scroller = content;
      const updatePosition = () => {
        const remaining = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;
        position.hidden = scroller.scrollHeight <= scroller.clientHeight + 1;
        const caption = remaining > 2 ? 'Más texto abajo ↓' : 'Fin de la evolución';
        if (position.textContent !== caption) position.textContent = caption;
      };
      content.addEventListener('scroll',updatePosition,{passive:true});
      dialog.append(header, content, position);
      dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
      document.body.append(dialog);
      dialog.showModal();
      content.focus({preventScroll:true});
      updatePosition();
    }
    function clearAccess() {
      dismiss();
      openButton?.remove();
      openButton = null;
      clearScroll();
    }
    function clearScroll() {
      for (const name of owned) {
        if (source?.getAttribute(name) === attributes[name]) source.removeAttribute(name);
      }
      owned.clear();
      source?.removeAttribute('data-hhr-note-scroll');
    }
    function measure() {
      if (!source) return;
      if (!source.clientHeight || source.scrollHeight <= source.clientHeight + 1) { clearAccess(); return; }
      if (content && content.textContent !== source.innerText) dismiss();
      source.toggleAttribute('data-hhr-note-scroll',true);
      for (const [name, value] of Object.entries(attributes)) {
        if (!source.hasAttribute(name)) { source.setAttribute(name,value); owned.add(name); }
      }
      if (!openButton) {
        openButton = document.createElement('button');
        openButton.type = 'button'; openButton.className = 'hhr-note-open';
        // The words on the button are part of its name, for whoever asks for it by voice.
        openButton.textContent = 'Nota completa';
        openButton.setAttribute('aria-label','Leer nota completa');
        openButton.setAttribute('aria-haspopup','dialog');
        openButton.addEventListener('click', openReader);
      }
      place(openButton);
    }
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    function refresh(next, encounter) {
      if (next !== source || encounter !== episode) {
        resize?.disconnect();
        clearAccess();
        source?.removeAttribute('data-hhr-note-text');
        source = next; episode = encounter;
        if (source) {
          source.setAttribute('data-hhr-note-text','');
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
