/** Presentation controls and access to Favorites inside Centro HHR. */
(() => {
  'use strict';
  const syncHandoffCheckbox = () => {
    const input = document.querySelector('#hhr-prescription-print-modal [data-setting="handoff"]');
    if (input) input.checked = globalThis.HhrNursingHandoffPreference.get();
  };
  new MutationObserver(syncHandoffCheckbox).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-hhr-handoff-enabled'],
  });
  // Chrome does not update an unpacked extension. Say which version runs and whether a later one is published.
  const guide = 'https://github.com/DanielOpazoD/extensioneloisahhr/blob/main/docs/instalacion/README.md#actualizar-una-instalaci%C3%B3n-existente';
  const showRelease = line => {
    let installed = '';
    try { installed = chrome.runtime.getManifest().version; } catch (_error) { return; }
    line.textContent = 'Versión instalada: ' + installed + '.';
    const type = globalThis.HhrRayenMessageContract?.types?.EXTENSION_RELEASE_STATUS;
    let request;
    // After the extension is reloaded the page keeps this script without a context to ask.
    try { request = type && chrome.runtime.sendMessage({ type }); } catch (_error) { return; }
    if (!request) return;
    Promise.resolve(request).then(status => {
      if (!line.isConnected || !status?.published) return;
      // The bar and this line compare version numbers. The icon menu also checks the package.
      if (status.ahead) { line.textContent = 'Versión instalada: ' + installed + ', posterior a la última publicada (' + status.published + ').'; return; }
      if (!status.available) { line.textContent = 'Versión instalada: ' + installed + ', la misma que la última publicada.'; return; }
      line.dataset.state = 'available';
      line.textContent = 'Tienes la versión ' + installed + ' y está publicada la ' + status.published + '. Descarga el ZIP y reemplaza la carpeta de la extensión. ';
      const link = Object.assign(document.createElement('a'), { href: guide, target: '_blank', rel: 'noopener noreferrer', textContent: 'Cómo actualizar' });
      line.append(link);
    }).catch(() => {});
  };

  const render = ({ root, operationsBar }) => {
    const preferences = globalThis.HhrCenterPreferences;
    const main = root.querySelector('.hhr-center-main');
    main.innerHTML = `<div class="hhr-center-toolbar hhr-settings-toolbar">
        <h2 class="hhr-center-heading">Ajustes</h2>
        <a class="hhr-center-action" href="https://github.com/DanielOpazoD/extensioneloisahhr/releases/latest/download/eloisa-hhr.zip" target="_blank" rel="noopener noreferrer">Descargar ZIP</a>
      </div>
      <div class="hhr-center-content"><p class="hhr-settings-release" role="status" data-release-status></p><div class="hhr-settings-list">
        <div class="hhr-setting-row"><label for="hhr-setting-mode">Presentación</label><select id="hhr-setting-mode" class="hhr-center-select" data-setting="mode">
          <option value="floating">Cuadro centrado</option><option value="docked">Panel lateral</option>
        </select></div>
        <div class="hhr-setting-row"><label for="hhr-setting-density">Densidad de Centro HHR</label><select id="hhr-setting-density" class="hhr-center-select" data-setting="density">
          <option value="normal">Normal</option><option value="compact">Compacta</option>
        </select></div>
        <div class="hhr-setting-row"><label for="hhr-setting-ficha-theme">Vista de la ficha clínica</label>
          <select id="hhr-setting-ficha-theme" class="hhr-center-select" disabled></select></div>
        <small role="status" data-ficha-theme-status></small>
        <label class="hhr-setting-row"><span>Contraer barra a HHR</span><input type="checkbox" data-setting="collapsed"></label>
        <label class="hhr-setting-row"><span>Entrega de turno en Gestión de cuidados</span><input type="checkbox" data-setting="handoff" disabled></label>
        <small role="status" data-handoff-status></small>
        <label class="hhr-setting-row"><span>Pautas clínicas en Evolución</span><input type="checkbox" data-checklist-enabled disabled></label>
        <small role="status" data-checklist-status></small>
      </div></div>`;
    main.querySelector('.hhr-settings-list').append(globalThis.HhrFavoriteLinks.create());
    showRelease(main.querySelector('[data-release-status]'));
    const theme = main.querySelector('#hhr-setting-ficha-theme');
    const themes = globalThis.HhrFichaThemes;
    for (const [id, title] of themes.choices()) theme.add(new Option(title, id));
    theme.value = root.dataset.fichaTheme || 'off';
    theme.disabled = !root.dataset.fichaTheme;
    theme.addEventListener('change', async () => {
      const message = main.querySelector('[data-ficha-theme-status]');
      theme.disabled = true;
      message.textContent = '';
      try { await themes.save(theme.value); }
      catch { theme.value = root.dataset.fichaTheme; message.textContent = 'No se pudo guardar la vista.'; }
      finally { theme.disabled = false; }
    });
    const checklist = main.querySelector('[data-checklist-enabled]');
    const checklistStatus = main.querySelector('[data-checklist-status]');
    const checklistKey = 'hhr-clinical-checklists-enabled';
    chrome.storage.local.get(checklistKey).then(stored => {
      checklist.checked = stored[checklistKey] === true;
      checklist.disabled = false;
    }).catch(() => { checklistStatus.textContent = 'No se pudo leer el ajuste de pautas.'; });
    checklist.addEventListener('change', async () => {
      checklist.disabled = true;
      try { await chrome.storage.local.set({ [checklistKey]: checklist.checked }); checklistStatus.textContent = ''; }
      catch { checklist.checked = !checklist.checked; checklistStatus.textContent = 'No se pudo guardar el ajuste de pautas.'; }
      finally { checklist.disabled = false; }
    });
    const handoff = globalThis.HhrNursingHandoffPreference;
    const checkbox = main.querySelector('[data-setting="handoff"]');
    const status = main.querySelector('[data-handoff-status]');
    const refreshHandoff = () => { checkbox.checked = handoff.get(); };
    handoff.load().then(() => { refreshHandoff(); checkbox.disabled = false; })
      .catch(() => { status.textContent = 'No se pudo leer el ajuste.'; checkbox.disabled = false; });
    const update = () => {
      if (!main.querySelector('[data-setting]') || !main.isConnected) return;
      const state = preferences.get();
      ['mode', 'density'].forEach(key => { main.querySelector('[data-setting="' + key + '"]').value = state[key]; });
      main.querySelector('[data-setting="collapsed"]').checked = operationsBar?.classList.contains('is-collapsed') || false;
    };
    main.querySelectorAll('[data-setting]').forEach(input => input.addEventListener('change', () => {
      if (input.dataset.setting === 'collapsed') operationsBar?.__hhrUi?.setCollapsed(input.checked);
      else if (input === checkbox) {
        checkbox.disabled = true;
        status.textContent = '';
        handoff.set(checkbox.checked).catch(() => {
          refreshHandoff();
          status.textContent = 'No se pudo guardar el ajuste.';
        }).finally(() => { checkbox.disabled = false; });
      } else preferences.save({ [input.dataset.setting]: input.value });
    }));
    update(); preferences.load().then(update);
  };
  globalThis.HhrCenterSettings = Object.freeze({ render });
})();
