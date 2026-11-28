# Arquitectura de la extensión Eloísa HHR

El manifiesto carga los adaptadores MAIN en el contexto de Rayen. Los scripts aislados
montan la interfaz y hacen solicitudes al service worker. El worker verifica la identidad
y el acceso para las operaciones clínicas. Eloísa y HHR conservan la autoridad sobre los
datos que cada sistema registra.

## Dónde empezar

| Flujo | Entrada y responsable | Autoridad y estado | Prueba |
| --- | --- | --- | --- |
| Listas de Rayen | [Adaptador MAIN](../extension/hhr-continuous-worklist-main.js), [episodio de la fila](../extension/hhr-worklist-print-column.js) y [composición de enfermería](../extension/hhr-nursing-worklist.js) | La fila y las acciones nativas pertenecen a Rayen. Las acciones de extensión comparten el episodio del enlace inequívoco. | [React con módulos sintéticos](../src/tests/rayen-import/unifiedNursingWorklist.test.js) |
| Presentación de listas, menú e Historial | [Listas y menú](../extension/hhr-native-worklist-presentation.js), [contenido del menú](../extension/hhr-worklist-drawer.js) e [Historial](../extension/hhr-history-date-navigation.js) | Los cambios de tablas y menú activan su propio refresco. El historial navega entre las publicaciones que Eloísa ya cargó. | [Listas en Chromium](../scripts/smoke-native-worklists.mjs), [diálogos y menú](../scripts/smoke-worklist-overlays.mjs) |
| Recetas y solicitudes | [Montaje de Centro HHR](../extension/content-prescription-print.js), [panel](../extension/hhr-center-shell-runtime.js) y [borradores](../extension/hhr-request-drafts.js) | El contexto del episodio se confirma antes de restaurar datos. El borrador de solicitud existe mientras el panel siga abierto. | [Panel en Chromium](../scripts/smoke-center-workspace.mjs) |
| Cambio de turno registrado en Eloísa | [Escritura clínica nativa](../extension/clinical-handoff-runtime.js) | Rayen conserva la observación. El worker comprueba permisos, vuelve a leer el registro y usa la [protección contra duplicados](../extension/clinical-write-runtime.js) ante un resultado incierto. | [Registro del cambio de turno](../src/tests/rayen-import/clinicalHandoffRuntimeExtension.test.ts) |
| Entrega de enfermería del censo HHR | [Montaje de fila](../extension/nursing-handoff-dialog.js), [editor aislado](../extension/nursing-handoff-editor.js) y [operaciones del worker](../extension/nursing-handoff-pilot.js) | HHR fija fecha censal, turno y versión. El worker vincula el acceso y el borrador de la vista al profesional y al episodio. La confirmación de HHR habilita el ✓. | [Autoridad y alcance](../src/tests/rayen-import/nursingHandoffPilot.test.js), [editor](../src/tests/rayen-import/nursingHandoffEditor.test.js) |
| Conexión y captura clínica | [Transporte de Ficha](../extension/fichamedico-transport-runtime.js), [contexto clínico](../extension/fichamedico-patient-context.js) y [captura coordinada](../extension/rayen-sync-bundle-runtime.js) | El worker verifica las sesiones y conserva por separado cada resultado de fuente. | [Paquete y reinyección](../scripts/smoke-rayen-extension-runtime.mjs) |

## Contrato del editor de entrega al censo HHR

[El contrato de mensajes](../extension/message-contract.js) valida la forma; el [worker](../extension/nursing-handoff-pilot.js)
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
| 3 | `extension/` por dominio. Se hace en un solo cambio, cuando no haya PR abiertas que lean rutas de `extension/` (las pruebas de Codex de la etapa 5 las leen): ficha (`hhr-ficha-*`, 26), fichamedico (18), gestion-camas (18), centro (`hhr-center*`, `hhr-lab*`, `hhr-prescription*`, recetas), clinico (`clinical-*`), urgencia (12), syslab (12), salud y relés (`health-*`, `relay-reinjection-*`, `connection-*`), contenido (`content-*`) y contratos. Un guion mueve los archivos y reescribe manifiesto, `importScripts` y rutas de pruebas y guiones | Ningún archivo en la raíz salvo el manifiesto y el worker |
| 4 | CSS: sin ids ficticios para ganar peso; cada `!important` que sobre, quitado con su medida antes y después | 0.48.239: ids ficticios de 10 a 4; el CI no deja sumar `!important` (745) ni ids ficticios. 0.48.242: Plan de tratamiento sin `!important` (745 → 645) |
| 5 | Las comprobaciones que leen el código fuente pasan a probar comportamiento | Ninguna prueba busca texto en el código |
| 6 | Utilidades repetidas (`normalize`, `plain`, `el`) en un módulo común | Una sola definición de cada una |
