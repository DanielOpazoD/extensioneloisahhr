/* The local pilot uses an extension-owned editor. Notes and credentials stay out of Rayen's page. */
(() => {
  'use strict';
  const name = 'Eloísa HHR · Entrega de turno (pruebas)';
  const source = /^https:\/\/fichamedico\.rayensalud\.cl\/dashboard\/encounter-list-nurse\/?(?:[?#].*)?$/;
  const editor = 'nursing-handoff-editor.html';
  const endpoint = 'http://127.0.0.1:5001/demo-hhr-handoff/southamerica-east1/nursingHandoffExtension';
  const editorKey = id => 'hhr-nursing-handoff-editor-' + id;
  const number = value => /^[1-9]\d{0,15}$/.test(value ?? '');
  const error = (message, code) => ({ error: message, code });
  const demoSession = value => typeof value === 'string' && /^eloisa-demo-v1\.[a-zA-Z0-9_-]{32}$/.test(value);
  const demoSessionError = () => error('Inicia sesión en Eloísa de pruebas y vuelve a abrir la entrega.', 'SOURCE_SESSION_CHANGED');
  const identity = info => {
    const ids = [info?.facId, info?.practitionerId, info?.practitionerRoleId];
    return ids.every(number) ? ids.join(':') : null;
  };

  function create({ chrome, getContext, getInfo, checkAccess, getSessionKey, fetchImpl = fetch }) {
    const store = chrome.storage.session;
    const enabled = () => chrome.runtime.getManifest().name === name;
    const load = async key => (await store.get(key))[key];
    async function start({ encId }, sender) {
      if (!enabled() || sender.frameId !== 0 || !source.test(sender.url) ||
          !source.test(sender.tab?.url) || !number(encId)) return error('Abre la lista de Gestión de cuidados.');
      const session = await getInfo(sender);
      if (session.error) return error(session.error);
      if (!demoSession(session.info?.token)) return demoSessionError();
      const result = await getContext(encId, session.info, null, sender);
      if (result.error) return error(result.error);
      const access = await checkAccess(result.info);
      if (access.error) return error(access.error);
      if (!demoSession(result.info?.token)) return demoSessionError();
      const owner = identity(result.info);
      if (!owner) return error('No se pudo verificar la sesión de Eloísa.');
      const id = crypto.randomUUID();
      const sessionKey = await getSessionKey(result.info, sender);
      const settings = {
        tabId: sender.tab.id, episode: String(encId), owner, sessionKey,
        patientId: result.patientId, run: result.patient.run, name: result.patient.name,
      };
      const tab = await chrome.tabs.create({ url: 'about:blank', active: false });
      await store.set({ [editorKey(id)]: { ...settings, editorTab: tab.id } });
      try {
        await chrome.tabs.update(tab.id, { url: chrome.runtime.getURL(editor) + '#' + id, active: true });
      } catch (failure) {
        await store.remove(editorKey(id));
        await chrome.tabs.remove(tab.id).catch(() => {});
        throw failure;
      }
      return { ok: true };
    }

    async function call(data) {
      try {
        const response = await fetchImpl(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data }), signal: AbortSignal.timeout(24_000),
        });
        const body = await response.json();
        return response.ok && body.result ? body.result :
          error(body.error?.message || 'HHR no respondió. Intenta de nuevo.', body.error?.status);
      } catch {
        return error('HHR no está disponible. Tu edición sigue abierta.', 'UNAVAILABLE');
      }
    }

    async function verifySource(context, checkPatient = false) {
      const tab = await chrome.tabs.get(context.tabId).catch(() => null);
      if (!source.test(tab?.url)) return error('Vuelve a la lista de Gestión de cuidados.', 'SOURCE_SESSION_CHANGED');
      const ficha = { tab, frameId: 0, url: tab.url, id: chrome.runtime.id };
      const session = await getInfo(ficha);
      if (!demoSession(session.info?.token)) return demoSessionError();
      if (identity(session.info) !== context.owner ||
          await getSessionKey(session.info, ficha) !== context.sessionKey) {
        return error('Cambió la sesión de Eloísa. Abre la entrega desde la lista.', 'SOURCE_SESSION_CHANGED');
      }

      const access = await checkAccess(session.info);
      if (access.error) return error(access.error, 'SOURCE_SESSION_CHANGED');
      if (checkPatient) {
        const refreshed = await getContext(context.episode, session.info, null, ficha);
        if (refreshed.error || refreshed.patientId !== context.patientId || refreshed.patient?.run !== context.run) {
          return error('Eloísa no confirmó el paciente y episodio. Abre otra vez la entrega.', 'SOURCE_SESSION_CHANGED');
        }
      }
      return { info: session.info };
    }

    async function operate(message, sender) {
      const { id, action } = message;
      if (!enabled() || sender.frameId !== 0 || !/^[a-f0-9-]{36}$/.test(id) ||
          sender.url !== chrome.runtime.getURL(editor) + '#' + id) return error('Editor no autorizado.');
      const context = await load(editorKey(id));
      if (!context || context.editorTab !== sender.tab?.id) return error('Vuelve a abrir la entrega desde la lista.');
      if (!['context', 'read', 'save'].includes(action)) return error('Operación no autorizada.');
      const verified = await verifySource(context, action !== 'context');
      if (verified.error) return verified;
      if (action === 'context') return { name: context.name };

      const { token, facId, practitionerId, practitionerRoleId } = verified.info;
      const result = await call({
        action, episode: context.episode, patientRun: context.run,
        source: { sessionProof: token, facilityId: String(facId), practitionerId: String(practitionerId), roleId: String(practitionerRoleId) },
        date: message.date, shift: message.shift, since: message.since,
        version: message.version, text: message.text,
      });
      if (!result.error && action === 'read') {
        const updated = await verifySource(context, true);
        if (updated.error) return updated;
      }
      if (result.confirmed) {
        const updated = await verifySource(context).catch(() => error('Cambió la sesión de Eloísa.', 'SOURCE_SESSION_CHANGED'));
        if (updated.error) return { ...updated, confirmed: true };
        await chrome.tabs.sendMessage(context.tabId, {
          type: 'RAYEN_NURSING_HANDOFF_CONFIRMED',
          episode: context.episode, date: result.date, shift: result.shift,
        }).catch(() => {});
      }
      return result;
    }

    if (enabled()) chrome.tabs.onRemoved.addListener(async tabId => {
      const all = await store.get(null);
      const keys = Object.entries(all).filter(([key, value]) =>
        key.startsWith(editorKey('')) && (value.tabId === tabId || value.editorTab === tabId)).map(([key]) => key);
      if (keys.length) await store.remove(keys);
    });
    return { start, operate };
  }

  globalThis.HhrNursingHandoffPilot = { create };
})();
