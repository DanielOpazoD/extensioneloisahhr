// One disclosure shared by the evolution card and its native editor.
(() => {
  'use strict';

  function create({ button, open, hasBraden, readMenu }) {
    const root = document.createElement('span');
    root.className = 'hhr-checklist-launcher';
    root.dataset.hhrChecklist = chrome.runtime.id;
    const menu = document.createElement('span');
    menu.id = 'hhr-checklist-action-menu';
    menu.className = 'hhr-checklist-action-menu';
    menu.popover = 'auto';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Acciones de evolución');
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'hhr-checklist-trigger';
    trigger.title = 'Acciones de evolución';
    trigger.setAttribute('aria-label', trigger.title);
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-controls', menu.id);
    trigger.setAttribute('aria-expanded', 'false');
    trigger.popoverTargetElement = menu;

    const addItem = (label, mode) => {
      const item = button(label, () => {
        menu.hidePopover();
        trigger.focus({ preventScroll: true });
        void open(typeof mode === 'function' ? mode() : mode);
      });
      item.setAttribute('role', 'menuitem');
      item.tabIndex = -1;
      menu.append(item);
      return item;
    };
    const pautas = addItem('Pautas', null);
    pautas.autofocus = true;
    const braden = addItem('Braden', 'braden');
    let favoriteMode;
    const shortcut = addItem('', () => favoriteMode);
    const showMenu = ({ saved, draft, favorite } = {}) => {
      pautas.textContent = saved ? 'Insertar pauta guardada' : draft ? 'Continuar pauta' : 'Pautas';
      braden.hidden = Boolean(saved || draft || !hasBraden);
      favoriteMode = favorite ? { templateId: favorite.id } : null;
      shortcut.textContent = favorite?.title || '';
      shortcut.hidden = Boolean(saved || draft || !favorite);
    };
    let menuRevision = 0;
    const status = document.createElement('span');
    status.className = 'hhr-checklist-action-status';
    status.hidden = true;
    menu.append(status);

    menu.addEventListener('beforetoggle', event => {
      const opening = event.newState === 'open';
      trigger.setAttribute('aria-expanded', String(opening));
      const revision = ++menuRevision;
      if (opening) {
        showMenu();
        void readMenu().then(info => {
          if (revision === menuRevision) showMenu(info);
        }).catch(() => {});
      }
    });
    trigger.addEventListener('keydown', event => {
      if (event.key !== 'ArrowDown') return;
      event.preventDefault();
      if (!menu.matches(':popover-open')) trigger.click();
      pautas.focus({ preventScroll: true });
    });
    menu.addEventListener('keydown', event => {
      const items = Array.from(menu.querySelectorAll('[role=menuitem]:not([hidden])'));
      const index = items.indexOf(document.activeElement);
      if (event.key === 'Escape') {
        event.preventDefault();
        menu.hidePopover();
        trigger.focus({ preventScroll: true });
      } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const target = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 :
          (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[target].focus({ preventScroll: true });
      }
      event.stopPropagation();
    });
    menu.addEventListener('focusout', event => {
      if (event.relatedTarget && !root.contains(event.relatedTarget) && menu.matches(':popover-open')) menu.hidePopover();
    });
    // The native title bar also handles mouse gestures to move and resize the editor.
    for (const type of ['pointerdown', 'mousedown', 'click', 'dblclick']) {
      root.addEventListener(type, event => event.stopPropagation());
    }
    root.append(trigger, menu);
    return {
      root, trigger,
      update(inserted) {
        const message = inserted ? 'Pauta insertada · guardar en Eloísa' : '';
        if (status.textContent !== message) {
          status.textContent = message;
          status.hidden = !message;
        }
      },
    };
  }
  globalThis.HhrChecklistActions = Object.freeze({ create });
})();
