# Resumen compacto de hospitalizados

La comparación reproduce la ficha médica con una evolución abierta, observaciones de entrega, nueve mediciones, dos alertas y tres interruptores. Ambas versiones se renderizaron en Chromium con los mismos datos ficticios, ancho de ventana y tamaño de letra del navegador.

| Medida | 0.48.181 · escritorio | Rediseño · escritorio | 0.48.181 · móvil | Rediseño · móvil |
| --- | ---: | ---: | ---: | ---: |
| Filas de signos vitales | 2 | 1 | 9 | 3 |
| Alto de las nueve mediciones | 172 px | 34 px | 712 px | 149 px |
| Alto total de Signos vitales | 288 px | 103 px | 846 px | 218 px |
| Alto de Alertas | 342 px | 209 px | 360 px | 222 px |
| Ancho del acceso al historial de signos | 152 px | 26 px | 152 px | 26 px |
| Letra de «Mostrar suspendidos» | 16 px | 12 px | 16 px | 12 px |

En escritorio (1366 × 850), Evolución y Observaciones comparten una fila de 1029 y 277 px respectivamente. En móvil (390 × 844), cada apartado dispone de 374 px de ancho y la nota se lee primero.

| Captura | Antes | Después |
| --- | --- | --- |
| Escritorio | [Ficha](antes/1366.png) | [Ficha](despues/1366.png) |
| Móvil | [Ficha](antes/390.png) | [Ficha](despues/390.png) |
| Signos vitales | [Detalle](antes/signos.png) | [Detalle](despues/signos.png) |
| Alertas en escritorio | [Detalle](antes/alertas-1366.png) | [Detalle](despues/alertas-1366.png) |
| Alertas en móvil | [Detalle](antes/alertas-390.png) | [Detalle](despues/alertas-390.png) |

## Reproducir

Con las dependencias y Chromium de Playwright instalados, ejecutar desde la raíz del proyecto.

```sh
node scripts/capture-medical-round.mjs 069654e docs/visual/ronda-compacta/antes antes
node scripts/capture-medical-round.mjs WORKTREE docs/visual/ronda-compacta/despues despues
```

La muestra reproduce una variante de Eloísa en la que el nombre de cada signo es texto directo de un párrafo que además contiene un elemento auxiliar vacío. La versión anterior reconocía cero de las nueve etiquetas en esa estructura. La prueba comprueba que el rediseño reconoce las nueve, conserva la temperatura destacada, abrevia la antigüedad y abre el historial con Enter.

La prueba también activa «No reanimación» con el teclado en la simulación y comprueba que «Gestión de visitas» conserva su propio estado. El borrador de observaciones sigue disponible tras cerrar el historial. Los estilos nativos se simulan localmente. El alto medido puede variar con el contenido, el zoom y la versión de Eloísa.
