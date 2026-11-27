# Resumen compacto en escritorio

## Alertas con la forma del resto, en 0.48.214

El responsable aceptó dar a Alertas la forma del resto del Resumen. Se leyó la tarjeta en la página, en las dos fichas (26-11-2026).

| Captura, 1488 × 910, nota breve y tres alertas | 0.48.213 | 0.48.214 |
| --- | --- | --- |
| Evolución, Entrega y Alertas | [Antes](0.48.214/antes/1488-alertas.png) | [Después](0.48.214/despues/1488-alertas.png) |

| Medida en la página, con el estilo aplicado a mano (igual en las dos fichas) | Antes | Ahora |
| --- | ---: | ---: |
| Alto de una alerta | 49–50 px | 45–46 px |
| Barra ámbar por fila | 2 px en cada una | ninguna; una marca de 7 px junto al título |
| Peso del texto de la alerta | 600 | 400 |
| Tinta de quién y cuándo | la del texto | gris `rgb(102,102,102)` |
| «No reanimación» sin marcar | barra de 2 px y negrita | como el interruptor de al lado |

| Medida en la ficha ficticia, nota de tres líneas y tres alertas | 0.48.213 | 0.48.214 |
| --- | ---: | ---: |
| Alto de la tarjeta de Alertas | 144 px: la lista se cortaba dentro de la primera alerta | 258 px: las tres alertas enteras |
| Borde inferior de la nota y de Alertas | el mismo | el mismo |

El alto mínimo que sigue a la lista depende del script de la extensión: no se pudo ver en la página.

## Un solo botón, en 0.48.213

El responsable aceptó unificar los botones del Resumen. Se leyeron en la página, en las dos fichas (26-11-2026).

| Botón | Antes | Ahora (con el estilo aplicado en la página) |
| --- | --- | --- |
| «Imprimir» (fila diaria) | relleno verde `rgb(21,149,136)`, texto blanco, esquina 8 px, 26 px | sin relleno, tinta `rgb(40,95,89)`, línea `rgb(196,216,209)`, esquina 6 px, 26 px |
| «Validar tratamiento» | relleno naranja `rgb(230,74,25)`, texto blanco, esquina 8 px, 28 px | lo mismo, 26 px |
| «Filtrar» (Balance Hídrico) | relleno verde, texto blanco, 13 px, 30 px | lo mismo, 12 px, 30 px como los campos de su fila |
| «Agregar» y «Agregar alerta» | contorno, esquina 4 px, 26 px | lo mismo, esquina 6 px |

| Captura, 1440 × 900 | 0.48.212 | 0.48.213 |
| --- | --- | --- |
| Primera pantalla | [Antes](0.48.213/antes/1440-resumen.png) | [Después](0.48.213/despues/1440-resumen.png) |

En la ficha ficticia «Validar tratamiento» pasa a tener el naranja de la página en la captura de «antes»: hasta ahora se dibujaba en morado.

## La carga sin saltos, medida con la versión instalada, en 0.48.212

Con la 0.48.211 instalada se midió la carga de la ficha médica y de la de Gestión de cuidados, cuadro por cuadro y sin datos clínicos (26-11-2026, 1500 × 950 px). Las dos se comportan igual.

| Qué se veía | Por qué | Con las reglas nuevas aplicadas en la página |
| --- | --- | --- |
| Diagnóstico a 174 px y luego a 114 | el margen alto de la ronda esperaba a la línea de enlaces | 110 px desde el primer cuadro |
| La nota a 262 px y luego a 208 | lo mismo | 198 → 204 px |
| Enlaces de sección a la vista unos 160 ms | la línea se reconocía por el enlace de la nota, que llega con la nota | 0 enlaces en todos los cuadros |
| La fecha del resumen diario un instante en su línea | su acople también esperaba a esa línea | de la espera a la línea de pestañas |

| Qué se veía | Por qué | Cómo se corrige |
| --- | --- | --- |
| Signos vitales un cuadro con 624 px (final 134) | Eloísa lo dibujó dentro del cuadro, después del turno de la vista | lo pendiente se presenta al cambiar el tamaño de la página, antes del pintado |
| Diagnóstico un cuadro con 130 px (final 82) | lo mismo | lo mismo |

La segunda tabla no se pudo comprobar en la página: depende del script de la extensión instalada. La comprueba la extensión instalada en la prueba del CI, con un apartado que se dibuja dentro de un `requestAnimationFrame`.

## Lector de evoluciones desde la lista, icono de suspendidos y nota breve con el alto de su bloque, en 0.48.211

El responsable avisó que «Ver evoluciones» respondía «Las evoluciones no fueron autorizadas para el episodio de esta pestaña», y pidió quitar «Imprimir selección» de las órdenes de examen, un icono para ver lo suspendido en lugar del interruptor con su texto, que una evolución breve tenga el alto de Entrega y Alertas, y una interfaz más limpia.

| Qué | 0.48.210 | 0.48.211 |
| --- | --- | --- |
| Página completa, 1440 × 900 | [Antes](0.48.211/antes/1440-resumen-completo.png) | [Después](0.48.211/despues/1440-resumen-completo.png) |
| Evolución breve, 1488 × 910 | [Antes](0.48.211/antes/1488-nota-breve.png) | [Después](0.48.211/despues/1488-nota-breve.png) |

| Medida | 0.48.210 | 0.48.211 |
| --- | ---: | ---: |
| «Ver evoluciones» al entrar desde la lista (en la página) | rechazado siempre | lee con la dirección de la pestaña |
| Borde inferior de una nota de tres líneas respecto de Alertas (ficha ficticia) | 63 px más arriba | el mismo |
| «Mostrar suspendidos» en un encabezado (en la página, con el estilo aplicado a mano) | 167 × 29 px, interruptor y texto | 28 × 28 px, icono |
| «Mostrar suspendidos» en una línea de «Sin datos» | 167 × 29 px | 20 × 20 px, tras el estado |
| «Imprimir selección (n órdenes)» | a la vista | no se dibuja |

Lo que no se ha visto sobre Eloísa: el lector abriendo desde la lista con la versión nueva (el arreglo está en el servicio de la extensión, que no puedo cambiar en la pestaña), y «Imprimir selección» oculto, porque el paciente leído no tiene solicitudes de examen.

## La ronda armada desde la carga, sin plegado de vacías ni flecha en la nota, en 0.48.210

El responsable instaló la 0.48.209 y avisó que aún se veía el aspecto antiguo al cargar y actualizar. Pidió además quitar la flecha que contraía la evolución, que toda sección vacía esté siempre en «Sin datos» (sin «Ver vacías» ni «Ocultar vacías») y alinear mejor Fármacos e Indicaciones libres.

Lo que se midió en la página con la 0.48.209 instalada (26-11-2026, cuadro por cuadro, sin datos clínicos):

| Qué se veía | Por qué | Ahora |
| --- | --- | --- |
| La nota a media anchura y Alertas y Reposo bajo ella, unos 200 ms | la ronda no se armaba hasta que llegaban la nota **y** la entrega de turno | la ronda se arma con los marcadores de carga: cada apartado llega a su lugar |
| Evolución bajaba de 114 a 200 px al llegar Diagnóstico | Diagnóstico entra arriba de la ronda | su marcador ya está arriba, con el alto de dos diagnósticos |
| La fila del resumen diario un instante en su línea, antes de acoplarse | esperaba a la línea de enlaces, que Eloísa dibuja después | se acopla en el pase que arma la ronda |

| Carga, 1440 × 900 | 0.48.209 | 0.48.210 |
| --- | --- | --- |
| Todo en carga | [Antes](0.48.210/antes/1440-cargando.png) | [Después](0.48.210/despues/1440-cargando.png) |
| Con la nota, la entrega, los signos y las alertas | [Antes](0.48.210/antes/1440-cargando-parcial.png) | [Después](0.48.210/despues/1440-cargando-parcial.png) |
| Página completa | [Antes](0.48.210/antes/1440-resumen-completo.png) | [Después](0.48.210/despues/1440-resumen-completo.png) |

| Medida, ficha ficticia a 1440 × 900 | 0.48.209 | 0.48.210 |
| --- | ---: | ---: |
| Lugar de la nota con todo en carga → con todo cargado | sin lugar → 224 px | 190 → 236 px, misma columna y tamaño |
| Alto del marcador de Evolución | 50 px | 311 px, el de la nota |
| Botones «Ver vacías» / «Ocultar vacías» | 1 | 0 |
| Secciones bajo «Sin datos» | 5 a la vista, 4 plegadas | 9 a la vista |
| Flecha que contrae la nota | a la vista | no se dibuja |

