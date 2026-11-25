# Vistas de la ficha

En la captura que motivó el cambio, la separación entre la navegación y el primer diagnóstico retrasa el comienzo de la lectura. La presión ocupa varias líneas por la PAM y la antigüedad, mientras otras mediciones dejan el mismo espacio libre. En Fármacos los textos ya son pequeños. Un aviso de falta de permisos y una sección sin registros ocupan tarjetas de tamaño parecido, aunque comunican cosas diferentes.

Compacto reduce los márgenes entre tarjetas, alinea los títulos con el contenido y conserva la letra de la prescripción. Cuando una tarjeta de solo lectura contiene únicamente el título y el mensaje de estado reconocido, ambos pueden compartir una línea. Se conserva el texto que distingue ausencia de registros de falta de permisos.

## Comparación en Chromium

Misma ficha ficticia, ventana de 1366 × 768, zoom del navegador al 100 %. La altura incluye la navegación, Diagnóstico, nueve mediciones y ocho indicaciones de prueba.

| Vista | Alto de la ficha | Alto de las nueve mediciones | Filas de fármacos completas en pantalla |
| --- | ---: | ---: | ---: |
| [Desactivado](off.png) | 1643 px | 264 px | 0 |
| [Modo 1 · Compacto](compact.png) | 718 px | 42 px | 8 |
| [Modo 2 · Equilibrado](balanced.png) | 817 px | 46 px | 7 |
| [Modo 3 · Lectura](reading.png) | 952 px | 54 px | 5 |

[A 390 px de ancho](compacto-movil.png), Compacto conserva los nombres completos de las mediciones y permite desplazar la tabla de fármacos dentro de la tarjeta. Para reproducir una vista, ejecuta `node scripts/capture-nursing-summary.mjs WORKTREE reports/compact compact`. El último argumento admite `off`, `compact`, `balanced` o `reading`.
