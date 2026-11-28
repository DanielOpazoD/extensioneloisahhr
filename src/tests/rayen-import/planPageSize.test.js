// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import '../../../extension/hhr-plan-page-size-main.js';
import '../../../extension/hhr-plan-hours.js';

const { rewrite, chosen } = globalThis.HhrPlanPageSize;
const base = 'https://fichamedico.rayensalud.cl/dashboard/encounter-list/101';
const api = 'https://fichamedicoback.rayensalud.cl/api/';
afterEach(() => { delete document.documentElement.dataset.hhrFichaTheme; delete document.documentElement.dataset.hhrPlanHours; });

it('pide más horas solo a las cuatro lecturas del Plan y solo en su tamaño de página nativo', () => {
  for (const name of ['carePlanMedication/1', 'carePlanFreeIndication/1', 'carePlanAssignedCare/1', 'carePlanProcedure/1/2/3']) {
    expect(rewrite(api + name + '?page=0&limit=7&isSuspended=false', 12, base)).toBe(api + name + '?page=0&limit=12&isSuspended=false');
  }
  // Another page size, another read, or nothing chosen: the request goes out as Eloísa wrote it.
  expect(rewrite(api + 'carePlanAssignedCare/1?page=0&limit=100', 12, base)).toBe(api + 'carePlanAssignedCare/1?page=0&limit=100');
  expect(rewrite(api + 'encounter/1/history?limit=7', 12, base)).toBe(api + 'encounter/1/history?limit=7');
  expect(rewrite(api + 'carePlanMedication/1?page=0&limit=7', 0, base)).toBe(api + 'carePlanMedication/1?page=0&limit=7');
});

it('lee la cantidad elegida solo en la ficha compacta y entre 8 y 14', () => {
  const ficha = {pathname:'/dashboard/encounter-list-nurse/101'};
  document.documentElement.dataset.hhrPlanHours = '12';
  expect(chosen(document, ficha)).toBe(0);
  document.documentElement.dataset.hhrFichaTheme = 'compact';
  expect(chosen(document, ficha)).toBe(12);
  expect(chosen(document, {pathname:'/dashboard/encounter-list'})).toBe(0);
  for (const value of ['7', '15', 'x']) { document.documentElement.dataset.hhrPlanHours = value; expect(chosen(document, ficha)).toBe(0); }
});

it('ajusta las horas a la ventana entre 7 y 14, o usa la elegida', () => {
  const { fit, hoursFor } = globalThis.HhrPlanHours;
  expect([fit(1024), fit(1280), fit(1440), fit(1920), fit(NaN)]).toEqual([7, 10, 12, 14, 7]);
  expect([hoursFor('auto', 1440), hoursFor(9, 1920)]).toEqual([12, 9]);
});
