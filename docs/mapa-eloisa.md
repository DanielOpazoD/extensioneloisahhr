# Mapa de Eloísa y de lo que la extensión transforma

Leído el 28-11-2026, con la extensión en 0.48.242. Este mapa sirve para elegir qué mejorar y para saber qué pantalla o proceso falta transformar. La forma de cada vista ya transformada está en [`estructura-eloisa.md`](estructura-eloisa.md), y las reglas de diseño están en [`estilo-ficha.md`](estilo-ficha.md).

**Cómo se obtuvo.** Las pantallas y los tipos de sección salen del código de Eloísa (`fichamedico.rayensalud.cl/_next`). Ese código se leyó desde la lista de Gestión de cuidados, que ya estaba abierta, sin abrir ninguna ficha. Lo que hace la extensión se tomó del manifiesto, del código de `extension/` y de la documentación. **Límite:** una pantalla marcada «sin tocar» se conoce por su ruta, pero no por su forma. Antes de transformarla hay que leerla en la página real, como se hizo con el Resumen.

Estados: **transformada** (la vista tiene un lector y su presentación propia), **parcial** (solo CSS común o un cambio puntual), **datos** (la extensión lee o descarga, pero no cambia la pantalla), **sin tocar**.

## 1. Pantallas del menú de Eloísa

| Pantalla | Ruta | Estado | Dónde |
| --- | --- | --- | --- |
| Lista de trabajo médico (no asignados, asignados, con alta, interconsultas) | `/dashboard/encounter-list` | Transformada: tabla compacta, columna «Imprimir», orden por cama | `hhr-continuous-worklist-main.js`, `hhr-native-worklist-presentation.js`, `hhr-worklist-print-column.js`; [capturas](visual/listas-de-trabajo/README.md) |
| Gestión de cuidados (lista de enfermería) | `/dashboard/encounter-list-nurse` | Transformada: une tres fuentes, muestra la novedad y agrega un lápiz que abre Camas | `hhr-nursing-worklist.js`, `hhr-nursing-novelty.js`, `worklist-patient-editor.js` |
| Lista de otros profesionales | `/dashboard/encounter-list-allied` | **Sin tocar**: ningún archivo la nombra | — |
| Ejecución de cuidados | `/dashboard/care-plan-execute` y la pestaña de la ficha de cuidados | **Parcial**: solo CSS (`data-hhr-ficha-view="care-execution"`) | `hhr-ficha-views.css` |
| Episodios cerrados | `/dashboard/past-encounter` | **Sin tocar** | — |
| Informes | `/dashboard/reports` | Datos: descarga los PDF; la pantalla no cambia | `hospitalization-reports-runtime.js`, `epicrisis-*.js` |
| Solicitudes de farmacia | `/dashboard/pharmacy-request` | **Sin tocar** | — |
| Menú lateral | todas | Agrega Favoritos, «Un día como hoy» y el clima | `hhr-worklist-drawer.js`, `hhr-favorite-links.js` |

## 2. La ficha: pestañas y marco

| Parte | Estado | Dónde |
| --- | --- | --- |
| Resumen, en la ficha médica y en la de Gestión de cuidados | Transformada (la ronda) | `hhr-native-ficha-presentation.js`, `hhr-ficha-round-layout.*`, `hhr-ficha-reading-*`; [capturas](visual/resumen-escritorio/README.md) |
| Plan de tratamiento | Transformada; pide de 7 a 14 horas | `hhr-ficha-care-plan.*`, `hhr-plan-hours.js`; [capturas](visual/plan-tratamiento/README.md) |
| Historial | Transformada, con navegador de fechas | `hhr-history-date-navigation.js`, `hhr-ficha-history.css`; [capturas](visual/historial/README.md) |
| Alta: asistente de tres pasos | **Parcial**: solo CSS | `hhr-ficha-views.css` |
| Antecedentes | **Sin tocar**: en la ficha leída no tenía contenido (CHANGELOG) | — |
| Barra verde | Parcial: el nombre abre la lista de pacientes y oculta el diagnóstico. Aislamiento y gestor documental sin cambio | `hhr-ficha-patient-switcher.*` |
| Cambio de pestaña | Transformada (transición) | `hhr-ficha-transitions.*` |
| Todo, con el tema «Desactivado» | Nativo, a propósito | `hhr-ficha-themes.js` |

## 3. Secciones del Resumen

El código de Eloísa define 35 tipos de sección (`<tipo>Entry` / `<tipo>EntrySection`). Esta tabla las ordena según lo que la extensión sabe de cada una.

