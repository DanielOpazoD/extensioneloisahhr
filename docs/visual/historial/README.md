# Historial compacto

## Línea de tiempo en 0.48.192

La comparación usa el mismo Historial ficticio en Chromium, escrito con la forma que se observó en Eloísa ([estructura](../../estructura-eloisa.md#historial)): tres días y once eventos repartidos en diez cajas, la hora como «hh:mm hrs», las dos formas de contenido, una administración de dos fármacos con sus detalles rotulados y dos eventos marcados «Nuevo». El reloj de la prueba está fijo en el 15-04-2026 de `Pacific/Easter`, de modo que «Hoy» y «Ayer» siempre dan las mismas fechas.

| Pantalla | 0.48.191 | 0.48.192 | Evoluciones por profesional |
| --- | --- | --- | --- |
| 1280 × 800 | [Antes](0.48.192/antes/1280-historial.png) | [Después](0.48.192/despues/1280-historial.png) | [Ver filtro](0.48.192/despues/1280-evoluciones.png) |
| 1440 × 900 | [Antes](0.48.192/antes/1440-historial.png) | [Después](0.48.192/despues/1440-historial.png) | |

| Medida, 0.48.191 → 0.48.192 | 1280 × 800 | 1440 × 900 |
| --- | ---: | ---: |
| Eventos completos en la primera pantalla, de 11 | 3 → 6 | 3 → 8 |
| Inicio del primer evento | 182 → 161 px | 182 → 161 px |
| Final del último evento | 2121 → 1175 px | 2100 → 1137 px |
| Ancho de los filtros | 300 → 272 px | 340 → 272 px |

Eloísa da a casi cada evento una caja propia y pone la fecha solo en la primera caja de un día. El lector reconoce dónde empieza y termina cada día, y sus cajas se leen como una superficie: la cabecera muestra la fecha junto a «Hoy» y «Ayer», las cajas del día se tocan y el día siguiente empieza 8 px más abajo. Como en las demás vistas, la fecha queda fija bajo las pestañas mientras pasa su caja, y el selector de fechas junto a las pestañas indica el día que se recorre.

Cada evento ocupa una línea con la hora al margen, la categoría, el cargo y el profesional; el texto empieza alineado bajo la categoría. Las evoluciones médicas y de enfermería llevan un filete lateral. Los detalles rotulados de una administración («Posología», «Dosis») siguen en la línea de su fármaco y un rótulo sin valor no se muestra. Las iniciales del avatar, que repetían el cargo, no se muestran; un avatar con imagen o icono se conserva al tamaño del texto. «Nuevo» cierra la primera línea de su evento.

Una tarjeta que el lector no reconoce, por ejemplo sin hora legible o con un botón en su cabecera, conserva la disposición de Eloísa (avatar, nombre, cargo, hora y controles) dentro de la superficie de su día. Fuera de la vista Compacta el Historial no cambia.

### Verificación con teclado

Enter sobre «Ver evoluciones» reúne las cinco evoluciones y lleva el foco a «Todos». Cada día conserva su fecha mientras alguna de sus cajas tenga una evolución a la vista. Enter sobre un profesional deja solo sus notas, sin filetes ni huecos de las cajas que quedan vacías, y «Historial completo» devuelve los once eventos.

```sh
node scripts/capture-history.mjs v0.48.191 /tmp/historial-anterior
node scripts/capture-history.mjs WORKTREE /tmp/historial-actual
```

Estas medidas corresponden a una reconstrucción local del Historial de Eloísa. La longitud de las notas, el número de eventos por día y las variantes de la página real cambian las cifras.
