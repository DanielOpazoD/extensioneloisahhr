# Historial compacto

## Línea de tiempo en 0.48.192

La comparación usa el mismo Historial ficticio en Chromium: tres días, diez eventos, dos evoluciones consecutivas, una evolución de enfermería y un evento marcado «Nuevo». El reloj de la prueba está fijo en el 15-04-2026 de `Pacific/Easter`, de modo que «Hoy» y «Ayer» siempre dan las mismas fechas.

| Pantalla | 0.48.191 | 0.48.192 | Evoluciones por profesional |
| --- | --- | --- | --- |
| 1280 × 800 | [Antes](0.48.192/antes/1280-historial.png) | [Después](0.48.192/despues/1280-historial.png) | [Ver filtro](0.48.192/despues/1280-evoluciones.png) |
| 1440 × 900 | [Antes](0.48.192/antes/1440-historial.png) | [Después](0.48.192/despues/1440-historial.png) | |

| Medida, 0.48.191 → 0.48.192 | 1280 × 800 | 1440 × 900 |
| --- | ---: | ---: |
| Eventos completos en la primera pantalla | 5 → 8 | 6 → 10 |
| Inicio del primer evento | 182 → 161 px | 182 → 161 px |
| Final del décimo evento | 1281 → 882 px | 1281 → 882 px |

Cada día es una superficie. Su cabecera muestra la fecha junto a «Hoy» y «Ayer» y permanece bajo las pestañas mientras se desplazan sus eventos. Cada evento ocupa una línea con la hora al margen, la categoría, el profesional y el cargo; el texto empieza alineado bajo la categoría. Las evoluciones médicas y de enfermería llevan un filete lateral. Las iniciales del avatar, que repetían el nombre, no se muestran; un avatar con imagen o icono se conserva al tamaño del texto. «Nuevo» cierra la primera línea de su evento.

Una tarjeta que el lector no reconoce, por ejemplo sin hora legible o con un botón en su cabecera, conserva la disposición de Eloísa (avatar, nombre, cargo, hora y controles) dentro de la superficie de su día. Fuera de la vista Compacta el Historial no cambia.

### Verificación con teclado

Enter sobre «Ver evoluciones» reúne las cinco evoluciones y lleva el foco a «Todos». Enter sobre un profesional deja solo sus notas y «Historial completo» devuelve los diez eventos.

```sh
node scripts/capture-history.mjs v0.48.191 /tmp/historial-anterior
node scripts/capture-history.mjs WORKTREE /tmp/historial-actual
```

Estas medidas corresponden a una reconstrucción local del Historial de Eloísa. La longitud de las notas, el número de eventos por día y las variantes de la página real cambian las cifras.
