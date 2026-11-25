# Resumen compacto en escritorio

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
