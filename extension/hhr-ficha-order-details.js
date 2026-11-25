// Use the host disclosure to materialize its own prescription text in the same table cell.
(() => {
  'use strict';
  const normalize = value => value.replace(/\s+/g, ' ').trim();
  const trimDots = value => value.replace(/(?:…|\.{3})$/, '').trimEnd();
  const controls = 'button,[role=button],a,input,select,textarea,[contenteditable],summary';
  const unavailable = 'dialog,[role=dialog],[hidden],[inert],[aria-hidden=true],[aria-busy=true],.MuiCollapse-hidden';
  const textColumns = /^(?:posología|indicaci[oó]n(?: libre| específica)?|indicaciones(?: libres| específicas)?|observaci[oó]n|observaciones)$/i;
  const more = /^(?:ver|leer) m[aá]s$/i;
  const less = /^(?:ver|leer) menos$/i;
  const textTags = 'div,p,span,strong,b,i,em,small,sub,sup,br';

  function disclosure(button, cell) {
    if (!button.matches('button') || button.disabled || button.closest(unavailable) ||
        button.matches('[aria-disabled=true],[aria-haspopup]:not([aria-haspopup=false]),[formaction]') ||
        (button.form && button.type !== 'button')) return;
    const controlled = button.getAttribute('aria-controls');
    if (controlled && !cell.contains(document.getElementById(controlled))) return;
    const label = normalize(button.textContent);
    if (!more.test(label) && !less.test(label)) return;
    const ariaLabel = button.getAttribute('aria-label');
    if (ariaLabel && normalize(ariaLabel).toLowerCase() !== label.toLowerCase()) return;

    // The button may live next to a Typography or inside it, sometimes inside its own Box.
    // Only accept a text-only group with a single disclosure and no separate actions.
    for (let group = button.parentElement; group && cell.contains(group); group = group.parentElement) {
      if ([...group.querySelectorAll('*')].some(el => !button.contains(el) &&
          (!el.matches(textTags) || el.matches(controls) || el.closest(unavailable)))) return;
      const walker = document.createTreeWalker(group, NodeFilter.SHOW_TEXT);
      const parts = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!button.contains(node) && node.textContent.trim()) {
          if (node.parentElement.checkVisibility?.({visibilityProperty:true, opacityProperty:true}) === false) return;
          parts.push(node.textContent);
        }
      }
      const text = normalize(parts.join(''));
      if (text) return {group, button, text, expanded:less.test(label)};
    }
  }

  // An expanded native button alone cannot prove that a MUI wrapper has stopped clipping the text.
  const clips = value => value === 'hidden' || value === 'clip';
  function clipped(group, cell) {
    const nodes = [...group.querySelectorAll('*')].filter(node => !node.closest(controls));
    for (let ancestor = group; cell.contains(ancestor); ancestor = ancestor.parentElement) nodes.push(ancestor);
    return nodes.some(node => {
      const style = getComputedStyle(node);
      return (clips(style.overflowX) && node.scrollWidth > node.clientWidth + 1) ||
        ((clips(style.overflowY) || Number(style.webkitLineClamp) > 0) && node.scrollHeight > node.clientHeight + 1);
    });
  }

  function currentIn(scope, cell) {
    const buttons = scope.querySelectorAll('button');
    return buttons.length === 1 ? disclosure(buttons[0], cell) : null;
  }

  function create() {
    // One attempt per native preview. A failed/incomplete expansion keeps its original control.
    let pending = new Map();
    function refresh(cells, marks) {
      const next = new Map();
      for (const [cell, heading] of cells) {
        if (cell.closest(unavailable)) continue;
        for (const chip of cell.querySelectorAll('.MuiChip-root')) {
          const label = chip.querySelector(':scope > .MuiChip-label');
          if (!label || chip.closest('td') !== cell) continue;
          const name = normalize(label.textContent);
          if (/^SOS$/i.test(name)) marks.set(chip, 'order-marker-sos');
          if (/^(?:Antimic\.?|Antimicrobiano)$/i.test(name)) marks.set(chip, 'order-marker-antimicrobial');
        }
        if (!textColumns.test(heading)) continue;
        const buttons = [...cell.querySelectorAll('button')].filter(button => button.closest('td') === cell);
        for (const button of buttons) {
          const current = disclosure(button, cell);
          if (!current) continue;
          const scope = buttons.length === 1 ? cell : current.group;
          let attempt = pending.get(scope);
          const prefix = trimDots(current.text);
          if (attempt?.manual && (current.expanded || attempt.prefix === prefix)) {
            next.set(scope, attempt);
            continue;
          }
          if (!current.expanded && prefix && (!attempt || attempt.prefix !== prefix || attempt.suppressed)) {
            attempt = {prefix, wasClipped:clipped(current.group, cell)};
            button.click();
            // Subsequent native clicks belong to the user, including while React's commit is pending.
            attempt.onClick = event => {
              const target = event.target.closest?.('button');
              if (target && disclosure(target, cell)) attempt.manual = true;
            };
            scope.addEventListener('click', attempt.onClick, true);
          }
          if (!attempt) continue;
          next.set(scope, attempt);
          attempt.suppressed = false;
          // React may replace the text wrapper or commit the new text on a later refresh.
          const result = currentIn(scope, cell);
          if (!result?.expanded || !result.text.startsWith(attempt.prefix)) continue;
          attempt.openText = result.text;
          if (result.text === trimDots(result.text) && (result.text.length > attempt.prefix.length || attempt.wasClipped) &&
              !clipped(result.group, cell)) {
            marks.set(result.button, 'order-disclosure');
            attempt.suppressed = true;
          }
        }
        // Undo native CSS ellipsis on materialized text, independently of JavaScript disclosures.
        for (const node of cell.querySelectorAll('.MuiTypography-root,.MuiTypography-noWrap,[style*="line-clamp"],[style*="ellipsis"]')) {
          if (!node.closest(controls + ',' + unavailable + ',.MuiChip-root') && !node.querySelector(controls + ',' + unavailable)) {
            marks.set(node, 'order-text');
          }
        }
      }
      for (const [scope, attempt] of pending) {
        if (next.get(scope) === attempt) continue;
        scope.removeEventListener('click', attempt.onClick, true);
        if (next.has(scope) || !scope.isConnected || attempt.manual) continue;
        const cell = scope.closest('td');
        const result = cell && currentIn(scope, cell);
        if (!result?.expanded) continue;
        // React may have committed between the last Compacto refresh and the change of theme.
        const sameText = attempt.openText ? attempt.openText === result.text :
          result.text.startsWith(attempt.prefix) && result.text === trimDots(result.text) &&
          (result.text.length > attempt.prefix.length || attempt.wasClipped);
        if (sameText) result.button.click();
      }
      pending = next;
    }
    return {refresh};
  }
  globalThis.HhrFichaOrderDetails = Object.freeze({create});
})();
