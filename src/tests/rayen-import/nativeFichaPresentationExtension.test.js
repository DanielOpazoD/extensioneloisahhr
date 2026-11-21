// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../extension/hhr-history-date-navigation.js';
import '../../../extension/hhr-native-ficha-presentation.js';

const event = (role, category, note = '') => `<div class="MuiCard-root">
  <div class="MuiCardHeader-root"><span class="MuiCardHeader-title">Autor de prueba</span><span class="MuiCardHeader-subheader">${role}</span></div>
  <div class="MuiCardContent-root"><div class="MuiStack-root"><p class="MuiTypography-root">${category}</p><div>${note}</div></div></div></div>`;
const group = (date, cards) => `<div class="MuiBox-root"><div class="MuiStack-root"><div class="MuiChip-root"><span class="MuiChip-label">${date}</span></div></div>${cards}</div>`;
const historyTab = '<div role="tablist"><button role="tab" aria-selected="true">Historial</button><button role="tab" aria-selected="false">Alta</button></div>';
let history, presentation;
beforeEach(() => {
  vi.spyOn(Element.prototype, 'getClientRects').mockImplementation(function () {
    return this.closest('[hidden],[data-hhr-history-filtered]') ? [] : [{ top: 0, bottom: 30, width: 100, height: 30 }];
  });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
});
afterEach(() => {
  history?.dispose(); presentation?.dispose(); history = null; presentation = null;
  document.body.replaceChildren(); vi.unstubAllGlobals(); vi.useRealTimers();
  window.history.replaceState(null, '', '/');
});

describe('Compact native history dates', () => {
  it('opens native history once and focuses the newest medical publication after loading', () => {
    window.history.replaceState(null, '', '/dashboard/encounter-list-nurse/22#hhr-ultima-publicacion');
    document.body.innerHTML = historyTab + '<div id="timeline"></div>';
    const tab = document.querySelector('button');
    tab.setAttribute('aria-selected', 'false');
    const open = vi.fn(() => tab.setAttribute('aria-selected', 'true'));
    tab.addEventListener('click', open);
    const unavailable = vi.fn();
    history = globalThis.HhrHistoryDateNavigation.create({ onNoveltyUnavailable: unavailable });
    history.refresh('22'); history.refresh('22');
    expect(open).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('');
    document.querySelector('#timeline').innerHTML = group('Hoy',
      event('Paramédico', 'Administración') + event('Médica cirujana', 'Indicaciones') + event('Médico', 'Evolución')) +
      group('Ayer', event('Médico', 'Evolución'));
    history.refresh('22');
    const target = document.querySelector('[data-hhr-history-novelty-target]');
    expect(target.querySelector('.MuiCardContent-root').textContent).toBe('Indicaciones');
    expect(document.activeElement).toBe(target);
    expect(window.scrollBy).toHaveBeenCalled();
    expect(unavailable).not.toHaveBeenCalled();
    tab.setAttribute('aria-selected', 'false');
    history.refresh('22');
    expect(target.hasAttribute('data-hhr-history-novelty-target')).toBe(false);
    expect(target.hasAttribute('tabindex')).toBe(false);
  });

  it('reports an unavailable publication and never opens a different episode', () => {
    vi.useFakeTimers();
    const url = '/dashboard/encounter-list-nurse/22#hhr-ultima-publicacion';
    window.history.replaceState(null, '', url);
    document.body.innerHTML = historyTab + '<div>' + group('Hoy', event('Enfermera', 'Evolución')) + '</div>';
    const unavailable = vi.fn();
    history = globalThis.HhrHistoryDateNavigation.create({ onNoveltyUnavailable: unavailable });
    history.refresh('23');
    expect(window.location.hash).toBe('#hhr-ultima-publicacion');
    history.refresh('22');
    expect(document.querySelector('[data-hhr-history-novelty-target]')).toBeNull();
    vi.advanceTimersByTime(15_000);
    expect(unavailable).toHaveBeenCalledTimes(1);
  });

  it('shows only date navigation while keeping every native event available', () => {
    document.body.innerHTML = historyTab + '<div id="timeline">' +
      group('Hoy', event('Médico', 'Evolución') + event('Médico', 'Fármacos')) +
      group('Ayer', event('Enfermera(o)', 'Evolución')) + '</div>';
    history = globalThis.HhrHistoryDateNavigation.create(); history.refresh('1');
    const navigator = document.querySelector('#hhr-history-date-navigation');
    expect(navigator.parentElement).toBe(document.querySelector('[role="tablist"]'));
    expect(navigator.previousElementSibling.textContent).toBe('Alta');
    const shadow = navigator.shadowRoot;
    expect(shadow.querySelectorAll('button')).toHaveLength(2);
    expect(shadow.querySelectorAll('option')).toHaveLength(2);
    expect(shadow.querySelector('[data-filter],[role="status"]')).toBeNull();
    expect(document.querySelectorAll('.MuiCard-root')).toHaveLength(3);
    expect(document.querySelectorAll('[data-hhr-history-filtered]')).toHaveLength(0);
  });

  it('updates loaded dates after native filtering and clears old episode dates', () => {
    document.body.innerHTML = historyTab + '<div id="timeline">' + group('Hoy', event('Médico', 'Evolución')) + '</div>';
    history = globalThis.HhrHistoryDateNavigation.create(); history.refresh('1');
    document.querySelector('#timeline').innerHTML = group('01-01-2025', event('Médico', 'Procedimientos'));
    history.refresh('2');
    const shadow = document.querySelector('#hhr-history-date-navigation').shadowRoot;
    expect(shadow.querySelector('select').textContent).toBe('01-01-2025');
    document.querySelector('#timeline').replaceChildren(); history.refresh('2');
    expect(document.querySelector('#hhr-history-date-navigation')).toBeNull();
  });

  it('releases date navigation on leaving history', () => {
    document.body.innerHTML = historyTab + '<div>' + group('Hoy', event('Médico', 'Evolución')) + '</div>';
    history = globalThis.HhrHistoryDateNavigation.create(); history.refresh('1');
    document.querySelector('[role="tab"]').setAttribute('aria-selected', 'false'); history.refresh('1');
    expect(document.querySelector('#hhr-history-date-navigation')).toBeNull();
    expect(document.querySelector('[data-hhr-history-rail],[data-hhr-history-tab],[data-hhr-history-scroll]')).toBeNull();
    expect(document.querySelectorAll('.MuiCard-root')).toHaveLength(1);
  });

  it('compacts Nuevo only within history cards and clears the style when the label changes', () => {
    const chip = '<div class="MuiChip-root"><span class="MuiChip-label">Nuevo</span></div>';
    document.body.innerHTML = historyTab + chip + '<div id="timeline">' +
      group('Hoy', event('Médico', 'Fármacos', chip)) + '</div>';
    history = globalThis.HhrHistoryDateNavigation.create(); history.refresh('1');
    const marked = document.querySelector('[data-hhr-history-new]');
    expect(marked.closest('#timeline')).not.toBeNull();
    expect(document.querySelectorAll('[data-hhr-history-new]')).toHaveLength(1);
    marked.firstElementChild.textContent = 'Suspendido';
    history.refresh('1');
    expect(marked.hasAttribute('data-hhr-history-new')).toBe(false);
  });
});