| Medida en la página, con las reglas aplicadas a mano (ficha médica, 1672 × 910 px) | 0.48.209 | 0.48.210 |
| --- | ---: | ---: |
| Borde de la tabla de Fármacos respecto de su tarjeta | 16 px adentro | al borde, como Indicaciones libres |
| Primera columna de Fármacos respecto del título | 7 px adentro | en el mismo borde |
| Alto de una fila de Fármacos | 39 px | 31 px |
| Alto de una fila de Indicaciones libres | 27 px | 31 px |

Los 46 px que aún baja la nota en la ficha ficticia son la fila del resumen diario, que en esa página no se acopla (30 px), y un Diagnóstico de dos filas, más alto que su marcador. En la página la fila se acopla en la línea de pestañas.

Lo que no se ha visto sobre Eloísa: la ronda armada con los marcadores. La página carga la extensión instalada; los estilos sí se aplicaron a mano allí. Lo comprueban [`capture-loading.mjs`](../../../scripts/capture-loading.mjs) y la extensión instalada en la prueba del CI.

## La ficha llega en la vista, y Evolución con una sola línea de acciones, en 0.48.209

El responsable grabó la carga de la ficha: se veía pasar del aspecto de Eloísa al de la vista. Pidió que la carga y la actualización fueran fluidas, «que parezca que el entorno nuevo es el original y no una maqueta», y que Evolución y Valoración fueran más minimalistas, con los botones unificados y más espacio para leer la evolución completa.

Lo que se leyó en la página (26-11-2026, ficha médica, al pasar de la lista a la ficha, sin datos clínicos):

| Momento | Qué dibujaba Eloísa | Qué hacía la vista (0.48.208) |
| --- | --- | --- |
| ~1,3 s | 24 marcadores de carga de 176 px: 4.047 px de página | nada: los marcadores no tienen `id` |
| ~1,5 s | la nota, en su lugar de Eloísa | la presentaba 80 ms después de cada cambio: 300 ms de página con forma de Eloísa |
| 1,6 a 2,2 s | el resto de los apartados | la página pasaba por 3.386, 3.054, 3.205, 1.888, 2.293 y 1.895 px |
| ~5,1 s | los apartados tardíos | 140 ms con su forma de Eloísa: de 2.149 a 1.456 px |

| Carga | 0.48.208 | 0.48.209 |
| --- | --- | --- |
| Todo en carga, 1440 × 900 | [Antes](0.48.209/antes/1440-cargando.png) | [Después](0.48.209/despues/1440-cargando.png) |
| Con la nota, la entrega, los signos y las alertas | [Antes](0.48.209/antes/1440-cargando-parcial.png) | [Después](0.48.209/despues/1440-cargando-parcial.png) |

En el «antes» las hojas de estilo y los scripts son los de la 0.48.208, presentados en el mismo instante: lo que la captura no muestra es su espera de 80 ms, que es lo que se veía en la página.

| Medida | 0.48.208 | 0.48.209 |
| --- | ---: | ---: |
| Alto de un marcador de carga | 176 px | 50 px |
| Página con todo en carga, en la página real | 4.047 px | 1.603 px (termina en 1.392) |
| Página con todo en carga, ficha ficticia a 1440 | 4.288 px | 1.549 px (termina en 1.686) |
| Espera entre lo que Eloísa dibuja y su presentación | 80 ms | ninguna: el mismo cuadro |
| Fila del resumen diario mientras la ronda se arma | en su línea de Eloísa, y luego salta | no se dibuja; aparece en la línea de pestañas |
| Margen de la página antes de las pestañas | 32 px de Eloísa | el de la vista |

Los marcadores y sus medidas se leyeron en la página con la hoja nueva aplicada a mano. El pase de presentación en el mismo cuadro no se ha visto en la página: lo comprueban la ficha ficticia ([`capture-loading.mjs`](../../../scripts/capture-loading.mjs)) y la extensión instalada en la prueba del CI.

| Evolución, nota larga, 1440 × 900 | 0.48.208 | 0.48.209 |
| --- | --- | --- |
| Tarjeta | [Antes](0.48.209/antes/1440-nota-larga.png) | [Después](0.48.209/despues/1440-nota-larga.png) |
| Ventana «Nota completa» | 960 px de ancho, texto a 15 px | [1.216 px, texto a 16 px](0.48.209/despues/1440-nota-completa.png) |

| Medida de Evolución, ficha ficticia | 0.48.208 | 0.48.209 |
| --- | ---: | ---: |
| Filas de botones | 2: encabezado y pie | 1: encabezado |
| Líneas de una nota larga a 900 px de alto | 14 | 21 |
| Líneas de una nota larga a 1.011 px de alto | 14 | 27 |
| Líneas de una nota larga a 800 px de alto | 14 | 16 |
| Máximo en una pantalla alta | 14 | 30 |
| Líneas de una nota corta | 14 | 14 |

Lo que queda igual: una nota corta mide lo mismo que antes, de modo que las tarjetas de su lado y de abajo empiezan en el mismo lugar; los Signos vitales siguen en la primera pantalla con una nota larga; «Leer más / Leer menos» es el control de Eloísa, ahora una flecha en la línea de acciones.

## Sin barra de secciones, nombres cortos y Balance Hídrico en una línea, en 0.48.207

El responsable pidió quitar del todo la barra de enlaces de sección en las dos fichas, corregir el cuadro del resumen diario (el botón «Imprimir» tapaba la fecha), mostrar a cada profesional con un nombre y un apellido, quitar la hora de la firma de Diagnóstico, escribir «Indicación» donde Eloísa dice «Indication» y simplificar Balance Hídrico sin registros.

| Pantalla | 0.48.206 | 0.48.207 | Página completa |
| --- | --- | --- | --- |
| 1440 × 900 | [Antes](0.48.207/antes/1440-resumen.png) | [Después](0.48.207/despues/1440-resumen.png) | [Antes](0.48.207/antes/1440-resumen-completo.png) · [Después](0.48.207/despues/1440-resumen-completo.png) |

| Medida a 1440 × 900, ficha ficticia, 0.48.206 → 0.48.207 | |
| --- | ---: |
| Barra de enlaces de sección | 33 px bajo las pestañas → no se muestra |
| Inicio de Diagnóstico | 159 → 122 px |
| Inicio de Fármacos | 827 → 790 px |
| Alto de la página | 1821 → 1714 px |
| Firma de Diagnóstico | día, hora y nombre → día y nombre |
| Balance Hídrico sin registros | 115 → 45 px |

| Medida en la página (ficha médica, 1728 × 966 px), con las reglas aplicadas a mano | |
| --- | ---: |
| «Imprimir» respecto del campo de fecha | 101 px encima → 14 px después |
| Balance Hídrico sin registros | 125 → 45 px, en una línea |

Los nombres de las capturas son inventados y siguen la forma leída en la página: «Tomás··Ejemplo Prueba» se lee «Tomás Ejemplo».

## Signos vitales sin franja en blanco, en 0.48.206

Al comparar las dos fichas en la página (26-11-2026, 1728 × 966 px), la tarjeta de Signos vitales medía 259 px para 135 de contenido: se estiraba hasta el alto de la columna de su derecha, que llevaba Reposo, Régimen y el grupo «Sin datos». El responsable pidió corregirlo.

| Pantalla | 0.48.205 | 0.48.206 |
| --- | --- | --- |
| 1280 × 800 | [Antes](0.48.206/antes/1280-resumen.png) | [Después](0.48.206/despues/1280-resumen.png) |
| 1440 × 900 | [Antes](0.48.206/antes/1440-resumen.png) | [Después](0.48.206/despues/1440-resumen.png) |

| Medida a 1440 × 900, en la ficha ficticia, 0.48.205 → 0.48.206 | |
| --- | ---: |
| Alto de la tarjeta de Signos vitales | 199 → 134 px |
| Franja en blanco bajo las mediciones | 65 → 0 px |
| Reposo y Régimen | junto a Signos → bajo Signos |
| Grupo «Sin datos» | bajo Reposo y Régimen → junto a Signos, desde arriba |
| Inicio de Fármacos | 823 → 827 px |

En la página (ficha médica, 1728 × 966 px), con la disposición nueva aplicada a mano en una pestaña propia:

