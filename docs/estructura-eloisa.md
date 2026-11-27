# Estructura de la ficha de Eloísa

Lo que sigue se observó el 25-11-2026 en la ficha médica real (`/dashboard/encounter-list/{id}`), con el exportador de [`scripts/export-ficha-structure.snippet.js`](../scripts/export-ficha-structure.snippet.js): solo estructura, sin textos clínicos, nombres ni cifras. Los rótulos citados son palabras de la interfaz. Las fichas ficticias de `scripts/*-visual-fixture.mjs` deben seguir estas formas.

## Marco común

- `main` deja 32 px a cada lado. El fondo de la página es `#f1f1f1`; las tarjetas son blancas, sin sombra, con esquinas de 12 px. Toda la página usa Inter («Inter, "Inter Fallback"»). Medido el 26-11-2026 en una ventana de 1990 px.
- La cabecera de una tarjeta deja 16 px arriba y a los lados y nada abajo; su contenido, 16 px y 24 abajo. Medido el 26-11-2026 en Balance Hídrico y Examen Gíneco Obstétrico.
- Cada tabla del Resumen va dentro de un `Paper`: `.MuiCardContent-root > div.MuiPaper-root > div.MuiTableContainer-root > table` en Fármacos, Indicaciones Libres, Procedimientos, Diagnóstico, Solicitud interconsulta, Órdenes de atención y Solicitud de examen (en esta última el `TableContainer` tiene un hermano).

- Cabecera fija `header.MuiAppBar-root#menu-app-bar-element` con los datos del paciente.
- Dentro de `main`, otra `header.MuiAppBar-root` fija con `.MuiTabs-root` y cinco pestañas `button[role=tab]`: `encounter-event-tab-summary`, `-antecedents`, `-care-plan`, `-history`, `-discharge`.
- La barra flotante de Centro HHR midió 241 × 38 px, a 5 px bajo la cabecera, en una ventana de 1990 px.

## Resumen

El cuerpo es `main > div.MuiStack-root`: primero la fila de enlaces de sección (`.MuiGrid-item > .MuiGrid-container` fijo, cada enlace `span.MuiBadge-root > span.MuiTypography-caption`) y luego el **marco**, un `div.MuiGrid-container.MuiGrid-spacing-xs-2` cuyos hijos directos son todos `div.MuiGrid-item`:

| Orden | Clases de rejilla | Contenido |
| --- | --- | --- |
| 1 | `xs-12` | Fila diaria (ver abajo). |
| 2 | `xs-6` | Un `.MuiGrid-container` con dos ítems: `section#estimatedDischargeSection` y `section#observationEntrySection > div#evolution`. Sin evolución registrada, `#evolution` va directo en su ítem, sin `section`. |
| 3 | `xs-12 md-6` | `section#shiftChangeEntrySection > div#shiftChangeObservation`. |
| 4 | `xs-12` | `div#encounterFormEntry` (Instrumentos de evaluación), sin `section`. |
| 5 | `xs-12` | `section#physicalExaminationEntry > div#physicalExaminationEntry`. |
| 6 | `xs-12` | `section#vitalSignsEntry > div#vitalSignsEntry` (el mismo id en ambos). |
| 7 | `xs-12` | Un solo botón de icono, `LocalPrintshopRoundedIcon`, con `aria-label="Imprimir indicaciones"` en su `svg`. Sin texto. |
| 8 | `xs-6` | Un `.MuiGrid-container` con dos ítems `xs-12`: `div.MuiCard-root#rest` (Reposo, sin `section` cuando está vacío) y `section#nutritionOrderEntrySection > div#nutritionOrder`. |
| 9 | `xs-12 md-6` | `section#alertEntrySection > div#alertEntries`. |
| 10… | `xs-12` | `medicationEntrySection`, `noPharmaEntrySection`, `freeIndicationEntrySection`, `procedureEntrySection`, `diagnosisEntrySection`, `referralRequestEntrySection`, `procedureOrderEntrySection`, `diagnosisTestEntrySection`, `ramEntrySection`, `allergyEntrySection`, `operationTheaterRequestEntrySection`, `inputOutputHydricBalanceEntrySection`, `adverseEventEntrySection`, `obstetricGynecologicalExaminationEntrySection`. |

