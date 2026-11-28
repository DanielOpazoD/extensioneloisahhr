// Marks what the compact Plan de tratamiento recognizes, with the shape described in
// docs/estructura-eloisa.md. Eloísa keeps its nodes; the stylesheet presents the marks.
(() => {
  'use strict';
  const attribute = 'data-hhr-plan';
  const plain = value => (value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  // The name Eloísa gives a button: on the button or, as in the scheduling tools, on its icon.
  // A tooltip this reader wrote is not a name of Eloísa's.
  const nativeName = (button, ownTitle) => (button.getAttribute('aria-label') || (ownTitle ? '' : button.title) ||
    button.querySelector('svg[aria-label]')?.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();

  const controls = 'a,button,input,select,textarea,[role="button"],[tabindex]';
  // The switch above the cards: one checkbox with its label and nothing else.
  const isFilter = element => !element.matches('.MuiCard-root') && !element.querySelector('.MuiCard-root,table') &&
    element.querySelectorAll(controls).length === 1 && Boolean(element.querySelector('input[type="checkbox"]'));

  // A scheduling card: a header and one table whose first heading is «Indicación» beside the hours.
  function schedule(card) {
    const header = card.querySelector(':scope > .MuiCardHeader-root');
    const content = card.querySelector(':scope > .MuiCardContent-root');
    const table = content?.querySelector(':scope > .MuiTableContainer-root > table');
    const cells = [...(table?.tHead?.rows[0]?.cells || [])];
    // In the ficha of Gestión de cuidados a table opens with a column that selects its rows: a checkbox and
    // nothing else, in the heading and in each row (read on the page 27-11-2026). The schedule follows it.
    const selects = cell => !cell?.textContent.trim() && cell.querySelectorAll(controls).length === 1 && Boolean(cell.querySelector('input[type="checkbox"]'));
    const select = cells.length === 3 && selects(cells[0]);
    const headings = select ? cells.slice(1) : cells;
    // Programación de procedimientos leaves its first heading empty (read on the page 27-11-2026): its title says what it is.
    const titled = /^programacion de /.test(plain(header?.querySelector('.MuiCardHeader-title')?.textContent));
    const first = plain(headings[0]?.textContent);
    if (!header || headings.length !== 2 || !(first.startsWith('indicacion') || (titled && !first))) return null;
    // The tools sit between the header and the table: icon buttons and nothing else. In the ficha of Gestión
    // de cuidados they open once a row is chosen, in a bar that also says how many are chosen and offers
    // «Cancelar» (read on the page 27-11-2026).
    const tools = [...card.children].find(el => el !== header && el !== content);
    const all = tools ? [...tools.querySelectorAll('button')] : [];
    const cancel = all.filter(button => button.matches('.MuiButton-text') && /^cancelar$/i.test(button.textContent.trim()));
    const count = tools ? [...tools.querySelectorAll('h6,p')].filter(el => /^\d+ item\(s\) seleccionado\(s\)$/i.test(el.textContent.trim())) : [];
    const buttons = all.filter(button => !cancel.includes(button));
    const onlyButtons = buttons.length && all.length === tools.querySelectorAll(controls).length && cancel.length <= 1 && count.length <= 1 &&
      (cancel.length === count.length) && buttons.every(button => button.matches('.MuiIconButton-root') && button.querySelector('svg') && !button.textContent.trim());
    const rows = [...(table.tBodies[0]?.rows || [])];
    // The hours: in the heading, a row of days, each its label and its hours; in each row, one box per hour
    // (read on the page 27-11-2026). Taken only when every row has as many boxes as the heading has hours.
    const hourCell = headings[1];
    const days = [...(hourCell?.querySelectorAll(':scope > .MuiStack-root > .MuiBox-root') || [])];
    const hours = days.flatMap(day => [...day.querySelectorAll(':scope > .MuiStack-root > *')]);
    const slots = rows.map(row => [...(row.cells[row.cells.length - 1]?.querySelectorAll(':scope > .MuiBox-root > .MuiStack-root') || [])]);
    const grid = hours.length && days.length && rows.length && !(rows.length === 1 && rows[0].cells.length === 1) &&
      slots.every(list => list.length === hours.length) ? {cell:hourCell, row:hourCell.firstElementChild, days, hours, slots:slots.flat()} : null;
    // An indication whose second line repeats its name (Eloísa does so for free indications).
    const repeats = rows.map(row => row.cells[select ? 1 : 0]).filter(Boolean).map(cell => {
      const [name, again] = [...cell.children];
      return name && again && cell.children.length === 2 && again.textContent.trim() && again.textContent.trim() === name.textContent.trim() ? again : null;
    }).filter(Boolean);
    return {table, select, grid, repeats, tools:onlyButtons && card.children.length === 3 ? tools : null, buttons:onlyButtons ? buttons : [],
      selection:onlyButtons && count.length ? {count:count[0], cancel:cancel[0]} : null,
      empty:rows.length === 1 && rows[0].cells.length === 1 && rows[0].cells[0].colSpan > 1};
  }

  const create = () => {
    const marks = new Map(), hints = new Set();
    const set = (next, element, name, value = '') => {
      if (element.getAttribute(name) !== value) element.setAttribute(name, value);
      next.set(element, (next.get(element) || new Set()).add(name));
    };
    let sizedBefore = new Set();
    function refresh(main) {
      const next = new Map(), named = new Set(), sized = new Set();
      const cards = main ? [...main.querySelectorAll('.MuiCard-root')].filter(card => !card.closest('dialog,[role="dialog"],[hidden],main [aria-hidden="true"]')) : [];
      const found = cards.map(card => [card, schedule(card)]).filter(([, plan]) => plan);
      // The view is the stack that holds the scheduling cards and, at most, the switch above them.
      // With anything else in it, each card is still compacted and the stack keeps Eloísa's spacing.
      const view = found[0]?.[0].parentElement;
      const rest = view ? [...view.children].filter(child => !found.some(([card]) => card === child)) : [];
      if (view && found.every(([card]) => card.parentElement === view) && rest.every(isFilter)) {
        set(next, view, attribute, 'view');
        rest.forEach(filter => {
          set(next, filter, attribute, 'filter');
          const label = filter.querySelector('label');
          if (label) set(next, label, attribute + '-filter', 'all');
        });
      }
      // A switch that shows what a card hides is drawn as an icon, as in the Resumen; its words stay its name.
      const filterOf = label => {
        const words = label.textContent.replace(/\s+/g, ' ').trim();
        set(next, label, attribute + '-filter', /^mostrar suspendidos$/i.test(words) ? 'suspended' : /^mostrar /i.test(words) ? 'hidden' : 'other');
        if (label.title !== words) label.title = words;
        named.add(label);
      };
      for (const [card, plan] of found) {
        set(next, card, attribute, 'card');
        for (const label of card.querySelectorAll(':scope > .MuiCardHeader-root > .MuiCardHeader-action label')) {
          if (label.querySelector('input[type="checkbox"]')) filterOf(label);
        }
        if (plan.empty) set(next, plan.table, attribute + '-empty');
        // The hours are a narrow grid: each hour as wide as its time on one line, the rest of the line for
        // what is indicated (the owner found 100 px and more per hour wasteful, 27-11-2026). The card says how
        // many hours it has, so that the column of hours takes just their width.
        if (plan.grid) {
          const {row, days, hours, slots} = plan.grid;
          if (card.style.getPropertyValue('--hhr-plan-hours') !== String(hours.length)) card.style.setProperty('--hhr-plan-hours', String(hours.length));
          sized.add(card);
          set(next, row, attribute + '-days');
          for (const day of days) {
            set(next, day, attribute + '-day', String(day.querySelectorAll(':scope > .MuiStack-root > *').length));
            // «Sáb (28/11/2026)» reads «Sáb 28/11»: the year is the one of the page; Eloísa's words stay for a screen reader.
            const label = [...day.querySelectorAll(':scope > :first-child, :scope > :first-child *')].find(el => !el.children.length && /\(\d{2}\/\d{2}\/\d{4}\)$/.test(el.textContent.trim()));
            const short = label && /^(.+?)\s*\((\d{2})\/(\d{2})\/\d{4}\)$/.exec(label.textContent.trim());
            if (short) set(next, label, attribute + '-day-label', short[1] + ' ' + short[2] + '/' + short[3]);
          }
          for (const hour of hours) set(next, hour, attribute + '-hour');
          for (const slot of slots) {
            set(next, slot, attribute + '-slot');
            // A scheduled hour is a box Eloísa paints: the view gives it the band of its headings.
            const mark = slot.querySelector(':scope > .MuiBox-root');
            if (mark && (mark.hasAttribute(attribute + '-mark') || getComputedStyle(mark).backgroundColor !== 'rgba(0, 0, 0, 0)')) set(next, mark, attribute + '-mark');
          }
        }
        if (plan.select) set(next, plan.table, attribute + '-select');
        if (plan.tools) set(next, plan.tools, attribute, 'tools');
        if (plan.selection) {
          set(next, plan.tools, attribute + '-selection');
          set(next, plan.selection.count, attribute + '-count');
          if (plan.selection.cancel) set(next, plan.selection.cancel, attribute + '-cancel');
        }
        for (const again of plan.repeats) set(next, again, attribute + '-repeat');
        for (const button of plan.tools ? plan.buttons : []) {
          const name = nativeName(button, hints.has(button));
          const menu = !name && button.querySelector('svg[data-testid^="MoreVert"]');
          if (name && name.length <= 28) set(next, button, attribute + '-caption', name);
          // A button without a tooltip of its own shows its name on hover. One that Eloísa already
          // names for a screen reader is not described twice.
          if ((name || menu) && !button.hasAttribute('aria-label') && (!button.title || hints.has(button))) {
            const hint = name || 'Más opciones';
            if (button.title !== hint) button.title = hint;
            named.add(button);
          }
        }
      }
      // The windows that plan an indication, and the menu of the other plannings, take the view's language.
      // They hang from the page, not from the plan: they are read only while the plan is shown.
      if (found.length) {
        for (const paper of document.querySelectorAll('.MuiDialog-paper')) {
          const title = paper.querySelector(':scope > .MuiDialogTitle-root');
          if (!title || !/^(planificaci[oó]n|planificar)\b/i.test(title.textContent.trim()) || !paper.querySelector('form')) continue;
          set(next, paper, attribute + '-dialog');
          for (const button of paper.querySelectorAll('.MuiButton-root')) {
            const words = button.textContent.replace(/\s+/g, ' ').trim();
            if (words && words === words.toLocaleUpperCase('es') && /[A-ZÁÉÍÓÚÑ]{2}/.test(words)) {
              const lower = words.toLocaleLowerCase('es');
              set(next, button, attribute + '-words', lower[0].toLocaleUpperCase('es') + lower.slice(1));
            }
          }
        }
        for (const menu of document.querySelectorAll('.MuiMenu-paper, .MuiPopover-paper')) {
          const items = [...menu.querySelectorAll('[role="menuitem"]')].map(item => item.textContent.trim());
          if (items.length && items.some(text => /^planifica/i.test(text))) set(next, menu, attribute + '-menu');
        }
      }
      for (const card of sizedBefore) if (!sized.has(card)) card.style.removeProperty('--hhr-plan-hours');
      sizedBefore = sized;
      for (const [element, names] of marks) for (const name of names) if (!next.get(element)?.has(name)) element.removeAttribute(name);
      for (const button of hints) if (!named.has(button)) button.removeAttribute('title');
      marks.clear(); next.forEach((names, element) => marks.set(element, names));
      hints.clear(); named.forEach(button => hints.add(button));
    }
    return Object.freeze({refresh, clear:() => refresh(null)});
  };
  globalThis.HhrFichaCarePlan = Object.freeze({create});
})();
