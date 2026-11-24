/** Markup for the official imaging request workspace. */
(() => {
  'use strict';
  const markup = (documents, encId) => `
        <div class="hhr-center-toolbar hhr-request-toolbar">
          <h2 class="hhr-center-heading">Imágenes</h2>
          <div class="hhr-rx-tabs hhr-flow-tabs" role="tablist" aria-label="Flujo de imágenes">
            <button class="hhr-rx-tab" type="button" role="tab" data-flow="request" aria-selected="true">Solicitar</button>
            <button class="hhr-rx-tab" type="button" role="tab" data-flow="reports" aria-selected="false">Informes</button>
          </div>
          ${globalThis.HhrLabRequestPatient.printActionsHtml('imaging')}
        </div>
        <div class="hhr-center-content">
          ${globalThis.HhrLabRequestPatient.sectionHtml(encId, true)}
          <div class="hhr-imaging-controls">
            <div class="hhr-rx-tabs hhr-imaging-tabs" role="tablist" aria-label="Documento">
              ${Object.values(documents).map((doc, index) => `
                <button class="hhr-rx-tab" type="button" role="tab" data-doc="${doc.id}"
                  aria-label="${doc.title}" aria-selected="${index === 0}">${doc.tabLabel || doc.title}</button>
              `).join('')}
            </div>
            <input class="hhr-center-search hhr-imaging-physician" type="text" maxlength="120"
              placeholder="Médico solicitante" aria-label="Médico solicitante">
            <div class="hhr-imaging-tools" role="group" aria-label="Herramientas de marcado">
              <button class="hhr-center-action hhr-imaging-tool is-active" type="button" data-tool="cross" aria-pressed="true">Cruz</button>
              <button class="hhr-center-action hhr-imaging-tool" type="button" data-tool="text" aria-pressed="false">Texto</button>
              <button class="hhr-center-action hhr-imaging-undo" type="button" aria-label="Deshacer"><span>Deshacer</span></button>
            </div>
          </div>
          <div class="hhr-imaging-stage">
            <div class="hhr-imaging-canvas" role="group" tabindex="0"
              aria-label="Formulario de imágenes" aria-describedby="hhr-imaging-keyboard-hint">
              <span id="hhr-imaging-keyboard-hint">Flechas para mover · Enter para marcar</span>
              <img class="hhr-imaging-image" alt="" draggable="false">
              <div class="hhr-imaging-overlays"></div>
            </div>
          </div>
          <div class="hhr-connection-feedback hhr-imaging-feedback" role="status" aria-live="polite"></div>
        </div>
      `;
  const reports = () => `
    <div class="hhr-labreq-patient-source hhr-census-anchor">
      <strong>Paciente</strong>
      ${globalThis.HhrLabRequestPatient.pickerButtonHtml()}
      ${globalThis.HhrLabRequestPatient.routeNoticeHtml}
    </div>
    <div class="hhr-imaging-reports">
      <a class="hhr-center-action hhr-center-action-primary" href="${globalThis.HhrFavoriteLinks.mmradUrl}"
        target="_blank" rel="noopener noreferrer">Abrir MMRAD <span aria-hidden="true">↗</span></a>
      <span class="hhr-rx-meta">Selecciona al paciente en el portal de radiología.</span>
    </div>`;
  globalThis.HhrImagingRequestView = Object.freeze({ markup, reports });
})();