| Qué sabe la vista | Secciones |
| --- | --- |
| **Modeladas**: lectura y lugar propios en la ronda | Diagnóstico, Evolución (`observation`), Observaciones de entrega (`shiftChange`), Alertas, Signos vitales, Reposo, Régimen (`nutritionOrder`), Fármacos y diluciones, Indicaciones libres, Solicitud de examen (`diagnosisTest`), Órdenes de procedimiento |
| **Estilo común**: se reconocen por su id. Vacías, van en una línea bajo «Sin datos»; con registros toman solo la letra y el margen de la vista | Procedimientos, Solicitud de interconsulta (`referralRequest`), Intervención quirúrgica (`operationTheaterRequest`), Balance hídrico, Dispositivos invasivos, Examen físico, No farmacológico (`noPharma`) |
| **Sin referencia en la extensión**: solo les llega la regla general («lo que no se reconoce no se toca») | Eventos adversos, Alergias, RAM, Antecedentes familiares, Servicio médico, Formulario dinámico, Formulario de atención (`encounterForm`: los puntajes se escriben ahí, pero no se presenta), Examen gíneco-obstétrico, Examen físico segmentario, Informe de interconsulta (`referralReport`), Cuidados de tratamiento (`treatmenCare`), y las variantes de Fármacos de alta (`medicationDischarge`, `medicationDilutionDischarge`, `medicationFreeDischarge`, `medicationFreeIndication`, `medicationDilution`) |

Algunas de la última fila pueden aparecer solo en Alta o en Antecedentes, y no en el Resumen. Para saberlo hay que leerlas en una ficha que las tenga.

## 4. Ventanas y procesos de Eloísa

| Ventana o proceso | Estado |
| --- | --- |
| Planificación estándar o única, y su menú (Plan) | Transformada |
| Confirmaciones (preguntas Sí/No) | Parcial: un solo estilo, en CSS |
| Editores de Evolución, Alertas, Entrega y Diagnóstico | Sin cambio visual. Evolución recibe las pautas (Braden, Caídas) como texto insertado |
| Asistente de alta y egreso | Parcial (CSS). El menú de la fila agrega «Alta corregida» y la epicrisis de enfermería |
| «Leer más» de Alertas y Entrega | La vista lo abre una vez y no dibuja la vuelta |
| Solicitud de examen | Se agrega «Imprimir selección» |

## 5. Superficies propias de la extensión

Centro HHR (barra y panel), Recetas e indicaciones, Laboratorio (Syslab y solicitud), Imágenes (solicitud, contraste, consentimiento), Conexiones, Ajustes, Entrega de turno al censo HHR (escribe en HHR y en Eloísa), lector «Ver evoluciones» y el popup. Su entrada está en [`arquitectura.md`](arquitectura.md).

## 6. Otros sistemas

| Sistema | Estado |
| --- | --- |
| Gestión de Camas (`hospitalizado.rayensalud.cl`) | Datos: captura camas, CUDYR y egresos, y muestra el indicador de conexión. La pantalla no se transforma |
| Syslab | Datos (puente) |
| Urgencia (`urgencia.saludenred.cl`) | Sin content script. HHR la abre y lee el DAU |
| `exalab` | Opcional, mediante `exalab-connect.html` |

## 7. Lo que queda por transformar

El orden sugerido pone primero lo que se usa a diario y lo que es barato porque se parece a lo ya hecho:

1. **Lista de otros profesionales**: probablemente es la misma tabla que las otras dos listas. Habría que confirmar su forma y aplicarle la presentación de listas.
2. **Ejecución de cuidados**: enfermería la usa a diario y hoy solo recibe CSS. Puede seguir el lenguaje del Plan (grilla de horas).
3. **Alta**: es un proceso de tres pasos y hoy solo recibe CSS. Primero hay que leer el asistente completo en la página.
4. **Secciones con registros sin modelar** (Procedimientos, Interconsulta, Quirúrgica, Examen físico, Dispositivos, Balance): hay que leer su forma con registros y darles un lugar en la ronda.
5. **Editores nativos** (Evolución, Alertas, Entrega, Diagnóstico): campos y botones con el lenguaje de la ventana de planificación.
6. **Antecedentes**: falta leerla en una ficha que tenga contenido.
7. **Episodios cerrados, Solicitudes de farmacia, Informes y Gestión de Camas**: sin presentación propia.

**Para completar el mapa** hay que leer en la página real las pantallas marcadas «sin tocar» y las secciones de la última fila de la tabla 3. Eso requiere que el responsable abra esas pantallas, porque la extensión solo lee lo que ya está abierto.
