import assert from 'node:assert/strict';

// Mirrors the public BedTabs/BedContainer props used by Gestión de Camas.
export function bedEditorFixture() {
  const boot = () => {
    const bed = { encounterId: 2003, hospitalAdmissionOrderId: 4 };
    const owner = (element, instance, props) => {
      element.__reactInternalInstance$fixture = { _currentElement: { _owner: { _instance: instance, _currentElement: { props } } } };
    };
    const tabs = document.querySelector('.pt-tabs').__reactInternalInstance$fixture = {};
    tabs._hostParent = { _renderedChildren: { tabs: { _currentElement: { props: { bedsByType: { 3: [bed] } } }, _renderedComponent: tabs } } };
    const patientId = Number(sessionStorage.getItem('test-patient') || 3003);
    const view = {
      props: {
        authenticate: { current: { profile: { id: 2 }, role: { facilityId: 1, permissions: ['Modificar_Paciente'] } } },
        hospitalRequest: { results: [{ id: 4, patient: { id: patientId }, hospitalAdmissionOrderMapping: {} }] },
        onAction({ option, bed: selected }) {
          if (option !== 'requestModified' || selected !== bed) throw Error('Incorrect native action');
          document.querySelector('dialog').showModal();
        },
      },
      typeViewResult: () => [{ bed, action: [[{ value: 'requestModified' }]] }],
    };
    owner(document.querySelector('.sdxTemplate__wrapper'), view);
    if (!sessionStorage.getItem('login')) location.hash = '/authenticate/login';
    document.querySelector('button').onclick = () => {
      sessionStorage.setItem('login', '1');
      location.hash = '/bed';
    };
  };
  return '<!doctype html><meta charset="utf-8"><button>Ingresar en prueba</button><div class="sdxWrapper__content-tabs pt-tabs"></div><div class="sdxTemplate__wrapper"></div><dialog>Modificación del paciente</dialog><script>(' + boot.toString() + ')()</script>';
}

export async function verifyEditShortcut(context, source, row, worker) {
  const pencil = row.getByRole('button', { name: 'Modificar paciente en Gestión de Camas' });
  await source.mouse.move(0, 0);
  await source.locator('body').click({position:{x:0,y:0}});
  assert.equal(await pencil.evaluate(el => getComputedStyle(el).opacity), '0');
  await pencil.focus();
  assert.equal(await pencil.evaluate(el => getComputedStyle(el).opacity), '1');
  assert.equal(await row.locator('td').first().evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(231, 244, 241)');
  const url = 'https://hospitalizado.rayensalud.cl/**';
  const handler = route => route.fulfill({ contentType: 'text/html', body: bedEditorFixture() });
  await context.route(url, handler);
  let dest;
  try {
    [dest] = await Promise.all([context.waitForEvent('page'), pencil.press('Enter')]);
    await dest.getByText('Inicia sesión en Gestión de Camas', { exact: false }).waitFor({timeout:10000});
    await dest.getByRole('button', { name: 'Ingresar en prueba' }).click();
    await dest.getByRole('dialog').waitFor({timeout:10000});
    assert.equal(await dest.getByRole('dialog').textContent(), 'Modificación del paciente');
    await dest.getByRole('status').filter({hasText:'Buscando el episodio'}).waitFor({state:'hidden'});
    assert.match(source.url(), /encounter-list-nurse$/);
    // A second click must use this authenticated document, including its in-memory state.
    await dest.evaluate(() => { document.querySelector('dialog').close(); window.testDocument = 'original'; });
    await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ url: 'https://hospitalizado.rayensalud.cl/*' });
      // An earlier handoff may have lost its listener during a reload or update.
      await chrome.storage.session.set({
        ['hhr-worklist-editor-' + tab.id]: {
          episode: '2002', patient: '3002', professional: '2', facility: '1', expires: Date.now() + 90_000,
        },
      });
    });
    await source.bringToFront();
    const total = context.pages().length;
    await pencil.click();
    await dest.getByRole('dialog').waitFor({timeout:10000});
    assert.equal(await dest.evaluate(() => window.testDocument), 'original');
    assert.equal(context.pages().length, total);
  } finally {
    await dest?.close();
    await source.bringToFront();
    await context.unroute(url, handler);
  }
}
