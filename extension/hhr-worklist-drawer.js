/** Display-only utilities for the Eloísa sidebar. */
(() => {
  'use strict';
  const zone = 'Pacific/Easter';
  const clock = new Intl.DateTimeFormat('es-CL', {
    timeZone: zone, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const calendar = new Intl.DateTimeFormat('es', { timeZone: zone, day: 'numeric', month: 'long' });
  const weatherLabel = code => {
    if (code === 0) return 'Despejado';
    if (code < 3) return 'Parcialmente nublado';
    if (code === 3) return 'Nublado';
    if (code < 50) return 'Neblina';
    if (code >= 95) return 'Tormenta';
    if ((code >= 71 && code <= 77) || code >= 85) return 'Nieve';
    return 'Lluvia';
  };
  const el = (tag, text, attributes = {}) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    if (text) node.textContent = text;
    return node;
  };

  function create({ fetchWeather, openFavorites, extensionVersion } = {}) {
    const records = new Map();
    let timer;
    const tick = () => {
      const now = new Date();
      const dateInfo = clock.format(now);
      const parts = calendar.formatToParts(now);
      const part = type => parts.find(p => p.type === type)?.value;
      const article = part('day') + '_de_' + part('month');
      for (const { time, curiosity } of records.values()) {
        if (time.textContent !== dateInfo) time.textContent = dateInfo;
        const url = 'https://es.wikipedia.org/wiki/' + encodeURIComponent(article) + '#Nacimientos';
        if (curiosity.href !== url) curiosity.href = url;
      }
    };
    const weatherCard = () => {
      const details = el('details', '', { 'data-hhr-drawer-weather': '' });
      const summary = el('summary', 'Tiempo · Rapa Nui');
      const panel = el('div', '', { class: 'hhr-drawer-forecast', 'aria-live': 'polite' });
      details.append(summary, panel);
      let rendering;
      let expires = 0;
      details.addEventListener('toggle', async () => {
        if (!details.open || rendering || Date.now() < expires) return;
        rendering = true;
        panel.textContent = 'Consultando…';
        try {
          const forecast = await fetchWeather?.();
          if (forecast?.bands?.length !== 3) { panel.textContent = 'Pronóstico no disponible.'; return; }
          expires = forecast.updatedAt + 15 * 60_000;
          summary.textContent = 'Rapa Nui · ' + forecast.current + ' °C';
          const conditions = el('strong', weatherLabel(forecast.code) + ' · ' + forecast.wind + ' km/h');
          const slots = el('div', '', { class: 'hhr-drawer-forecast-slots' });
          forecast.bands.forEach(({ min, max, rain, gust }, index) => {
            const slot = el('div', '');
            slot.append(el('strong', index * 24 + '–' + (index + 1) * 24 + ' h'),
              el('span', min + '–' + max + ' °C'),
              el('span', 'Lluvia ' + rain + '%'),
              el('span', 'Ráf. ' + gust + ' km/h', { title: 'Ráfagas máximas' }));
            slots.append(slot);
          });
          panel.replaceChildren(conditions, slots, el('a', 'Open-Meteo', {
            href: 'https://open-meteo.com/', target: '_blank', rel: 'noopener noreferrer',
          }));
        } catch (_error) {
          panel.textContent = 'Pronóstico no disponible.';
        } finally {
          rendering = false;
        }
      });
      return details;
    };
    const decorate = drawer => {
      if (records.has(drawer)) return;
      const native = [...drawer.querySelectorAll('p,span,div')].filter(node =>
        !node.children.length && /^(?:Versión:\s*\S+|\d{2}[-/]\d{2}[-/]\d{4},?\s+\d{2}:\d{2}(?::\d{2})?)$/.test(node.textContent.trim()));
      const version = native.find(node => node.textContent.trim().startsWith('Versión:'))?.textContent.trim();
      native.forEach(node => node.setAttribute('data-hhr-drawer-native-clock', ''));
      const footer = el('section', '', { 'data-hhr-drawer-tools': '', 'aria-label': 'Herramientas de Eloísa' });
      const shortcuts = el('div', '', { class: 'hhr-drawer-shortcuts' });
      const favorite = el('button', '☆ Favoritos', { type: 'button' });
      favorite.addEventListener('click', event => { if (event.isTrusted) openFavorites?.(); });
      const curiosity = el('a', 'Un día como hoy', { target: '_blank', rel: 'noopener noreferrer', title: 'Nacimientos de hoy' });
      shortcuts.append(favorite, curiosity);
      const stamp = el('div', '', { class: 'hhr-drawer-clock' });
      const time = el('time', '', { title: 'Hora de Rapa Nui' });
      const info = el('details', '', { class: 'hhr-drawer-info' });
      info.append(el('summary', 'ⓘ', { 'aria-label': 'Información de versiones' }),
        el('span', [version?.replace('Versión:', 'Eloísa'), extensionVersion && 'Puente HHR ' + extensionVersion].filter(Boolean).join(' · ')));
      stamp.append(time, info);
      footer.append(weatherCard(), shortcuts, stamp);
      drawer.append(footer);
      records.set(drawer, { time, curiosity, footer, native });
      tick();
      timer ??= setInterval(tick, 10_000);
    };
    const prune = () => {
      for (const drawer of records.keys()) if (!drawer.isConnected) records.delete(drawer);
      if (!records.size) { clearInterval(timer); timer = undefined; }
    };
    return { decorate, prune, dispose() {
      clearInterval(timer);
      for (const { footer, native } of records.values()) {
        footer.remove();
        native.forEach(node => node.removeAttribute('data-hhr-drawer-native-clock'));
      }
      records.clear();
    } };
  }
  globalThis.HhrWorklistDrawer = { create };
})();