| Medida en la página, 0.48.205 → disposición nueva | |
| --- | ---: |
| Alto de la tarjeta de Signos vitales | 259 → 133 px |
| Franja en blanco bajo las mediciones | 134 → 8 px |
| Columna de Signos, Reposo y Régimen, y columna «Sin datos» (seis filas) | 259 y 259 → 202 y 163 px |
| Inicio de Fármacos | 857 → 800 px |

Falta verla con la versión instalada.

## La ficha de Gestión de cuidados como la médica, en 0.48.205

El responsable pidió que la tarjeta de Evolución de la ficha abierta desde Gestión de cuidados sea la de la ficha médica, y que Dispositivos invasivos sea más limpio y compacto. Las medidas son de la página, leída el 26-11-2026 a 1728 × 966 px.

| Medida en la página, 0.48.204 → 0.48.205 | |
| --- | ---: |
| Nota de la ficha de cuidados | 960 × 190 px, plegada, texto en una caja de 350 px → 960 × 339 px, entera, como la médica |
| Inicio de Signos vitales en la ficha de cuidados | 437 → 586 px, el de la ficha médica |
| Tarjeta de Dispositivos invasivos, con un dispositivo | 207 → 73 px |
| Fila y encabezado de Dispositivos invasivos | 75 y 72 → 27 y 18 px |
| Ancho de su tabla en una tarjeta de 1440 px | 1517 (se salía) → 1440 px |

[Ficha de cuidados ficticia, 1440 × 900](0.48.205/1440-ficha-de-cuidados.png). Los 73, 27 y 18 px de Dispositivos invasivos se midieron en la página con las reglas aplicadas a mano; la nota se comprobó en la ficha ficticia, que sigue la forma leída.

## Las evoluciones de todas las profesiones, sin salir del Resumen, en 0.48.203

El responsable pidió ver en la sección Evolución las evoluciones de otros profesionales (enfermería para quien es médico, médicas para quien es de enfermería, y las demás) sin ir a Historial, con libertad para una interfaz simple.

«Ver evoluciones», en la cabecera de la tarjeta, abre un lector sobre el Resumen.

| Pantalla, 1440 × 900 | 0.48.203 |
| --- | --- |
| Todas las profesiones | [Lector](0.48.203/1440-evoluciones-todas.png) |
| Solo enfermería | [Lector](0.48.203/1440-evoluciones-enfermeria.png) |

| Medida | |
| --- | ---: |
| Pasos para leer una evolución de otra profesión | ir a Historial, esperar su carga y filtrar → un clic |
| Tamaño del lector | 960 × 828 px, el de la ventana de la nota completa |
| Letra de cada nota | 15 px, con sus saltos de línea |
| Ventana leída | 14 días; a pedido, 60 días y un año |

Las notas, los autores y las fechas de las capturas son inventados. La hora de cada nota es la de Rapa Nui: el historial de Eloísa la guarda en hora continental (15-04-2026 11:12 en el historial se lee 09:12). **Falta confirmar en la página** que esa hora coincide con la que Eloísa muestra en la tarjeta para la misma nota.

## Signos vitales en media línea, la fila diaria fuera de la ficha y tablas a una línea, en 0.48.201

El responsable revisó la 0.48.199 en su pantalla y pidió tres cosas. Estrechar el cuadro de Signos vitales y usar el espacio que sobra a su derecha para Reposo, Régimen y las secciones sin datos. Quitar la franja de la fecha del resumen diario e «Imprimir», conservando la impresión. Y que Procedimientos se lea tan compacto como el resto.

| Pantalla | 0.48.200 | 0.48.201 | Página completa |
| --- | --- | --- | --- |
| 1280 × 800 | [Antes](0.48.201/antes/1280-resumen.png) | [Después](0.48.201/despues/1280-resumen.png) | [Antes](0.48.201/antes/1280-resumen-completo.png) · [Después](0.48.201/despues/1280-resumen-completo.png) |
| 1440 × 900 | [Antes](0.48.201/antes/1440-resumen.png) | [Después](0.48.201/despues/1440-resumen.png) | [Antes](0.48.201/antes/1440-resumen-completo.png) · [Después](0.48.201/despues/1440-resumen-completo.png) |
| 1440 × 900, con registros en todas las secciones | | | [Antes](0.48.201/antes/1440-con-registros-completo.png) · [Después](0.48.201/despues/1440-con-registros-completo.png) |

| Medida a 1440 × 900, 0.48.200 → 0.48.201 | |
| --- | ---: |
| Fecha del resumen diario e «Imprimir» | una franja de 30 px sobre la ficha → el final de la línea de pestañas |
| Inicio de Diagnóstico | 201 → 159 px |
| Ancho de Signos vitales | toda la línea → su primera mitad |
| Filas de las nueve mediciones | 1 → 2, cinco y cuatro |
| Reposo y Régimen | una línea propia bajo Signos → junto a Signos |
| Grupo «Sin datos» | al final de la ficha, tres por fila → junto a Signos, dos por fila |
| Inicio de Fármacos | 819 → 823 px |
| Alto de la página | 1923 → 1817 px |
| Fila de Procedimientos, con y sin selector de estado | 51 → 31 y 28 px |
| Fila de Solicitud de examen | 46 → 31 px |
| Fila de Solicitud interconsulta, Órdenes de atención y Solicitudes de intervención quirúrgica | 35 → 28 px |
| Alto de la página con registros en todas las secciones | 2519 → 2266 px |

**Por qué la fila no subía sola.** La estructura exportada de la página el 26-11-2026 ([`estructura-eloisa.md`](../../estructura-eloisa.md)) mostró la fila en su propia línea de 30 px, con la vista activa y a 1303 px de ancho. La ficha ficticia lo reproduce: la barra flotante de Centro HHR, de 350 px, tapa el final de la línea de secciones, y entre el último enlace y esa barra no caben la fecha y sus dos botones. En la línea de pestañas sí caben, a cualquier ancho desde 1100 px. Ahí la fila deja de contar como línea de la ronda.

La rejilla coloca cada sección sin datos en el primer hueco junto a los signos (`grid-auto-flow: dense`), y `hhr-ficha-round-layout.js` cuenta las líneas que ocupa esa columna para que Signos vitales las abarque. No se mueve ningún nodo: la fila diaria se sitúa con `position: fixed`, como ya hacía en la línea de secciones.

## Lo vacío junto, las tablas con un ritmo y el Resumen desde arriba, en 0.48.199

El responsable revisó la 0.48.198 en su pantalla y pidió: agrupar con más elegancia las secciones sin datos; dar el estilo de la vista a Procedimientos, Solicitud interconsulta, Solicitud de examen y Solicitudes de intervención quirúrgica cuando tienen registros; que un Régimen en edición no se vea de otro programa; quitar el nombre del funcionario de la línea de secciones y dejar entero «Resumen diario paciente»; un lector de la evolución más grande y más limpio; más margen general; y que la ficha no quede a mitad de documento al recargar.

| Pantalla | 0.48.198 | 0.48.199 | Página completa |
| --- | --- | --- | --- |
| 1280 × 800 | [Antes](0.48.199/antes/1280-resumen.png) | [Después](0.48.199/despues/1280-resumen.png) | [Antes](0.48.199/antes/1280-resumen-completo.png) · [Después](0.48.199/despues/1280-resumen-completo.png) |
| 1440 × 900 | [Antes](0.48.199/antes/1440-resumen.png) | [Después](0.48.199/despues/1440-resumen.png) | [Antes](0.48.199/antes/1440-resumen-completo.png) · [Después](0.48.199/despues/1440-resumen-completo.png) |
| 1990 × 1086, la ventana del responsable, con registros en las cuatro secciones | | | [Antes](0.48.199/antes/1990-con-registros-completo.png) · [Después](0.48.199/despues/1990-con-registros-completo.png) |

Las capturas de la primera pantalla ya no se desplazan a mano al inicio. El «antes» muestra lo que se veía al cargar: la página a mitad de documento, donde Eloísa había puesto el foco.

| Medida, 0.48.198 → 0.48.199 | |
| --- | ---: |
| Posición de la página al abrir el Resumen | donde Eloísa puso el foco, a mitad de documento → al inicio (0 px) |
| Secciones sin datos, a 1440 × 900 | 5 tarjetas de una línea → un grupo de 2 filas |
| Alto de la página, a 1440 × 900 | 2042 → 1923 px |
| Alto de la página con registros en las cuatro secciones, a 1990 × 1086 | 3051 → 2486 px |
| Ancho del contenido y margen a cada lado, a 1990 px | 1600 y 195 → 1440 y 275 px |
| Lector de la evolución, a 1990 × 1086 | hasta 736 × 869 → hasta 960 × 999 px |
| Firma en la fila del resumen diario | a la vista → solo para el lector de pantalla |

