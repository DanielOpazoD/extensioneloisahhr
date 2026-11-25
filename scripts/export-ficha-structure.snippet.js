// Exporta la ESTRUCTURA de la pestaña visible de la ficha, sin datos clínicos ni nombres.
//
// Uso: abrir la pestaña de Eloísa que se quiere describir (por ejemplo Plan de tratamiento),
// F12 → Consola, pegar este archivo completo y pulsar Enter. La estructura queda en el
// portapapeles. Revisarla antes de compartirla: los textos se ven como «xxxx» y los números
// como «0000».
//
// Qué conserva: etiquetas, clases de componentes, roles, estados (seleccionado, deshabilitado)
// y las palabras de interfaz de una lista cerrada («Fármacos», «Agregar», «Acciones»…).
// Qué enmascara: cualquier otra palabra (letras → x) y todos los dígitos (→ 0), en textos, en
// rótulos (`aria-label`, `title`, `placeholder`, `alt`) y en la ruta. Nunca lee el valor de un
// campo de formulario.
// Qué pasa con los identificadores: `id`, `data-testid`, las marcas `data-hhr-*` y los tramos de
// la ruta conservan sus letras solo si cada una de sus palabras está en una segunda lista
// cerrada, la de palabras de programador («medicationEntrySection», «encounter-event-tab-history»).
// Pierden sus dígitos. Cualquier otro se enmascara. Dos excepciones: el `data-testid` de un icono
// de la biblioteca (`svg.MuiSvgIcon-root`) sale como está («EditNoteRoundedIcon»), y un id
// generado por React sale como `:r0:`.
// De las clases solo salen las de componentes (`Mui…`) y las de la extensión (`hhr-…`), tal cual,
// con sus dígitos (`MuiGrid-grid-xs-12`): las escribe la biblioteca, no los datos.
// Un identificador que salga como «xxxx» y haga falta se agrega a su lista, tras comprobar
// que no nombra a nadie.
globalThis.exportFichaStructure = function exportFichaStructure(root = document.body) {
  const plain = word => word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
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
    'enmendar enmendado enmendados notas programacion cuidados planificacion estandar unica ir hrs solicitante administrador externo ' +
    'buscar filtrar filtros limpiar ver leer menos mostrar ocultar ocultos suspendidos suspender suspendido reanudar historial completo ' +
    'ultima actualizacion hoy ayer registrado registrada registrados registradas presenta presentan permiso visualizar tiene ' +
    'medico medica enfermera enfermero kinesiologo kinesiologa paramedico nutricionista matron matrona tens tecnico enfermeria ' +
    'terapeuta ocupacional fonoaudiologo psicologo quimico farmaceutico cirujano tratante especialista ' +
    'solicitada realizada pendiente pendientes asignar vigente vigentes activo activa activos activas todos todas ninguno ninguna ' +
    'si seleccione seleccionar opcion opciones requerido obligatorio pagina filas siguiente anterior sos antimic antimicrobiano ' +
    'pa fc fr hgt presion frecuencia cardiaca respiratoria saturacion temperatura axilar hemoglucotest oxigeno').split(' '));
  const mask = text => text.replace(/[\p{L}\p{N}]+/gu, word =>
    /^\p{L}+$/u.test(word) && vocabulary.has(plain(word)) ? word : word.replace(/\p{N}/gu, '0').replace(/\p{L}/gu, 'x'));
  // A structural attribute says a state. Its value is kept only when it is one of the words a state can take.
  const structural = new Set(['role', 'type', 'aria-selected', 'aria-expanded', 'aria-checked', 'aria-disabled', 'aria-haspopup',
    'aria-current', 'aria-pressed', 'disabled', 'hidden', 'colspan', 'rowspan', 'multiple', 'readonly']);
  const states = new Set(('true false mixed page step location date time datetime-local month week text number email tel url search password ' +
    'file range color hidden submit reset button checkbox radio switch slider spinbutton textbox searchbox combobox listbox option menu ' +
    'menubar menuitem menuitemcheckbox menuitemradio tab tablist tabpanel dialog alertdialog alert status log timer progressbar tooltip ' +
    'presentation none img figure link heading list listitem table grid treegrid row rowgroup cell gridcell columnheader rowheader tree ' +
    'treeitem group radiogroup region navigation main banner complementary contentinfo form article document application separator ' +
    'toolbar scrollbar note until-found').split(' '));
  const state = value => states.has(value) || /^\d{1,2}$/.test(value) ? value : mask(value);
  // An identifier keeps its letters only when a developer wrote every word of it, and loses its digits.
  const identifiers = new Set(['id', 'data-testid', 'for', 'aria-labelledby', 'aria-controls']);
  const developerWords = new Set(('encounter event tab tabs tabpanel panel history care plan summary background discharge list dashboard ' +
    'entry entries section form medication medications no pharma free indication indications procedure procedures diagnosis diagnostic ' +
    'referral request requests order orders test tests ram allergy allergies operation theater input output hydric balance adverse ' +
    'obstetric vital signs physical examination shift change observation observations estimated evolution rest nutrition alert alerts ' +
    'daily date time label helper text field button icon root main content header footer title subheader action actions menu item items ' +
    'dialog modal popover select option checkbox radio switch table row cell head body container wrapper card paper box grid stack ' +
    'simple full width scrollable auto mui patient patients hospitalization hospital episode detail details view print filter filters ' +
    'search user role device devices invasive product products instrument instruments evaluation equipment status state type name ' +
    'description comment comments new edit add delete remove save cancel close open toggle show hide collapse expand more less next ' +
    'previous first last page pages id key value data hhr clinical operations bar notices prescription note notes amend amended ' +
    'standard single planning schedule scheduling treatment today yesterday frame before after tools start end write narrow above ' +
    'half inline flat kind compact sections slot primary rail timeline link dock docked repeat shared heading folded caption hint ' +
    'instructions vital age round reading update day edge empty').split(' '));
  const words = token => token.replace(/\p{N}/gu, '').split(/[-_:]+|(?<=[a-z])(?=[A-Z])/).filter(Boolean);
  const developerName = token => /^[A-Za-z][\w:-]*$/.test(token) && words(token).every(word => developerWords.has(word.toLowerCase()));
  // React writes ids such as `:r1b:` or `_r_1b_`. Nothing of them is kept but that they are one.
  const reactId = /^([:_]r[:_]?)[0-9a-z]*([:_])$/i;
  const identifier = (value, libraryIcon) => value.split(/\s+/).map(token =>
    reactId.test(token) ? token.replace(reactId, '$10$2') :
    libraryIcon && /^[A-Z][A-Za-z0-9]*Icon$/.test(token) || developerName(token) ? token.replace(/\p{N}/gu, '0') : mask(token)).join(' ');
  const described = new Set(['aria-label', 'title', 'placeholder', 'alt']);
  const skipped = 'script,style,link,noscript,iframe,template,#hhr-clinical-operations-bar,#hhr-clinical-page-notices,#hhr-prescription-print-modal';
  const signature = el => el.tagName + '.' + [...el.classList].filter(name => name.startsWith('Mui')).join('.');
  const lines = [];
  const open = el => {
    const parts = [el.tagName.toLowerCase()];
    // Component classes (MuiGrid-grid-xs-12, MuiTypography-body2) and the extension's own. Nothing else.
    const classes = [...el.classList].filter(name => /^(?:Mui[A-Za-z0-9-]+|PrivateSwitchBase-[a-z]+|hhr-[a-z-]+)$/.test(name));
    if (classes.length) parts.push('class="' + classes.join(' ') + '"');
    for (const {name, value} of el.attributes) {
      if (structural.has(name)) parts.push(value === '' ? name : name + '="' + state(value) + '"');
      // The library names its icons itself. Any other test id is read as an identifier.
      else if (identifiers.has(name)) parts.push(name + '="' + identifier(value, name === 'data-testid' && el.matches('svg.MuiSvgIcon-root')).slice(0, 80) + '"');
      // A mark of the extension is one of its own words («frame», «note»). Any other value is text.
      else if (name.startsWith('data-hhr-')) parts.push(name + '="' + (/^[a-z]+(?:-[a-z]+)*$/.test(value) ? identifier(value) : mask(value).slice(0, 80)) + '"');
      else if (described.has(name)) parts.push(name + '="' + mask(value).slice(0, 80) + '"');
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
  // Of the route, only the names of its sections. An identifier in it reads as zeros and x.
  const route = location.pathname.split('/').map(part => identifier(part)).join('/');
  return '<!-- Estructura de la ficha sin datos: textos como xxxx, dígitos como 0000. ' + route + ' ' +
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