Títulos de las tarjetas, en ese orden: Fecha estimada de alta, Observaciones de entrega de turno, Instrumentos de evaluación, Examen físico, Signos vitales, Reposo, Régimen, Alertas, Fármacos, Producto no Farmacológico, Indicaciones Libres, Procedimientos, Diagnóstico, Solicitud interconsulta, Órdenes de atención, Solicitud de examen, RAM, Alergias, Solicitudes de intervención quirúrgica, Balance Hídrico, Eventos Adversos, Examen Gíneco Obstétrico.

### Mientras carga

Leído en la página el 26-11-2026, al pasar de la lista a una ficha (los tiempos son de esa lectura y cambian con la red):

- Durante casi un segundo `main` está vacío (64 px). Después Eloísa dibuja el encabezado del paciente con cinco `span.MuiSkeleton-root` y una barra `MuiLinearProgress`.
- A los ~1,3 s dibuja el marco del Resumen completo, con **un marcador por apartado**: los mismos ítems `.MuiGrid-item` que tendrá después, cada uno con una `div.MuiPaper-root.MuiCard-root` de 176 px: `.MuiCardHeader-root` (88 px) con el título real en `span.MuiTypography-h6.MuiCardHeader-title` y una barra en `.MuiCardHeader-subheader`; `.MuiCardContent-root` (88 px) con dos `span.MuiSkeleton-root.MuiSkeleton-text.MuiSkeleton-pulse`. Son 24 ítems y casi 4.000 px de página. Los marcadores no tienen `id`: el `section` con su `id` llega con los datos.
- La fila diaria ya está en ese marco, con su formulario; en lugar de la firma lleva una barra `span.MuiSkeleton-root` de 300 × 14 px.
- Las pestañas aparecen un cuadro después que el marco.
- Cada apartado reemplaza a su marcador cuando llegan sus datos: la nota a los ~1,5 s, la mayoría antes de los 2,2 s y algunos (seis barras en esa lectura) recién a los 5 s.
- Los títulos de los marcadores son los de sus apartados. En la ficha médica, en este orden: Evolución, Observaciones de entrega de turno, Instrumentos de evaluación, Examen físico, Signos vitales, Reposo, Régimen, Alertas, Fármacos, Producto no Farmacológico, Indicaciones Libres, Procedimientos, Diagnóstico, Solicitud interconsulta, Órdenes de atención, Solicitud de examen, RAM, Alergias, Solicitudes de intervención quirúrgica, Balance Hídrico y Examen Gíneco Obstétrico. En la ficha de Gestión de cuidados: Diagnóstico, Signos vitales, Valoración, Alertas, Instrumentos de evaluación, Reposo, Régimen, Observaciones de entrega de turno, Fármacos, Producto no Farmacológico, Indicaciones Libres, Procedimientos, Dispositivos invasivos, Solicitud de examen, Solicitud interconsulta, Órdenes de atención, Prestaciones, RAM, Alergias, Balance Hídrico y Examen Gíneco Obstétrico.
- En la ficha médica el marcador de Evolución comparte su columna con un ítem vacío, sin hijos: el lugar de la fecha estimada de alta, que no tiene marcador. Reposo y Régimen van en dos ítems de una misma cuadrícula anidada. Los demás marcadores son hijo directo de su ítem.
- Con la extensión lista antes que los datos (0,4 s en esa lectura), la nota llegó 60 ms antes que Reposo y Alertas y 210 ms antes que la entrega de turno; Diagnóstico y Signos vitales llegaron después.
- El ítem de la línea de enlaces de sección está desde el inicio, vacío y sin alto (`div.MuiGrid-item.MuiGrid-grid-xs-12 > div.MuiGrid-container`, justo antes del marco). Eloísa le agrega cada enlace con su apartado: el de la nota llega con la nota.
- Las pestañas se dibujan un cuadro después que los marcadores.
- Eloísa también cambia la página dentro del cuadro, en sus propios `requestAnimationFrame`: un apartado puede aparecer después del turno de un script que espera al cuadro.
- Un apartado ya cargado puede llevar una barra propia mientras termina (Diagnóstico y Balance Hídrico tenían una): no es un marcador, y tiene otros hijos en su contenido.

### Botones

Leídos en la página el 26-11-2026, en las dos fichas:

