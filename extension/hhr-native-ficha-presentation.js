/** Native navigation and read-only evolution layout. Uses Eloísa's existing sections. */
(() => {
  'use strict';
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const SECTIONS = {
    alertas: 'alertEntrySection', diagnostico: 'diagnosisEntrySection',
    'solicitud de examen': 'diagnosisTestEntrySection',
    'indicaciones (indicacion libre)': 'freeIndicationEntrySection',
    'indicaciones (medicamento)': 'medicationEntrySection',
    'indicaciones (regimen)': 'nutritionOrderEntrySection',
    evolucion: 'observationEntrySection', 'examen fisico': 'physicalExaminationEntry',
    procedimientos: 'procedureEntrySection', 'ordenes de atencion': 'procedureOrderEntrySection',
    'dispositivos invasivos': 'invasiveDeviceEntry', 'solicitud de interconsulta': 'referralRequestEntrySection',
    'solicitud interconsulta': 'referralRequestEntrySection', 'indicaciones (reposo)': 'restEntrySection',
    'solicitudes de intervencion quirurgica': 'operationTheaterRequestEntrySection',
    'signos vitales': 'vitalSignsEntry',
  };
  const css = `
    [data-hhr-ficha-primary] { padding:2px 12px !important; min-height:40px !important; box-sizing:border-box; background:#fff; border-bottom:1px solid #dce5e2; }
    [data-hhr-ficha-primary] [role="tab"] { min-height:34px !important; min-width:0 !important; padding:4px 12px !important; border:0; border-radius:7px; font-size:13px; color:var(--hhr-ficha-ink-soft); }
    [data-hhr-ficha-primary] [role="tab"][aria-selected="true"] { color:var(--hhr-ficha-focus); background:#e5f3ef; font-weight:600; }
    [data-hhr-ficha-primary] [role="tab"]:focus-visible,[data-hhr-ficha-link]:focus-visible { outline:2px solid #0b6e66; outline-offset:-2px; }
    [data-hhr-ficha-section-slot] { min-height:var(--hhr-section-height,48px); }
    [data-hhr-ficha-sections] { position:fixed !important; top:var(--hhr-section-top) !important; left:var(--hhr-section-left) !important; width:var(--hhr-section-width) !important; max-width:100vw; box-sizing:border-box; margin:0 !important; padding:7px 0 !important; display:flex; flex-wrap:nowrap !important; gap:6px; overflow-x:auto; background:#f6f8f7; border-bottom:1px solid #dce5e2; z-index:25; scrollbar-width:thin; }
    [data-hhr-ficha-sections] > .MuiGrid-item { flex-shrink:0; }
    [data-hhr-ficha-link] { display:inline-block; padding:5px 10px; border:1px solid transparent; border-radius:16px; cursor:pointer; font-size:12px !important; line-height:20px !important; text-decoration:none !important; color:var(--hhr-ficha-ink-soft) !important; white-space:nowrap; }
    [data-hhr-ficha-link]:hover { color:var(--hhr-ficha-focus) !important; background:#e5f3ef; }
    [data-hhr-ficha-link][aria-current="location"] { color:var(--hhr-ficha-focus) !important; border-color:#b6d9cd; background:#e5f3ef; font-weight:600; }
    [data-hhr-evolution-block] { width:100% !important; max-width:100% !important; min-width:0; box-sizing:border-box; }
    [data-hhr-evolution-block] > .MuiBox-root { max-width:100%; overflow-wrap:anywhere; }
    [data-hhr-evolution-row] { flex-wrap:wrap !important; }
    [data-hhr-evolution-text] { flex:1 1 100% !important; width:100% !important; max-width:100% !important; min-width:0; overflow-wrap:anywhere; }
    @media screen {
      [data-hhr-ficha-sections] { padding-block:3px !important; gap:3px; }
      [data-hhr-ficha-link] { padding:3px 8px; }
      .hhr-ficha-empty-toggle { flex:none; align-self:center; min-height:26px; padding:2px 9px; border:1px solid #cdded8;
        border-radius:6px; background:white; color:var(--hhr-ficha-action); font:inherit; font-size:12px; cursor:pointer; }
      .hhr-ficha-empty-toggle:focus-visible { outline:2px solid #0b6e66; }
      [data-hhr-ficha-folded],.MuiGrid-item:has(> [data-hhr-ficha-folded]:only-child) { display:none !important; }
      .MuiAppBar-root:has(> [data-hhr-ficha-primary]:only-child) { height:auto !important; min-height:40px !important; }
      [data-hhr-ficha-summary-grid] { display:flex !important; flex-flow:row wrap !important; container-type:inline-size;
        align-items:start; gap:var(--hhr-ficha-gap,8px) !important; width:100%; margin:0 !important; box-sizing:border-box; }
      [data-hhr-ficha-summary-grid] > * { flex:1 1 100% !important; min-width:0; max-width:100% !important; box-sizing:border-box; }
      [data-hhr-ficha-summary-grid] > .MuiGrid-item { padding:0 !important; }
      @container (min-width:44rem) {
        [data-hhr-ficha-summary-grid] > :is([data-hhr-ficha-summary-card],.MuiGrid-item):where(:not([data-hhr-ficha-summary-card="wide"],:has(> [data-hhr-ficha-summary-card="wide"]))) {
          flex-basis:calc((100% - var(--hhr-ficha-gap,8px)) / 2) !important;
        }
      }
      @container (min-width:65rem) {
        [data-hhr-ficha-summary-grid] > :is([data-hhr-ficha-summary-card="brief"],.MuiGrid-item:has(> [data-hhr-ficha-summary-card="brief"])) {
          flex-basis:calc((100% - 2 * var(--hhr-ficha-gap,8px)) / 3) !important;
        }
      }
      [data-hhr-ficha-summary-card="brief"]:not(:has(> .MuiCard-root)),
      [data-hhr-ficha-summary-card="brief"] > .MuiCard-root:only-child {
        display:flex; flex-wrap:wrap; align-items:baseline; column-gap:.65em; row-gap:2px; padding:6px 10px !important; }
      [data-hhr-ficha-summary-card] > .MuiCard-root:only-child :is(h2,h3,h4).MuiCardHeader-title { margin:0; }
      [data-hhr-ficha-summary-card="regular"] > p { margin-block:3px; }
      [data-hhr-ficha-summary-card]:has(> .MuiCard-root:only-child) { padding:0 !important; }
      [data-hhr-ficha-summary-card="brief"] :is(h2,h3,h4,.MuiCardHeader-root,.MuiCardContent-root) { margin-block:0 !important; }
      [data-hhr-ficha-summary-card="brief"] > :is(p,div:not(.MuiCard-root)),[data-hhr-ficha-summary-card="brief"] > .MuiCard-root > .MuiCardContent-root {
        min-width:0; overflow-wrap:anywhere; }
      [data-hhr-ficha-summary-card] > .MuiCard-root:has(> .MuiCardHeader-root):is(:has(> .MuiCardActions-root > button:only-child:is([aria-label*="imprimir" i],[title*="imprimir" i])),:has(> .MuiCardActions-root > button:only-child [data-testid^="Print"])) {
        display:grid; grid-template-columns:minmax(0,1fr) auto;
        > .MuiCardHeader-root { grid-column:1; grid-row:1; }
        > .MuiCardActions-root { grid-column:2; grid-row:1; align-self:center; }
        > .MuiCardContent-root { grid-column:1 / -1; }
      }
      [data-hhr-visible-medications]::after { content:" (" attr(data-hhr-visible-medications) ")"; font-weight:normal; }
      [data-hhr-ficha-summary-card] > .MuiCard-root > .MuiCardHeader-root { align-items:center; }
      [data-hhr-ficha-summary-card] > .MuiCard-root > .MuiCardHeader-root > .MuiCardHeader-action { margin:0; align-self:center; }
      [data-hhr-ficha-summary-card] .MuiCardContent-root > .MuiStack-root > .MuiCard-root:has(~ .MuiCard-root),
      [data-hhr-ficha-summary-card] .MuiCardContent-root > .MuiStack-root > .MuiCard-root ~ .MuiCard-root {
        box-shadow:none; border-radius:0; }
      [data-hhr-ficha-summary-card] .MuiCardContent-root > .MuiStack-root > .MuiCard-root ~ .MuiCard-root {
        border-block-start:1px solid #dce5e2; }
      [data-hhr-ficha-summary-card] {
        min-inline-size:0; min-block-size:0 !important; align-self:start;
      }
      [data-hhr-ficha-summary-card] > :is(h2,h3,h4) { margin-block:0 5px; }
      [data-hhr-ficha-summary-card] > :is(.MuiCard-root,.MuiPaper-root) {
        min-block-size:0 !important; height:auto !important;
      }
      [data-hhr-ficha-summary-card] :is(.MuiCardHeader-root,.MuiCardContent-root,.MuiCardActions-root):not(:is([role=dialog],dialog) *) {
        padding-block:6px !important; padding-inline:clamp(8px,1vw,14px) !important;
      }

      /* Tighten the native reading surfaces, including the whitespace inside each record. */
      :is(#diagnosisEntrySection,#vitalSignsEntry,#restEntrySection,#nutritionOrderEntrySection)[data-hhr-ficha-summary-card] {
        padding:3px 8px !important; height:auto !important;
        :is(.MuiCardHeader-root,.MuiCardContent-root,.MuiCardActions-root):not(:is(dialog,[role=dialog]) *) {
          padding:2px 4px !important; margin-block:0 !important; min-height:0 !important;
        }
        :is(h2,h3,h4,h5,h6,p,ul):not(:is(dialog,[role=dialog]) *) { margin-block:1px !important; }
        .MuiStack-root:not(:is(dialog,[role=dialog]) *) { row-gap:3px !important; }
      }
      :is(#medicationEntrySection,#freeIndicationEntrySection,#diagnosisEntrySection,#vitalSignsEntry,#restEntrySection,#nutritionOrderEntrySection)[data-hhr-ficha-summary-card] {
        :is(th,td,.MuiListItem-root):not(:is(dialog,[role=dialog]) *) {
          height:auto !important; padding:var(--hhr-ficha-cell-y,3px) 7px !important; line-height:1.3 !important;
        }
        tr:not(:is(dialog,[role=dialog]) *) { height:auto !important; }
        :is(th,td,.MuiListItem-root) :is(p,.MuiListItemText-root):not(:is(dialog,[role=dialog]) *) {
          margin-block:0 !important; line-height:1.3 !important;
        }
      }
      :is(#medicationEntrySection,#freeIndicationEntrySection)[data-hhr-ficha-summary-card] {
        .MuiIconButton-root:not(:is(dialog,[role=dialog]) *) {
          inline-size:24px !important; block-size:24px !important; padding:4px !important;
          svg { inline-size:15px !important; block-size:15px !important; }
        }
        :is(.MuiCardContent-root,.MuiCardActions-root):not(:is(dialog,[role=dialog]) *) { padding-block:3px !important; }
      }
      [data-hhr-ficha-reading-pair] {
        display:flex !important; flex-flow:row wrap !important; align-items:start !important;
        gap:8px !important; container-type:inline-size;
      }
      [data-hhr-ficha-reading-pair] > * {
        flex:1 1 100% !important; min-width:0 !important; max-width:100% !important; box-sizing:border-box;
      }
      @container (min-width:44rem) {
        [data-hhr-ficha-reading-pair] > :first-child,
        [data-hhr-ficha-summary-grid] > #alertEntrySection:has(+ #observationEntrySection) {
          flex:0 0 clamp(11rem,24%,20rem) !important;
        }
        [data-hhr-ficha-reading-pair] > :last-child,
        [data-hhr-ficha-summary-grid] > #alertEntrySection + #observationEntrySection { flex:1 1 55% !important; }
      }
      [data-hhr-ficha-reading-pair]:has(> :first-child[data-hhr-brief-alert]) > *,
      [data-hhr-ficha-reading-pair]:has(> :first-child [data-hhr-brief-alert]) > *,
      [data-hhr-ficha-summary-grid] > #alertEntrySection[data-hhr-brief-alert]:has(+ #observationEntrySection),
      [data-hhr-ficha-summary-grid] > #alertEntrySection[data-hhr-brief-alert] + #observationEntrySection {
        flex:1 1 100% !important;
      }
      #alertEntrySection[data-hhr-brief-alert]:not(:has(> .MuiCard-root)),
      #alertEntrySection[data-hhr-brief-alert] > .MuiCard-root:only-child {
        display:flex; flex-wrap:wrap; align-items:center; gap:2px 10px;
        :is(.MuiCardHeader-root,.MuiCardContent-root) { margin:0 !important; padding-block:2px !important; }
      }
      [data-hhr-reading="orders"] table:has([data-hhr-reading="narrow"]) {
        table-layout:auto !important; width:100%;
        [data-hhr-reading="narrow"] { width:1% !important; }
        th[data-hhr-reading="narrow"] { white-space:nowrap; }
      }
      :is([data-hhr-reading="diagnosis"],[data-hhr-reading="orders"],[data-hhr-reading="vitals"]) {
        min-height:0 !important; height:auto !important; padding-block:3px !important;
        :is(h2,h3,h4,h5,h6,.MuiCardHeader-title):not(:is(dialog,[role=dialog]) *) { margin-block:1px !important; }
        :is(.MuiCardContent-root,.MuiCardHeader-root,.MuiCardActions-root):not(:is(dialog,[role=dialog]) *) {
          min-height:0 !important; margin-block:0 !important; padding-block:3px !important;
        }
        :is(th,td):not(:is(dialog,[role=dialog]) *) { padding:var(--hhr-ficha-cell-y,3px) 7px !important; height:auto !important; line-height:1.28 !important; }
        tr:not(:is(dialog,[role=dialog]) *) { height:auto !important; }
        :is(th,td) :is(p,.MuiTypography-root):not(:is(dialog,[role=dialog]) *) { margin-block:0 !important; }
        td :is(.MuiButton-root,.MuiIconButton-root):not(:is(dialog,[role=dialog]) *) {
          padding:2px 4px !important; min-height:24px !important; line-height:1.2 !important; }
      }
      [data-hhr-reading="diagnosis"] .MuiCardHeader-root:not(:has(button,input,.MuiCardHeader-avatar,.MuiCardHeader-action)) {
        display:flex; flex-flow:row wrap; align-items:baseline; gap:2px 10px;
        > .MuiCardHeader-content { display:flex; flex-wrap:wrap; align-items:baseline; gap:inherit; }
      }
      [data-hhr-reading="orders"] td[data-hhr-reading="narrow"]:has(.MuiIconButton-root) {
        white-space:nowrap;
        .MuiIconButton-root { min-inline-size:24px; }
      }
      @media(max-width:48rem) {
        [data-hhr-reading="orders"]:has(table thead th:nth-child(5)) {
          min-inline-size:0; max-inline-size:100%; overflow-x:auto;
          table { min-inline-size:44rem; }
        }
      }
      [data-hhr-reading^="time-symbol"] { zoom:.68; }
      [data-hhr-reading="vital-grid"] {
        display:grid !important; grid-template-columns:repeat(auto-fit,minmax(min(100%,7.5rem),1fr)) !important;
        gap:3px !important; margin:0 !important; width:100% !important; align-items:stretch;
      }
      :is([data-hhr-reading="vital-tile"],[data-hhr-reading="vital-inner"]) {
        box-sizing:border-box; width:auto !important; max-width:none !important; min-width:0 !important;
        height:auto !important; min-height:0 !important; margin:0 !important; padding:3px 6px !important;
        border-radius:4px !important; gap:1px !important;
        :is(p,h4,h5,h6,.MuiTypography-root) { margin-block:0 !important; line-height:1.23 !important; }
      }
      [data-hhr-reading="vital-tile"]:has(> [data-hhr-reading="vital-inner"]) { padding:0 !important; }
      :is([data-hhr-reading="vital-tile"],[data-hhr-reading="vital-inner"]):has(> [data-hhr-reading="vital-label"]) {
        display:grid !important; grid-template-columns:minmax(0,1fr) auto; align-content:start; align-items:baseline;
        gap:2px 4px !important; padding:var(--hhr-ficha-tile-y,4px) 5px !important;
        > * { min-width:0; max-width:100%; grid-column:1 / -1; }
        > [data-hhr-reading="vital-label"] { grid-column:1; }
        > [data-hhr-reading="vital-value"] { grid-column:2; }
        > [data-hhr-reading="vital-pam"]:has(+ [data-hhr-reading="vital-time"]) { grid-column:1; }
        > [data-hhr-reading="vital-pam"] + [data-hhr-reading="vital-time"] { grid-column:2; }
      }
      [data-hhr-reading="vital-grid"] :is([data-hhr-reading="vital-label"],[data-hhr-reading="vital-pam"],[data-hhr-reading="vital-time"],[data-hhr-reading="vital-value"]) {
        margin:0 !important; padding:0 !important; line-height:1.15 !important;
        font-variant-numeric:tabular-nums; overflow-wrap:anywhere;
      }
      [data-hhr-reading="vital-grid"] [data-hhr-reading="vital-label"] { font-size:.75rem !important; }
      [data-hhr-reading="vital-grid"] [data-hhr-reading="vital-value"] { font-size:var(--hhr-ficha-value,.9375rem) !important; font-weight:600; }
      [data-hhr-reading="vital-grid"] :is([data-hhr-reading="vital-pam"],[data-hhr-reading="vital-time"]) { font-size:.6875rem !important; }
      [data-hhr-reading="vital-pam"] :is(b,strong) { font-size:inherit !important; }
      @media(max-width:30rem) {
        :is([data-hhr-reading="vital-tile"],[data-hhr-reading="vital-inner"]):has(> [data-hhr-reading="vital-label"]):not(:has(> [data-hhr-reading="vital-pam"])) {
          display:flex !important; flex-flow:row wrap !important;
          > * { flex:1 1 100%; }
          > [data-hhr-reading="vital-label"] { flex:1 1 auto; }
          > [data-hhr-reading="vital-value"] { flex:0 1 auto; }
        }
        [data-hhr-reading="vital-grid"] {
          grid-template-columns:repeat(auto-fit,minmax(min(100%,6.25rem),1fr)) !important;
        }
      }
      [data-hhr-vital-detail-folded] { display:none !important; }
      .hhr-ficha-vitals,.hhr-ficha-vitals dl { display:flex; flex-wrap:wrap; align-items:center; gap:5px 14px; }
      .hhr-ficha-vitals dl { margin:2px 0; flex:1 1 auto; }
      .hhr-ficha-vitals dt,.hhr-ficha-vitals small { color:var(--hhr-ficha-ink-soft); line-height:1.15; }
      .hhr-ficha-vitals dt { font-size:.75rem; }
      .hhr-ficha-vitals dd { margin:0; font-size:.9375rem; line-height:1.15; font-weight:600; font-variant-numeric:tabular-nums; }
      .hhr-ficha-vitals small { display:block; font-size:.6875rem; font-weight:normal; }
      .hhr-ficha-vitals button { min-height:26px; font:inherit; color:var(--hhr-ficha-focus); background:transparent;
        border:1px solid #cdded8; border-radius:6px; cursor:pointer; }
      #observationEntrySection .MuiCard-root:has(> .MuiCardHeader-root .MuiCardHeader-subheader) {
        > .MuiCardHeader-root:not(:has(button,a,input)) {
          display:flex; flex-wrap:wrap; align-items:baseline; gap:2px 8px; margin:0 !important;
          .MuiCardHeader-content { display:contents; }
          .MuiCardHeader-action { order:-1; margin:0; }
        }
        > .MuiCardContent-root { padding-block-start:0 !important; }
        &:has(+ .MuiCard-root > .MuiCardHeader-root .MuiCardHeader-subheader),
        & + .MuiCard-root:has(> .MuiCardHeader-root .MuiCardHeader-subheader) {
          margin-block:0 !important; border-radius:0; box-shadow:none;
        }
        & + .MuiCard-root:has(> .MuiCardHeader-root .MuiCardHeader-subheader) { border-top:1px solid #dce5e2; }
      }
      #evolution [data-hhr-evolution-block] + [data-hhr-evolution-block],
      #evolution .MuiStack-root:has(> [data-hhr-evolution-block]) + .MuiStack-root:has(> [data-hhr-evolution-block]) {
        border-top:1px solid #dce5e2; padding-block-start:4px; }
      #evolution [data-hhr-evolution-block] > .MuiTypography-caption { display:inline; margin-inline-end:6px; }
    }
    @media print { .hhr-ficha-vitals,.hhr-ficha-empty-toggle { display:none; } }
    @media(max-width:600px) { [data-hhr-ficha-primary] { padding:2px 4px !important; } [data-hhr-ficha-primary] [role="tab"] { padding:4px 9px !important; font-size:12px; } }
  `;
  const create = () => {
    const surfaces = globalThis.HhrFichaReadingSurfaces.create();
    const summaryDensity = globalThis.HhrFichaSummaryDensity.create(Object.values(SECTIONS));
    const labels = globalThis.HhrFichaReadingLabels.create();
    const round = globalThis.HhrFichaRoundLayout.create();
    const carePlan = globalThis.HhrFichaCarePlan.create();
    const marked = new Map();
    const links = new Map();
    let primary = null, row = null, slot = null, style = null;
    let lastTarget = null, frame = 0, disposed = false;
    // The native date and print row, while it rides on the free end of the section links.
    let dailyRow = null, docked = false;
    const desktop = globalThis.matchMedia?.('(min-width:1100px)');
    let noteEncounter = null, noteDisclosure = null, keepNoteFolded = false;
    const noteReader = globalThis.HhrFichaNoteReader.create();
    const rememberNoteToggle = event => { keepNoteFolded = normalize(event.currentTarget.textContent) === 'leer menos'; };
    const setNoteDisclosure = (next, encounter) => {
      if (next === noteDisclosure && encounter === noteEncounter) return;
      noteDisclosure?.removeEventListener('click', rememberNoteToggle, true);
      if (encounter !== noteEncounter) keepNoteFolded = false;
      noteEncounter = encounter;
      noteDisclosure = next;
      if (!next) return;
      next.addEventListener('click', rememberNoteToggle, true);
      // Rayen owns the full text. Its native disclosure also works without aria-expanded.
      if (!keepNoteFolded && normalize(next.textContent) === 'leer mas') next.click();
    };
    const mark = (element, attribute, value = '') => {
      if (!element) return;
      element.setAttribute(attribute, value);
      if (!marked.has(element)) marked.set(element, new Set());
      marked.get(element).add(attribute);
    };
    const unmark = element => {
      marked.get(element)?.forEach(attribute => element.removeAttribute(attribute));
      marked.delete(element);
    };
    const removeLink = (element, item) => {
      element.removeEventListener('click', item.click);
      element.removeEventListener('keydown', item.keydown);
      ['role', 'tabindex', 'aria-current'].forEach(attribute => {
        const value = item.attributes[attribute];
        if (value === null) element.removeAttribute(attribute); else element.setAttribute(attribute, value);
      });
      unmark(element); links.delete(element);
    };
    const reset = () => {
      noteReader.refresh(null, null);
      style?.remove(); style = null;
      surfaces.clear();
      labels.clear();
      round.clear();
      carePlan.clear();
      summaryDensity.clear();
      resizeObserver?.disconnect();
      links.forEach((item, element) => removeLink(element, item));
      [...marked.keys()].forEach(unmark);
      undock();
      dailyRow = null;
      if (row) ['top', 'left', 'width'].forEach(key => row.style.removeProperty('--hhr-section-' + key));
      slot?.style.removeProperty('--hhr-section-height');
      primary = null; row = null; slot = null; lastTarget = null;
    };
    const dockProperties = ['--hhr-dock-top', '--hhr-dock-right', '--hhr-dock-height'];
    function undock() {
      if (!docked) return;
      docked = false;
      dailyRow?.removeAttribute('data-hhr-ficha-dock');
      for (const name of dockProperties) dailyRow?.style.removeProperty(name);
      row?.removeAttribute('data-hhr-ficha-docked');
      row?.style.removeProperty('--hhr-dock-width');
    }
    // Only the recognized daily row: a byline and the form «Resumen diario paciente» with its date
    // field and «Imprimir». Eloísa adds a calendar button inside the field and a second print icon.
    function findDailyRow() {
      const round = slot?.nextElementSibling;
      const item = round?.matches('[data-hhr-round="frame"]') ? round.firstElementChild : null;
      if (!item?.matches('.MuiGrid-item[data-hhr-round="before"]') || !item.querySelector(':scope > [data-hhr-update-label]')) return null;
      const controls = [...item.querySelectorAll('input,select,textarea,button,a[href],[role="button"],[contenteditable]')];
      const fields = controls.filter(el => el.matches('input')), buttons = controls.filter(el => el.matches('button'));
      const field = fields[0];
      const named = normalize([field?.getAttribute('aria-label'), ...Array.from(field?.labels || [], label => label.textContent)].join(' '));
      if (fields.length !== 1 || !field.form || !field.matches('input[type="date"],input[type="text"],input:not([type])') ||
          controls.length !== 1 + buttons.length || buttons.length < 1 || buttons.length > 3 || !/resumen diario/.test(named) ||
          !buttons.some(button => button.form === field.form && normalize(button.textContent) === 'imprimir') ||
          item.querySelector('table,img,.MuiCard-root,[aria-live],[role="alert"],[role="status"]')) return null;
      return item;
    }
    // The links never scroll under the docked row: it docks only while everything fits on the line.
    function positionDailyRow() {
      const fits = () => {
        if (!dailyRow?.isConnected || !row?.isConnected || !desktop?.matches) return null;
        const items = [...row.children].filter(el => el.getClientRects().length);
        const parts = [...dailyRow.children].filter(el => el.getClientRects().length);
        if (!items.length || !parts.length) return null;
        const linksEnd = items.at(-1).getBoundingClientRect().right;
        const width = parts.reduce((sum, el) => sum + el.getBoundingClientRect().width, 0) + 8 * (parts.length - 1);
        const rail = row.getBoundingClientRect();
        // The floating Centro HHR bar hangs over the end of this line. Stop short of it at every
        // scroll position: the choice uses horizontal measures only, so scrolling never moves the round.
        const bar = document.getElementById('hhr-clinical-operations-bar');
        const cover = bar?.getClientRects().length ? bar.getBoundingClientRect() : null;
        const limit = cover && cover.left < rail.right && cover.right > rail.left ? Math.min(rail.right, cover.left - 10) : rail.right;
        return items[0].getBoundingClientRect().left >= rail.left - 1 && linksEnd + 28 + width <= limit ? {rail, width, limit} : null;
      };
      const room = fits();
      if (!room) {
        // Give the row its line back before the next paint.
        if (docked) { undock(); round.repack(); }
        return;
      }
      const values = [room.rail.top + 'px', Math.max(0, document.documentElement.clientWidth - room.limit) + 'px', room.rail.height + 'px'];
      dockProperties.forEach((name, index) => {
        if (dailyRow.style.getPropertyValue(name) !== values[index]) dailyRow.style.setProperty(name, values[index]);
      });
      const reserved = Math.ceil(room.rail.right - room.limit + room.width + 12) + 'px';
      if (row.style.getPropertyValue('--hhr-dock-width') !== reserved) row.style.setProperty('--hhr-dock-width', reserved);
      if (docked) return;
      docked = true;
      dailyRow.setAttribute('data-hhr-ficha-dock', '');
      row.setAttribute('data-hhr-ficha-docked', '');
      // The round no longer has a leading line of its own.
      round.repack();
    }
    const positionRow = () => {
      const bounds = slot.getBoundingClientRect();
      const header = primary.closest('.MuiAppBar-root') || primary;
      const top = Math.max(0, header.getBoundingClientRect().bottom);
      row.style.setProperty('--hhr-section-top', top + 'px');
      row.style.setProperty('--hhr-section-left', Math.max(0, bounds.left) + 'px');
      row.style.setProperty('--hhr-section-width', Math.max(0, Math.min(bounds.width, innerWidth - Math.max(0, bounds.left))) + 'px');
      slot.style.setProperty('--hhr-section-height', row.getBoundingClientRect().height + 4 + 'px');
    };
    const update = () => {
      frame = 0;
      if (!row?.isConnected || !primary?.isConnected) return;
      positionRow();
      positionDailyRow();
      const boundary = row.getBoundingClientRect().bottom + 14;
      const targets = [...links.entries()].flatMap(([element, item]) => {
        const target = document.getElementById(item.id);
        return target?.getClientRects().length ? [{ element, target, rect: target.getBoundingClientRect() }] : [];
      });
      // With shorter cards the final section may be visible before it can reach the top rail.
      const scroll = lastTarget?.scroller;
      const atEnd = scroll && scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop <= 2;
      const visibleBottom = scroll && scroll !== document.scrollingElement ? Math.min(innerHeight, scroll.getBoundingClientRect().bottom) : innerHeight;
      const active = targets.find(item => item.target === lastTarget?.target && item.rect.bottom > boundary &&
        (item.rect.top <= boundary + 2 || (atEnd && item.rect.top < visibleBottom))) ||
        targets.filter(item => item.rect.top <= boundary && item.rect.bottom > boundary).sort((a, b) => b.rect.top - a.rect.top)[0] ||
        targets.filter(item => item.rect.bottom > boundary).sort((a, b) => a.rect.top - b.rect.top)[0];
      links.forEach((_item, element) => {
        if (element === active?.element) element.setAttribute('aria-current', 'location');
        else element.removeAttribute('aria-current');
      });
    };
    const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(update); };
    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    const jump = id => {
      const target = document.getElementById(id);
      summaryDensity.reveal(target);
      if (!target?.getClientRects().length || !row?.isConnected || !primary?.isConnected) return;
      // A route or viewport change may have moved the header before the pending frame.
      positionRow();
      let scroller = window;
      for (let parent = target.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight) { scroller = parent; break; }
      }
      lastTarget = { target, scroller:scroller === window ? document.scrollingElement : scroller };
      scroller.scrollBy({ top: target.getBoundingClientRect().top - row.getBoundingClientRect().bottom - 12, behavior: 'instant' });
      schedule();
    };
    const enhanceEvolution = () => {
      const next = new Set();
      const add = (element, attribute) => { mark(element, attribute); next.add(element); };
      const summary = document.getElementById('evolution');
      if (summary?.getClientRects().length && summary.querySelector('.MuiCardHeader-title')?.textContent.trim() === 'Evolución') {
        summary.querySelectorAll('.MuiCardContent-root > .MuiStack-root > .MuiStack-root > .MuiBox-root').forEach(block => {
          if (block.querySelector(':scope > .MuiTypography-caption') && block.querySelector(':scope > .MuiBox-root') &&
              !block.querySelector('input,textarea,[contenteditable="true"],[role="textbox"]')) add(block, 'data-hhr-evolution-block');
        });
      }
      document.querySelectorAll('.MuiCard-root > .MuiCardContent-root').forEach(body => {
        if (!body.parentElement.getClientRects().length || body.closest('#hhr-prescription-print-modal') ||
            !Array.from(body.children).some(child => child.matches('p.MuiTypography-root') && normalize(child.textContent) === 'evolucion')) return;
        body.querySelectorAll(':scope > .MuiStack-root > .MuiStack-root').forEach(stack => {
          const text = stack.firstElementChild;
          if (text?.matches('p.MuiTypography-root') && !stack.querySelector('input,textarea,[contenteditable="true"],[role="textbox"]')) {
            add(stack, 'data-hhr-evolution-row'); add(text, 'data-hhr-evolution-text');
          }
        });
      });
      [...marked.entries()].filter(([element, attrs]) => [...attrs].some(attr => attr.startsWith('data-hhr-evolution-')) && !next.has(element)).forEach(([element]) => unmark(element));
    };
    const refresh = (encounterId, theme = 'compact') => {
      if (disposed) return;
      if (!encounterId || theme === 'off') {
        setNoteDisclosure(null, encounterId);
        delete document.documentElement.dataset.hhrFichaTheme;
        reset(); return;
      }
      document.documentElement.dataset.hhrFichaTheme = theme;
      const tab = Array.from(document.querySelectorAll('[role="tab"][aria-selected="true"]')).find(element =>
        (element.id?.startsWith('encounter-event-tab-') || (normalize(element.textContent) === 'resumen' && element.closest('.MuiTabs-root'))) && element.getClientRects().length);
      if (!tab) { setNoteDisclosure(null, encounterId); reset(); return; }
      const nextPrimary = tab.closest('.MuiTabs-root');
      if (primary && primary !== nextPrimary) reset();
      primary = nextPrimary;
      resizeObserver?.disconnect();
      if (primary) resizeObserver?.observe(primary);
      if (!style) { style = document.createElement('style'); style.textContent = css; document.head.append(style); }
      if (primary) mark(primary, 'data-hhr-ficha-primary');
      enhanceEvolution();
      const isSummary = tab.id === 'encounter-event-tab-summary' || normalize(tab.textContent) === 'resumen';
      const main = isSummary ? document.querySelector('main') : null;
      surfaces.refresh(main, theme === 'compact');
      const compact = theme === 'compact' ? main : null;
      labels.refresh(compact, encounterId);
      const disclosure = compact?.querySelector('#evolution [data-hhr-evolution-block] > .MuiBox-root > button[data-hhr-note-disclosure]:only-child');
      const readableDisclosure = disclosure?.getClientRects().length &&
        !disclosure.closest('form,dialog,[role=dialog],[inert],[hidden],[aria-hidden=true]') &&
        !disclosure.matches(':disabled,[aria-disabled=true]') ? disclosure : null;
      setNoteDisclosure(readableDisclosure, encounterId);
      const paragraph = readableDisclosure?.parentElement.previousElementSibling;
      noteReader.refresh(paragraph?.matches('.MuiTypography-caption') ? paragraph : null, encounterId);
      round.refresh(compact);
      carePlan.refresh(theme === 'compact' && tab.id === 'encounter-event-tab-care-plan' ? document.querySelector('main') : null);
      const caption = main && [...main.querySelectorAll('.MuiGrid-container .MuiTypography-caption')].find(element =>
        ['evolucion','valoracion'].includes(normalize(element.textContent)) && element.getClientRects().length);
      const nextRow = caption?.closest('.MuiGrid-container');
      if (row && row !== nextRow) {
        undock(); dailyRow = null;
        links.forEach((item, element) => removeLink(element, item));
        unmark(row); unmark(slot);
        ['top', 'left', 'width'].forEach(key => row.style.removeProperty('--hhr-section-' + key));
        slot?.style.removeProperty('--hhr-section-height'); lastTarget = null;
      }
      row = nextRow || null; slot = row?.parentElement || null;
      if (!row || !slot) { summaryDensity.refresh(encounterId, null, isSummary); return; }
      resizeObserver?.observe(slot);
      mark(row, 'data-hhr-ficha-sections'); mark(slot, 'data-hhr-ficha-section-slot');
      const nextDaily = compact ? findDailyRow() : null;
      if (nextDaily !== dailyRow) { undock(); dailyRow = nextDaily; }
      // Collapsing or expanding the floating bar changes the room on this line.
      const floating = dailyRow && document.getElementById('hhr-clinical-operations-bar');
      if (floating) resizeObserver?.observe(floating);
      [...links.entries()].filter(([element]) => !row.contains(element)).forEach(([element, item]) => removeLink(element, item));
      row.querySelectorAll('.MuiTypography-caption').forEach(element => {
        const id = SECTIONS[normalize(element.textContent)];
        const previous = links.get(element);
        if (previous && (previous.id !== id || !document.getElementById(id))) removeLink(element, previous);
        if (!id || links.has(element) || !document.getElementById(id)) return;
        const item = { id, attributes: Object.fromEntries(['role', 'tabindex', 'aria-current'].map(name => [name, element.getAttribute(name)])) };
        item.click = event => { event.preventDefault(); event.stopPropagation(); jump(item.id); };
        item.keydown = event => { if (event.key === 'Enter' || event.key === ' ') item.click(event); };
        mark(element, 'data-hhr-ficha-link', id); element.setAttribute('role', 'link'); element.tabIndex = 0;
        element.addEventListener('click', item.click); element.addEventListener('keydown', item.keydown); links.set(element, item);
      });
      summaryDensity.refresh(encounterId, row);
      schedule();
    };
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    return Object.freeze({ refresh, dispose: () => {
      setNoteDisclosure(null, null);
      disposed = true; cancelAnimationFrame(frame); reset();
      delete document.documentElement.dataset.hhrFichaTheme;
      window.removeEventListener('scroll', schedule, true); window.removeEventListener('resize', schedule);
    } });
  };
  globalThis.HhrNativeFichaPresentation = Object.freeze({ create });
})();
