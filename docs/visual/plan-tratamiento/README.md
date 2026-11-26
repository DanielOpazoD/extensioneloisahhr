# Plan de tratamiento compacto

## Tarjetas de programación en 0.48.192

La comparación usa el mismo Plan de tratamiento ficticio en Chromium, escrito con la forma que se observó en Eloísa ([estructura](../../estructura-eloisa.md#plan-de-tratamiento)): cuatro tarjetas de programación, diez indicaciones, siete horas por página y una tarjeta sin plan.

| Pantalla | 0.48.191 | 0.48.192 |
| --- | --- | --- |
| 1280 × 800 | [Antes](0.48.192/antes/1280-plan.png) | [Después](0.48.192/despues/1280-plan.png) |
| 1440 × 900 | [Antes](0.48.192/antes/1440-plan.png) | [Después](0.48.192/despues/1440-plan.png) |

| Medida, 0.48.191 → 0.48.192 | 1000 × 800 | 1280 × 800 | 1440 × 900 | 1920 × 1080 |
| --- | ---: | ---: | ---: | ---: |
| Indicaciones completas en la primera pantalla, de 10 | 2 → 6 | 2 → 6 | 2 → 10 | 4 → 10 |
| Tarjetas con su título en la primera pantalla, de 4 | 2 → 3 | 2 → 3 | 2 → 4 | 2 → 4 |
| Final de la última tarjeta | 2416 → 1096 px | 2416 → 1096 px | 2286 → 898 px | 2205 → 898 px |

Cada tarjeta pone en una línea su título, su interruptor y sus herramientas. Las herramientas muestran el nombre que Eloísa les da en su icono, «Planificación estandar» y «Planificación única», cuando la tarjeta mide al menos 992 px; en una tarjeta más estrecha quedan los iconos y el nombre aparece al pasar el cursor. Cada indicación ocupa una fila tan alta como su texto: el nombre en negrita, la posología debajo en el tamaño pequeño, y «SOS» o «Externo» como etiquetas. El pie vacío de la tabla no ocupa una fila.

La columna de la indicación mide al menos 224 px. En Eloísa la mantienen abierta los controles de página; al hacerlos más pequeños, en una ventana de menos de 1274 px la columna quedaba en 171 px, más estrecha que la original, de 209 px.

Lo que no cambia:

- **Las horas.** Cada hora conserva el ancho que le da Eloísa y cada marca queda bajo su hora. La prueba mide el centro de cada marca contra el de su rótulo.
- **Los iconos de estado.** Conservan su dibujo y su color. La extensión no les da nombre ni color propios: su significado es de Eloísa.
- **El encabezado fijo** de cada tabla, «Ir a Hoy» y las flechas de página.
- **Lo que tiene otra forma.** Si la primera columna no es «Indicación», la tarjeta conserva el aspecto de Eloísa. Si entre la cabecera y la tabla hay algo más que botones de icono, las herramientas conservan su fila bajo el título. Si entre las tarjetas hay otro bloque, ese bloque y la separación entre tarjetas quedan como en Eloísa.

### Verificación con teclado

Desde el interruptor de una tarjeta, Tab recorre «Planificación estandar», «Planificación única», el menú de opciones e «Ir a Hoy», en el orden en que se ven.

```sh
node scripts/capture-care-plan.mjs v0.48.191 /tmp/plan-anterior
node scripts/capture-care-plan.mjs WORKTREE /tmp/plan-actual
```

La captura comprueba cada ancho dos veces: con la letra del equipo y con una más ancha, como la de otro sistema. Con la letra ancha el plan termina en 1131 px a 1000 px de ancho y en 934 px a 1440 px, donde caben 9 de las 10 indicaciones.

Estas medidas corresponden a una reconstrucción local. La ficha ficticia supone que la columna de horas mide 1000 px, como se midió en una ventana de 1990 px; no se ha comprobado qué ancho le da Eloísa en una ventana de 1280 px. El número de indicaciones y la longitud de sus nombres cambian las cifras.
