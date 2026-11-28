// One choice for each age or yes/no question, and explicit absence for multiple-choice sections.
(() => {
  'use strict';
  const model = globalThis.HhrChecklistFalls;
  const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  };

  function render({ container, template, answers, identity, onAnswerChange }) {
    const now = globalThis.HhrClinicalAssessmentClock.hospitalDateTimeNow();
    answers.fecha ??= now.date;
    answers.hora ??= now.time;
    const adult = template.id === 'hhr-caidas-adulto';
    const dates = make('div', '', 'hhr-braden-meta');
    const sections = make('div', '', 'hhr-falls-sections');
    const summary = make('div', '', 'hhr-braden-summary');
    const result = make('div', '', 'hhr-braden-summary-head');
    const preview = make('details', '', 'hhr-falls-preview');
    const textPreview = make('pre', '', 'hhr-checklist-preview');
    result.setAttribute('aria-live', 'polite');
    summary.append(result, preview);
    preview.append(make('summary', 'Vista previa de la evolución'), textPreview);
    const age = make('p', '', 'hhr-falls-age');

    function refresh() {
      const eligible = model.eligibility(template, identity, answers.fecha);
      if (adult) {
        if (eligible.adultAge) answers.edad = eligible.adultAge;
        else delete answers.edad;
        const option = template.groups[0].options.find(item => item.value === answers.edad);
        age.textContent = option ? `${option.description} (${option.points} pts)` : 'Edad pendiente de confirmar.';
      }
      const score = model.evaluate(template, answers);
      preview.hidden = true;
      summary.className = 'hhr-braden-summary';
      if (eligible.reason || !score.risk) {
        result.replaceChildren(make('span', eligible.reason ||
          `${score.groups.length} de ${template.groups.length} secciones completas`, 'hhr-braden-pending'));
        return;
      }
      const riskStyle = score.risk === 'medio' ? 'moderado' : score.risk;
      summary.classList.add('is-' + riskStyle);
      result.replaceChildren(
        make('span', `Total: ${score.points} / ${score.maximum}`, 'hhr-braden-total'),
        make('span', 'Riesgo ' + score.riskLabel, 'hhr-braden-risk-pill is-' + riskStyle),
        make('span', 'Reevaluar: ' + score.cadence.label, 'hhr-braden-reassess')
      );
      textPreview.textContent = model.buildEvolutionText(template, answers);
      preview.hidden = !textPreview.textContent;
    }

    const changed = () => {
      onAnswerChange();
      refresh();
    };
    for (const [name, type, label] of [
      ['fecha', 'date', 'Fecha de valoración'], ['hora', 'time', 'Hora de valoración (Rapa Nui)'],
    ]) {
      const wrap = make('label', label);
      const input = make('input');
      Object.assign(input, { name, type, required: true, value: answers[name] });
      input.addEventListener('input', () => { answers[name] = input.value; changed(); });
      wrap.append(input);
      dates.append(wrap);
    }
    for (const section of template.groups) {
      const fieldset = make('fieldset', '', 'hhr-falls-group');
      fieldset.append(make('legend', section.label));
      if (adult && section.id === 'edad') {
        fieldset.classList.add('hhr-falls-adult-age');
        fieldset.append(age);
        sections.append(fieldset);
        continue;
      }
      const options = section.options.map(option => {
        const label = make('label', '', 'hhr-falls-option');
        const input = make('input');
        Object.assign(input, {
          type: section.multiple ? 'checkbox' : 'radio',
          name: section.id, value: option.value, required: !section.multiple,
          checked: section.multiple ? (answers[section.id] || []).includes(option.value) : answers[section.id] === option.value,
        });
        label.append(input, make('span', option.description), make('span', option.points + ' pts', 'hhr-falls-weight'));
        fieldset.append(label);
        return { input, option };
      });
      for (const { input, option } of options) {
        input.addEventListener('change', () => {
          if (section.multiple) {
            // A zero-point absence is exclusive; turning it off leaves an unanswered section.
            if (input.checked) {
              for (const other of options) {
                if (other.input !== input && (!option.points || !other.option.points)) other.input.checked = false;
              }
            }
            const selected = options.filter(item => item.input.checked).map(item => item.option.value);
            if (selected.length) answers[section.id] = selected;
            else delete answers[section.id];
          } else if (input.checked) answers[section.id] = option.value;
          changed();
        });
      }
      sections.append(fieldset);
    }

    const label = make('label', 'Observaciones y medidas preventivas aplicadas');
    const observations = make('textarea');
    Object.assign(observations, { name: 'observaciones', rows: 2, maxLength: 2000, value: answers.observaciones || '' });
    observations.addEventListener('input', () => { answers.observaciones = observations.value; changed(); });
    label.append(observations);
    container.classList.add('fields');
    container.replaceChildren(dates, sections, label, summary);
    refresh();
  }

  globalThis.HhrChecklistFallsView = Object.freeze({ render });
})();
