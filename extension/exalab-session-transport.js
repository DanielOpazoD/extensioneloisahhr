/** Reads only the Exalab session cookies and hands them to HHR's gateway; values never reach a page. */
(function (root) {
  'use strict';
  const EXALAB_URL = 'https://exalab.saludoriente.cl/web_ssmo/index.php';
  const GRANT = Object.freeze({ permissions: ['cookies'], origins: ['https://exalab.saludoriente.cl/*'] });
  // Chrome's getAll({ url }) omits the signed-in session that get() finds, so read each cookie by name.
  const readCookies = async () =>
    (await Promise.all(['PHPSESSID', 'cf_clearance'].map(name => chrome.cookies.get({ url: EXALAB_URL, name }))))
      .filter(Boolean).map(({ name, value, domain }) => ({ name, value, domain }));
  const hasSession = cookies => cookies.some(cookie => cookie.name === 'PHPSESSID');
  const connect = async (origin, pair, cookies, userAgent) => {
    const response = await fetch(`${origin}/.netlify/functions/exalab-proxy?action=connect`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit',
      body: JSON.stringify({ pair, session: { cookies, userAgent } }),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(50_000),
    });
    const result = await response.json().catch(() => null);
    return response.ok && result?.success === true && result.connected === true;
  };
  root.HhrExalabSession = Object.freeze({ EXALAB_URL, GRANT, readCookies, hasSession, connect });
})(typeof self !== 'undefined' ? self : globalThis);
