(() => {
  'use strict';
  if (globalThis.hhrClinicalChecklistDialogInstalled) return;
  globalThis.hhrClinicalChecklistDialogInstalled = true;
  document.querySelectorAll('[data-hhr-checklist="' + chrome.runtime.id + '"]').forEach(el => el.remove());

  const key = 'hhr-clinical-checklists-enabled';
  const route = () => globalThis.HhrPrescriptionPrint.resolveEncounterId(location.href);
  const evo = globalThis.HhrChecklistEvolution;
  const braden = globalThis.HhrChecklistBraden;
  let enabled = false,
    launcher,
    launcherEpisode,
    dialog,
    session,
    insertedReceipt,
    scheduled = false,
    persistedRevision = 0;

  const make = (tag, text) => {
    const el = document.createElement(tag);
    if (text) el.textContent = text;
    return el;
  };
  const button = (text, click, className = '') => {
    const el = make('button', text);
    el.type = 'button';
    if (className) el.className = className;
    el.addEventListener('click', click);
    return el;
  };
  const current = state => enabled && state === session && route() === state.episode;
  const nextFrame = () =>
    typeof requestAnimationFrame === 'function'
      ? new Promise(resolve => requestAnimationFrame(() => resolve()))
      : Promise.resolve();

  async function call(state, request) {
    const result = await chrome.runtime.sendMessage({
      type: 'RAYEN_CLINICAL_CHECKLIST',
      encId: state.episode,
      request,
      ...(state.catalog
        ? { actor: state.catalog.actor, document: state.catalog.document, hhrTabId: state.catalog.hhrTabId }
        : {}),
    });
    if (!current(state)) throw new Error('Cambió la ficha.');
    if (!result || result.error) throw new Error(result?.error || 'HHR no confirmó la operación.');
    return result;
  }

  function close() {
    if (!dialog) return;
    const old = dialog;
    dialog = null;
    old.close();
    old.remove();
  }

  function status(text) {
    const area = dialog?.querySelector('[role=status]');
    if (area) area.textContent = text;
  }

  async function verifyChart(state) {
    const header = await call(state, { action: state.localBraden ? 'braden' : 'verify' });
    if (
      !current(state) ||
      header.episode !== state.episode ||
      header.actor !== state.catalog.actor ||
      header.document !== state.catalog.document
    ) {
      throw new Error('Reabre la ficha del mismo paciente con la sesión que aplicó la pauta.');
    }
    return header;
  }

  async function transcribe(state, standaloneText) {
    const previousDialog = dialog;
    const active = () => current(state) && dialog === previousDialog && previousDialog?.isConnected;
    const verify = async () => {
      const identity = await verifyChart(state);
      if (standaloneText) validateBradenAge(state, identity);
    };
    await verify();
    if (!active()) return false;
    previousDialog.close();
    await nextFrame();
    let inserted = false;
    try {
      if (!evo.editor()) {
        if (!(await evo.openEditor(active))) return false;
        await verify();
      }
      if (active()) {
        inserted = standaloneText
          ? evo.insertStandalone(standaloneText, braden.EVOLUTION_HEADING)
          : evo.insert(state.record);
      }
    } finally {
      if (!inserted && active() && !previousDialog.open) previousDialog.showModal();
    }
    if (!inserted) return false;
    insertedReceipt = standaloneText
      ? { episode: state.episode, heading: braden.EVOLUTION_HEADING }
      : { episode: state.episode, code: state.record.code };
    session = null;
    close();
    refresh();
    return true;
  }

  async function copyEvolutionText(text) {
    if (!text) return false;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  }

  async function showReceipt(state, options = {}) {
    if (!dialog || !current(state)) return;
    dialog.classList.remove('is-matrix');
    const content = dialog.querySelector('form');
    content.replaceChildren();
    const code = make('p', state.record.code);
    code.className = 'hhr-checklist-code';
    const preview = make('pre', state.record.evolution);
    preview.className = 'hhr-checklist-preview';
    const actions = make('div');
    actions.className = 'hhr-checklist-actions';
    const insert = button(
      'Insertar en evolución',
      async () => {
        insert.disabled = true;
        try {
          if (!(await transcribe(state))) {
            status('Abre el editor de una evolución en Eloísa y pulsa «Insertar en evolución», o usa «Copiar texto».');
          }
        } catch (error) {
          status(error.message);
        } finally {
          insert.disabled = false;
        }
      },
      'is-primary'
    );
    const copy = button('Copiar texto', async () => {
      try {
        if (await copyEvolutionText(state.record.evolution)) {
          status('Texto copiado. Pégalo en la evolución de Eloísa y guarda allí.');
        } else {
          status('Selecciona el texto de arriba para copiarlo en la evolución.');
        }
      } catch {
        status('Selecciona el texto de arriba para copiarlo en la evolución.');
      }
    });
    actions.append(insert, copy);
    content.append(code, preview, actions);

    if (options.copyOnly) {
      try {
        const copied = await copyEvolutionText(state.record.evolution);
        status(
          copied
            ? 'Guardada en HHR y texto copiado.'
            : 'Guardada en HHR. Selecciona el texto de arriba para copiarlo o pulsa «Insertar en evolución».'
        );
      } catch {
        status('Guardada en HHR. Selecciona el texto de arriba para copiarlo o pulsa «Insertar en evolución».');
      }
      return;
    }

    status('Guardada en HHR. Insertando en la evolución de este episodio…');
    insert.disabled = true;
    try {
      if (!(await transcribe(state)) && dialog?.isConnected) {
        status('Guardada en HHR. Abre la evolución en Eloísa y pulsa «Insertar en evolución», o usa «Copiar texto».');
      }
    } catch (error) {
      status(error.message);
    } finally {
      insert.disabled = false;
    }
  }

  function createFieldInput(state, field, onChange) {
    const input = field.type === 'choice' ? make('select') : field.type === 'text' ? make('textarea') : make('input');
    if (field.type === 'choice') {
      input.add(new Option('Seleccionar…', ''));
      for (const option of field.options) input.add(new Option(option.label, option.label));
    } else if (field.type === 'text') {
      input.rows = 2;
      input.maxLength = 2000;
    } else {
      input.type = field.type === 'positive-integer' ? 'number' : field.type;
      if (input.type === 'number') {
        input.min = '1';
        input.max = '999999';
        input.step = '1';
      }
    }
    input.name = field.id;
    input.value = state.answers[field.id] || '';
    input.addEventListener('input', () => {
      state.answers[field.id] = input.value;
      onChange();
    });
    return input;
  }

  function fieldsFor(state, template, container) {
    container.replaceChildren();
    const validate = () => {
      for (const field of template.fields) {
        const input = container.querySelector('[name="' + CSS.escape(field.id) + '"]');
        if (input) {
          input.required = Boolean(
            field.required || (field.requiredWhen && state.answers[field.requiredWhen.field] === field.requiredWhen.equals)
          );
        }
      }
    };
    for (const field of template.fields) {
      const label = make('label', field.label);
      label.append(createFieldInput(state, field, validate));
      container.append(label);
    }
    validate();
  }

  function showVersionChanged(state, previous, form) {
    status('Cambió la plantilla en HHR. Revisa tu borrador antes de empezar con la versión nueva.');
    const oldTemplate = previous.templates.find(t => t.id === state.templateId);
    const summary = (oldTemplate?.fields || [])
      .filter(field => state.answers[field.id])
      .map(field => field.label + ': ' + state.answers[field.id])
      .join('\n');
    const draft = make('p', summary);
    draft.style.whiteSpace = 'pre-wrap';
    form.replaceChildren(
      draft,
      button('Empezar con la nueva versión', () => {
        session = null;
        close();
        void open();
      })
    );
  }

  function hasDraft(state) {
    return Object.entries(state.answers).some(([id, answer]) =>
      (answer || '') !== (state.initialAnswers?.[id] || '')
    );
  }

  const favoriteKey = actor => 'hhr-checklist-favorite:' + actor;
  const readFavorite = async actor => {
    const key = favoriteKey(actor);
    return (await chrome.storage.local.get(key))[key];
  };

  async function readMenu(episode) {
    const identity = await chrome.runtime.sendMessage({
      type: 'RAYEN_CLINICAL_CHECKLIST', encId: episode, request: { action: 'verify' },
    });
    if (identity?.episode !== episode || !identity.actor || route() !== episode) return {};
    const storedFavorite = await readFavorite(identity.actor);
    const favorite = braden?.isBundledBraden(storedFavorite?.id) ? null : storedFavorite;
    const own = session?.episode === episode && session.catalog?.actor === identity.actor &&
      session.catalog.document === identity.document;
    return { favorite, saved: own && session.record, draft: own && hasDraft(session) };
  }

  function availableTemplate(template) {
    if (!template?.title?.trim() || !template.fields?.length) return false;
    if (['vigilancia-cirugias', 'supervision-tacto'].includes(template.id)) return false;
    // This editable placeholder can return once the hospital replaces its test field.
    return !(template.id === 'p-9470a3d4-a989-4199-b822-eef1e78fe60b' &&
      template.fields.some(field => field.label === 'asdasdasd'));
  }

  async function syncCatalog(state, surface) {
    status('Sincronizando plantillas desde HHR…');
    const catalog = await call(state, { action: 'templates' });
    if (dialog !== surface) return false;
    catalog.templates = catalog.templates.filter(item => availableTemplate(item) && !braden?.isBundledBraden(item.id));
    const favorite = await readFavorite(catalog.actor);
    if (dialog !== surface || !current(state)) return false;
    state.favorite = catalog.templates.find(t => t.id === favorite?.id);
    const previous = state.catalog;
    if (previous && (previous.uid !== catalog.uid || previous.actor !== catalog.actor || previous.document !== catalog.document)) {
      session = null;
      insertedReceipt = null;
      close();
      refresh();
      await open(state.preferredMode);
      return false;
    }
    if (state.templateId && previous) {
      const revision = list => list.templates.find(t => t.id === state.templateId)?.version;
      if (revision(previous) !== revision(catalog)) {
        showVersionChanged(state, previous, dialog.querySelector('form'));
        return false;
      }
    }
    state.catalog = catalog;
    render(state);
    return true;
  }

  function missingRequiredDimension(template, answers) {
    if (!braden?.isBradenTemplate(template)) return null;
    for (const field of template.fields || []) {
      if (field.required && !String(answers[field.id] || '').trim()) return field.label;
    }
    return null;
  }

  function initialTemplateId(state) {
    const list = state.catalog.templates;
    if (state.templateId && list.some(t => t.id === state.templateId)) return state.templateId;
    if (state.preferredMode?.templateId && state.favorite?.id === state.preferredMode.templateId) return state.favorite.id;
    if (state.preferredMode === 'braden' && braden) {
      const suggested = braden.suggestBradenTemplate(list, state.catalog);
      if (suggested.templateId) return suggested.templateId;
    }
    return list[0].id;
  }

  async function submitApplication(state, group, form, { copyOnly }) {
    const template = state.catalog.templates.find(item => item.id === state.templateId);
    const missing = missingRequiredDimension(template, state.answers);
    if (missing) {
      status('Completa primero: ' + missing + '.');
      return;
    }
    if (!form.reportValidity()) return;
    state.busy = true;
    group.disabled = true;
    status('Guardando en HHR…');
    try {
      const { record } = await call(state, {
        action: 'apply',
        code: state.code,
        uid: state.catalog.uid,
        templateId: template.id,
        version: template.version,
        answers: state.answers,
      });
      if (record?.code !== state.code || record.patient?.episode !== state.episode || record.authorUid !== state.catalog.uid || !record.evolution) {
        throw new Error('No se pudo comprobar el recibo de HHR.');
      }
      state.record = record;
      await showReceipt(state, { copyOnly });
    } catch (error) {
      if (current(state)) status(error.message + '\nCódigo de esta aplicación: ' + state.code);
    } finally {
      state.busy = false;
      group.disabled = false;
    }
  }

  function validateBradenAge(state, identity) {
    const eligible = braden.eligibleTemplate(identity, state.answers.fecha);
    if (eligible.reason) throw new Error(eligible.reason);
    if (eligible.templateId !== state.templateId) {
      throw new Error('La fecha de valoración corresponde a otra escala. Revisa la fecha y vuelve a abrir Braden.');
    }
  }

  async function submitBraden(state, template, form, group, copyOnly) {
    if (state.busy || !current(state) || !form.reportValidity()) return;
    const missing = missingRequiredDimension(template, state.answers);
    if (missing) {
      status('Completa primero: ' + missing + '.');
      return;
    }
    const text = braden.buildDraftEvolutionText(template, state.answers);
    if (!text) {
      status('Revisa los puntajes de todas las dimensiones.');
      return;
    }
    state.busy = true;
    group.disabled = true;
    try {
      if (copyOnly) {
        validateBradenAge(state, await verifyChart(state));
        if (!group.isConnected) return;
        const copied = await copyEvolutionText(text);
        if (current(state)) status(copied
          ? 'Texto copiado. Pégalo en una evolución nueva y guarda en Eloísa.'
          : 'Selecciona el texto de la vista previa para copiarlo.');
      } else {
        status('Comprobando el episodio en Eloísa…');
        if (!(await transcribe(state, text)) && current(state)) {
          status('Abre una evolución nueva y vacía para insertar la pauta. También puedes copiar el texto.');
        }
      }
    } catch (error) {
      if (current(state)) status(error.message);
    } finally {
      state.busy = false;
      group.disabled = false;
    }
  }

  function renderBraden(state, form) {
    const eligible = braden.eligibleTemplate(state.catalog, state.answers.fecha);
    dialog.querySelector('.identity').textContent = [state.catalog.patientName, state.catalog.document, state.catalog.patientAge]
      .filter(Boolean).join(' · ');
    const template = globalThis.HhrBradenTemplates.find(item => item.id === (state.templateId || eligible.templateId));
    if (!template) {
      status(eligible.reason || 'No se pudo abrir la pauta Braden.');
      return;
    }
    state.templateId = template.id;
    const group = make('fieldset');
    group.className = 'fields';
    group.style.cssText = 'margin:0;padding:0;border:0;display:grid;gap:10px';
    const fields = make('div');
    const actions = make('div');
    actions.className = 'hhr-checklist-actions';
    const copy = () => submitBraden(state, template, form, group, true);
    const save = make('button', 'Insertar en evolución');
    save.type = 'submit';
    actions.append(save, button('Copiar texto', event => {
      if (event.isTrusted && navigator.userActivation.isActive) void copy();
    }, 'hhr-checklist-copy'));
    group.append(make('h3', template.title), fields, actions);
    form.replaceChildren(group);
    braden.renderMatrix({
      container: fields, template, bradenTemplates: [template], answers: state.answers,
      onAnswerChange: () => status(''), onCopyText: copy,
    });
    state.initialAnswers ??= { ...state.answers };
    form.onsubmit = event => {
      event.preventDefault();
      if (event.isTrusted && navigator.userActivation.isActive) void submitBraden(state, template, form, group, false);
    };
  }

  function render(state) {
    if (!dialog || !current(state)) return;
    if (state.record) {
      void showReceipt(state);
      return;
    }
    const form = dialog.querySelector('form');
    const label = make('label', 'Plantilla');
    const select = make('select');
    select.id = 'hhr-checklist-template';
    label.htmlFor = select.id;
    for (const item of state.catalog.templates) select.add(new Option(item.title, item.id));
    if (!select.options.length) {
      form.replaceChildren();
      status('HHR no tiene plantillas disponibles.');
      return;
    }
    select.value = initialTemplateId(state);

    const templateRow = make('div');
    templateRow.className = 'hhr-checklist-template-row';
    const versionBadge = make('span');
    versionBadge.className = 'hhr-checklist-version';
    const syncBtn = button('↻', async () => {
      if (state.busy || !current(state)) return;
      syncBtn.disabled = true;
      const surface = dialog;
      try {
        await syncCatalog(state, surface);
      } catch (error) {
        if (dialog === surface && current(state)) status(error.message);
      } finally {
        syncBtn.disabled = false;
      }
    }, 'hhr-checklist-sync');
    syncBtn.title = 'Actualizar plantillas';
    syncBtn.setAttribute('aria-label', syncBtn.title);
    const caption = make('div');
    caption.className = 'hhr-checklist-template-caption';
    caption.append(label, versionBadge);
    const pin = button('☆', async () => {
      if (!current(state) || state.busy) return;
      const template = state.catalog.templates.find(t => t.id === select.value);
      const next = state.favorite?.id === template.id ? null : { id: template.id, title: template.title };
      pin.disabled = true;
      try {
        await verifyChart(state);
        if (!current(state) || !pin.isConnected) return;
        const key = favoriteKey(state.catalog.actor);
        if (next) await chrome.storage.local.set({ [key]: next });
        else await chrome.storage.local.remove(key);
        state.favorite = next;
        updatePin();
      } catch (error) {
        if (current(state)) status(error.message);
      } finally {
        pin.disabled = false;
      }
    }, 'hhr-checklist-sync');
    const updatePin = () => {
      const pinned = select.value === state.favorite?.id;
      pin.textContent = pinned ? '★' : '☆';
      pin.title = pinned ? 'Quitar pauta favorita' : 'Fijar pauta favorita';
      pin.setAttribute('aria-label', pin.title);
      pin.setAttribute('aria-pressed', String(pinned));
    };
    templateRow.append(caption, select, pin, syncBtn);

    const fields = make('div');
    fields.className = 'fields';
    const actions = make('div');
    actions.className = 'hhr-checklist-actions';
    const save = make('button', 'Guardar');
    save.type = 'submit';
    save.title = 'Guarda en HHR e inserta el texto en Evolución';
    const saveAndCopy = button('Copiar texto', async event => {
      if (!event.isTrusted || !navigator.userActivation.isActive || state.busy || !current(state)) return;
      await submitApplication(state, group, form, { copyOnly: true });
    }, 'hhr-checklist-copy');
    saveAndCopy.title = 'Guarda en HHR y copia el texto';
    actions.append(save, saveAndCopy);

    const group = make('fieldset');
    group.style.cssText = 'margin:0;padding:0;border:0;display:grid;gap:10px';
    group.append(templateRow, fields, actions);
    form.replaceChildren(group);

    const bradenList = braden ? state.catalog.templates.filter(braden.isBradenTemplate) : [];
    const suggestion = braden ? braden.suggestBradenTemplate(state.catalog.templates, state.catalog) : { templateId: null, reason: '' };

    const handleInlineCopy = async text => {
      try {
        if (await copyEvolutionText(text)) {
          status('Borrador copiado. Pendiente de guardar en HHR.');
        } else {
          status('Selecciona el texto de la vista previa para copiarlo.');
        }
      } catch {
        status('Selecciona el texto de la vista previa para copiarlo.');
      }
    };

    const selectTemplate = () => {
      if (state.templateId !== select.value) {
        state.templateId = select.value;
        state.answers = {};
        state.initialAnswers = null;
      }
      updatePin();
      const chosen = state.catalog.templates.find(t => t.id === state.templateId);
      const isMatrix = Boolean(braden?.isBradenTemplate(chosen));
      dialog?.classList.toggle('is-matrix', isMatrix);
      versionBadge.textContent = chosen
        ? (chosen.ageRangeLabel ? chosen.ageRangeLabel + ' · ' : '') + 'v' + chosen.version
        : '';
      if (isMatrix) {
        braden.renderMatrix({
          container: fields,
          template: chosen,
          bradenTemplates: bradenList,
          suggestedId: suggestion.templateId,
          suggestedReason: suggestion.reason,
          answers: state.answers,
          authorName: state.catalog.authorName,
          onSwitchTemplate: nextId => {
            select.value = nextId;
            selectTemplate();
          },
          onAnswerChange: () => status(''),
          onCopyText: handleInlineCopy,
        });
      } else {
        fieldsFor(state, chosen, fields);
      }
      state.initialAnswers ??= { ...state.answers };
    };
    // Changing the template with answers asks first, inside this window and in its words: the browser's
    // own box spoke for the page and could not be styled. Until it is answered, the template stays.
    select.addEventListener('change', () => {
      if (!hasDraft(state)) { selectTemplate(); return; }
      const wanted = select.value;
      select.value = state.templateId;
      dialog?.querySelector('.hhr-checklist-confirm')?.remove();
      const ask = make('div');
      ask.className = 'hhr-checklist-confirm';
      ask.setAttribute('role', 'alertdialog');
      ask.setAttribute('aria-labelledby', 'hhr-checklist-confirm-question');
      const question = make('p', '¿Descartar las respuestas de esta plantilla?');
      question.id = 'hhr-checklist-confirm-question';
      const answer = discard => () => {
        ask.remove();
        if (!discard) { select.focus(); return; }
        select.value = wanted;
        selectTemplate();
      };
      const back = button('Volver', answer(false));
      ask.append(question, back, button('Descartar', answer(true), 'is-confirm'));
      select.closest('label,div')?.after(ask);
      back.focus();
    });
    selectTemplate();
    const ageLabel = state.catalog.patientAge ? ' · ' + state.catalog.patientAge : '';
    dialog.querySelector('.identity').textContent =
      state.catalog.patientName + ' · ' + state.catalog.document + ageLabel + ' · Registra en HHR: ' + state.catalog.authorName;
    status('');
    form.onsubmit = event => event.preventDefault();
    save.addEventListener('click', async event => {
      event.preventDefault();
      if (!event.isTrusted || !navigator.userActivation.isActive || state.busy || !current(state)) return;
      await submitApplication(state, group, form, { copyOnly: false });
    });
  }

  function showLoadFailure(form, message) {
    status(message);
    const actions = make('div');
    actions.className = 'hhr-checklist-actions';
    const link = make('a', 'Abrir HHR');
    link.href = 'https://hhr-hospitalizados.app/';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    actions.append(
      link,
      button('Reintentar', () => {
        const mode = session?.preferredMode;
        close();
        void open(mode);
      })
    );
    form.replaceChildren(actions);
  }

  async function open(preferredMode = null) {
    const episode = route();
    if (!enabled || !episode || dialog?.open) return;
    const nativeDialogs = evo.dialogs();
    if (nativeDialogs.some(evo.templateDialog)) return;
    const nativeEditor = nativeDialogs.find(evo.evolutionDialog);
    const localBraden = preferredMode === 'braden';
    if (!session || session.episode !== episode ||
      (!session.record && !hasDraft(session) && session.localBraden !== localBraden)) {
      session = { episode, code: 'PT-' + crypto.randomUUID().toUpperCase(), answers: {}, preferredMode, localBraden };
    } else if (!session.record && preferredMode) {
      session.preferredMode = preferredMode;
      if (!hasDraft(session)) session.templateId = null;
    }
    const state = session;
    dialog = make('dialog');
    dialog.className = 'hhr-checklist-dialog';
    dialog.classList.toggle('is-matrix', state.localBraden);
    dialog.dataset.hhrChecklist = chrome.runtime.id;
    dialog.setAttribute('aria-labelledby', 'hhr-checklist-heading');
    const header = make('header');
    const heading = make('h2', 'Aplicar pauta');
    heading.id = 'hhr-checklist-heading';
    header.append(heading, button('Cerrar', close));
    const who = make('p');
    who.className = 'identity';
    const feedback = make('p');
    feedback.setAttribute('role', 'status');
    const form = make('form');
    dialog.append(header, who, form, feedback);
    // Keep keyboard focus inside the native editor's modal boundary.
    (nativeEditor || document.body).append(dialog);
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') event.stopPropagation();
    });
    dialog.addEventListener('cancel', e => {
      e.preventDefault();
      close();
    });
    dialog.showModal();
    const surface = dialog;
    if (state.localBraden) {
      status('Comprobando la ficha en Eloísa…');
      try {
        const identity = await call(state, { action: 'braden' });
        if (identity.episode !== episode || !identity.actor || !identity.document) {
          throw new Error('Eloísa no pudo confirmar el paciente y el episodio.');
        }
        if (dialog !== surface || !current(state)) return;
        if (state.catalog && (identity.actor !== state.catalog.actor || identity.document !== state.catalog.document)) {
          session = null;
          insertedReceipt = null;
          close();
          refresh();
          await open('braden');
          return;
        }
        state.catalog = identity;
        status('');
        renderBraden(state, form);
      } catch (error) {
        if (dialog === surface && current(state)) status(error.message);
      }
      return;
    }
    if (state.record) {
      try {
        await verifyChart(state);
        if (dialog === surface) await showReceipt(state);
      } catch (error) {
        if (dialog === surface) status(error.message);
      }
      return;
    }
    try {
      await syncCatalog(state, surface);
    } catch (error) {
      if (dialog === surface && current(state)) showLoadFailure(form, error.message);
    }
  }

  function refresh() {
    const episode = route();
    if (launcher && launcherEpisode !== episode) {
      launcher.root.remove();
      launcher = null;
    }
    if (!enabled || (session && session.episode !== episode)) {
      session = null;
      close();
    }
    if (!enabled || insertedReceipt?.episode !== episode) insertedReceipt = null;
    if (dialog && !dialog.isConnected) close();
    if (dialog?.open) return;
    const nativeDialogs = evo.dialogs();
    // A portal such as Plantillas can temporarily hide Evolución with aria-hidden.
    if (enabled && episode && nativeDialogs.some(evo.templateDialog)) return;
    const nativeDialog = nativeDialogs.find(evo.evolutionDialog);
    const host = enabled && episode ? evo.resolveTriggerHost(nativeDialog) : null;
    if (!host) {
      if (enabled && episode && launcher?.root.isConnected && launcher.root.closest('[inert],[aria-hidden="true"]')) return;
      launcher?.root.remove();
      launcher = null;
      return;
    }
    if (!launcher) {
      launcherEpisode = episode;
      launcher = globalThis.HhrChecklistActions.create({
        button, hasBraden: Boolean(braden && globalThis.HhrBradenTemplates?.length), readMenu: () => readMenu(episode), open: mode => {
          if (route() === episode) return open(mode);
        },
      });
    }
    if (launcher.root.parentElement !== host) host.append(launcher.root);
    const activeEditor = insertedReceipt && evo.editor();
    const activeText = String(activeEditor?.value ?? activeEditor?.innerText ?? '');
    const inserted = Boolean(activeEditor && (insertedReceipt.heading
      ? activeText.split(/\r?\n/, 1)[0] === insertedReceipt.heading
      : activeText.includes(insertedReceipt.code)));
    launcher.update(inserted);
  }

  const observer = new MutationObserver(() => {
    if (!enabled || scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      refresh();
    });
  });

  function display(on) {
    enabled = on === true;
    observer.disconnect();
    if (enabled) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['open', 'hidden', 'aria-hidden', 'inert'],
      });
    }
    refresh();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && Object.hasOwn(changes, key)) {
      persistedRevision++;
      display(changes[key].newValue);
    }
  });
  const revision = persistedRevision;
  void chrome.storage.local
    .get(key)
    .then(data => {
      if (revision === persistedRevision) display(data[key]);
    })
    .catch(() => {});
  window.addEventListener('popstate', refresh);
})();