- «Imprimir» de la fila diaria y «Filtrar» de Balance Hídrico: `button.MuiButton-contained.MuiButton-containedPrimary`, fondo `rgb(21,149,136)` y texto blanco.
- «validar tratamiento» de Fármacos (solo en la ficha médica): `button.MuiButton-contained.MuiButton-containedSecondary`, fondo `rgb(230,74,25)`, naranja.
- Todos llevan `transition` de 0,25 s en fondo y color: un valor leído justo después de cambiar un estilo es intermedio.
- Un botón redondo naranja de 40 px, sin texto, abre un menú de acciones rápidas; sus opciones miden 0 px mientras está cerrado.

### Fila diaria

`div.MuiGrid-item` (flex) con dos hijos:

1. `p.MuiTypography-root`: «Última actualización: dd-mm-aaaa, hh:mm - Nombre».
2. `div.MuiStack-root` con: un `form.MuiStack-root` (campo MUI «Resumen diario paciente» con `input[type=text]` de marcador `dd/mm/aaaa`, un botón de calendario dentro del campo y un `button[type=submit]` «Imprimir»), un `hr.MuiDivider-vertical` y un botón de icono `LocalPrintshopRoundedIcon`.

No hay `input[type=date]`. La fila tiene cuatro controles. El icono, que Eloísa llama solo «Imprimir», genera `Reporte_Evolucion_Paciente.pdf`; «Imprimir indicaciones», `Reporte_Indicaciones_Paciente.pdf`; el icono al final de Fármacos («Imprimir recetón», en `.MuiCardHeader-action > .MuiStack-root`), `Reporte_Receta_Medica.pdf`; y el de Balance Hídrico, `Reporte_Ingresos_Egresos.pdf` (leído el 27-11-2026). La ficha de Gestión de cuidados solo tiene «Imprimir» del resumen diario y el de Balance Hídrico. El `div.MuiFormControl-root` del campo mide 180 px de ancho (26-11-2026).

### Nombres de profesionales

Leídos en la página el 26-11-2026, enmascarados y con sus espacios. La mayoría de las firmas escriben cuatro campos unidos por un espacio: primer nombre, segundo nombre, primer apellido y segundo apellido. Un campo vacío deja su espacio:

- Diagnóstico, Reposo, Régimen: «Médico Nombre··Apellido Apellido» (sin segundo nombre: dos espacios).
- Signos vitales y Alertas: «Cargo Nombre··Apellido·» (sin segundo nombre ni segundo apellido: queda un espacio al final).
- Evolución: «Médico Nombre Apellido», con un solo espacio.
- «Solicitante» en Fármacos: «Nombre Apellido·» o «Nombre Apellido Apellido».
- Historial: el título de cada evento es el cargo y su subtítulo, sin elementos dentro, el nombre en cuatro campos («Nombre··Apellido Apellido», «Nombre··Apellido·»). 33 de 33 eventos leídos.
- Plan de tratamiento: ningún texto con cargo ni nombre de profesional.

Leída de nuevo el 26-11-2026 con la vista Compacta activa (0.48.199), a 1303 × 970 px: la fila es el primer hijo de la rejilla de la ronda, que sigue al hueco de la línea de secciones, y medía 30 px **en su propia línea**. No había subido a la línea de secciones: la barra flotante de Centro HHR tapa su final y la fila no cabía entre el último enlace y esa barra. Desde la 0.48.201 va en la línea de pestañas.

### Evolución

- Cabecera: `.MuiCardHeader-content` con título y `.MuiCardHeader-subheader` «Última actualización: dd-mm-aaaa, hh:mm:ss, Médico Nombre»; `.MuiCardHeader-action` con un `div.MuiStack-root > button.MuiIconButton-sizeMedium > svg[data-testid=MoreVertRoundedIcon]`.
- Contenido: `.MuiCardContent-root > div.MuiStack-root` con dos hijos:
  1. `div.MuiStack-root > div.MuiBox-root` con el texto en `span.MuiTypography-caption` y `div.MuiBox-root > button.MuiButton-text` «Leer más» / «Leer menos».
  2. `div.MuiStack-root > div.MuiStack-root` con dos `button.MuiIconButton-sizeSmall`.
- **Ningún botón tiene `aria-label` ni `title`.** El nombre está en el `svg`: `EditNoteRoundedIcon` → `aria-label="Enmendar"`; `FormatListBulletedRoundedIcon` → `aria-label="Ver enmendados"`. El menú `MoreVertRoundedIcon` no tiene nombre.

### Signos vitales

