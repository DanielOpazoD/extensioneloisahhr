# Arquitectura de la extensión Eloísa HHR

El manifiesto carga los adaptadores MAIN en el contexto de Rayen. Los scripts aislados
montan la interfaz y hacen solicitudes al service worker. El worker verifica la identidad
y el acceso para las operaciones clínicas. Eloísa y HHR conservan la autoridad sobre los
datos que cada sistema registra.

## Dónde empezar

| Flujo | Entrada y responsable | Autoridad y estado | Prueba |
| --- | --- | --- | --- |
| Listas de Rayen | [Adaptador MAIN](../extension/listas/hhr-continuous-worklist-main.js), [episodio de la fila](../extension/listas/hhr-worklist-print-column.js) y [composición de enfermería](../extension/listas/hhr-nursing-worklist.js) | La fila y las acciones nativas pertenecen a Rayen. Las acciones de extensión comparten el episodio del enlace inequívoco. | [React con módulos sintéticos](../src/tests/rayen-import/unifiedNursingWorklist.test.js) |
| Presentación de listas, menú e Historial | [Listas y menú](../extension/listas/hhr-native-worklist-presentation.js), [contenido del menú](../extension/listas/hhr-worklist-drawer.js) e [Historial](../extension/ficha/hhr-history-date-navigation.js) | Los cambios de tablas y menú activan su propio refresco. El historial navega entre las publicaciones que Eloísa ya cargó. | [Listas en Chromium](../scripts/smoke-native-worklists.mjs), [diálogos y menú](../scripts/smoke-worklist-overlays.mjs) |
| Recetas y solicitudes | [Montaje de Centro HHR](../extension/contenido/content-prescription-print.js), [panel](../extension/centro/hhr-center-shell-runtime.js) y [borradores](../extension/centro/hhr-request-drafts.js) | El contexto del episodio se confirma antes de restaurar datos. El borrador de solicitud existe mientras el panel siga abierto. | [Panel en Chromium](../scripts/smoke-center-workspace.mjs) |
| Cambio de turno registrado en Eloísa | [Escritura clínica nativa](../extension/clinico/clinical-handoff-runtime.js) | Rayen conserva la observación. El worker comprueba permisos, vuelve a leer el registro y usa la [protección contra duplicados](../extension/clinico/clinical-write-runtime.js) ante un resultado incierto. | [Registro del cambio de turno](../src/tests/rayen-import/clinicalHandoffRuntimeExtension.test.ts) |
| Entrega de enfermería del censo HHR | [Montaje de fila](../extension/entrega-enfermeria/nursing-handoff-dialog.js), [editor aislado](../extension/entrega-enfermeria/nursing-handoff-editor.js) y [operaciones del worker](../extension/entrega-enfermeria/nursing-handoff-pilot.js) | HHR fija fecha censal, turno y versión. El worker vincula el acceso y el borrador de la vista al profesional y al episodio. La confirmación de HHR habilita el ✓. | [Autoridad y alcance](../src/tests/rayen-import/nursingHandoffPilot.test.js), [editor](../src/tests/rayen-import/nursingHandoffEditor.test.js) |
| Conexión y captura clínica | [Transporte de Ficha](../extension/fichamedico/fichamedico-transport-runtime.js), [contexto clínico](../extension/fichamedico/fichamedico-patient-context.js) y [captura coordinada](../extension/censo/rayen-sync-bundle-runtime.js) | El worker verifica las sesiones y conserva por separado cada resultado de fuente. | [Paquete y reinyección](../scripts/smoke-rayen-extension-runtime.mjs) |

## Contrato del editor de entrega al censo HHR

[El contrato de mensajes](../extension/contratos/message-contract.js) valida la forma; el [worker](../extension/entrega-enfermeria/nursing-handoff-pilot.js)
comprueba el origen, propietario y documento. Las decisiones clínicas se mantienen en su
operación y se prueban por separado.

| Acción | Quién la envía | Datos y resultado |
| --- | --- | --- |
| Abrir | Lista de enfermería | Episodio. Devuelve un identificador de editor para el documento actual. |
| `context`, `read` | Marco del editor | Identificador de editor y, para relecturas, fecha, turno y versión conocida. Devuelve el contexto o el registro verificado. |
| `draft`, `save` | Marco del editor | Identificador, fecha, turno y versión. `draft` omite el texto al retirar el borrador. `save` exige el texto y espera confirmación de HHR. |
| `connect`, `disconnect`, `connect-inline` | Marco del editor o, para `connect-inline`, documento de la lista | Identificador. El worker verifica la pertenencia al documento y a la sesión que abrió el editor. |
| `hosted-result` | Portal de conexión de HHR | Identificador de la solicitud y vencimiento cuando se autoriza. HHR conserva su control de conexión. |
| `close` | Documento de la lista | Identificador. Revoca el editor al salir o al retirar la fila. |

Los fallos inesperados del enrutador devuelven `OPERATION_FAILED` y el texto previsto
para la operación. Los estados de dominio siguen distinguiendo cambio de sesión,
conflicto, guardado incierto y confirmación.

## Verificación de cambios

Para cada cambio, ubicar la entrada, el responsable del estado, la fuente autorizada
y una prueba que compruebe el resultado visible. Ante cambios de Rayen desconocidos,
probar que la vista nativa sigue disponible. Para una acción clínica, probar también
identidad ambigua y cambio de sesión o episodio con datos sintéticos.

## Carpetas de `extension/`

