// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import '../../../extension/clinical-day-runtime.js';
import '../../../extension/census-sync-horizon-runtime.js';
import '../../../extension/capture-read-recovery.js';
import '../../../extension/gestion-camas-session.js';
import '../../../extension/rayen-sync-bundle-runtime.js';
import '../../../extension/fichamedico-read-resilience.js';

type Health = Record<string, {
  status: string;
  message: string;
  identity?: { facilityId: string; practitionerId: string; practitionerRoleId: string };
  usingBackgroundSession?: boolean;
}>;

const globals = globalThis as typeof globalThis & {
  HhrRayenSyncBundleRuntime: {
    capture: (input: Record<string, unknown>) => Promise<Record<string, any>>;
  };
  HhrFichaMedicoReadResilience: {
    describeSessionStatus: (input: Record<string, unknown>) => { ready: boolean; message: string };
  };
};

const ready: Health = {
  fichaMedico: { status: 'ready', message: 'Ficha Médico disponible.' },
  gestionCamas: { status: 'ready', message: 'Gestión de Camas disponible.' },
};

// The exact health a signed-in Ficha Médico tab reports during its read block.
const readBlocked: Health = {
  ...ready,
  fichaMedico: {
    status: 'stale',
    message: globals.HhrFichaMedicoReadResilience.describeSessionStatus({
      sessionReady: true,
      readBlocked: true,
    }).message,
  },
};

const snapshot = {
  snapshot: {
    capturedAt: '2026-07-24T10:00:00.000Z',
    facilityId: 1342,
    encounters: [],
    isComplete: true,
  },
};

const capture = (healths: Health[], readSnapshot: () => Promise<unknown>) => {
  const times = [new Date('2026-07-24T18:00:00.000Z'), new Date('2026-07-24T18:00:21.000Z')];
  const readHealth = vi.fn();
  healths.forEach(health => readHealth.mockResolvedValueOnce(health));
  return globals.HhrRayenSyncBundleRuntime.capture({
    dateStart: '2026-07-24',
    dateEnd: '2026-07-25',
    readHealth,
    readSnapshot,
    readReport: vi.fn().mockResolvedValue({
      ok: true,
      rows: [],
      facilityId: 1342,
      capturedAt: '2026-07-24T10:00:20.000Z',
    }),
    now: () => times.shift() ?? new Date('2026-07-24T18:00:21.000Z'),
    idFactory: () => 'sync-bundle-read-block',
  });
};

describe('Rayen capture while Ficha Médico is in its read block', () => {
  it('reads anyway; once the network is back the read clears the block and the sync completes', async () => {
    const readSnapshot = vi.fn().mockResolvedValue(snapshot);

    const result = await capture([readBlocked, ready], readSnapshot);

    expect(readSnapshot).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        bundle: expect.objectContaining({ id: 'sync-bundle-read-block' }),
      })
    );
  });

  it('still fails, with the block named, when the network is still down', async () => {
    const readSnapshot = vi.fn().mockResolvedValue({
      error: 'No se pudo leer Rayen. Detalle: Failed to fetch al consultar https://example.invalid/census',
    });

    const result = await capture([readBlocked, readBlocked], readSnapshot);

    expect(result.ok).toBeUndefined();
    expect(result.error).toBe(readBlocked.fichaMedico.message);
  });

  it('does not read when Ficha Médico is unavailable for any other reason', async () => {
    const readSnapshot = vi.fn().mockResolvedValue(snapshot);

    const result = await capture(
      [{ ...ready, fichaMedico: { status: 'stale', message: 'La sesión de Ficha Médico venció.' } }],
      readSnapshot
    );

    expect(readSnapshot).not.toHaveBeenCalled();
    expect(result).toEqual({ error: 'La sesión de Ficha Médico venció.' });
  });

  it('does not read when Gestión de Camas is also unavailable', async () => {
    const readSnapshot = vi.fn().mockResolvedValue(snapshot);

    const result = await capture(
      [{ ...readBlocked, gestionCamas: { status: 'missing', message: 'Abre Gestión de Camas.' } }],
      readSnapshot
    );

    expect(readSnapshot).not.toHaveBeenCalled();
    expect(result).toEqual({ error: readBlocked.fichaMedico.message });
  });
});

it.each([false, true])('descarta la captura si cambia el profesional y Camas termina en segundo plano (inicio en segundo plano: %s)', async usingBackgroundSession => {
  const identity = { facilityId: '1342', practitionerId: '3', practitionerRoleId: '5' };
  const background = {
    fichaMedico: { ...ready.fichaMedico, identity },
    gestionCamas: { ...ready.gestionCamas, usingBackgroundSession },
  };
  const after = {
    ...background,
    fichaMedico: { ...background.fichaMedico, identity: { ...identity, practitionerId: '4' } },
    gestionCamas: { ...background.gestionCamas, usingBackgroundSession: true },
  };
  const result = await capture([background, after], async () => snapshot);
  expect(result).toEqual({ error: 'El acceso de Ficha Médico cambió durante la sincronización. Vuelve a sincronizar.' });
});

it('exige un acceso de Ficha verificable desde el inicio si Camas se cierra durante la captura', async () => {
  const after = {
    fichaMedico: { ...ready.fichaMedico, identity: { facilityId: '1342', practitionerId: '3', practitionerRoleId: '5' } },
    gestionCamas: { ...ready.gestionCamas, usingBackgroundSession: true },
  };
  const result = await capture([ready, after], async () => snapshot);
  expect(result).toEqual({ error: 'El acceso de Ficha Médico cambió durante la sincronización. Vuelve a sincronizar.' });
});
