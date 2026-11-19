/** Session readiness and action verification, independent of the live-tab bridge probe. */
(function (root) {
  'use strict';

  const reasonOf = (value, fallback = 'session_unverified') => {
    if (value && value.reason) return value.reason;
    return value && value.status === 'ready' ? 'connected' : fallback;
  };

  const create = ({ session, readSession, clearUnusableSession, requestLiveSession,
    verifySession, bindFichaScope, healthProbeTimeoutMs }) => {
    const finish = status => {
      return { ...status, reason: reasonOf(status) };
    };

    const resolveRecord = async (matchingTabs, liveOptions) => {
      let record = await readSession();
      if (session.isUsable(record) &&
          !matchingTabs.some(tab => Number(tab?.id) === Number(record.sourceTabId))) {
        const live = await requestLiveSession(liveOptions);
        if (live.record) return { record: live.record };
        return { status: {
          status: 'stale',
          reason: reasonOf(live),
          message: live.error ||
            'La sesión guardada pertenece a una pestaña cerrada. Vuelve a conectar Gestión de Camas.',
        } };
      }
      if (!session.isUsable(record)) {
        record = await clearUnusableSession();
        if (!session.isUsable(record)) {
          const live = await requestLiveSession(liveOptions);
          if (!live.record) return { status: {
            ...session.publicStatus(null),
            reason: reasonOf(live),
            message: live.error || 'Gestión de Camas no está conectada.',
          } };
          record = live.record;
        }
      }
      return { record };
    };

    const verifyRecord = async (record, liveOptions, background) => {
      const verified = await verifySession(record, healthProbeTimeoutMs);
      if (verified.record) return { record: verified.record };
      if (!background && verified.reason === 'session_expired') {
        const live = await requestLiveSession(liveOptions);
        if (live.record) return { record: live.record };
      }
      const status = session.publicStatus(record);
      return { status: finish({
        ...status,
        status: 'stale',
        reason: reasonOf(verified, reasonOf(status)),
        message: verified.error || status.message,
      }) };
    };

    return async ({ matchingTabs, liveOptions, verifySessions = false, fichaHealth, background = false, bindScope = true }) => {
      const resolved = background ? { record: await readSession() } : await resolveRecord(matchingTabs, liveOptions);
      if (resolved.status) return finish(resolved.status);
      let { record } = resolved;
      if (background && matchingTabs.some(tab => Number(tab?.id) === Number(record?.sourceTabId))) return null;
      if (background && !session.isUsable(record)) return matchingTabs.length ? null : session.publicStatus(record);
      const ficha = await fichaHealth;
      const scope = session.fichaScopeOf(ficha);
      const needsFreshFicha = ficha?.status === 'ready' && !scope;
      const scopeMismatch = candidate => candidate.fichaScope || background
        ? !scope || scope !== candidate.fichaScope
        : Boolean(scope && !scope.startsWith(candidate.facId + ':'));
      const reconnect = candidate => ({
        ...session.publicStatus(candidate), status: 'stale', reason: 'session_unverified',
        message: needsFreshFicha
          ? 'Recarga Ficha Médico y abre Gestión de Camas para conectarla en segundo plano.'
          : 'Vuelve a conectar Gestión de Camas con el acceso actual de Ficha Médico.',
      });
      if (scopeMismatch(record)) return reconnect(record);
      if (verifySessions || !session.isVerificationFresh(record)) {
        const verified = await verifyRecord(record, liveOptions, background);
        if (verified.status) return verified.status;
        record = verified.record;
      }
      if (scopeMismatch(record)) return reconnect(record);
      if (bindScope && !background && !record.fichaScope && scope) {
        const bound = await bindFichaScope(record, scope);
        if (!bound || scopeMismatch(bound)) return reconnect(bound);
        record = bound;
      }
      const status = session.publicStatus(record);
      if (needsFreshFicha && status.status === 'ready') {
        return { ...status, message: 'Gestión de Camas conectada. Recarga Ficha Médico antes de cerrar Camas.' };
      }
      return status;
    };
  };

  root.HhrGestionCamasSessionHealth = Object.freeze({ create });
})(typeof self !== 'undefined' ? self : globalThis);
