// A change of module in the compact ficha reads as one page, not as Eloísa's page and then this view
// (asked 27-11-2026). Two ways, one per browser:
// - With view transitions (Chrome 111+), a click on a tab is replayed inside a transition: the old view
//   stays on screen while Eloísa draws the new one, and the new one arrives by a short fade. The green bar,
//   the line of tabs and Centro HHR keep their place (hhr-ficha-transitions.css names them).
// - Without them, or with reduced motion, the content under the tabs is veiled from the click until the
//   presentation has marked the new module, at most 450 ms; the stylesheet lifts the veil by itself a
//   little later, should this script stop.
// Eloísa's tabs keep their words, their focus and what they do: the replayed click is the same click.
(() => {
  'use strict';
  const TAB = '[role="tab"][id^="encounter-event-tab-"]';
  // The longest the old view waits for the new one; past it, the new one shows as it is.
  const cap = 450;

  function create({ doc = globalThis.document, win = globalThis } = {}) {
    const root = doc.documentElement;
    let active = false, listening = false, waiting = null, revealTimer = 0;

    const reduced = () => Boolean(win.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    const release = () => {
      if (!waiting) return;
      const done = waiting;
      waiting = null;
      win.clearTimeout(done.timer);
      done.observer?.disconnect();
      if (root.hasAttribute('data-hhr-ficha-settling')) {
        root.removeAttribute('data-hhr-ficha-settling');
        // The new module fades in from the veil, once.
        root.setAttribute('data-hhr-ficha-revealing', '');
        win.clearTimeout(revealTimer);
        revealTimer = win.setTimeout(() => root.removeAttribute('data-hhr-ficha-revealing'), 220);
      }
      done.resolve();
    };
    // Waits for the target tab to be the selected one and for Eloísa to have committed it, or the cap.
    const wait = (target, { veil }) => new Promise(resolve => {
      release();
      if (veil) root.setAttribute('data-hhr-ficha-settling', '');
      waiting = { target, resolve, veil, timer: win.setTimeout(release, cap) };
      if (!veil) {
        // Inside a transition the page is not painted: a task after Eloísa selects the tab, its view is
        // drawn and the presentation marks it in the frame that the new state is taken from.
        const selected = () => doc.getElementById(target)?.getAttribute('aria-selected') === 'true';
        const settle = () => win.setTimeout(() => { if (waiting?.target === target) release(); }, 0);
        if (selected()) settle();
        else {
          const observer = new MutationObserver(() => { if (selected()) { observer.disconnect(); settle(); } });
          observer.observe(doc.body, { attributes: true, attributeFilter: ['aria-selected'], subtree: true });
          waiting.observer = observer;
        }
      }
    });

    function onClick(event) {
      if (!active || !event.isTrusted || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const tab = event.target.closest?.(TAB);
      if (!tab || tab.getAttribute('aria-selected') === 'true' || tab.disabled || tab.getAttribute('aria-disabled') === 'true') return;
      if (typeof doc.startViewTransition !== 'function' || reduced()) { wait(tab.id, { veil: true }); return; }
      // The click reaches Eloísa inside the transition, once its old view has been taken.
      event.stopPropagation();
      event.preventDefault();
      root.setAttribute('data-hhr-ficha-switching', '');
      let transition;
      try {
        transition = doc.startViewTransition(() => { const done = wait(tab.id, { veil: false }); tab.click(); return done; });
      } catch {
        root.removeAttribute('data-hhr-ficha-switching');
        tab.click();
        return;
      }
      transition.finished.catch(() => {}).finally(() => root.removeAttribute('data-hhr-ficha-switching'));
    }

    return Object.freeze({
      /** Turns the transitions on in the compact view and off elsewhere. */
      refresh(compact) {
        active = Boolean(compact);
        if (active && !listening) { doc.addEventListener('click', onClick, true); listening = true; }
        if (!active) {
          release();
          if (listening) { doc.removeEventListener('click', onClick, true); listening = false; }
          root.removeAttribute('data-hhr-ficha-revealing');
        }
      },
      /** The presentation has marked the module of this tab: the veil may go. */
      presented(tabId) { if (waiting?.veil && waiting.target === tabId) release(); },
      dispose() { this.refresh(false); win.clearTimeout(revealTimer); },
    });
  }
  globalThis.HhrFichaTransitions = Object.freeze({ create, cap });
})();
