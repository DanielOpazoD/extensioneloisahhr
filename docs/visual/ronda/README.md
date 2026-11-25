# Ronda médica en modo compacto

La comparación usa la misma ficha ficticia en Chromium con nueve signos vitales, una evolución expandida, dos secciones vacías y el formulario de entrega de turno. En escritorio ahora caben la nota, las nueve mediciones y la alerta en la primera pantalla.

| Medición | Antes · 1366 × 850 | Después · 1366 × 850 | Antes · 390 × 844 | Después · 390 × 844 |
| --- | ---: | ---: | ---: | ---: |
| Ancho de Evolución | 653 px | 1318 px | 374 px | 374 px |
| Alto de Observaciones de entrega de turno | 394 px | 69 px | 98 px | 69 px |
| Inicio de Signos vitales desde el borde superior | 904 px | 562 px | 1176 px | 775 px |
| Alto de las nueve mediciones | 82 px | 43 px | 217 px | 178 px |
| Inicio de Fármacos desde el borde superior | 1242 px | 839 px | 1666 px | 1187 px |

- Escritorio — [versión anterior](antes/1366.png) y [rediseño](despues/1366.png).
- Móvil — [versión anterior](antes/390.png) y [rediseño](despues/390.png).
- Signos vitales — [detalle anterior](antes/signos.png) y [detalle del rediseño](despues/signos.png).
- Evoluciones — [historial filtrado con dos profesionales](despues/evoluciones.png).

## Reproducir

Desde la raíz del repositorio, con las dependencias instaladas y Chromium de Playwright disponible, ejecutar:

```sh
node scripts/capture-medical-round.mjs bf2c65b docs/visual/ronda/antes
node scripts/capture-medical-round.mjs WORKTREE docs/visual/ronda/despues
```

El script carga los CSS y controladores de lectura declarados por el manifiesto de cada revisión. El caso abre «Ver evoluciones», comprueba las dos notas de «Todos» y después selecciona a una profesional y verifica que aparece solo su nota. También verifica las nueve lecturas, la antigüedad «2h», el color nativo del valor destacado y el ancho de la página.

Estas medidas corresponden a una reconstrucción local del DOM de Eloísa, con datos y estilos de origen simulados. La longitud de las notas, el zoom y las variantes de la ficha real pueden cambiar las dimensiones. En el ancho móvil, la navegación de secciones permite desplazarse lateralmente.
