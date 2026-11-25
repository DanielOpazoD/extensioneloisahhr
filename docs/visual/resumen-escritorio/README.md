# Resumen compacto en escritorio

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
