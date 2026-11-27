import { expect, it, vi } from 'vitest';
import '../../../extension/hospitalized-roster-runtime.js';

const ficha = { frameId:0, url:'https://fichamedico.rayensalud.cl/dashboard/encounter-list/101' };
const setup = () => {
  const deps = {
    getFetchInfo: vi.fn(async () => ({ info:{ token:'sintético' } })),
    fetchActiveEncounterRows: vi.fn(async () => ({ rows:[{ id:101 }, { id:102 }] })),
    normalizeHospitalizedEncounter: vi.fn((row, header) => ({ row, header })),
    activeHospitalizedEncounters: vi.fn(() => [
      { encounterId:'101', name:'Paciente Ficticio', run:'1-9', service:'Medicina', room:'Sala 1', bed:'Cama 1', diagnosis:'no se entrega' },
    ]),
  };
  return { deps, handle:globalThis.HhrHospitalizedRosterRuntime.create(deps) };
};

it('lee el censo una vez, sin cabecera por paciente, y entrega solo quién y dónde', async () => {
  const { deps, handle } = setup();
  expect(await handle({}, ficha)).toEqual({ ok:true, patients:[{ encounterId:'101', name:'Paciente Ficticio', service:'Medicina', room:'Sala 1', bed:'Cama 1' }] });
  expect(deps.fetchActiveEncounterRows).toHaveBeenCalledTimes(1);
  expect(deps.normalizeHospitalizedEncounter.mock.calls.map(([, header]) => header)).toEqual([null, null]);
});

it('responde solo a la propia ficha y deja pasar el error de la fuente', async () => {
  const { deps, handle } = setup();
  for (const sender of [{ ...ficha, frameId:1 }, { frameId:0, url:'https://example.test/dashboard/' }, undefined]) {
    expect(await handle({}, sender)).toEqual({ error:'Lista de hospitalizados no disponible.' });
  }
  expect(deps.getFetchInfo).not.toHaveBeenCalled();
  deps.fetchActiveEncounterRows.mockResolvedValueOnce({ error:'Sin sesión.' });
  expect(await handle({}, ficha)).toEqual({ error:'Sin sesión.' });
});