- Cabecera con subtítulo «Última actualización: dd-mm-aaaa h:mm:ss, Paramédico Nombre» (sin coma tras la fecha, hora sin cero inicial).
- Cada medición: `div.MuiCard-root > div.MuiCardContent-root` con `p` (nombre, y dentro un `div.MuiBox-root > span.MuiTypography-caption`), el valor (`h5`, o para la presión un `div.MuiGrid-root` con `div.MuiStack-root` de tres `h5` y otro con `p` «PAM:» y `p` valor) y `p` con la antigüedad («2 horas»).
- Un botón «VER HISTORIAL COMPLETO».

### Reposo y Régimen

- Reposo vacío: `div.MuiCard-root#rest`, sin `section`, con su cabecera (título «Reposo», subtítulo y acciones vacíos) y `.MuiCardContent-root > p` «No se presenta un Reposo registrado para este paciente».
- Régimen: `.MuiCardContent-root > div.MuiStack-root` con dos `div.MuiStack-root`: `p` «Régimen:» + `div.MuiChip-root` + `div.MuiBox-root > span.MuiTypography-caption`; y `p` «Observación:» + `div.MuiBox-root > span.MuiTypography-caption`.

### Alertas

Al abrir el Resumen, **Eloísa da el foco al campo vacío de la nueva alerta**, sin que nadie lo pulse: medido el 26-11-2026 a los 0,5, 1,5, 3, 6 y 9 s de cargar la ficha. Quitarle ese foco no muestra ningún error.

`div#alertEntries`: `.MuiCardContent-root` con `div.MuiBox-root` (alto máximo de 250 px con desplazamiento propio; una `div.MuiStack-root` por alerta: una pila con `p` «Cargo Nombre» y `div > span` mensaje; otra con `span.MuiTypography-caption` antigüedad y `div.MuiStack-root > button[aria-label="Archivar"] > svg[data-testid=ArchiveRoundedIcon]`) y un `form.MuiStack-root` con los interruptores «No reanimación» y «Gestión de Visitas» y el campo «Observaciones» con «Agregar». Una ficha tenía quince alertas.

- Una alerta (26-11-2026, las dos fichas): `div.MuiStack-root` con dos `div.MuiStack-root`. El primero lleva `p.MuiTypography-body2` (quien la escribió) y un `div > span.MuiTypography-body2` (el texto, con 8 px de margen superior); el segundo, `span.MuiTypography-caption.MuiTypography-alignRight` (hace cuánto) y un `div.MuiStack-root > button.MuiIconButton-sizeSmall` (archivar).
- Bajo la lista, un `form.MuiStack-root` con dos `label.MuiFormControlLabel-root` (No reanimación, Gestión de Visitas), cada uno con su `span.MuiSwitch-root`.
### Secciones con registros que aún no se han exportado

Procedimientos, Solicitud interconsulta, Solicitud de examen y Solicitudes de intervención quirúrgica **con registros** se leyeron el 26-11-2026 en capturas de pantalla, no con el exportador. Se conocen sus columnas y controles, no sus nodos:

- Procedimientos: Indicación, Estado (selector mientras está «Solicitada», texto cuando está «Realizada»), Fecha solicitud, Para, Nº de sesiones, Fundamentos (texto cortado con «Ver más»), Solicitante, Acciones. Interruptor «Mostrar suspendidos» en la cabecera.
- Solicitud interconsulta: Especialidad, Destino, Estado, Fecha solicitud, Interconsultor, Motivo, Acciones. Lleva firma.
- Solicitud de examen: botón «Imprimir selección (n órdenes)» sobre la tabla; Grupo de exámenes, Nro. Orden, Estado Orden (selector), Fecha solicitud, Examen(es), Observaciones, Estado, Acciones.
- Solicitudes de intervención quirúrgica: Tipo de solicitud, Estado, Diagnóstico, Intervención, Fecha solicitud, Fecha estimada, Acciones.

La ficha ficticia las dibuja con la tabla que Eloísa usa en las demás secciones. La vista les da solo lo común (regla 10 de [`estilo-ficha.md`](estilo-ficha.md)), por el id de su sección y cualquier `table` dentro. **Falta exportar su estructura** para confirmar esa forma. Lo mismo vale para una tarjeta de Reposo o Régimen que espera confirmación: Eloísa la tiñe y le añade sus herramientas (editar, eliminar) al pie.

### Fármacos

