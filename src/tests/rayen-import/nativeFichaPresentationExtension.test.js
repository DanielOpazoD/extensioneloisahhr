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
  document.body.replaceChildren(); vi.unstubAllGlobals();
});

describe('Compact native history dates', () => {
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
