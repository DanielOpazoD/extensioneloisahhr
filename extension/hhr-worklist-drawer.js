/** Display-only utilities for the Eloísa sidebar. */
(() => {
  'use strict';
  const zone = 'Pacific/Easter';
  const clock = new Intl.DateTimeFormat('es-CL', {
    timeZone: zone, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const calendar = new Intl.DateTimeFormat('es', { timeZone: zone, day: 'numeric', month: 'long' });
  const weatherCondition = code => {
    if (code === 0) return ['clear', 'Despejado'];
    if (code < 3) return ['partly', 'Parcialmente nublado'];
    if (code === 3) return ['cloud', 'Nublado'];
    if (code < 50) return ['fog', 'Neblina'];
    if (code >= 95) return ['storm', 'Tormenta'];
    if ((code >= 71 && code <= 77) || code >= 85) return ['snow', 'Nieve'];
    return ['rain', 'Lluvia'];
  };
  const el = (tag, text, attributes = {}) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    if (text) node.textContent = text;
    return node;
  };

  function create({ fetchWeather, openFavorites } = {}) {
    const records = new Map();
    let timer;
    const tick = () => {
      const now = new Date();
      const dateInfo = clock.format(now);
      const parts = calendar.formatToParts(now);
      const part = type => parts.find(p => p.type === type)?.value;
      const article = part('day') + '_de_' + part('month');
      for (const { time, curiosity, weather } of records.values()) {
        if (time.textContent !== dateInfo) time.textContent = dateInfo;
        const url = 'https://es.wikipedia.org/wiki/' + encodeURIComponent(article) + '#Nacimientos';
        if (curiosity.href !== url) curiosity.href = url;
        void weather.refresh();
      }
    };
    const weatherCard = () => {
      const card = el('section', '', { 'data-hhr-drawer-weather': '', 'aria-label': 'Tiempo en Rapa Nui' });
      const panel = el('div', 'Consultando el tiempo…', { class: 'hhr-drawer-forecast' });
      const status = el('div', '', { class: 'hhr-weather-status', role: 'status' });
      card.append(panel, status);
      let pending = false;
      let nextRead = 0;
      let hasForecast = false;
      function unavailable() {
        nextRead = Date.now() + 60_000;
        if (hasForecast) status.textContent = 'Pronóstico sin actualizar';
        else panel.textContent = 'Pronóstico no disponible';
      }
      const refresh = async () => {
        if (pending || Date.now() < nextRead || document.hidden || !card.getClientRects().length) return;
        pending = true;
        try {
          const forecast = await fetchWeather?.();
          if (!card.isConnected) return;
          if (forecast?.bands?.length !== 3) { unavailable(); return; }
          nextRead = Math.max(Date.now() + 60_000, forecast.updatedAt + 15 * 60_000);
          const [kind, label] = weatherCondition(forecast.code);
          const sky = el('div', '', { class: 'hhr-weather-sky', 'data-weather': kind, 'aria-hidden': 'true' });
          if (!forecast.isDay) sky.setAttribute('data-night', '');
          sky.append(...['light', 'cloud', 'precip'].map(part => el('span', '', { class: 'hhr-sky-' + part })));
          const hero = el('div', '', { class: 'hhr-weather-hero' });
          const headline = el('div', '');
          headline.append(el('strong', 'Rapa Nui'), el('span', forecast.current + ' °C', { class: 'hhr-weather-temperature' }));
          hero.append(headline, sky);
          const conditions = el('p', label + ' · Viento ' + forecast.wind + ' km/h', { class: 'hhr-weather-conditions' });
          const slots = el('div', '', { class: 'hhr-drawer-forecast-slots' });
          forecast.bands.forEach(({ min, max, rain, gust }, index) => {
            const slot = el('div', '');
            slot.append(el('strong', index * 24 + '–' + (index + 1) * 24 + ' h'),
              el('span', min + '–' + max + ' °C'),
              el('span', 'Lluvia ' + rain + '%'),
              el('span', 'Ráf. ' + gust + ' km/h', { title: 'Ráfagas máximas' }));
            slots.append(slot);
          });
          panel.replaceChildren(hero, conditions, slots, el('a', 'Open-Meteo', {
            href: 'https://open-meteo.com/', target: '_blank', rel: 'noopener noreferrer',
          }));
          hasForecast = true;
          status.textContent = '';
        } catch (_error) {
          if (card.isConnected) unavailable();
        } finally {
          pending = false;
        }
      };
      return { card, refresh };
    };
    const markBrand = (drawer, record) => {
      if (record.logo?.isConnected) return;
      record.brand?.removeAttribute('data-hhr-drawer-brand');
      record.logo?.removeAttribute('data-hhr-drawer-logo');
      const images = [...drawer.querySelectorAll('img')].filter(img => !img.closest('li,[data-hhr-drawer-tools]'));
      const menu = drawer.querySelector('[data-hhr-menu-icon="worklist"],[data-hhr-menu-icon="care"]');
      const logo = images.find(img =>
        /rayen|elo[ií]sa|logo/i.test((img.getAttribute('alt') || '') + ' ' + (img.getAttribute('src') || '')));
      const headerLogo = logo || images.find(img => menu && (img.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING));
      const brand = headerLogo?.closest('a') || headerLogo?.parentElement;
      if (!brand || brand === drawer) return;
      record.logo = headerLogo;
      record.brand = brand;
      headerLogo.setAttribute('data-hhr-drawer-logo', '');
      brand.setAttribute('data-hhr-drawer-brand', '');
    };
    const decorate = drawer => {
      if (records.has(drawer)) {
        markBrand(drawer, records.get(drawer));
        return;
      }
      const native = [...drawer.querySelectorAll('p,span,div')].filter(node =>
        !node.children.length && /^(?:Versión:\s*\S+|\d{2}[-/]\d{2}[-/]\d{4},?\s+\d{2}:\d{2}(?::\d{2})?)$/.test(node.textContent.trim()));
      native.forEach(node => node.setAttribute('data-hhr-drawer-native-clock', ''));
      const footer = el('section', '', { 'data-hhr-drawer-tools': '', 'aria-label': 'Herramientas de Eloísa' });
      const shortcuts = el('div', '', { class: 'hhr-drawer-shortcuts' });
      const favorite = el('button', '☆ Favoritos', { type: 'button' });
      favorite.addEventListener('click', event => { if (event.isTrusted) openFavorites?.(drawer); });
      const curiosity = el('a', 'Un día como hoy', { target: '_blank', rel: 'noopener noreferrer', title: 'Nacimientos de hoy' });
      shortcuts.append(favorite, curiosity);
      const stamp = el('div', '', { class: 'hhr-drawer-clock' });
      const time = el('time', '', { title: 'Hora de Rapa Nui' });
      const weather = weatherCard();
      stamp.append(time);
      footer.append(weather.card, shortcuts, stamp);
      drawer.append(footer);
      const record = { time, curiosity, weather, footer, native };
      records.set(drawer, record);
      markBrand(drawer, record);
      tick();
      timer ??= setInterval(tick, 10_000);
    };
    const prune = () => {
      for (const drawer of records.keys()) if (!drawer.isConnected) records.delete(drawer);
      if (!records.size) { clearInterval(timer); timer = undefined; }
    };
    return { decorate, prune, dispose() {
      clearInterval(timer);
      for (const { footer, native, brand, logo } of records.values()) {
        footer.remove();
        brand?.removeAttribute('data-hhr-drawer-brand');
        logo?.removeAttribute('data-hhr-drawer-logo');
        native.forEach(node => node.removeAttribute('data-hhr-drawer-native-clock'));
      }
      records.clear();
    } };
  }
  globalThis.HhrWorklistDrawer = { create };
})();
