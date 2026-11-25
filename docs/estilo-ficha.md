# Estilo y forma de trabajo en las vistas de la ficha

Esta guía reúne las reglas con las que se rediseñaron el Resumen compacto y el Historial, para que la siguiente mejora empiece donde terminó la anterior.

## Reglas de diseño

1. **Eloísa conserva sus nodos.** La extensión marca lo que reconoce con atributos `data-hhr-*` y lo presenta con CSS. No mueve, clona ni recrea controles de React.
2. **El texto nativo sigue en la página.** Un rótulo abreviado, una firma omitida o una antigüedad compartida se resuelven con contenido generado en CSS. El lector de pantalla, la búsqueda y la impresión reciben el texto original.
3. **Cada dato se dice una vez.** Antes de añadir un rótulo, comprobar si la pantalla ya lo dice a un renglón de distancia.
4. **El color tiene función.** Verde para lo que se puede pulsar, ámbar para una marca clínica, y el color que da Eloísa para un valor fuera de rango. La estructura usa grises.
5. **Cuatro tamaños y dos pesos.** Meta (12 px), lectura (13 px), título (15 px) y título principal (16 px); normal y 600.
6. **Un margen de lectura.** El título de una tarjeta, sus columnas y su primera celda empiezan en la misma línea (`--hhr-ficha-inset`).
7. **Una acción es un icono de la familia y su nombre.** Sin sitio para el nombre queda el icono, con el nombre al pasar el cursor.
8. **Lo que no se reconoce no se toca.** Una tarjeta, fila o botón con una forma distinta de la prevista conserva el aspecto de Eloísa.

## Dónde vive cada cosa

| Archivo | Contenido |
| --- | --- |
| [`hhr-ficha-tokens.css`](../extension/hhr-ficha-tokens.css) | Colores por función, tamaños, pesos, márgenes e iconos. Es el único lugar donde se definen. |
| [`hhr-ficha-themes.css`](../extension/hhr-ficha-themes.css) | Densidad por vista y reglas comunes del Resumen. |
| [`hhr-ficha-round-layout.css`](../extension/hhr-ficha-round-layout.css) y [`.js`](../extension/hhr-ficha-round-layout.js) | Las dos columnas de la ronda de escritorio. |
| [`hhr-ficha-evolution-authors.css`](../extension/hhr-ficha-evolution-authors.css) y [`.js`](../extension/hhr-ficha-evolution-authors.js) | Acciones de Evolución y filtro de evoluciones por profesional. |
| [`hhr-ficha-reading-labels.css`](../extension/hhr-ficha-reading-labels.css) y [`.js`](../extension/hhr-ficha-reading-labels.js) | Firmas, campos de entrega y alerta, interruptores. |
| [`hhr-ficha-history.css`](../extension/hhr-ficha-history.css) y [`hhr-history-date-navigation.js`](../extension/hhr-history-date-navigation.js) | Historial compacto y navegación por fechas. |

Una regla nueva toma sus valores de los tokens. Una regla anterior, escrita con el color o el tamaño a mano, se pasa a tokens cuando se vuelve a editar; no hace falta una migración aparte.

## Cómo cambiar o añadir una vista

1. **Ficha ficticia.** Cada vista tiene la suya en `scripts/*-visual-fixture.mjs`, con datos inventados y la estructura que el lector reconoce.
2. **Captura con el arnés común.** [`scripts/ficha-capture-harness.mjs`](../scripts/ficha-capture-harness.mjs) monta la ficha con los estilos y lectores que declara el manifiesto de una revisión o del árbol de trabajo. Así el «antes» y el «después» usan la misma página.
3. **Comprobaciones como invariantes.** Lo que promete el diseño se mide en la página: alineaciones, orden de lectura, foco de teclado, que nada tape un control. Un fallo se explica con una frase, no con una diferencia de píxeles.
4. **Prueba unitaria de marcas y limpieza.** Cada atributo que el lector pone debe retirarse al cambiar de vista, de episodio o de pestaña, y no reescribirse en un refresco idéntico.
5. **Mutaciones de control.** Romper a propósito la regla nueva y comprobar que alguna prueba falla.
6. **Antes y después.** Capturas a 1280 × 800 y 1440 × 900 en `docs/visual/`, con las medidas que cambian.

```sh
node scripts/capture-medical-round.mjs WORKTREE /tmp/resumen lectura
node scripts/capture-medical-round.mjs WORKTREE /tmp/ingreso ingreso
node scripts/capture-history.mjs WORKTREE /tmp/historial
```

## Calibrar con la página real

Las fichas ficticias reproducen lo que se sabe de Eloísa. Para una pantalla de la que no hay modelo, o para comprobar uno existente, [`scripts/export-ficha-structure.snippet.js`](../scripts/export-ficha-structure.snippet.js) describe la estructura de la pestaña abierta sin datos clínicos:

1. Abrir en Eloísa la pestaña que interesa.
2. F12 → Consola. Pegar el archivo completo y pulsar Enter. Chrome puede pedir escribir `allow pasting` la primera vez.
3. La estructura queda en el portapapeles. Revisarla antes de compartirla.

El exportador conserva etiquetas, clases de componentes, roles, estados y las palabras de interfaz de una lista cerrada. Enmascara cualquier otra palabra como `xxxx` y todos los dígitos como `0`, en textos y en atributos, y nunca lee el valor de un campo. Una prueba lo verifica con nombres, RUN, dosis y texto libre inventados.

Con esa estructura se escribe la ficha ficticia de la vista, y a partir de ahí se sigue el procedimiento anterior.
