# Estructura de la ficha de Eloísa

Lo que sigue se observó el 25-11-2026 en la ficha médica real (`/dashboard/encounter-list/{id}`), con el exportador de [`scripts/export-ficha-structure.snippet.js`](../scripts/export-ficha-structure.snippet.js): solo estructura, sin textos clínicos, nombres ni cifras. Los rótulos citados son palabras de la interfaz. Las fichas ficticias de `scripts/*-visual-fixture.mjs` deben seguir estas formas.

## Marco común

- `main` deja 32 px a cada lado. El fondo de la página es `#f1f1f1`; las tarjetas son blancas, sin sombra, con esquinas de 12 px. Toda la página usa Inter («Inter, "Inter Fallback"»). Medido el 26-11-2026 en una ventana de 1990 px.
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

### Fila diaria

`div.MuiGrid-item` (flex) con dos hijos:

1. `p.MuiTypography-root`: «Última actualización: dd-mm-aaaa, hh:mm - Nombre».
2. `div.MuiStack-root` con: un `form.MuiStack-root` (campo MUI «Resumen diario paciente» con `input[type=text]` de marcador `dd/mm/aaaa`, un botón de calendario dentro del campo y un `button[type=submit]` «Imprimir»), un `hr.MuiDivider-vertical` y un botón de icono `LocalPrintshopRoundedIcon`.

No hay `input[type=date]`. La fila tiene cuatro controles.

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

`div#alertEntries`: `.MuiCardContent-root` con `div.MuiBox-root` (alto máximo de 250 px con desplazamiento propio; una `div.MuiStack-root` por alerta: una pila con `p` «Cargo Nombre» y `div > span` mensaje; otra con `span.MuiTypography-caption` antigüedad y `div.MuiStack-root > button[aria-label="Archivar"] > svg[data-testid=ArchiveRoundedIcon]`) y un `form.MuiStack-root` con los interruptores «No reanimación» y «Gestión de Visitas» y el campo «Observaciones» con «Agregar». Una ficha tenía quince alertas.

### Fármacos

- Cabecera con título «Fármacos» y subtítulo vacío: la tarjeta no lleva firma. Acciones en un `div.MuiStack-root`: `button.MuiButton-contained.MuiButton-containedSecondary` «validar tratamiento» (el texto está en minúsculas y se muestra en mayúsculas; 195 × 38 px), interruptor «Mostrar Suspendidos», botón de icono `LocalPrintshopRoundedIcon` con nombre en su `svg`.
- Columnas (`th` fijas): Tiempo, Indication, Posología, Indicaciones específicas, Solicitante, Acciones.
- Celdas: tiempo en `div.MuiBox-root` con `svg[data-testid=ChangeHistoryRoundedIcon]` y un número de una o dos cifras, que son los días de tratamiento (lo confirmó el responsable clínico el 25-11-2026); el fármaco en un `div.MuiStack-root` con su `span.MuiTypography-caption` y otra pila con sus chips (por ejemplo «SOS»); posología e indicaciones específicas en `div.MuiBox-root > span.MuiTypography-caption`; el solicitante en un `span.MuiTypography-caption`.
- **Un texto largo llega cortado.** Posología e indicaciones específicas se cortan hacia los 48 caracteres con «...» y llevan debajo un `div.MuiBox-root > button.MuiButton-text` «Leer más», en su propia línea: 10 de 14 posologías en la lista leída.
- En una lista de 14: nombres de 24 a 113 caracteres (mediana 35), solicitantes de 12 a 17.
- Acciones por fila: `CancelIcon` («Suspender») y `SpeakerNotesIcon` («Ver notas», deshabilitado sin notas), de tamaño pequeño, y `MoreVertIcon`, de tamaño mediano y con `aria-haspopup`; el nombre está en el `svg`.

### Diagnóstico

`section#diagnosisEntrySection > div.MuiCard-root#diagnosisEntry`, tras Fármacos, Producto no Farmacológico, Indicaciones Libres y Procedimientos: en una ficha estaba a 2,5 pantallas del inicio.

- Cabecera con título, subtítulo «Última actualización: …, Médico Nombre» y acciones vacías.
- `.MuiCardContent-root > div.MuiPaper-root > div.MuiTableContainer-root > table` con siete columnas: una sin rótulo, Diagnóstico, Estado, Fecha, GES, Eno, Acciones.
- Fila: `svg[data-testid=StarRoundedIcon]` en el diagnóstico principal; un `div.MuiStack-root` con una etiqueta de dos palabras (`div.MuiBox-root > span.MuiTypography-caption`) y el texto «código: descripción» en otro `span.MuiTypography-caption`; el estado en un selector de MUI (`div[role=combobox]#select-diagnosis-status`, 196 × 40 px, habilitado); la fecha; GES y Eno vacíos; y dos botones pequeños, `SpeakerNotesIcon` («Ver notas», deshabilitado) y `NoteAddIcon` («Agregar notas»).

### Otras tablas

| Tarjeta | Columnas |
| --- | --- |
| Indicaciones Libres | Indication, Programación, Solicitante, Acciones |
| Procedimientos | Indicación, Estado, Fecha solicitud, Para, Nº de sesiones, Fundamentos, Solicitante, Acciones |
| Solicitud interconsulta | Especialidad, Destino, Estado, Fecha solicitud, Interconsultor, Motivo, Acciones |
| Órdenes de atención | Profesional, Estado, Fecha solicitud, Asignado, Motivo, Indicaciones, Acciones |
| Solicitud de examen | Grupo de exámenes, Nro. Orden, Estado Orden, Fecha solicitud, Examen(es), Observaciones, Estado, Acciones |

Las filas de Indicaciones Libres llevan las mismas tres acciones que las de Fármacos. Una ficha tenía 20 botones «Leer más» en sus tablas.

### Línea de secciones

Doce enlaces `div.MuiGrid-item > span.MuiBadge-root > span.MuiTypography-caption`, en este orden: Alertas, Diagnóstico, Solicitud de examen, Indicaciones (Indicación Libre), Indicaciones (Medicamento), Indicaciones (Régimen), Evolución, Solicitudes de intervención quirúrgica, Procedimientos, Órdenes de atención, Solicitud interconsulta, Signos vitales. **No es el orden de la página.**

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

## Lo que esto corrige en las fichas ficticias

- El Historial ficticio agrupaba todas las tarjetas de un día en una caja y escribía la hora sin «hrs».
- El Resumen ficticio usaba `input[type=date]` y un solo botón en la fila diaria, y daba `aria-label` a los botones de Evolución.
- El lápiz de Evolución es «Enmendar», no «Editar».
- No había ficha ficticia de Plan de tratamiento. La de `scripts/care-plan-visual-fixture.mjs` se escribió desde esta descripción.
- Las fichas ficticias del Resumen dibujaban Fármacos con tres o cuatro columnas, un menú por fila y una firma de tarjeta; «Imprimir indicaciones» como un botón con texto; Reposo vacío dentro de una sección; y los interruptores y botones de Eloísa a un tamaño que no tienen. Con la forma real, la 0.48.192 dejaba Reposo vacío como una tarjeta a todo el ancho y Régimen en tres líneas. `scripts/summary-visual-fixture.mjs` sigue esta descripción bloque por bloque.