La forma de las cuatro secciones con registros se leyó en capturas de pantalla, no con el exportador ([`estructura-eloisa.md`](../../estructura-eloisa.md)). La vista les da solo lo común, por el id de su sección: falta confirmarla en la página.

## Cada bloque en su lugar y más aire, en 0.48.198

El responsable pidió un orden de lectura: Diagnóstico primero, Evolución de tamaño fijo con Observaciones de entrega y Alertas al lado, y después el resto. También más margen general y dentro de los cuadros. En la 0.48.197 nada tenía un lugar fijo: Diagnóstico empezaba entre los 526 y los 628 px, y Fármacos entre los 616 y los 718, según el largo de la nota, el número de alertas y el alto de la ventana.

| Pantalla | 0.48.197 | 0.48.198 | Página completa |
| --- | --- | --- | --- |
| 1280 × 800 | [Antes](0.48.198/antes/1280-resumen.png) | [Después](0.48.198/despues/1280-resumen.png) | [Antes](0.48.198/antes/1280-resumen-completo.png) · [Después](0.48.198/despues/1280-resumen-completo.png) |
| 1440 × 900 | [Antes](0.48.198/antes/1440-resumen.png) | [Después](0.48.198/despues/1440-resumen.png) | [Antes](0.48.198/antes/1440-resumen-completo.png) · [Después](0.48.198/despues/1440-resumen-completo.png) |

| Medida a 1440 × 900, 0.48.197 → 0.48.198 | |
| --- | ---: |
| Inicio de Diagnóstico | 530 → 201 px |
| Alto de Evolución, con una nota de 7 líneas y con una de 31 | 197 y 276 → 339 y 339 px |
| Líneas de la nota a la vista | 11, y entre 9 y 12 según el alto de la ventana → 14 |
| Fin de Alertas respecto del fin de Evolución, con 3 y con 8 alertas | 74 y 102 px más abajo → 0 y 0 px |
| Lista de 8 alertas a la vista | 250 de 406 px → 207 de 406 px |
| Inicio de Fármacos, con la ficha liviana y con la cargada | 621 y 700 → 819 y 819 px |
| Margen de lectura dentro de una tarjeta | 10 → 16 px |
| Separación entre dos bloques | 8 → 12 px |
| Indicaciones de Fármacos en una línea, a 1280 y a 1440 | 7 y 8 → 7 y 8 |
| Esquinas de una tarjeta | 6 → 8 px |

La primera pantalla es ahora la ronda: por qué está el paciente, la nota con lo que la acompaña y los signos. El costo es Fármacos, que empieza 119 px más abajo que en la ficha cargada de antes y sale de la primera pantalla a 800 px de alto. Las capturas de la primera pantalla se toman ahora desde el inicio de la página: la ficha ficticia, como Eloísa, da el foco al campo de alerta al cargar y la dejaba desplazada.

## Las formas que Eloísa dibuja hoy, en 0.48.197

El responsable vio en su pantalla un Resumen todavía flojo. Se midió su ficha el 26-11-2026, en un paciente de estadía corta, y aparecieron formas que la vista no reconocía (detalle en [`estructura-eloisa.md`](../../estructura-eloisa.md)):
- Fármacos dentro de una segunda sección, con una línea «Medico Validador:».
- El campo de nueva alerta enfocado por Eloísa al cargar.
- La frase de Cirugía partida en tres nodos de texto.
- Diagnóstico y Órdenes de atención sin tabla.
- Balance Hídrico con su filtro.
- Eventos Adversos y Gíneco sin permiso.

La ficha ficticia dibuja ahora esas formas. Con ellas, la 0.48.196 reproduce lo que se veía en la pantalla real. Las páginas completas se capturan con una ventana tan alta como la página, para que la cabecera fija no aparezca a media página.

| Pantalla | 0.48.196 | 0.48.197 | Página completa |
| --- | --- | --- | --- |
| 1280 × 800 | [Antes](0.48.197/antes/1280-resumen.png) | [Después](0.48.197/despues/1280-resumen.png) | [Antes](0.48.197/antes/1280-resumen-completo.png) · [Después](0.48.197/despues/1280-resumen-completo.png) |
| 1440 × 900 | [Antes](0.48.197/antes/1440-resumen.png) | [Después](0.48.197/despues/1440-resumen.png) | [Antes](0.48.197/antes/1440-resumen-completo.png) · [Después](0.48.197/despues/1440-resumen-completo.png) |
| 1990 × 1086, la ventana del responsable | [Antes](0.48.197/antes/1990-resumen.png) | [Después](0.48.197/despues/1990-resumen.png) | [Antes](0.48.197/antes/1990-resumen-completo.png) · [Después](0.48.197/despues/1990-resumen-completo.png) |
| 1440, sin diagnósticos ni órdenes de atención | | | [Antes](0.48.197/antes/1440-sin-registros-completo.png) · [Después](0.48.197/despues/1440-sin-registros-completo.png) |

| Medida a 1440 × 900, 0.48.196 → 0.48.197 | |
| --- | ---: |
| Borde izquierdo de Fármacos (el de las demás tarjetas: 42) | 52 → 42 px |
| Huecos sobre Fármacos | 57 y 13 → 8 y 8 px |
| Inicio de Fármacos | 703 → 621 px |
| Tamaños de título bajo la ronda | 15 y 20 → 15 px |
| Formulario de alertas | abierto, con el foco → plegado, sin foco |
| Alertas | 298 → 237 px |
| Solicitudes de intervención quirúrgica | tarjeta de 76 px → línea de 27 px en la ronda, junto a Exámenes |
| Examen Gíneco Obstétrico, sin permiso | 108 → 29 px |
| Balance Hídrico | 166 → 115 px |
| Diagnóstico y Órdenes de atención vacíos | 54 y 48 → 29 y 29 px |
| Alto de la página | 2132 → 1795 px (sin diagnósticos ni órdenes: 2033 → 1651) |

- **Fármacos en una segunda sección.** La vista no reconocía `section#dilutionEntrySection`. La tarjeta quedaba 10 px más adentro, con el título a 20 px y «VALIDAR TRATAMIENTO» en mayúsculas. «Imprimir indicaciones» volvía a su línea propia. La vista reconoce ahora ambas formas.
- **El validador.** «Medico Validador:» va bajo el título, en gris y pegado a la tabla. Sin valor dice «Tratamiento sin validar».
- **El foco de Eloísa.** Al cargar, Eloísa enfoca el campo vacío de nueva alerta, y ese foco mantenía abierto el formulario plegable. Un foco que no pasó por el botón o por el campo visible ya no lo abre, y la vista lo suelta.
- **Lo vacío es una línea.** Diagnóstico y Órdenes de atención sin registros, la frase de Cirugía en tres nodos y el permiso denegado de cualquier sección se leen como RAM. Diagnóstico vacío no se pliega con las demás secciones vacías.
- **Balance Hídrico** filtra a la altura de una línea. **Indicaciones libres** se leen enteras: Eloísa titula su columna «Indication» y la vista no abría su «Leer más». **Un título** para toda tarjeta bajo la ronda.

`capture-summary.mjs` comprueba cada forma:
- en la página: bordes, validador, formulario de alertas, indicación libre, Balance y secciones sin permiso;
- en tres páginas propias a 1440 px: sin diagnósticos ni órdenes, con Fármacos en su forma anterior y con un validador.

Veintisiete mutaciones de control, una por regla. Fallan las veinticinco que tienen efecto en la página. Las otras dos no lo tenían, y se retiraron:
- el `:not()` de una regla de Órdenes ya cubierta por otra;
- un fondo opaco para la fila diaria acoplada, que la ficha ficticia nunca acopla.

Una revisión independiente no encontró bloqueantes. Encontró un fallo y tres detalles:
- **El fallo.** El primer plegado soltaba también el foco de quien ya escribía antes de que el formulario se plegara, al volver de una ventana estrecha, o al borrar un borrador escrito antes. Ahora solo se suelta el foco con que el campo aparece por primera vez en el resumen de un paciente.
- **Dos casos sin prueba:** una tabla que contiene una sección vacía, y la línea del validador con texto suelto.
- **El lector de pantalla** no oía «Tratamiento sin validar».

