# Resumen compacto en escritorio

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
node scripts/capture-medical-round.mjs WORKTREE docs/visual/resumen-escritorio/despues escritorio
```

Cada ejecución mide los cuatro casos y guarda dos capturas representativas. Las coordenadas corresponden al inicio de la página, con el tamaño de fuente predeterminado. Los resultados dependen de la longitud de la nota, del contenido de las tarjetas y del zoom del navegador.
