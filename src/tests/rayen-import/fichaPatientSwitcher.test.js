// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import '../../../extension/hhr-ficha-patient-switcher.js';

const bar = `<header id="menu-app-bar-element" class="MuiAppBar-root"><div class="MuiToolbar-root"><div class="MuiStack-root">
  <div class="MuiStack-root"><div class="MuiStack-root"><svg></svg><div class="MuiStack-root"><p class="MuiTypography-root">Paciente Actual</p></div></div></div>
  <div class="MuiStack-root"><div class="MuiStack-root"><span class="MuiTypography-root">Diagnóstico</span><span class="MuiTypography-root">: ficticio</span></div></div>
</div></div></header>`;
const roster = [
  {encounterId:'101', name:'Paciente Actual', room:'Sala 1', bed:'Cama 1'},
  {encounterId:'102', name:'Otra Persona Ficticia', room:'Sala 2', bed:'Cama 4'},
  {encounterId:'x', name:'Sin episodio', room:'', bed:''},
];
afterEach(() => { document.body.innerHTML = ''; window.history.replaceState(null, '', '/'); });

it('lleva a la misma vista de otro episodio', () => {
  const { hrefFor } = globalThis.HhrFichaPatientSwitcher;
  expect(hrefFor('102', '/dashboard/encounter-list/101')).toBe('/dashboard/encounter-list/102');
  expect(hrefFor('102', '/dashboard/encounter-list-nurse/101/')).toBe('/dashboard/encounter-list-nurse/102/');
  expect(hrefFor('102', '/dashboard/encounter-list')).toBeNull();
});

it('abre con el nombre del paciente la lista de hospitalizados, la filtra y la cierra con Escape', async () => {
  window.history.replaceState(null, '', '/dashboard/encounter-list-nurse/101');
  document.body.innerHTML = bar;
  const readRoster = vi.fn(async () => ({ok:true, patients:roster}));
  const switcher = globalThis.HhrFichaPatientSwitcher.create({ readRoster });
  switcher.refresh('101', true);
  const name = document.querySelector('[data-hhr-patient-switch]');
  expect(name.textContent).toBe('Paciente Actual');
  expect([name.getAttribute('role'), name.getAttribute('aria-haspopup'), name.getAttribute('aria-expanded')]).toEqual(['button', 'dialog', 'false']);
  // Pointing at the name reads the list before it is pressed.
  name.dispatchEvent(new Event('pointerenter'));
  expect(readRoster).toHaveBeenCalledTimes(1);
  name.click();
  await vi.waitFor(() => expect(document.querySelectorAll('[data-hhr-patient-switcher] a')).toHaveLength(2));
  const links = [...document.querySelectorAll('[data-hhr-patient-switcher] a')];
  expect(links.map(link => [link.getAttribute('href'), link.getAttribute('aria-current')])).toEqual([
    ['/dashboard/encounter-list-nurse/101', 'page'], ['/dashboard/encounter-list-nurse/102', null]]);
  const search = document.querySelector('[data-hhr-patient-switcher] input');
  expect(document.activeElement).toBe(search);
  search.value = 'cama 4';
  search.dispatchEvent(new Event('input'));
  expect([...document.querySelectorAll('[data-hhr-patient-switcher] a .hhr-switch-name')].map(el => el.textContent)).toEqual(['Otra Persona Ficticia']);
  search.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true}));
  expect(document.querySelector('[data-hhr-patient-switcher]')).toBeNull();
  expect(document.activeElement).toBe(name);
  // The roster is read once a minute, not on every opening.
  name.click();
  await vi.waitFor(() => expect(document.querySelectorAll('[data-hhr-patient-switcher] a')).toHaveLength(2));
  expect(readRoster).toHaveBeenCalledTimes(1);
  switcher.clear();
  expect(document.querySelector('[data-hhr-patient-switcher],[data-hhr-patient-switch],[role="button"]')).toBeNull();
});

it('dice cuando la lista no está disponible y no toma el nombre fuera de una ficha', async () => {
  window.history.replaceState(null, '', '/dashboard/encounter-list/101');
  document.body.innerHTML = bar;
  const readRoster = vi.fn(async () => ({error:'Sin sesión de Eloísa.'}));
  const switcher = globalThis.HhrFichaPatientSwitcher.create({ readRoster });
  switcher.refresh('101', true);
  document.querySelector('[data-hhr-patient-switch]').click();
  await vi.waitFor(() => expect(document.querySelector('.hhr-switch-status').textContent).toBe('Sin sesión de Eloísa. Reintentar'));
  document.querySelector('[data-hhr-switch-retry]').click();
  await vi.waitFor(() => expect(document.querySelector('[data-hhr-switch-retry]')).not.toBeNull());
  expect(readRoster).toHaveBeenCalledTimes(2);
  switcher.clear();
  window.history.replaceState(null, '', '/dashboard/encounter-list');
  switcher.refresh('', true);
  expect(document.querySelector('[data-hhr-patient-switch]')).toBeNull();
});
