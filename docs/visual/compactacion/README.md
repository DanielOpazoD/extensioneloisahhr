# Resumen de enfermería

Comparación de la extensión publicada 0.48.177 y la corrección 0.48.178 en Chromium. Ambas versiones se muestran con la misma ficha ficticia, escala y fuentes a 1366 × 768 y 390 × 768. Las capturas originales del hospital no forman parte de esta prueba.

| Medida | 0.48.177 | 0.48.178 |
| --- | ---: | ---: |
| Alto de las nueve tarjetas de signos vitales a 1366 px | 258 px | 84 px |
| Filas completas de Fármacos visibles antes de desplazarse a 1366 px | 2 | 6 |
| Alto de las nueve tarjetas de signos vitales a 390 px | 666 px | 224 px |
| Ancho del documento en una ventana de 390 px | 546 px | 390 px |

La prueba anterior usaba «Saturación O2» en un único nodo de texto y una sola acción por fármaco. Con un subíndice HTML, la versión 0.48.177 dejaba de reconocer la cuadrícula completa. La nueva prueba incluye el subíndice, tres acciones por fila y textos de distinta longitud. El desplazamiento horizontal en pantallas estrechas queda dentro del cuadro de Fármacos. Estas medidas describen el ejemplo reproducido.

| Escritorio | Vista estrecha |
| --- | --- |
| [Antes · escritorio](antes-1366.png) | [Antes · vista estrecha](antes-390.png) |
| [Después · escritorio](despues-1366.png) | [Después · vista estrecha](despues-390.png) |

Para repetir la comparación desde el checkout 0.48.178, con las dependencias instaladas y Chromium disponible:

```sh
git fetch origin tag v0.48.177
node scripts/capture-nursing-summary.mjs v0.48.177 reports/antes
node scripts/capture-nursing-summary.mjs WORKTREE reports/despues
```