- Cabecera con título «Fármacos» y subtítulo vacío: la tarjeta no lleva firma. Acciones en un `div.MuiStack-root`: `button.MuiButton-contained.MuiButton-containedSecondary` «validar tratamiento» (el texto está en minúsculas y se muestra en mayúsculas; 195 × 38 px), interruptor «Mostrar Suspendidos», botón de icono `LocalPrintshopRoundedIcon` con nombre en su `svg`.
- **La tarjeta puede ir dentro de una segunda sección** (26-11-2026): `section#medicationEntrySection > section#dilutionEntrySection > div.MuiCard-root#medicationEntry`. Su contenido abre entonces con `div.MuiBox-root` de dos `span.MuiTypography-caption`: «Medico Validador:», sin tilde, y su valor, vacío en esa ficha. Le sigue la tabla.
- Columnas (`th` fijas): Tiempo, Indication, Posología, Indicaciones específicas, Solicitante, Acciones.
- Celdas: tiempo en `div.MuiBox-root` con `svg[data-testid=ChangeHistoryRoundedIcon]` y un número de una o dos cifras, que son los días de tratamiento (lo confirmó el responsable clínico el 25-11-2026); el fármaco en un `div.MuiStack-root` con su `span.MuiTypography-caption` y otra pila con sus chips (por ejemplo «SOS»); posología e indicaciones específicas en `div.MuiBox-root > span.MuiTypography-caption`; el solicitante en un `span.MuiTypography-caption`.
- **Un texto largo llega cortado.** Posología e indicaciones específicas se cortan hacia los 48 caracteres con «...» y llevan debajo un `div.MuiBox-root > button.MuiButton-text` «Leer más», en su propia línea: 10 de 14 posologías en la lista leída.
- En una lista de 14: nombres de 24 a 113 caracteres (mediana 35), solicitantes de 12 a 17.
- Acciones por fila: `CancelIcon` («Suspender») y `SpeakerNotesIcon` («Ver notas», deshabilitado sin notas), de tamaño pequeño, y `MoreVertIcon`, de tamaño mediano y con `aria-haspopup`; el nombre está en el `svg`.
- El contenido de la tarjeta tiene tres hijos: la línea del validador, el `Paper` con la tabla y un `form.MuiStack-root` que no dibuja nada (0 px).
- El número de días va en un `div.MuiBox-root` de 36 px (`display:flex; align-items:baseline`) cuyo hijo tiene 14,4 px de margen superior, bajo el triángulo: sin el triángulo, el número quedaba 4 px bajo la línea del medicamento.

### Diagnóstico

`section#diagnosisEntrySection > div.MuiCard-root#diagnosisEntry`, tras Fármacos, Producto no Farmacológico, Indicaciones Libres y Procedimientos: en una ficha estaba a 2,5 pantallas del inicio.

- Cabecera con título, subtítulo «Última actualización: …, Médico Nombre» y acciones vacías.
- `.MuiCardContent-root > div.MuiPaper-root > div.MuiTableContainer-root > table` con siete columnas: una sin rótulo, Diagnóstico, Estado, Fecha, GES, Eno, Acciones.
- Fila: `svg[data-testid=StarRoundedIcon]` en el diagnóstico principal; un `div.MuiStack-root` con una etiqueta de dos palabras (`div.MuiBox-root > span.MuiTypography-caption`) y el texto «código: descripción» en otro `span.MuiTypography-caption`; el estado en un selector de MUI (`div[role=combobox]#select-diagnosis-status`, 196 × 40 px, habilitado); la fecha; GES y Eno vacíos; y dos botones pequeños, `SpeakerNotesIcon` («Ver notas», deshabilitado) y `NoteAddIcon` («Agregar notas»).

Sin registros (segunda lectura del 26-11-2026), las cuatro son `section#…EntrySection > div.MuiCard-root#…Entry` con `.MuiCardContent-root > p.MuiTypography-body2`:

- `#procedureEntry`: conserva en su cabecera el interruptor «Mostrar suspendidos» (`label.MuiFormControlLabel-root` dentro de `.MuiCardHeader-action > .MuiStack-root`) y dice «No se presentan procedimientos registrados para este paciente».
- `#referralRequestEntry`: «No se presentan interconsultas … para este paciente».
- `#diagnosisTestEntry`: «No presenta solicitudes de examenes registradas», sin tilde.
- `#operationTheaterRequestEntry`: los tres nodos de texto ya descritos.

