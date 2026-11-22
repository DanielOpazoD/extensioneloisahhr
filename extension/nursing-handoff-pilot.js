/* The local pilot uses an extension-owned editor. Notes and credentials stay out of Rayen's page. */
(() => {
  'use strict';
  const name = 'Eloísa HHR · Entrega de turno (pruebas)';
  const source = /^https:\/\/fichamedico\.rayensalud\.cl\/dashboard\/encounter-list-nurse\/?(?:[?#].*)?$/;
  const editor = 'nursing-handoff-editor.html';
  const prefix = tabId => 'hhr-nursing-handoff-' + tabId + ':';
  const editorKey = (tabId, id) => prefix(tabId) + 'editor:' + id;
  const draftKey = (context, date, shift) => prefix(context.tabId) +
    ['draft', context.sourceDocument, context.episode, date, shift].join(':');
  const number = value => /^[1-9]\d{0,15}$/.test(value ?? '');
  const error = (message, code) => ({ error: message, code });
  const identity = info => {
    const ids = [info?.facId, info?.practitionerId, info?.practitionerRoleId];
    return ids.every(number) ? ids.join(':') : null;
  };

  function create({
    chrome, getContext, getInfo, checkAccess, getSessionKey, fetchImpl = fetch,
    localPilot = globalThis.HhrNursingHandoffLocalPilot,
    hosted = globalThis.HhrNursingHandoffConnection,
  }) {
    const store = chrome.storage.session;
    const isPilot = chrome.runtime.getManifest().name === name;
    const connection = !isPilot && hosted?.create(chrome, tabId => {
      void chrome.tabs.sendMessage(tabId, { type: 'RAYEN_NURSING_HANDOFF_ACCESS_CHANGED' }, { frameId: 0 })
        .catch(() => {});
    });
    const endpoint = connection ? hosted.endpoint : 'http://127.0.0.1:' + (localPilot?.port ?? 5001) +
      '/demo-hhr-handoff/southamerica-east1/nursingHandoffExtension';
    const enabled = Boolean(connection || (isPilot && localPilot?.installationKey));
    const needsHhr = () => error('Conecta tu cuenta de HHR para continuar.', 'HHR_LINK_REQUIRED');
    const load = async key => (await store.get(key))[key];
    const draftWrites = new Map();
    async function writeDraft(context, { date, shift, version, text }) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !['day', 'night'].includes(shift) ||
          !/^[a-f0-9]{64}$/.test(version) || (text !== undefined && (typeof text !== 'string' || text.length > 16000))) {
        return error('No se pudo conservar el borrador.');
      }
      const key = draftKey(context, date, shift);
      const { owner, sessionKey, patientId, run } = context;
      const write = Promise.resolve(draftWrites.get(key)).catch(() => {}).then(() =>
        text === undefined ? store.remove(key) :
          store.set({ [key]: { owner, sessionKey, patientId, run, version, text } }));
      draftWrites.set(key, write);
      try {
        await write;
        return { ok: true };
      } finally {
        if (draftWrites.get(key) === write) draftWrites.delete(key);
      }
    }
    const getPatient = (episode, info, sender) => {
      const testCase = localPilot?.testCase;
      if (testCase?.episode === episode && new URL(sender.url).searchParams.get('hhrHandoffTest') === '1') {
        return { info, patientId: testCase.episode, patient: testCase.patient };
      }
      return getContext(episode, info, null, sender);
    };
    async function sourceSession(sender) {
      if (!enabled || sender.frameId !== 0 || !source.test(sender.url) ||
          !source.test(sender.tab?.url)) return error('Abre la lista de Gestión de cuidados.');
      const session = await getInfo(sender);
      if (session.error) return error(session.error);
      if (!session.info?.token || !identity(session.info)) return error('Inicia sesión en Hospitalizados de Eloísa.');
      return session;
    }

    async function table({ action }, sender) {
      if (action !== 'status' && action !== 'connect') return error('Operación no autorizada.');
      const session = await sourceSession(sender);
      if (session.error) return session;
      const access = await checkAccess(session.info);
      if (access.error) return error(access.error);
      const owner = identity(session.info);
      if (!connection || await connection.authorized(owner)) return { ok: true };
      return action === 'connect' ? connection.open(owner, sender.tab.id) : needsHhr();
    }

    async function start({ encId, inline }, sender) {
      if (!number(encId)) return error('Abre la lista de Gestión de cuidados.');
      const session = await sourceSession(sender);
      if (session.error) return session;
      if (inline === true && connection && !await connection.authorized(identity(session.info))) return needsHhr();
      const result = await getPatient(String(encId), session.info, sender);
      if (result.error) return error(result.error);
      const access = await checkAccess(result.info);
      if (access.error) return error(access.error);
      const owner = identity(result.info);
      if (!owner) return error('No se pudo verificar la sesión de Eloísa.');
      const id = crypto.randomUUID();
      const sessionKey = await getSessionKey(result.info, sender);
      await store.set({ [editorKey(sender.tab.id, id)]: {
        id, tabId: sender.tab.id, sourceDocument: sender.documentId, episode: String(encId), owner, sessionKey,
        patientId: result.patientId, run: result.patient.run, name: result.patient.name, inline: inline === true,
      } });
      return { ok: true, id };
    }

    async function call(data) {
      try {
        const response = await fetchImpl(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data }), signal: AbortSignal.timeout(24_000),
        });
        const body = await response.json();
        if (response.ok && body.result) return body.result;
        const { status, message, details } = body.error ?? {};
        return { ...error(message || 'HHR no respondió. Intenta de nuevo.', status), slot: details };
      } catch {
        return error('HHR no está disponible. Tu edición sigue abierta.', 'UNAVAILABLE');
      }
    }

    async function verifySource(context, checkPatient = false) {
      const tab = await chrome.tabs.get(context.tabId).catch(() => null);
      if (!source.test(tab?.url)) return error('Vuelve a la lista de Gestión de cuidados.', 'SOURCE_SESSION_CHANGED');
      const ficha = { tab, frameId: 0, url: tab.url, id: chrome.runtime.id };
      const session = await getInfo(ficha);
      if (!session.info?.token || identity(session.info) !== context.owner ||
          await getSessionKey(session.info, ficha) !== context.sessionKey) {
        return error('Cambió la sesión de Eloísa. Abre la entrega desde la lista.', 'SOURCE_SESSION_CHANGED');
      }

      const access = await checkAccess(session.info);
      if (access.error) return error(access.error, 'SOURCE_SESSION_CHANGED');
      if (checkPatient) {
        const refreshed = await getPatient(context.episode, session.info, ficha);
        if (refreshed.error || refreshed.patientId !== context.patientId || refreshed.patient?.run !== context.run) {
          return error('Eloísa no confirmó el paciente y episodio. Abre otra vez la entrega.', 'SOURCE_SESSION_CHANGED');
        }
      }
      return { info: session.info };
    }

    async function operate(message, sender) {
      const { id, action } = message;
      if (connection && action === 'hosted-result') return connection.receive(message, sender);
      if (!enabled || !/^[a-f0-9-]{36}$/.test(id) || !source.test(sender.tab?.url) ||
          !sender.documentId) return error('Editor no autorizado.');
      const key = editorKey(sender.tab.id, id);
      const context = await load(key);
      if (context?.id !== id) return error('Vuelve a abrir la entrega desde la lista.');
      if (action === 'close' && sender.frameId === 0 && sender.documentId === context.sourceDocument) {
        await store.remove(key);
        return { ok: true };
      }
      if (!(sender.frameId > 0) || sender.url !== chrome.runtime.getURL(editor) + '#' + id ||
          (context.editorDocument ? context.editorDocument !== sender.documentId : action !== 'context')) {
        return error('Editor no autorizado.');
      }
      if (action === 'draft' && context.inline && context.editorDocument === sender.documentId) {
        return writeDraft(context, message);
      }
      if (!['context', 'read', 'save', 'connect', 'disconnect'].includes(action)) return error('Operación no autorizada.');
      const verified = await verifySource(context, ['read', 'save'].includes(action));
      if (verified.error) return verified;
      if (action === 'context') {
        await store.set({ [key]: { ...context, editorDocument: sender.documentId } });
        return { name: context.name, hosted: Boolean(connection), inline: context.inline === true };
      }

      if (action === 'connect') return connection ?
        connection.open(context.owner, context.tabId) : error('El piloto local usa el censo de pruebas.');
      const access = connection && await connection.authorized(context.owner);
      if (action === 'disconnect') {
        if (!access) return { disconnected: true };
        await connection.forget(context.owner, access.proof);
        const result = await call({ action, ...access });
        return { disconnected: true, remoteConfirmed: result.disconnected === true };
      }
      if (connection && !access) return needsHhr();
      const { facId, practitionerId, practitionerRoleId } = verified.info;
      const result = await call({
        action, episode: context.episode, patientRun: context.run,
        ...(connection ? access : {
          source: { installationKey: localPilot.installationKey, facilityId: String(facId), practitionerId: String(practitionerId), roleId: String(practitionerRoleId) },
        }),
        date: message.date, shift: message.shift, since: message.since,
        version: message.version, text: message.text,
      });
      if (connection && result.code === 'UNAUTHENTICATED') {
        await connection.forget(context.owner, access.proof);
        return needsHhr();
      }
      if (!result.error && action === 'read') {
        const updated = await verifySource(context, true);
        if (updated.error) return updated;
        if (context.inline && !message.since) {
          const key = draftKey(context, result.date, result.shift);
          await draftWrites.get(key)?.catch(() => {});
          const draft = await load(key);
          if (draft?.owner === context.owner && draft.sessionKey === context.sessionKey &&
              draft.patientId === context.patientId && draft.run === context.run) {
            return { ...result, draft: { text: draft.text, version: draft.version } };
          }
        }
      }
      if (result.confirmed) {
        const updated = await verifySource(context).catch(() => error('Cambió la sesión de Eloísa.', 'SOURCE_SESSION_CHANGED'));
        if (updated.error) return { ...updated, confirmed: true };
        await chrome.tabs.sendMessage(context.tabId, {
          type: 'RAYEN_NURSING_HANDOFF_CONFIRMED',
          episode: context.episode, date: result.date, shift: result.shift,
        }, { documentId: context.sourceDocument }).catch(() => {});
      }
      return result;
    }

    if (enabled) chrome.tabs.onRemoved.addListener(async tabId => {
      const keys = Object.keys(await store.get(null)).filter(key => key.startsWith(prefix(tabId)));
      if (keys.length) await store.remove(keys);
    });
    // HHR commits to the same census document even when two rows belong to different patients.
    let saving = Promise.resolve();
    return {
      table,
      start,
      operate(message, sender) {
        if (message.action !== 'save' || !(sender.frameId > 0) ||
            sender.url !== chrome.runtime.getURL(editor) + '#' + message.id) {
          return operate(message, sender);
        }
        const next = saving.then(() => operate(message, sender));
        saving = next.catch(() => {});
        return next;
      },
    };
  }

  globalThis.HhrNursingHandoffPilot = { create };
})();
