/** Presentation adapter for Eloísa's client-side, ten-row worklist renderers. */
(() => {
  'use strict';

  // These two Next route modules use the same JSX runtime. Bind only their
  // local import, leaving React, application stores and the API data untouched.
  const jsxModule = 95155;
  const routes = [
    { id: 25587, path: '/dashboard/encounter-list', lists: [
      ['encounterApiTag', 'encounters-unassiged-list', 'encounterList'],
    ] },
    { id: 61188, path: '/dashboard/encounter-list-nurse', lists: [
      ['tagName', 'noveltyEncounterListData', 'noveltyEncounterList'],
      ['tagName', 'nurse-encounters-uneventful-list', 'uneventfulEncounterList'],
    ] },
  ];

  // Each native renderer filters this private view, then takes a ten-row
  // slice and maps it into native rows. Keep filtering, order and row objects.
  // Array.filter preserves the subclass on its result via Symbol.species.
  class WorklistRows extends Array {
    slice(start, end) {
      if (Number.isSafeInteger(start) && start >= 0 && start % 10 === 0 && end === start + 10) {
        return Array.from(this);
      }
      return super.slice(...arguments);
    }
  }

  const withWorklistRows = (jsx, route) => (type, props, ...rest) => {
    if (typeof type === 'function' && props && location.pathname.replace(/\/$/, '') === route.path) {
      for (const [tag, value, key] of route.lists) {
        if (props[tag] === value && Array.isArray(props[key]) && props[key].length) {
          props = { ...props, [key]: WorklistRows.from(props[key]) };
          break;
        }
      }
    }
    return jsx(type, props, ...rest);
  };

  function bindRoute(factory, route) {
    return function(module, exports, require) {
      const localRequire = new Proxy(require, {
        apply(target, receiver, args) {
          const result = Reflect.apply(target, receiver, args);
          if (args[0] !== jsxModule || typeof result?.jsx !== 'function') return result;
          return { ...result, jsx: withWorklistRows(result.jsx, route) };
        },
      });
      return factory.call(this, module, exports, localRequire);
    };
  }

  // The initial script can load on the login screen or directly on a list.
  // Install before Next executes either route, including later SPA navigation.
  const chunks = self.webpackChunk_N_E ||= [];
  chunks.push([['hhr-continuous-worklists-v1'], {}, require => {
    const modules = require.m;
    if (!modules || !Object.isExtensible(modules)) return;
    for (const route of routes) {
      const wrap = factory => typeof factory === 'function' ? bindRoute(factory, route) : factory;
      if (Object.hasOwn(modules, route.id)) {
        modules[route.id] = wrap(modules[route.id]);
      } else {
        // Once this lazy module arrives, restore a regular registry entry.
        Object.defineProperty(modules, route.id, {
          configurable: true,
          set(factory) {
            Object.defineProperty(modules, route.id, {
              configurable: true, enumerable: true, writable: true, value: wrap(factory),
            });
          },
        });
      }
    }
  }]);
})();
