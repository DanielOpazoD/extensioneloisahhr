# Listas de trabajo

## La lista médica como la de Gestión de cuidados, en 0.48.202

El responsable comparó las dos listas en su pantalla el 26-11-2026. En la de trabajo médico el nombre de cada paciente se partía dentro de sus palabras, en una columna de unos 110 px, y «Nuevo» era la etiqueta naranja de Eloísa. En Gestión de cuidados el nombre iba en una línea y «Nuevo» era una etiqueta pequeña y verde. Pidió que ambas se vean igual, tomando como referencia la de Gestión de cuidados.

| Pantalla | 0.48.201 | 0.48.202 |
| --- | --- | --- |
| 1280 × 520 | [Antes](0.48.202/antes/1280-lista-medica.png) | [Después](0.48.202/despues/1280-lista-medica.png) |
| 1440 × 520 | [Antes](0.48.202/antes/1440-lista-medica.png) | [Después](0.48.202/despues/1440-lista-medica.png) |

| Medida a 1440 × 520, 0.48.201 → 0.48.202 | |
| --- | ---: |
| Ancho de la columna Paciente | 134 → 312 px |
| Líneas del nombre, en cinco pacientes | 3, 8, 1, 7 y 3 → 1 en todos |
| Alto de las filas | de 45 a 158 px → 45 px en todas |
| «Nuevo» | naranja, 24 px de alto, letra de 13 px → verde, 16 px, letra de 10 px |

Los pacientes son inventados. La lista ficticia de `scripts/capture-medical-worklist.mjs` pasa por el adaptador de la extensión, como la tabla de Eloísa, y reproduce el ancho que la página deja a la columna. Ese ancho se midió en una captura de pantalla, no en la estructura exportada: falta confirmarlo en la página.