describe('Native ficha presentation', () => {
  it('widens read-only evolutions, preserves editable fields and restores native navigation attributes', () => {
    document.body.innerHTML = `<main><header class="MuiAppBar-root"><div class="MuiTabs-root"><div role="tablist">
      <button id="encounter-event-tab-summary" role="tab" aria-selected="true">Resumen</button></div></div></header>
      <div><div class="MuiGrid-container"><div class="MuiGrid-item"><span class="MuiTypography-caption">Evolución</span></div></div></div>
      <section id="observationEntrySection"><div id="evolution" class="MuiCard-root"><span class="MuiCardHeader-title">Evolución</span>
        <div class="MuiCardContent-root"><div class="MuiStack-root"><div class="MuiStack-root">
          <div class="MuiBox-root" id="read"><span class="MuiTypography-caption">Autor de prueba</span><div class="MuiBox-root">Texto de prueba</div></div>
          <div class="MuiBox-root" id="edit"><span class="MuiTypography-caption">Editor</span><div class="MuiBox-root"><textarea>Trabajo en curso</textarea></div></div>
        </div></div></div></div></section></main>`;
    presentation = globalThis.HhrNativeFichaPresentation.create(); presentation.refresh('1');
    expect(document.querySelector('#read').hasAttribute('data-hhr-evolution-block')).toBe(true);
    expect(document.querySelector('#edit').hasAttribute('data-hhr-evolution-block')).toBe(false);
    const link = document.querySelector('[data-hhr-ficha-link]');
    expect(link.getAttribute('role')).toBe('link'); expect(link.tabIndex).toBe(0);
    presentation.dispose();
    expect(document.querySelectorAll('[data-hhr-evolution-block],[data-hhr-ficha-primary]')).toHaveLength(0);
    expect(link.hasAttribute('role')).toBe(false); expect(link.hasAttribute('tabindex')).toBe(false);
    expect(document.querySelector('textarea').value).toBe('Trabajo en curso');
  });
});