Está corregido. Cinco mutaciones más comprueban cada arreglo.

Límites:

- **La fila diaria que tapaba el contenido.** En la página real no tapaba nada a ninguna altura de desplazamiento. Una captura de página completa reproduce el efecto, con los elementos fijos a media página: era casi seguro una captura de ese tipo.
- **Formas aún no leídas:** Balance Hídrico con registros, Gíneco y Eventos Adversos con permiso, y Cirugía con solicitudes. Toman el título común y conservan el resto de su forma.
- Con la línea del validador, Fármacos baja 20 px en su tarjeta: a 1440 se ven completas 6 indicaciones en la primera pantalla.

## Márgenes, tipografía y ritmo en 0.48.196

Un repaso con reglas mínimas de buena composición, medidas en la página. Antes se midió Eloísa el 26-11-2026: deja 32 px a cada lado, su fondo es `#f1f1f1`, sus tarjetas son blancas sin sombra con esquinas de 12 px y toda la página usa Inter. La ficha ficticia sigue desde esta versión esas medidas y las longitudes de los catorce nombres de fármacos leídos (24 a 113 caracteres).

| Pantalla | 0.48.195 | 0.48.196 | Página completa |
| --- | --- | --- | --- |
| 1280 × 800 | [Antes](0.48.196/antes/1280-resumen.png) | [Después](0.48.196/despues/1280-resumen.png) | [Antes](0.48.196/antes/1280-resumen-completo.png) · [Después](0.48.196/despues/1280-resumen-completo.png) |
| 1440 × 900 | [Antes](0.48.196/antes/1440-resumen.png) | [Después](0.48.196/despues/1440-resumen.png) | [Antes](0.48.196/antes/1440-resumen-completo.png) · [Después](0.48.196/despues/1440-resumen-completo.png) |
| 1990 × 1086, la ventana del responsable | [Antes](0.48.196/antes/1990-resumen.png) | [Después](0.48.196/despues/1990-resumen.png) | |

| Medida, 0.48.195 → 0.48.196 | 1280 × 800 | 1440 × 900 |
| --- | ---: | ---: |
| Margen izquierdo y derecho de las tarjetas | 16 y 32 → 35 y 35 px | 16 y 32 → 42 y 42 px |
| Separación entre bloques bajo la ronda | 6 o 10 → 8 px | 6 o 10 → 8 px |
| Tipografías / pesos / tamaños de letra | 2 / 5 / 6 → 1 / 2 / 4 | 2 / 5 / 6 → 1 / 2 / 4 |
| Inicio de Fármacos | 647 → 616 px | 620 → 621 px |
| Indicaciones de Fármacos completas en la primera pantalla, de 14 | 2 → 3 | 7 → 7 |
| Indicaciones de Fármacos en una sola línea, de 14 | 5 → 7 | 8 → 8 |

En una ventana de 1990 px el contenido ocupaba 1926 px de borde a borde; ahora se detiene en 1600 px, centrado, con 195 px a cada lado.

- **Márgenes.** La ronda de dos columnas tomaba el canal de 16 px que Eloísa cuelga a la izquierda de su rejilla y no lo devolvía. Ahora la ronda, las tarjetas bajo ella, la fila diaria, la línea de secciones y las pestañas comparten un borde, con el mismo margen a cada lado. Ese margen nunca es menor que los 32 px de Eloísa y crece con la ventana: 35 px a 1280, 42 a 1440, 56 desde 1800. En una pantalla ancha el contenido se detiene en 1600 px y queda centrado. En un portátil crece poco, para no quitar ancho al texto clínico.
- **Una tipografía.** La vista escribía sus textos con la letra del sistema y dejaba los de Eloísa en Inter: una misma tarjeta mezclaba dos. Ahora todo es Inter.
- **Dos pesos y cuatro tamaños.** Había 400, 500, 600, 650 y 750, y tamaños de 12 a 17 px. Quedan 400 y 600; 12, 13, 15 y 16 px. Cada tarjeta se titula a 15 px, Evolución incluida, y cada tabla nombra sus columnas a 12 px.
- **Grises neutros.** Los textos secundarios tenían un tinte verde que los acercaba al verde de las acciones: el nombre de quien indica parecía un enlace. Ahora usan los grises de Eloísa; el verde queda para lo que se puede pulsar.
- **Una superficie y una separación.** Las tarjetas bajo la ronda tenían esquinas de 4, 5, 6 o 12 px y se separaban 6 o 10 px. Ahora todas son la superficie blanca y sin sombra de Eloísa, con las esquinas de la vista, a 8 px una de otra. Eloísa usa esquinas de 12 px; la vista Compacta mantiene sus 6 px, más propios de una página densa, en todas sus tarjetas.
- **Tablas.** El texto empezaba 7 px más adentro que su título: Eloísa envuelve la tabla en un `Paper` que la regla no contemplaba. Ahora título, encabezados y primera celda comparten borde.
- **Secciones vacías.** Producto no Farmacológico, RAM y Alergias se leen como las solicitudes vacías: nombre a 13 px, mensaje en gris, filtro al final de la línea. MUI resta 8 px a su zona de acciones y pegaba el mensaje al nombre, y deja 16 px tras la etiqueta de un interruptor, que lo apartaba del borde: un interruptor que cierra una cabecera termina ahora en el borde de lectura.
- **Detalles.** Signos vitales vuelve a una fila con el margen nuevo. En Diagnóstico la fecha y el estado no se parten, el título queda arriba y el selector de estado no ocupa más de lo que dice. En Fármacos, la etiqueta SOS o Antimic. sigue al nombre en su línea en vez de quitarle una columna.

`capture-summary.mjs` comprueba estas reglas a 1280 y 1440 px, y la fecha de Diagnóstico también a 1100 px: márgenes, separación, tipografía, pesos, tamaños, tintas, títulos, superficies, bordes de tabla, secciones vacías y su filtro, el título de Diagnóstico y la etiqueta junto al nombre.

Cada una de estas mutaciones hace fallar la captura: márgenes asimétricos; separación de 6 px; márgenes propios de las tarjetas; un peso 650; la letra del sistema; la tabla sin su `Paper`; la zona de acciones con su margen; la superficie nativa; un valor vital de 17 px; fechas partidas a 1100 px; Evolución a 16 px; una sección vacía a 14 px; la etiqueta en su columna o en bloque; Signos con el umbral anterior; encabezados de tabla a 14 px; tintas verdes; el filtro al principio de la línea; una sección vacía con 14 px de sangrado; Diagnóstico centrado; la etiqueta de un interruptor con el margen de MUI; títulos sin la tinta de la vista.

Límites:

- **Nada de esto se ha visto aplicado sobre Eloísa.** La página real carga Inter. Donde corren las capturas no está instalada, y la ficha ficticia declara la reserva que Eloísa misma declara: Arial ajustada al ancho de Inter (Liberation Sans en Linux, con las mismas medidas). Las cifras son así iguales en macOS y en CI, y cercanas a la página. La comprobación de una sola tipografía mide la familia declarada.
- **Historial y Plan** ya tenían márgenes simétricos. Sus fichas ficticias siguen con el fondo y el margen de 24 px anteriores a esta medida.
- **Por debajo de 1100 px**, sin las dos columnas, Diagnóstico queda 8 px más adentro que los demás bloques, como antes. No hay comprobación de márgenes en esa franja.
- **A 1990 px la fila de fecha diaria ya no cabe junto a la línea de secciones**, que ahora termina antes y queda bajo la barra flotante de Centro HHR: ocupa su propia línea, unos 40 px.
- **Bordes y fondos** escritos a mano quedan en algunas reglas; pasan a tokens cuando se vuelvan a editar.

## Los días de tratamiento en 0.48.194

En Fármacos, la columna «Tiempo» de Eloísa es un triángulo con un número. El número cuenta días de tratamiento, según confirmó el responsable clínico. La vista Compacta lo dice: «12 d», con las unidades alineadas en el borde de la columna. Un lector de pantalla lee «12 días», y «1 día» en singular. El triángulo, que no nombraba nada, deja su sitio a la unidad; la columna no cambia de ancho ni las filas de alto.

| Pantalla | 0.48.193 | 0.48.194 |
| --- | --- | --- |
| 1280 × 800 | [Antes](0.48.194/antes/1280-farmacos.png) | [Después](0.48.194/despues/1280-farmacos.png) |
| 1440 × 900 | [Antes](0.48.194/antes/1440-farmacos.png) | [Después](0.48.194/despues/1440-farmacos.png) |

