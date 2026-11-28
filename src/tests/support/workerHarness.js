// Runs the real service worker (background.js and every file it imports) in a Node context, with a `chrome`
// whose members do nothing unless told: a test can then send the worker the messages a page would send and
// read what it answers, instead of reading its source. Nothing reaches a network or a real browser.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const extension = path.resolve('extension');
const read = name => readFileSync(path.join(extension, name), 'utf8');

/**
 * Loads the worker. `answers` maps a chrome call (`'chrome.tabs.query'`) to what it resolves to; any other
 * call resolves to undefined and any event only records its listener.
 */
export function loadWorker({ answers = {} } = {}) {
  const listeners = [];
  const defaults = { 'chrome.tabs.query': [], 'chrome.storage.local.get': {}, 'chrome.storage.session.get': {} };
  const known = { ...defaults, ...answers };
  const manifest = { version: '0.0.0', content_scripts: [] };
  const member = route => new Proxy(function () {}, {
    get: (_target, key) => {
      if (key === 'then') return undefined;
      if (key === 'addListener') return listener => { listeners.push([route, listener]); };
      return member(route + '.' + String(key));
    },
    apply: () => route === 'chrome.runtime.getManifest' ? manifest : Promise.resolve(known[route]),
  });
  const context = vm.createContext({
    console, URL, URLSearchParams, TextEncoder, TextDecoder, crypto: globalThis.crypto, structuredClone, atob, btoa,
    setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask, performance, Blob, Response, Request, Headers,
    AbortController, AbortSignal, fetch: async () => { throw new Error('Sin red en la prueba.'); },
  });
  context.self = context;
  context.globalThis = context;
  context.chrome = member('chrome');
  context.importScripts = (...names) => {
    for (const name of names) vm.runInContext(read(name), context, { filename: name });
  };
  vm.runInContext(read('background.js'), context, { filename: 'background.js' });

  /** What the worker answers a runtime message, or 'sin respuesta' when no listener takes it. */
  const send = (message, sender = {}) => new Promise(resolve => {
    let taken = false;
    for (const [route, listener] of listeners) {
      if (route !== 'chrome.runtime.onMessage') continue;
      if (listener(message, sender, resolve) === true) taken = true;
    }
    if (!taken) resolve('sin respuesta');
  });
  return { context, listeners, send, types: context.HhrRayenMessageContract.types };
}

/** A sender that is the top frame of a ficha of Eloísa, with its tab. */
export const fichaSender = (encId = '141336', tabId = 7) => {
  const url = `https://fichamedico.rayensalud.cl/dashboard/encounter-list/${encId}`;
  return { id: 'extension', frameId: 0, url, tab: { id: tabId, url } };
};
