/** Fixed public request for the latest published version. The service worker never sends page or session data. */
(() => {
  'use strict';
  const endpoint = 'https://api.github.com/repos/DanielOpazoD/extensioneloisahhr/releases/latest';
  const storageKey = 'hhr-release-check-v1';
  // One answer serves a working shift. After a failure the next attempt waits an hour.
  const fresh = 6 * 60 * 60_000, patience = 60 * 60_000;
  const unavailable = 'Versión publicada no disponible.';
  const parse = version => /^\d+\.\d+\.\d+$/.test(version ?? '') ? version.split('.').map(Number) : null;
  /** True only when both are versions and `published` is the later one. */
  function newer(published, installed) {
    const latest = parse(published), local = parse(installed);
    if (!latest || !local) return false;
    return (latest.map((value, at) => value - local[at]).find(value => value !== 0) || 0) > 0;
  }
  /** The version of a published release, or null for a draft, a prerelease or another kind of tag. */
  function project(release) {
    const match = /^v(\d+\.\d+\.\d+)$/.exec(release?.tag_name ?? '');
    return match && release.draft !== true && release.prerelease !== true ? match[1] : null;
  }

  function create({ storage, request, installed, now = Date.now }) {
    let inFlight;
    const answer = published => ({ installed, published, available: newer(published, installed) });
    async function check(known) {
      let published = null;
      try {
        const response = await request(endpoint, {
          credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(6000),
        });
        published = response.ok ? project(await response.json()) : null;
      } catch { /* Offline, blocked or over GitHub's limit: the last known answer stands. */ }
      const record = published ? { published, checkedAt: now() } : { ...known, failedAt: now() };
      await storage.set({ [storageKey]: record }).catch(() => {});
      return answer(record.published ?? null);
    }
    async function status(_message, sender) {
      if (sender?.frameId !== 0 || !/^https:\/\/fichamedico\.rayensalud\.cl\/dashboard(?:\/|$)/.test(sender.url ?? '')) return { error: unavailable };
      const stored = (await storage.get(storageKey).catch(() => ({})))?.[storageKey];
      const known = parse(stored?.published) ? { published: stored.published, checkedAt: stored.checkedAt } : {};
      // A stamp from the future, after a clock was set back, is not an age.
      const age = stamp => { const elapsed = now() - stamp; return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : Infinity; };
      if (known.published && age(known.checkedAt) < fresh) return answer(known.published);
      if (age(stored?.failedAt) < patience) return answer(known.published ?? null);
      inFlight ||= check(known).finally(() => { inFlight = undefined; });
      return inFlight;
    }
    return Object.freeze({ status });
  }
  globalThis.HhrExtensionReleaseCheck = Object.freeze({ create, newer, project, storageKey });
})();