Fuera de la vista Compacta los días conservan el símbolo de Eloísa. La ficha ficticia nombra desde esta versión la letra en cada texto, como hace MUI: así se comprueba que el número y su unidad se leen con la misma.

## El Resumen sobre la forma que dibuja Eloísa en 0.48.193

Esta comparación usa una ficha ficticia nueva, [`scripts/summary-visual-fixture.mjs`](../../../scripts/summary-visual-fixture.mjs), escrita bloque por bloque desde la [estructura leída en Eloísa](../../estructura-eloisa.md#resumen): el marco y sus ítems en su orden, los doce enlaces de sección, Fármacos con sus seis columnas y catorce indicaciones, y Diagnóstico tras las indicaciones. Las fichas anteriores suponían formas más simples, y con la forma real la 0.48.192 se veía peor de lo que mostraban sus capturas.

| Pantalla | 0.48.192 | 0.48.193 |
| --- | --- | --- |
| 1280 × 800 | [Antes](0.48.193/antes/1280-resumen.png) | [Después](0.48.193/despues/1280-resumen.png) |
| 1440 × 900 | [Antes](0.48.193/antes/1440-resumen.png) | [Después](0.48.193/despues/1440-resumen.png) |

| Medida, 0.48.192 → 0.48.193 | 1280 × 800 | 1440 × 900 |
| --- | ---: | ---: |
| Inicio de Diagnóstico | 1684 → 514 px | 1684 → 514 px |
| Inicio de Fármacos | 772 → 605 px | 772 → 605 px |
| Indicaciones de Fármacos completas en la primera pantalla, de 14 | 0 → 3 | 1 → 8 |
| Indicaciones de Fármacos en una sola línea, de 14 | 0 → 8 | 0 → 10 |
| Final de Fármacos | 1468 → 1143 px | 1468 → 1109 px |

Lo que la forma real dejaba sin compactar:

- **Reposo sin registro** es una tarjeta sin su sección. No se reconocía y quedaba a todo el ancho, 124 px, entre la ronda y Fármacos. Ahora se lee «Sin registro» en la línea de Régimen.
- **Régimen** envuelve su valor y su observación en una caja cada uno. Se partía en tres líneas, 96 px. Ahora ocupa una.
- **«Imprimir indicaciones»** es un botón de icono solo en su línea, 46 px. Ahora va en la línea del título de Fármacos, tras el título, con el nombre que Eloísa le da en su icono. Para la tecla Tab se lee donde se ve: tras Diagnóstico y antes de las herramientas de Fármacos.
- **Los controles de Eloísa** tenían su tamaño nativo: interruptores de 38 px, «VALIDAR TRATAMIENTO» de 38 px, selector de estado de 40 px. Ahora miden lo que una línea. Conservan su color y sus palabras; «Validar tratamiento» y las pestañas se escriben como una frase.
- **Fármacos** partía «Solicitante» en dos líneas en todas las filas y daba a la posología 241 px. El solicitante ocupa una línea y la posología tiene sitio para unos cincuenta caracteres.
- **Cada signo vital** dejaba una línea vacía bajo su nombre, la caja de una unidad que no lleva.

Lo que cambia de lugar:

- **Diagnóstico** abre las tarjetas bajo la ronda. Su nombre y su firma ocupan una columna al inicio, como Reposo y Régimen, y cada diagnóstico es una línea con su estrella, su estado y sus notas. La columna «Diagnóstico» no repite el nombre de la tarjeta.
- **Las tarjetas bajo la ronda** empiezan en el borde de la ronda. Antes quedaban 16 px más adentro.

Lo que tiene otra forma se queda donde Eloísa lo puso: una tabla cuya segunda columna no es «Diagnóstico», un icono con otro nombre, o una línea de impresión seguida de otra tarjeta que no sea Fármacos.

```sh
node scripts/capture-summary.mjs v0.48.192 /tmp/resumen-anterior
node scripts/capture-summary.mjs WORKTREE /tmp/resumen-actual
```

Límites:

- **Sigue siendo una reconstrucción.** La forma se leyó en una ficha real, pero los estilos nativos de la ficha ficticia son aproximados y nada de esto se ha visto aplicado sobre Eloísa.
- **Diagnóstico cuesta primera pantalla a Fármacos.** Con dos diagnósticos ocupa 85 px: a 1280 px se ven tres indicaciones completas donde sin él cabrían siete.
- **La fila de fecha diaria** conserva su línea, 36 px. Con los doce enlaces reales no cabe en la línea de secciones a ningún ancho probado.
- **«Tiempo»** sigue siendo un triángulo con un número. No se sabe qué cuenta, y no se rotula.
- **Por debajo de 1280 px** un diagnóstico largo ocupa dos líneas: las cifras valen desde ese ancho.
- **En un Chrome anterior al 137** Diagnóstico conserva su lugar de siempre. Solo cambia de sitio donde la tecla Tab sigue el orden en que se ve. Y sin posicionamiento por anclas, anterior al 125, «Imprimir indicaciones» conserva su línea.
- **La ficha ficticia anterior de ingreso** gana una línea por fármaco a 1440 px: sus instrucciones, mucho más largas que las leídas en Eloísa, dejan menos sitio al nombre ahora que la posología pide el suyo.
- **Con muchas alertas** la columna derecha crece hasta 250 px de lista, el máximo que le da Eloísa. No se ha medido el Resumen con dieciséis.

## La fila diaria y las acciones de la nota como las dibuja Eloísa en 0.48.192

La ficha ficticia se corrigió con la [estructura observada en Eloísa](../../estructura-eloisa.md#resumen). Dos formas eran distintas de las supuestas, y por eso dos cambios anteriores no llegaban a la página real:

- **La fila diaria** es un campo de fecha con rótulo flotante, un botón de calendario, «Imprimir» y un segundo botón de impresión; no un selector de fecha nativo con un botón. La 0.48.191 no la reconocía: ni la acoplaba a la línea de secciones ni omitía su firma repetida. Desde esta versión la reconoce por su formulario «Resumen diario paciente».
- **Los botones de Evolución** no tienen nombre propio; lo lleva su icono, y el lápiz se llama «Enmendar». La 0.48.189 lo rotulaba «Editar» y a su lista «Enmiendas». Ahora se leen «Enmendar» y «Enmendados», las palabras de Eloísa.

| Pantalla | 0.48.191 | 0.48.192 | Detalle |
| --- | --- | --- | --- |
| 1280 × 800 | [Antes](0.48.192/antes/1280-ingreso.png) | [Después](0.48.192/despues/1280-ingreso.png) | [Con la barra flotante plegada](0.48.192/despues/1280-barra-plegada.png) |
| 1440 × 900 | [Antes](0.48.192/antes/1440-ingreso.png) | [Después](0.48.192/despues/1440-ingreso.png) | |

| Medida en px, 0.48.191 → 0.48.192 | 1280 × 800 | 1280 × 800, barra plegada | 1440 × 900 |
| --- | ---: | ---: | ---: |
| Inicio de Evolución | 175 → 165 | 175 → 129 | 175 → 165 |
| Inicio de Fármacos | 604 → 594 | 604 → 558 | 623 → 613 |

Con su forma real la fila es más ancha que la supuesta. Cabe en la línea de secciones con la barra flotante de Centro HHR plegada; con la barra desplegada conserva su fila a 1280 y a 1440 px, diez píxeles más baja que antes. Las cifras de la sección siguiente se midieron con la fila supuesta: su «a 1440 px caben» no vale para la fila real.

## Cada dato una vez y la fecha en la línea de secciones en 0.48.191

La ficha ficticia incluye desde esta versión un doble de la barra flotante de Centro HHR, en el lugar y con el tamaño que le da la extensión: 5 px bajo la cabecera, a 18 px del borde derecho, 250 px de ancho hasta 1280 px y 350 px por encima. Las capturas anteriores no la mostraban.

| Pantalla | 0.48.190 | 0.48.191 | Detalle |
| --- | --- | --- | --- |
| 1280 × 800 | [Antes](0.48.191/antes/1280-ingreso.png) | [Después](0.48.191/despues/1280-ingreso.png) | [Con la barra flotante plegada](0.48.191/despues/1280-barra-plegada.png) |
| 1440 × 900 | [Antes](0.48.191/antes/1440-ingreso.png) | [Después](0.48.191/despues/1440-ingreso.png) | [Indicaciones](0.48.191/despues/1440-indicaciones.png) |

La fecha del resumen diario e «Imprimir» se acoplan a la línea de los enlaces de sección cuando caben entre el último enlace y la barra flotante. A 1440 px caben. A 1280 px caben con la barra flotante plegada; con la barra desplegada conservan su fila. La elección usa solo medidas horizontales: al desplazar la ficha, la fila no cambia de lugar y la nota no se mueve.

| Medida en px, 0.48.190 → 0.48.191 | 1280 × 800 | 1280 × 800, barra plegada | 1440 × 900 |
| --- | ---: | ---: | ---: |
| Inicio de Evolución | 165 → 165 | 165 → 129 | 165 → 129 |
| Inicio de Fármacos | 594 → 594 | 594 → 558 | 613 → 577 |
| Inicio de Indicaciones libres | 730 → 730 | 730 → 694 | 732 → 696 |
| Final de Órdenes de atención | 947 → 947 | 947 → 911 | 941 → 905 |

Lo que deja de repetirse, en las tres situaciones:

- La firma de la fila diaria, cuando es la misma de Evolución. Si otro profesional actualizó el resumen después, esa firma se lee antes de la fecha.
- La firma de Indicaciones libres y de Órdenes de atención, cuando su texto nativo coincide, segundos incluidos, con el de la tarjeta anterior a la vista. Una tarjeta plegada u oculta por sus propios estilos no cuenta como la anterior. Muestran «↑ misma firma» y la firma completa al pasar el cursor.
- La antigüedad de las mediciones. Ocho de las nueve casillas decían «2h»; ahora el título dice «medidos hace 2 h» y solo el hemoglucotest conserva su «4h». Si alguna casilla no es una medición reconocida, no declara su antigüedad, o las recientes no coinciden, cada casilla conserva la suya.
- El rótulo «Acciones» de las tablas de indicaciones, cuando la columna solo contiene botones. La columna pasa de 70 a 49 px y cede ese ancho al texto de las indicaciones.

El texto nativo de cada firma, antigüedad y rótulo sigue en la página para los lectores de pantalla y la impresión.

### Verificación con teclado

Acoplada o en su fila, la fecha es la parada siguiente a «Ver vacías». Después van «Imprimir» y «Ver evoluciones». La barra flotante nunca queda sobre la fecha ni sobre «Imprimir»: la prueba pide al navegador el elemento que hay en el centro de cada control. Con ocho enlaces de sección más, o con un control añadido a la fila, esta conserva su lugar sobre la nota y regresa a la línea al recuperar el sitio. Al desactivar la vista compacta no queda ninguna marca ni estilo del acople.

```sh
node scripts/capture-medical-round.mjs v0.48.190 /tmp/repeticiones-anterior ingreso
node scripts/capture-medical-round.mjs WORKTREE /tmp/repeticiones-actual ingreso
node scripts/capture-medical-round.mjs WORKTREE /tmp/acople-actual lectura
```

## Acciones con nombre y líneas compartidas en 0.48.189

La comparación usa las dos fichas ficticias de la versión anterior. El ingreso largo incluye ahora el menú de pautas que la extensión monta junto a las herramientas nativas de la nota.

| Pantalla | 0.48.188 | 0.48.189 | Indicaciones |
| --- | --- | --- | --- |
| 1280 × 800 | [Antes](0.48.189/antes/1280-ingreso.png) | [Después](0.48.189/despues/1280-ingreso.png) | [Ver tabla](0.48.189/despues/1280-indicaciones.png) |
| 1440 × 900 | [Antes](0.48.189/antes/1440-ingreso.png) | [Después](0.48.189/despues/1440-ingreso.png) | [Ver tabla](0.48.189/despues/1440-indicaciones.png) |

En Evolución se leen, en este orden, «Ver evoluciones», «Editar», «Enmiendas», «Pautas» y el menú de opciones. Cada nombre acompaña a un icono del mismo trazo. Con menos de 768 px de tarjeta quedan los iconos, y un icono sin nombre nativo muestra el suyo al pasar el cursor. Un botón que la extensión no reconoce conserva el icono de Eloísa.

| Medida en px, 0.48.188 → 0.48.189 | 1280 × 800 | 1440 × 900 |
| --- | ---: | ---: |
| Inicio de Fármacos | 622 → 594 | 641 → 613 |
| Inicio de Indicaciones libres | 760 → 730 | 763 → 732 |
| Final de Órdenes de atención | 996 → 947 | 990 → 941 |
| Final del lateral | 471 → 395 | 471 → 395 |
| Alto de Observaciones de entrega | 59 → 34 | 59 → 34 |
| Alto de Alertas | 194 → 169 | 194 → 169 |

En el ingreso, Reposo no tiene registro y comparte la línea con Régimen. Con dos indicaciones firmadas por profesionales distintos, la línea común cabe en la ventana de 1440 px: Fármacos pasa de 531 a 497 px. [Antes](0.48.189/antes/1440-expandida.png) · [Después](0.48.189/despues/1440-expandida.png). En la de 1280 px cada indicación conserva su renglón y Fármacos queda en 530 px. Las dos solicitudes vacías ocupan 27 px en total, frente a 53.

En las tablas, el nombre de cada columna y la primera celda empiezan en el margen del título de su tarjeta. Las marcas SOS y Antimic conservan su texto, su filete y su contraste. «No reanimación», una vez marcada, ocupa toda la línea de Alertas.

Con el texto del navegador al 125 % en una ventana de 1100 px, el estado de cada solicitud vacía pasa debajo de su nombre y las dos mitades terminan en la misma línea.

### Verificación con teclado

Tab recorre «Ver evoluciones», el menú de opciones, «Editar», «Enmiendas», «Pautas» y el texto de la nota. El menú se ve al final de la fila y recibe el foco en segundo lugar. Eloísa lo mantiene en la cabecera de la tarjeta y Chromium ordena el foco de la cabecera antes que el de las herramientas. Un clic en «Agregar» deja el cursor en el campo de entrega. Después de «Gestión de Visitas», Tab llega a «Agregar alerta» en la misma línea.

```sh
node scripts/capture-medical-round.mjs v0.48.188 /tmp/acciones-anterior ingreso
node scripts/capture-medical-round.mjs WORKTREE /tmp/acciones-actual ingreso
node scripts/capture-medical-round.mjs WORKTREE /tmp/lineas-actual lectura
```

## Ingreso largo en 0.48.188

La comparación usa la misma ficha ficticia en Chromium, con una evolución de más de cuarenta líneas, un Reposo vacío y un Régimen con observación y autor. La prueba incluye un botón de impresión y tarjetas agrupadas en cuadrículas anidadas. Tab y Fin llevan al último renglón de Evolución. «Leer nota completa» abre el texto íntegro en una ventana de lectura. Escape devuelve el foco al botón. [Ver el lector](0.48.188/despues/1440-lector.png) Las tres indicaciones de prueba se pueden leer hasta su última palabra.

| Pantalla | 0.48.187 | 0.48.188 | Indicaciones |
| --- | --- | --- | --- |
| 1280 × 800 | [Antes](0.48.188/antes/1280-ingreso.png) | [Después](0.48.188/despues/1280-ingreso.png) | [Ver tabla](0.48.188/despues/1280-indicaciones.png) |
| 1440 × 900 | [Antes](0.48.188/antes/1440-ingreso.png) | [Después](0.48.188/despues/1440-ingreso.png) | [Ver tabla](0.48.188/despues/1440-indicaciones.png) |

La tarjeta de Evolución pasó de 962 px de alto a 256 px en la ventana de 1280 y a 275 px en la de 1440. Signos vitales queda justo debajo, con ambos bordes alineados. En el lateral, las solicitudes vacías ocupan 27 px cada una. En los dos tamaños, Reposo ocupa 29 px y Régimen 33 px.

Para repetir la comparación, ejecutar desde la raíz del repositorio.

```sh
node scripts/capture-medical-round.mjs v0.48.187 /tmp/ingreso-anterior ingreso
node scripts/capture-medical-round.mjs WORKTREE /tmp/ingreso-actual ingreso
```

## Lectura y escritura en 0.48.187

En la captura inicial se pueden leer las alertas y el estado de los interruptores. «Agregar observación» y «Agregar alerta» abren sus campos con un clic o con Enter. Un borrador permanece visible al recorrer la ficha. Una línea permite seguir cada indicación hasta su control al usar el ratón o el teclado.

| Escritorio | Resumen en 0.48.186 | Resumen en 0.48.187 | Orden con foco en 0.48.187 |
| --- | --- | --- | --- |
| 1280 × 800 | [Antes](0.48.187/antes/1280-expandida.png) | [Después](0.48.187/despues/1280-expandida.png) | [Ver detalle](0.48.187/despues/1280-ordenes.png) |
| 1440 × 900 | [Antes](0.48.187/antes/1440-expandida.png) | [Después](0.48.187/despues/1440-expandida.png) | [Ver detalle](0.48.187/despues/1440-ordenes.png) |

Con esta ficha ficticia, la PAM y los tiempos pasan de 11 a 12 px sin aumentar la altura de la franja de nueve signos. A 1280 px, las filas de Reposo y Régimen pasan de 45 a 29 px cada una. La columna Indicaciones pasa de 445 a 485 px en el portátil y de 507 a 549 px en escritorio. Se conserva el color original de los valores clínicos. Las dos capturas usan la misma nota, las mismas órdenes y el mismo zoom.

```sh
node scripts/capture-medical-round.mjs v0.48.186 /tmp/lectura-anterior lectura
node scripts/capture-medical-round.mjs WORKTREE /tmp/lectura-actual lectura
```

## Ronda de escritorio 0.48.186

Evolución abre extendida y comparte columna con Signos vitales, Reposo y Régimen. Observaciones de entrega encabeza la segunda columna, seguida de Alertas. Las solicitudes vacías de examen y cirugía ocupan una línea cada una. Cuando llega una orden, su sección recupera el ancho completo y sus acciones.

| Ficha ficticia en Chromium | 0.48.185 | 0.48.186 |
| --- | --- | --- |
| 1280 × 800 | [Antes](0.48.186/antes/1280-expandida.png) | [Después](0.48.186/despues/1280-expandida.png) |
| 1440 × 900 | [Antes](0.48.186/antes/1440-expandida.png) | [Después](0.48.186/despues/1440-expandida.png) |

Con la misma nota expandida, la primera fila de Fármacos termina a 631 px del borde superior, frente a los 709 px anteriores. Las filas de Órdenes de atención pasan de 59–65 a 35 px, y cada indicación de Reposo o Régimen pasa de 69 a 45 px. Los nueve signos vitales caben en una fila a ambos anchos. PA, FC, FR, SatO₂, T° ax. y HGT conservan el nombre completo al pasar el cursor.

En la lista médica de egresados se comprobó que los nombres largos saltan por palabras aunque la fila tenga dos etiquetas de estado. [Ver captura de Egresados](0.48.186/egresados.png).

```sh
node scripts/capture-medical-round.mjs v0.48.185 /tmp/ronda-anterior ronda
node scripts/capture-medical-round.mjs WORKTREE /tmp/ronda-actual ronda
```

## Ficha compacta 0.48.185

Comparación de la misma ficha ficticia, con el zoom predeterminado de Chromium. Las cifras indican la distancia desde el borde superior de la ventana hasta el final de la primera fila de Fármacos.

| Escritorio y estado de la nota | 0.48.184 | 0.48.185 | Espacio recuperado |
| --- | --- | --- | --- |
| Portátil de 1280 × 800, nota contraída | [748 px](0.48.184/1280-contraida.png) | [653 px](0.48.185/1280-contraida.png) | 95 px |
| Escritorio de 1440 × 900, nota expandida | [791 px](0.48.184/1440-expandida.png) | [693 px](0.48.185/1440-expandida.png) | 98 px |

En las dos ventanas se verificó que las acciones de Evolución comparten una línea y que Tab las recorre en orden. El texto completo de la nota reaparece al expandirla. Las nueve mediciones conservan sus valores y su propia celda. Los títulos de Signos vitales, Alertas y Fármacos empiezan a 10 px de su borde. Reposo y Régimen comparten la firma solo cuando coinciden el texto completo de origen, el rol y la hora, incluidos los segundos.

Para repetir la comparación, ejecutar desde la raíz de la extensión.

```sh
node scripts/capture-medical-round.mjs 025bde6 /tmp/ronda-anterior escritorio
node scripts/capture-medical-round.mjs WORKTREE /tmp/ronda-actual escritorio
```

## Distribución estable en 0.48.184

| Ventana y estado | 0.48.183 | 0.48.184 | Ancho de Evolución |
| --- | --- | --- | --- |
| 1280 × 800, nota contraída | [Antes](despues/1280-contraida.png) | [Después](0.48.184/1280-contraida.png) | 637 → 813 px |
| 1440 × 900, nota expandida | [Antes](despues/1440-expandida.png) | [Después](0.48.184/1440-expandida.png) | 1032 → 920 px |

En la 0.48.184 el ancho de Evolución es de 813 px en el portátil y de 920 px en la ventana grande, tanto plegada como abierta. Entrega, Reposo y Régimen quedan en la misma columna en los dos estados. A 1280 × 800, el borde inferior del primer fármaco pasa de 688 a 748 px con la nota contraída y de 775 a 791 px con la nota expandida. La fila completa sigue a la vista en los dos casos de esta ficha ficticia.

«Agregar a entrega» y «Agregar alerta» conservan sus formularios nativos. Se probaron dos borradores distintos y la activación de ambos botones con Enter. La tecla Espacio alterna «No reanimación» entre «Sin marcar» y «Marcado» y conserva el estado de «Gestión de visitas». En la franja, el tiempo de la medición de cuatro horas se distingue de los de dos horas por su peso tipográfico. La temperatura conserva el color de Eloísa.

Para reproducir las capturas de esta versión, ejecutar `node scripts/capture-medical-round.mjs v0.48.184 docs/visual/resumen-escritorio/0.48.184 escritorio`.

## Comparación de 0.48.182 a 0.48.183

Comparación en Chromium con la misma ficha médica ficticia. Se abrió y plegó la evolución con Enter. El ejemplo conserva una nota, una observación de entrega editable, nueve mediciones, dos alertas y un fármaco.

| Ventana y estado | Versión 0.48.182 | Rediseño |
| --- | --- | --- |
| 1280 × 800, nota contraída | [Ver antes](antes/1280-contraida.png) | [Ver después](despues/1280-contraida.png) |
| 1440 × 900, nota expandida | [Ver antes](antes/1440-expandida.png) | [Ver después](despues/1440-expandida.png) |

## Cuánto se alcanza a leer

| Medida en px, 0.48.182 → rediseño | Nota contraída | Nota expandida |
| --- | ---: | ---: |
| Inicio de Evolución | 201 → 177 | 201 → 177 |
| Alto de Evolución | 150 → 121 | 257 → 226 |
| Inicio de Signos vitales | 368 → 328 | 476 → 415 |
| Inicio de Fármacos | 720 → 587 | 827 → 674 |
| Borde inferior de la primera fila de fármaco | 821 → 688 | 928 → 775 |

Estas coordenadas coincidieron en las dos ventanas ensayadas. Con 800 px de alto, la primera fila del fármaco se lee completa incluso con la nota expandida. Signos vitales aparece entre 40 y 61 px antes y Fármacos entre 133 y 153 px antes. Los nueve valores quedaron en una fila, dentro de sus celdas, con sus cifras originales y sin desplazamiento horizontal de la página.

## Verificación con teclado

El botón de plegado conserva el foco y vuelve a presentar el texto completo al expandirse. En la simulación, con «Agregar» deshabilitado, Tab pasa del campo de entrega al reloj de signos vitales. Enter abre el historial y Escape devuelve el foco al mismo reloj.

Después del botón para archivar el último aviso, Tab recorre «No reanimación», «Gestión de visitas» y el campo de Alertas. La prueba activa un interruptor y comprueba que el otro conserva su estado. Escribir un aviso conserva el texto que se estaba editando en la entrega. Todas las acciones se ejecutan en la ficha de prueba.

## Reproducir

Con las dependencias y Chromium de Playwright instalados, ejecutar desde la raíz de la extensión.

```sh
node scripts/capture-medical-round.mjs 06e48f8 docs/visual/resumen-escritorio/antes escritorio
node scripts/capture-medical-round.mjs v0.48.183 docs/visual/resumen-escritorio/despues escritorio
```

Cada ejecución mide los cuatro casos y guarda dos capturas representativas. Las coordenadas corresponden al inicio de la página, con el tamaño de fuente predeterminado. Los resultados dependen de la longitud de la nota, del contenido de las tarjetas y del zoom del navegador.