Esa lectura fue de un paciente sin procedimientos: la forma de Procedimientos **con registros** sigue sin exportarse.

Sin diagnósticos (26-11-2026), la tarjeta no tiene tabla ni firma: `.MuiCardContent-root > p.MuiTypography-body2` «No se presentan diagnosticos registrados para este paciente», sin tilde.

- El estado, en la ficha médica (27-11-2026): `div.MuiFormControl-root.MuiFormControl-fullWidth > div.MuiInputBase-root.MuiOutlinedInput-root` con `div#select-diagnosis-status.MuiSelect-select[role=combobox]` (la palabra en un `span.MuiTypography-caption`, relleno 3 px 32 px 3 px 14 px), `input.MuiSelect-nativeInput`, `svg.MuiSelect-icon` y `fieldset.MuiOutlinedInput-notchedOutline`, que dibuja la caja.
- En la ficha de Gestión de cuidados el estado es solo un `span.MuiTypography-caption`: no se puede cambiar desde allí.
### Secciones vacías o sin permiso

Medido el 26-11-2026 en un paciente de estadía corta:

- Órdenes de atención sin órdenes: `p.MuiTypography-body2` «No se presenta orden de atención solicitada para este paciente», sin tabla ni firma.
- Solicitudes de intervención quirúrgica: `p.MuiTypography-body2` con **tres nodos de texto**, «No se presentan», «Solicitudes de intervención quirúrgica» y «registradas para este paciente».
- Eventos Adversos y Examen Gíneco Obstétrico: `p.MuiTypography-body2` «No tiene permiso para visualizar».
- Balance Hídrico: en la cabecera, un interruptor «Balance Hídrico Indicado» y un botón de icono de impresión deshabilitado; en el contenido, un `div.MuiStack-root` en fila con cuatro campos pequeños de 200 × 40 px (selector «Tipo de Registro», selector «Item» deshabilitado, dos campos de fecha y hora `DD/MM/YYYY hh:mm` con su calendario) y un `button[type=submit]` «Filtrar»; debajo, un `p.MuiTypography-body2`. La tarjeta mide 164 px.

### Otras tablas

| Tarjeta | Columnas |
| --- | --- |
| Indicaciones Libres | Indication, Programación, Solicitante, Acciones |
| Procedimientos | Indicación, Estado, Fecha solicitud, Para, Nº de sesiones, Fundamentos, Solicitante, Acciones |
| Solicitud interconsulta | Especialidad, Destino, Estado, Fecha solicitud, Interconsultor, Motivo, Acciones |
| Órdenes de atención | Profesional, Estado, Fecha solicitud, Asignado, Motivo, Indicaciones, Acciones |
| Solicitud de examen | Grupo de exámenes, Nro. Orden, Estado Orden, Fecha solicitud, Examen(es), Observaciones, Estado, Acciones |

Las filas de Indicaciones Libres llevan las mismas tres acciones que las de Fármacos. Su texto llega cortado como una posología, con «Leer más» bajo él, en la columna «Indication», en inglés (26-11-2026). Una ficha tenía 20 botones «Leer más» en sus tablas.

### Línea de secciones

Doce enlaces `div.MuiGrid-item > span.MuiBadge-root > span.MuiTypography-caption`, en este orden: Alertas, Diagnóstico, Solicitud de examen, Indicaciones (Indicación Libre), Indicaciones (Medicamento), Indicaciones (Régimen), Evolución, Solicitudes de intervención quirúrgica, Procedimientos, Órdenes de atención, Solicitud interconsulta, Signos vitales. **No es el orden de la página.** Eloísa muestra solo los de las secciones que el paciente tiene: en la segunda lectura del 26-11-2026 eran siete (Alertas, Indicaciones (Indicación Libre), Indicaciones (Medicamento), Indicaciones (Régimen), Evolución, uno más y Signos vitales).

## Resumen de la ficha abierta desde Gestión de cuidados

Leído en la página el 26-11-2026 (`/dashboard/encounter-list-nurse/<episodio>`), con Claude en Chrome y textos enmascarados, a 1728 × 966 px y con la vista Compacta. Es la misma rejilla del Resumen médico, con estas diferencias:

