// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import '../../../extension/hhr-ficha-transitions.js';

const page = `<main><header class="MuiAppBar-root"><div role="tablist">
  <button role="tab" id="encounter-event-tab-summary" aria-selected="true">Resumen</button>
  <button role="tab" id="encounter-event-tab-care-plan" aria-selected="false">Plan de tratamiento</button>
</div></header><div class="content"></div></main>`;
// jsdom cannot make a trusted click: the person's click is the one this flag marks.
const person = new WeakSet();
const trusted = target => {
  const event = new MouseEvent('click', {bubbles:true, cancelable:true});
  person.add(event);
  target.dispatchEvent(event);
  return event;
};
// Each test's transitions listen on the one document of the file: they are taken down after it.
const made = [];
const create = () => { const transitions = globalThis.HhrFichaTransitions.create({trusted:event => person.has(event)}); made.push(transitions); return transitions; };
afterEach(() => { made.splice(0).forEach(transitions => transitions.dispose()); vi.useRealTimers(); document.body.innerHTML = ''; document.documentElement.removeAttribute('data-hhr-ficha-settling'); document.documentElement.removeAttribute('data-hhr-ficha-revealing'); });

it('vela el módulo nuevo hasta que la vista lo presenta, sin tocar el clic de Eloísa', () => {
  vi.useFakeTimers();
  document.body.innerHTML = page;
  const transitions = create();
  transitions.refresh(true);
  const tab = document.getElementById('encounter-event-tab-care-plan');
  const eloisa = vi.fn();
  tab.addEventListener('click', eloisa);
  const event = trusted(tab);
  expect([event.defaultPrevented, eloisa.mock.calls.length]).toEqual([false, 1]);
  expect(document.documentElement.hasAttribute('data-hhr-ficha-settling')).toBe(true);
  transitions.presented('encounter-event-tab-summary');
  expect(document.documentElement.hasAttribute('data-hhr-ficha-settling')).toBe(true);
  transitions.presented('encounter-event-tab-care-plan');
  expect(document.documentElement.hasAttribute('data-hhr-ficha-settling')).toBe(false);
  expect(document.documentElement.hasAttribute('data-hhr-ficha-revealing')).toBe(true);
  vi.advanceTimersByTime(250);
  expect(document.documentElement.hasAttribute('data-hhr-ficha-revealing')).toBe(false);
});

it('levanta el velo solo al cumplirse la espera, e ignora la pestaña ya elegida y la vista apagada', () => {
  vi.useFakeTimers();
  document.body.innerHTML = page;
  const transitions = create();
  transitions.refresh(true);
  trusted(document.getElementById('encounter-event-tab-summary'));
  expect(document.documentElement.hasAttribute('data-hhr-ficha-settling')).toBe(false);
  trusted(document.getElementById('encounter-event-tab-care-plan'));
  vi.advanceTimersByTime(globalThis.HhrFichaTransitions.cap);
  expect(document.documentElement.hasAttribute('data-hhr-ficha-settling')).toBe(false);
  transitions.refresh(false);
  trusted(document.getElementById('encounter-event-tab-care-plan'));
  expect(document.documentElement.hasAttribute('data-hhr-ficha-settling')).toBe(false);
});

it('con transiciones, el clic de Eloísa llega una vez, dentro de la transición', async () => {
  document.body.innerHTML = page;
  const tab = document.getElementById('encounter-event-tab-care-plan');
  const eloisa = vi.fn(() => tab.setAttribute('aria-selected', 'true'));
  tab.addEventListener('click', eloisa);
  let update;
  document.startViewTransition = vi.fn(callback => { update = callback; return {finished:Promise.resolve()}; });
  try {
    const transitions = create();
    transitions.refresh(true);
    const event = trusted(tab);
    expect([event.defaultPrevented, eloisa.mock.calls.length, document.documentElement.hasAttribute('data-hhr-ficha-switching')]).toEqual([true, 0, true]);
    await update();
    expect(eloisa).toHaveBeenCalledTimes(1);
    expect(document.documentElement.hasAttribute('data-hhr-ficha-settling')).toBe(false);
  } finally {
    delete document.startViewTransition;
  }
});