Desde 0.48.243 cada archivo vive en la carpeta de su tema. La carpeta no cambia cómo se carga: el
manifiesto, `importScripts` del worker y los `<script src>` de las páginas nombran la ruta completa
(`ficha/hhr-ficha-themes.css`) y siguen decidiendo dónde y en qué orden. [El guion del cambio](../scripts/move-extension-files.mjs)
(`--plan` muestra el reparto) es el registro de qué archivo fue a cada carpeta; `--refs` reescribe las
referencias a los nombres antiguos y puede volver a correrse sobre una rama que se rebasa.

| Carpeta | Qué contiene |
| --- | --- |
| raíz | `manifest.json`, `background.js` (las rutas de `importScripts` son relativas a él), `vendor-lock.json` y las páginas HTML. Las páginas no se mueven porque se abren por su dirección: el popup, el documento offscreen, las ventanas de Syslab y Exalab, el editor de entrega y el acceso a Urgencias que HHR reconoce por `/urgency-login.html`. |
| `ficha/` | Presentación compacta de la ficha: `hhr-ficha-*` (JS y CSS), `ficha/hhr-native-ficha-presentation.js`, el Historial, el Plan y las notas de evolución. |
| `listas/` | Listas de trabajo de Eloísa, el menú lateral (clima, nacimientos, accesos) y el regreso a la lista. |
| `centro/` | Centro HHR: panel, recetas, laboratorio, imágenes, solicitudes, vista previa de documentos y `centro/hhr-ui.js`. |
| `clinico/` | Lecturas y escrituras clínicas (`clinical-*`), pautas, antecedentes y la autorización por episodio. |
| `fichamedico/` | Lector de Ficha Médico (`fichamedico-*`) y su adaptador MAIN `fichamedico/inject-fichamedico.js`. |
| `gestion-camas/` | Gestión de Camas (`gestion-camas-*`), CUDYR, su adaptador MAIN y el editor de pacientes. |
| `censo/` | Captura coordinada del censo Rayen → HHR y su recuperación. |
| `documentos/` | Epicrisis, informes, auditoría, impresión de PDF y el ZIP de auditoría. |
| `entrega-enfermeria/` | Entrega de enfermería al censo HHR (`nursing-handoff-*`). |
| `urgencia/` | Acceso a Rayen Urgencias y DAU (`urgency-*`). |
| `syslab/` | Syslab, el visor de resultados y el documento offscreen. |
| `exalab/` | Conexión personal con Exalab. |
| `salud/` | Salud de la conexión, relés y su reinyección, generación de ejecución y reparación. |
| `contenido/` | Entradas de los content scripts (`content-*`). |
| `contratos/` | Contratos compartidos entre mundos: mensajes, offscreen, código de traspaso, errores de lectura y orígenes HHR. |
| `estado/` | Popup de estado, descarga e identidad del paquete. |
| `vendor/` | Bibliotecas de terceros fijadas en `vendor-lock.json` (jsPDF, pdf-lib, xlsx, PDF.js). |
| `icons/`, `forms/`, `installation/` | Imágenes y formularios oficiales. |

## Comprobaciones de estructura

La extensión no tiene un sistema de módulos: cada archivo publica un objeto (`globalThis.HhrX`) y el
manifiesto, o `importScripts` del worker, decide dónde y en qué orden se carga. Dos comprobaciones sin
dependencias corren primero en CI:

- `npm run check:load-order` ([script](../scripts/check-load-order.mjs)) lee cada mundo del manifiesto (worker,
  páginas, MAIN y aislado) y falla si un archivo usa un miembro de un objeto que ningún archivo de su mundo
  define. Una lectura que tolera la ausencia (`HhrX?.`, `HhrX ?? …`) no cuenta.
- `npm run check:shape` ([script](../scripts/check-code-shape.mjs)) es un trinquete: las líneas de más de 160
  caracteres y los archivos de más de 800 líneas pueden bajar, nunca subir, respecto de
  [la línea base](../scripts/code-shape-baseline.json). Al mejorar, `node scripts/check-code-shape.mjs --update`.

El CI corre en tres trabajos a la vez (unitarias y paquete, extensión en Chromium, capturas de las vistas) y
`extension-ci`, la comprobación que piden `main` y la publicación, pasa solo si los tres pasaron.

## Plan de mejora técnica (27-11-2026)

Medido en 0.48.237: 246 archivos JS en una carpeta plana, 203 objetos globales, 442 líneas de más de 160
caracteres, 495 `!important` en el CSS, 275 comprobaciones que buscan texto en el código fuente y un CI de
4 min 40 s. Cada etapa es un cambio propio, con las capturas como red.

| Etapa | Qué | Meta |
| --- | --- | --- |
| 1 | Orden de carga y forma del código en CI; CI en paralelo; esperas por condición | Hecho en este cambio |
| 2 | `background.js` legible: sin líneas anchas, la autorización por episodio con nombre; el presupuesto de líneas sube a 1.650 porque el ancho ya lo vigila `check:shape` | Hecho en 0.48.238 (25 → 0 líneas anchas) |
| 3 | `extension/` por tema, en un solo cambio con un guion que mueve los archivos y reescribe manifiesto, `importScripts`, páginas, pruebas, guiones y documentación | Hecho en 0.48.243: 267 archivos en 18 carpetas; en la raíz quedan el manifiesto, el worker, `vendor-lock.json` y las páginas ([mapa](#carpetas-de-extension)) |
| 4 | CSS: sin ids ficticios para ganar peso; cada `!important` que sobre, quitado con su medida antes y después | 0.48.239: ids ficticios de 10 a 4; el CI no deja sumar `!important` (745) ni ids ficticios. 0.48.242: Plan de tratamiento sin `!important` (745 → 645) |
| 5 | Las comprobaciones que leen el código fuente pasan a probar comportamiento | Ninguna prueba busca texto en el código |
| 6 | Utilidades repetidas (`normalize`, `plain`, `el`) en un módulo común | Una sola definición de cada una |
