// Plan de tratamiento asks Eloísa's server for its schedules seven hours at a time (`limit=7`, read on the
// page on 27-11-2026). In the compact view the hours are a narrow grid, so it asks for as many as the view
// chose: the number the extension writes on the page as `data-hhr-plan-hours` (7 to 14). Eloísa draws
// whatever it receives, its pages and «Ir a Hoy» included. Only those four reads, only their default page
// size, only in the compact ficha: anything else goes out as Eloísa wrote it.
(() => {
  'use strict';
  if (globalThis.HhrPlanPageSize) return;
  const PATH = /^\/api\/carePlan(?:Medication|FreeIndication|AssignedCare|Procedure)\//;
  const FICHA = /^\/dashboard\/encounter-list(?:-nurse)?\/\d+/;

  /** The hours the compact view asks for, or 0 to leave Eloísa's request alone. */
  function chosen(doc = globalThis.document, place = globalThis.location) {
    const root = doc?.documentElement;
    if (!root || root.dataset.hhrFichaTheme !== 'compact' || !FICHA.test(place?.pathname || '')) return 0;
    const hours = Number(root.dataset.hhrPlanHours);
    return Number.isInteger(hours) && hours > 7 && hours <= 14 ? hours : 0;
  }

  /** The same address with the chosen page size, or the address unchanged. */
  function rewrite(url, hours, base) {
    if (!hours) return url;
    try {
      const parsed = new URL(String(url), base);
      if (!PATH.test(parsed.pathname) || parsed.searchParams.get('limit') !== '7') return url;
      parsed.searchParams.set('limit', String(hours));
      return parsed.toString();
    } catch {
      return url;
    }
  }

  const page = globalThis.window;
  if (page?.fetch && page.XMLHttpRequest) {
    const fetchBefore = page.fetch;
    page.fetch = function (input, init) {
      const hours = chosen();
      if (hours) {
        if (typeof input === 'string' || input instanceof URL) input = rewrite(input, hours, page.location.href);
        else if (input instanceof page.Request) {
          const next = rewrite(input.url, hours, page.location.href);
          if (next !== input.url) input = new page.Request(next, input);
        }
      }
      return fetchBefore.call(this, input, init);
    };
    const openBefore = page.XMLHttpRequest.prototype.open;
    page.XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      return openBefore.call(this, method, rewrite(url, chosen(), page.location.href), ...rest);
    };
  }
  globalThis.HhrPlanPageSize = Object.freeze({ chosen, rewrite });
})();