- **Pestañas:** Resumen, Plan de tratamiento, Ejecución de cuidados, Historial. No tiene Antecedentes ni Alta.
- **Nota:** `section#observationEntrySection > div#evolution`, la misma tarjeta, pero su título es **«Valoración»** y su `.MuiCardContent-root` tiene dos hijos: un `p.MuiTypography-body2` «Evolución:» y la pila de la nota. La pila es la del Resumen médico (`div.MuiStack-root > div.MuiStack-root > div.MuiBox-root > span.MuiTypography-caption` y el `div.MuiBox-root` de «Leer más»), con **una** herramienta al pie en lugar de dos. La caja del texto mide 350 px.
- **Dispositivos invasivos:** `section#invasiveDeviceEntrySection > div#invasiveDeviceEntry > .MuiCardContent-root > .MuiPaper-root > .MuiTableContainer-root > table.MuiTable-stickyHeader`. Columnas: Dispositivo, Nº, Fecha instalación, Fecha de caducidad, Localización, Procedencia, Observación, Acciones. Las celdas de texto son un `span.MuiTypography-caption`, o un `div.MuiBox-root` de 300 px con un `p.MuiTypography-body2`. Las dos fechas van en columnas de unos 103 px: «dd-mm-aaaa hh:mm» ocupa dos líneas. Celdas con 16 px de relleno; la tabla mide 1517 px en un contenedor de 1412.
- **Otras tarjetas:** `section#medicalServiceEntrySection > div#medicalServiceEntry`, que no está en el Resumen médico. No tiene Fecha estimada de alta, Examen físico ni Solicitudes de intervención quirúrgica.
- El título de Indicaciones libres se escribe con minúscula («Indicaciones libres»); en el Resumen médico, «Indicaciones Libres».

Con el menú lateral de Eloísa abierto, o cualquiera de sus ventanas, toda la página lleva `aria-hidden="true"` en un antecesor de `main`.

## Plan de tratamiento

`main > div.MuiStack-root > div.MuiStack-root` con un interruptor «Mostrar todos los ocultos» y cuatro `div.MuiCard-root`:

| Tarjeta | Interruptor de cabecera |
| --- | --- |
| Programación de procedimientos | Mostrar realizados, no realizados, archivados y suspendidos |
| Programación de indicaciones libres | Mostrar Suspendidos |
| Programación de medicamentos | Mostrar Suspendidos |
| Programación de cuidados | Mostrar Finalizados |

Cada tarjeta:

- `.MuiCardHeader-root` (relleno 24 px 16 px, título de 24 px) con el interruptor en `.MuiCardHeader-action`.
- `div.MuiBox-root > .MuiCollapse-root` con tres botones de icono: `AccessTimeRoundedIcon` (`aria-label="Planificación estandar"`), `TouchAppIcon` («Planificación única») y `MoreVertIcon`.
- `.MuiCardContent-root > .MuiTableContainer-root` (alto máximo 600 px, desplazamiento propio) `> table.MuiTable-root`:
  - `thead > tr` con dos `th` fijas. La primera: `p` «Indicación» y un `div.MuiStack-root` con `button.MuiButton-text` «Ir a Hoy», flecha izquierda, `p` «n / m» y flecha derecha. La segunda mide 1000 px: un `div.MuiStack-root` con un bloque por día (`span.MuiTypography-caption` «Ayer (dd/mm/aaaa)», «Hoy (…)», «Jue (…)») y debajo una pila de horas («08:00 p. m.»). Siete horas por página, 100 px cada una.
  - `tbody > tr` con dos celdas (relleno 16 px, texto de 16 px). La primera: `div.MuiStack-root` con una pila (`p` indicación y chips como «SOS» o «Externo») y un `div.MuiBox-root > p` con la posología. La segunda: `div.MuiBox-root` (flex) con una `div.MuiStack-root` por hora; una hora programada lleva `div.MuiBox-root > button.MuiIconButton-sizeMedium > svg`.
  - Iconos de estado vistos: `CheckRoundedIcon`, `AccessTimeRoundedIcon`, `TimerOffIcon`. Todos grises, sin `aria-label` en el botón ni en el `svg`.
  - Sin registros: una fila con `td[colspan=3] > p` «No se registra un plan de tratamiento.».
  - `tfoot` con tres celdas vacías.

Leído en la página el 27-11-2026: en Programación de procedimientos la primera columna de la tabla no tiene texto (ni «Indicación»); la vista la reconoce por el título «Programación de …». Los interruptores de cabecera son `label.MuiFormControlLabel-root` con un `MuiSwitch` (pista y botón como `span`).

