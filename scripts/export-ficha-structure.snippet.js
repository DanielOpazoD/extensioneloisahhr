// Exporta la ESTRUCTURA de la pestaña visible de la ficha, sin datos clínicos ni nombres.
//
// Uso: abrir la pestaña de Eloísa que se quiere describir (por ejemplo Plan de tratamiento),
// F12 → Consola, pegar este archivo completo y pulsar Enter. La estructura queda en el
// portapapeles. Revisarla antes de compartirla: los textos se ven como «xxxx» y los números
// como «0000».
//
// Qué conserva: etiquetas, clases de componentes, roles, estados (seleccionado, deshabilitado)
// y las palabras de interfaz de una lista cerrada («Fármacos», «Agregar», «Acciones»…).
// Qué enmascara: cualquier otra palabra (letras → x) y todos los dígitos (→ 0), en textos y en
// atributos. Nunca lee el valor de un campo de formulario.
globalThis.exportFichaStructure = function exportFichaStructure(root = document.body) {
  const plain = word => word.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  // Palabras de interfaz. Ninguna es un nombre propio habitual.
  const vocabulary = new Set(('a al con de del el en la las los no o para por que se sin su un una y este esta ' +
    'resumen antecedentes plan tratamiento historial alta ficha paciente pacientes episodio hospitalizados ' +
    'alertas alerta diagnostico diagnosticos evolucion evoluciones signos vitales farmacos farmaco medicamento medicamentos ' +
    'indicaciones indicacion libre libres especificas especifica regimen reposo ordenes orden atencion solicitud solicitudes ' +
    'examen examenes interconsulta interconsultas intervencion quirurgica quirurgicas procedimientos procedimiento dispositivos ' +
    'invasivos producto productos farmacologico farmacologicos instrumentos evaluacion fisico prestaciones observaciones observacion ' +
    'entrega turno gestion visitas reanimacion fecha estimada hora horario tiempo estado motivo asignado profesional posologia dosis ' +
    'via frecuencia duracion cantidad unidad inicio termino acciones accion detalle tipo nombre descripcion comentario comentarios ' +
    'agregar anadir nuevo nueva editar modificar eliminar borrar guardar cancelar cerrar aceptar confirmar validar firmar imprimir ' +
    'buscar filtrar filtros limpiar ver leer mas menos mostrar ocultar suspendidos suspender suspendido reanudar historial completo ' +
    'ultima actualizacion hoy ayer registrado registrada registrados registradas presenta presentan permiso visualizar tiene ' +
    'medico medica enfermera enfermero kinesiologo kinesiologa paramedico nutricionista matron matrona tens tecnico enfermeria ' +
    'terapeuta ocupacional fonoaudiologo psicologo quimico farmaceutico cirujano tratante especialista ' +
    'solicitada realizada pendiente pendientes asignar vigente vigentes activo activa activos activas todos todas ninguno ninguna ' +
    'si seleccione seleccionar opcion opciones requerido obligatorio pagina filas siguiente anterior total sos antimic antimicrobiano ' +
    'pa fc fr hgt presion frecuencia cardiaca respiratoria saturacion temperatura axilar hemoglucotest oxigeno').split(' '));
  const mask = text => text.replace(/[\p{L}\p{N}]+/gu, word =>
    /^\p{L}+$/u.test(word) && vocabulary.has(plain(word)) ? word : word.replace(/\p{N}/gu, '0').replace(/\p{L}/gu, 'x'));
  const structural = new Set(['role', 'type', 'aria-selected', 'aria-expanded', 'aria-checked', 'aria-disabled', 'aria-haspopup',
    'aria-current', 'aria-pressed', 'disabled', 'hidden', 'colspan', 'rowspan', 'multiple', 'readonly', 'tabindex']);
  // An identifier is written by a developer: it keeps its letters and loses its digits.
  const identifiers = new Set(['id', 'data-testid', 'for', 'aria-labelledby', 'aria-controls']);
  const described = new Set(['aria-label', 'title', 'placeholder', 'alt']);
  const skipped = 'script,style,link,noscript,iframe,template,#hhr-clinical-operations-bar,#hhr-clinical-page-notices,#hhr-prescription-print-modal';
  const signature = el => el.tagName + '.' + [...el.classList].filter(name => name.startsWith('Mui')).join('.');
  const lines = [];
  const open = el => {
    const parts = [el.tagName.toLowerCase()];
    const classes = [...el.classList].filter(name => /^[A-Za-z][A-Za-z-]*$/.test(name) && !name.startsWith('css-'));
    if (classes.length) parts.push('class="' + classes.join(' ') + '"');
    for (const {name, value} of el.attributes) {
      if (structural.has(name)) parts.push(value === '' ? name : name + '="' + value.replace(/[^a-z0-9-]/gi, '') + '"');
      else if (identifiers.has(name)) parts.push(name + '="' + value.replace(/\p{N}/gu, '0').slice(0, 80) + '"');
      else if (described.has(name) || name.startsWith('data-hhr-')) parts.push(name + '="' + mask(value).slice(0, 80) + '"');
    }
    if (el.matches('input[type=checkbox],input[type=radio]') && el.checked) parts.push('checked');
    const style = getComputedStyle(el);
    if (/^(?:flex|inline-flex|grid|inline-grid|none|contents)$/.test(style.display)) parts.push('x-display="' + style.display + '"');
    if (/^(?:fixed|sticky)$/.test(style.position)) parts.push('x-position="' + style.position + '"');
    return '<' + parts.join(' ') + '>';
  };
  const walk = (node, depth) => {
    const indent = '  '.repeat(Math.min(depth, 30));
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.replace(/\s+/g, ' ').trim();
      if (text) lines.push(indent + mask(text).slice(0, 80));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || node.matches(skipped)) return;
    lines.push(indent + open(node));
    // The drawing of an icon says nothing about the page. Its test id, kept above, does.
    if (node.matches('svg,canvas,img,video,select,textarea')) return;
    // Five siblings of one shape describe a list or a table. The rest are counted.
    let previous = '', run = 0, omitted = 0;
    const close = () => {
      if (omitted) lines.push(indent + '  <!-- +' + omitted + ' hermanos con la misma forma -->');
      omitted = 0;
    };
    for (const child of node.childNodes) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const shape = signature(child);
        run = shape === previous ? run + 1 : 0;
        if (run === 0) close();
        previous = shape;
        if (run >= 5) { if (!child.matches(skipped)) omitted++; continue; }
      }
      walk(child, depth + 1);
    }
    close();
  };
  walk(root, 0);
  return '<!-- Estructura de la ficha sin datos: textos como xxxx, dígitos como 0000. ' + location.pathname.replace(/\d/g, '0') + ' ' +
    innerWidth + '×' + innerHeight + ' -->\n' + lines.join('\n');
};
(() => {
  const structure = globalThis.exportFichaStructure();
  const summary = 'Estructura lista: ' + structure.split('\n').length + ' líneas, ' + Math.round(structure.length / 1024) + ' KB.';
  try {
    copy(structure);
    console.log(summary + ' Copiada al portapapeles.');
  } catch {
    Promise.resolve(navigator.clipboard?.writeText(structure)).then(
      () => console.log(summary + ' Copiada al portapapeles.'),
      () => console.log(summary + ' Selecciónala desde aquí:\n' + structure));
  }
})();
