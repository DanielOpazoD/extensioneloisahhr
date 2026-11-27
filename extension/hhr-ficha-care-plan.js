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
    const headings = table?.tHead?.rows[0]?.cells;
    // Programación de procedimientos leaves its first heading empty (read on the page 27-11-2026): its title says what it is.
    const titled = /^programacion de /.test(plain(header?.querySelector('.MuiCardHeader-title')?.textContent));
    const first = plain(headings?.[0]?.textContent);
    if (!header || headings?.length !== 2 || !(first.startsWith('indicacion') || (titled && !first))) return null;
    // The tools sit between the header and the table: icon buttons and nothing else.
    const tools = [...card.children].find(el => el !== header && el !== content);
    const buttons = tools ? [...tools.querySelectorAll('button')] : [];
    const onlyButtons = buttons.length && buttons.length === tools.querySelectorAll(controls).length &&
      buttons.every(button => button.matches('.MuiIconButton-root') && button.querySelector('svg') && !button.textContent.trim());
    const rows = [...(table.tBodies[0]?.rows || [])];
    return {table, tools:onlyButtons && card.children.length === 3 ? tools : null, buttons:onlyButtons ? buttons : [],
      empty:rows.length === 1 && rows[0].cells.length === 1 && rows[0].cells[0].colSpan > 1};
  }

  const create = () => {
    const marks = new Map(), hints = new Set();
    const set = (next, element, name, value = '') => {
      if (element.getAttribute(name) !== value) element.setAttribute(name, value);
      next.set(element, (next.get(element) || new Set()).add(name));
    };
    function refresh(main) {
      const next = new Map(), named = new Set();
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
        if (plan.tools) set(next, plan.tools, attribute, 'tools');
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
      for (const [element, names] of marks) for (const name of names) if (!next.get(element)?.has(name)) element.removeAttribute(name);
      for (const button of hints) if (!named.has(button)) button.removeAttribute('title');
      marks.clear(); next.forEach((names, element) => marks.set(element, names));
      hints.clear(); named.forEach(button => hints.add(button));
    }
    return Object.freeze({refresh, clear:() => refresh(null)});
  };
  globalThis.HhrFichaCarePlan = Object.freeze({create});
})();