Pendiente de confirmar en la página real:

- **Qué significa cada icono de estado.** Hasta saberlo, la vista Compacta no les da nombre ni color.
- **Cómo fija Eloísa el ancho de la columna de horas** y cuánto mide en una ventana de 1280 px. La ficha ficticia supone 1000 px fijos.
- **Cuándo se pliega el `.MuiCollapse-root`** de las herramientas.

## Historial

`main > … > div.MuiGrid-container` con dos ítems:

1. **Filtros** (485 de 1942 px): `div.MuiCard-root` con título «Filtros», un botón de icono `PrintRoundedIcon` y un `form` con un interruptor, tres selectores (`addDays`, `multiple-select-role`, `multiple-select-categories`) y «Filtrar».
2. **Línea de tiempo**: un `div.MuiStack-root` con una `div.MuiBox-root` por evento o par de eventos. **No hay una caja por día.** En una ficha con 314 eventos: 15 cajas empiezan con el separador de fecha (`div.MuiStack-root > div.MuiChip-root`, «Hoy», «Ayer» o `dd-mm-aaaa`) seguido de una tarjeta, 287 tienen una sola tarjeta sin separador y 6 tienen dos tarjetas.

Cada evento es un `div.MuiCard-root`:

- `.MuiCardHeader-root` con `.MuiCardHeader-avatar > .MuiAvatar-root` (una letra), `.MuiCardHeader-content` (título y subtítulo: cargo y nombre; en 298 de 314 el título es el cargo) y `.MuiCardHeader-action > p` con la hora **siempre como «hh:mm hrs»**. Sin botones.
- `.MuiCardContent-root` en una de dos formas: `p` categoría + `div.MuiStack-root` (202 de 314), o un solo `div.MuiStack-root` cuyo primer hijo es el `p` de categoría (112 de 314).
- Categorías vistas: Administrador de medicamentos, Evolución, Orden de atención, Signos vitales, Procedimiento, Dispositivos invasivos, Indicación libre, Alertas, Fármacos.
- Evolución: `div.MuiStack-root` con una fila (`p` texto, chips «Nuevo» y otro) y un `p`.
- Administrador de medicamentos: una fila por fármaco (de 1 a 12), cada una con `p` y pares `span > span` rótulo y valor («Hora de administración», «Posología», «Dosis»…). Un evento llegó a 1508 px de alto.
- 110 de 314 eventos llevaban el chip «Nuevo».
- Leído el 27-11-2026: los pares rótulo y valor son `span.MuiTypography-body1`, el rótulo en peso 500 y el valor en peso 300. Algunos detalles son `p.MuiTypography-body2` en `rgb(128,128,128)` (3,9:1 sobre blanco). Los chips escriben a 10 px. Un signo vital fuera de rango se escribe en rojo puro.

## Lo que esto corrige en las fichas ficticias

- El Historial ficticio agrupaba todas las tarjetas de un día en una caja y escribía la hora sin «hrs».
- El Resumen ficticio usaba `input[type=date]` y un solo botón en la fila diaria, y daba `aria-label` a los botones de Evolución.
- El lápiz de Evolución es «Enmendar», no «Editar».
- No había ficha ficticia de Plan de tratamiento. La de `scripts/care-plan-visual-fixture.mjs` se escribió desde esta descripción.
- Las fichas ficticias del Resumen dibujaban Fármacos con tres o cuatro columnas, un menú por fila y una firma de tarjeta; «Imprimir indicaciones» como un botón con texto; Reposo vacío dentro de una sección; y los interruptores y botones de Eloísa a un tamaño que no tienen. Con la forma real, la 0.48.192 dejaba Reposo vacío como una tarjeta a todo el ancho y Régimen en tres líneas. `scripts/summary-visual-fixture.mjs` sigue esta descripción bloque por bloque.
- La del Resumen dibujaba Fármacos sin su segunda sección ni la línea de su validador, el campo de alerta sin el foco que Eloísa le da, la frase de Cirugía en un solo nodo, y no tenía Balance Hídrico, Eventos Adversos ni Examen Gíneco Obstétrico. Con esas formas, la 0.48.196 dejaba Fármacos 10 px más adentro con su título y su botón nativos, «Imprimir indicaciones» en una línea propia, el formulario de alertas abierto, y Cirugía, Balance y Gíneco a su tamaño nativo: lo que el responsable vio en su pantalla el 26-11-2026.
