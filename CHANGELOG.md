# Cambios

## 0.48.227

- Las listas de trabajo (médica y de Gestión de cuidados) usan las tintas y tamaños de la ficha. Medido en la página con el estilo aplicado a mano (27-11-2026): la lista médica pasa de 9 tintas de texto a 4 y de 4 tamaños a 2; la de cuidados, de 11 tintas a 6 y de 6 tamaños a 3; ninguna conserva texto de bajo contraste (había un gris de 3,9:1) y el alto de las filas no cambia. Encabezados en 12 px y tinta suave, celdas en 13 px, nombre y cama en peso 600, el filtro elegido en el verde de acción. «Nuevo» conserva su verde, el mismo en ambas listas.
- Centro HHR (recetas, documentos y sus ventanas) se lee como la ficha: esquina de 8 px y sombra suave, títulos de 15 px, botones de 30 px (lo que se pide con una línea, la vuelta en palabras), etiquetas de 11 px.
- Corregido: en una ventana angosta (menos de 1100 px) el Resumen abría desplazado hasta el campo de alertas, que Eloísa enfoca al cargar; ahora abre arriba, como en escritorio. Y el nombre «Reposo» de «Sin datos» ya no aparece suelto en esa ventana.
- En CI: cada cambio compara sus capturas con las de la versión base y deja las diferencias en magenta como artefacto («capturas-diferencias»), con una tabla en el resumen del trabajo. Es informativo: no detiene un cambio. Y el Resumen se comprueba también a 1024 px: sin desborde lateral, con contraste y controles suficientes, y abierto arriba.

## 0.48.226

- Un solo juego de controles. Los iconos de «Mostrar suspendidos» miden 26 px, como los de Plan (antes 28). Los botones de lectura comparten la esquina de los demás botones.
- Dos tintas para un icono: el verde de lo que se pulsa y el gris tenue de una herramienta de fila (`--hhr-ficha-tool`). «Archivar» de las alertas, el calendario de la fecha diaria y el filtro de Balance Hídrico pasan a ese gris; antes usaban tres grises distintos.
- Menos ruido en las filas: el icono de comentario que Eloísa deja deshabilitado (no hay comentario) ya no se dibuja en cada fila de Fármacos, Indicaciones libres y Diagnóstico; deja su lugar vacío, así que las columnas no se mueven.
- El valor de Régimen («Común») es una etiqueta como las demás: 16 px y letra de etiqueta (antes 18 px y 13 px).
- Plan separa sus tarjetas con 12 px, como el Resumen (antes 8).
- La pestaña activa usa el verde de acción.
- Nueva comprobación en CI: todo texto del Resumen (ambas fichas), Plan, Historial, Alta y Ejecución de cuidados usa una de las tintas de la vista (texto, texto suave, apagado, acción, alarma, deshabilitado y las dos marcas de una indicación).

## 0.48.225

- Reposo sin indicación se lee bajo «Sin datos», con las demás secciones sin registros, como pediste para todo lo vacío. Su tarjeta queda en su lugar, fuera de la vista y con la frase de Eloísa para un lector de pantalla, y Régimen ocupa la línea bajo Signos vitales. El bloque que Eloísa comparte entre Reposo y Régimen no se desarma.
- La impresión de la evolución va en su tarjeta: un icono junto a «Ver evoluciones» que pulsa el icono de Eloísa. Ese icono sale de la fila diaria, que queda con la fecha y la impresión del resumen diario.
- Corregido: la PAM de la 0.48.223 se leía «87.3387»; la cifra de Eloísa no se ocultaba. Ahora se lee «87», y una comprobación en CI lo vigila.
- Balance Hídrico vacío sigue en su línea: tiene el interruptor «Balance Hídrico Indicado», que se usa.

## 0.48.224

- Las confirmaciones se leen con un solo estilo, simple. En el código de Eloísa hay más de veinte (leído el 27-11-2026): «Validar tratamiento», «¿Descartar Evolución?», «¿Descartar alta medica?», «¿Deseas renovar tu sesión?», «¿Confirmar aislamiento del paciente?», «¿Cancelar registro?», «¿Desea confirmar los cambios ingresados?» y otras. Todas usan el mismo diálogo de Eloísa, y ahora se leen así: la pregunta en 15 px, su frase en 13 px en tinta suave, una caja angosta con la esquina de la vista, lo que se pide con una línea alrededor de sus palabras y la vuelta («Salir», «Volver», «Cancelar») solo en palabras, sin mayúsculas. Eloísa conserva el orden, las palabras y las acciones. Un diálogo con un campo para escribir es un formulario y no cambia.
- Las dos confirmaciones propias de la extensión («Cambios sin guardar» y «Revisión del último guardado») se leen igual.
- Cambiar de plantilla con respuestas en Aplicar pauta pregunta dentro de la misma ventana, con «Volver» y «Descartar», en lugar del cuadro del navegador, que no se podía ajustar.
- Nueva comprobación en CI: una confirmación con la estructura de Eloísa toma este estilo, con su contraste y el tamaño de sus botones, y un diálogo con un campo conserva el suyo.

## 0.48.223

- Cambio rápido de paciente: en la ficha abierta desde la lista de trabajo médico o desde Gestión de cuidados, el nombre del paciente en la barra verde abre la lista de pacientes hospitalizados, con buscador por nombre, sala o cama. Cada paciente es un enlace a la misma vista de su episodio, y el actual va marcado. La lista sale de una sola lectura del censo activo (nombre, servicio, sala y cama; nada clínico), se guarda un minuto y solo se entrega a la propia ficha. Se mueve con las flechas y se cierra con Escape.
- La barra verde ya no muestra el diagnóstico: el Resumen empieza con él. Sus palabras siguen en la página.
- La PAM se lee como número entero (Eloísa la escribe con dos decimales, leído en la página el 27-11-2026); la cifra de Eloísa sigue en la página.
- En Alertas, quien escribió se lee con su nombre y apellido, sin el cargo («Elena Ejemplo», no «Enfermera(o) Elena Ejemplo»).
- El Resumen ya no muestra «Gestión de Visitas», a pedido del responsable. El interruptor sigue en la página, fuera de la vista.
- La ventana de Evoluciones es más compacta: texto de 14 px (antes 16), cabecera, filtros y márgenes más bajos y los botones de la vista. Conserva el tamaño de la ventana.

## 0.48.222

- Alta (ficha médica) y Ejecución de cuidados (ficha de Gestión de cuidados) usan el mismo estilo que el Resumen: títulos de 15 px, tarjetas con la esquina de la vista y sin sombra, campos a la altura de una línea, el botón único sin relleno ni mayúsculas, interruptores del tamaño de los demás y texto a la letra del Resumen. Seguían con el aspecto original de Eloísa.
- Ejecución de cuidados: los Filtros se leen como en Historial, cada día encabeza sus horas y cada hora es una tarjeta con su tabla al ritmo del Resumen. Medido en la página con el estilo aplicado a mano (27-11-2026): la vista pasa de 3481 a 2035 px de alto y cada fila de 96 a 61 px; la hora de cada tarjeta, que Eloísa escribía en un gris de 3,9:1, se lee a 16:1.
- El icono de impresión de cada hora entra en la familia de iconos de contorno.
- Antecedentes no cambia: en la ficha leída no tenía contenido que mostrar.
- Nueva captura en CI (`scripts/capture-other-views.mjs`) que comprueba ambas vistas, también su contraste y el tamaño de sus controles.

## 0.48.221

- Plan de tratamiento se ve igual en la ficha de Gestión de cuidados que en la de lista de trabajo médico. Ahí Eloísa abre cada tabla, salvo Procedimientos, con una columna de casillas para seleccionar filas (leído en la página el 27-11-2026), y la vista no la reconocía: tres de las cuatro tarjetas quedaban con títulos de 24 px, interruptores de 38 px y botones en mayúsculas. Ahora se reconocen las cuatro; la columna de selección mide lo que su casilla y la indicación se lee como en la ficha médica.

## 0.48.220

- Cuando la vista Compacta no reconoce el Resumen o el Plan de tratamiento de una ficha ya cargada, lo avisa una vez por paciente y vista: «La vista Compacta no reconoció el Resumen de esta ficha y lo muestra como lo dibuja Eloísa. Puede que Eloísa haya cambiado su página.». Antes volvía al aspecto de Eloísa sin avisar. Espera a que la página quede quieta 4 segundos y, mientras no la reconoce, deja `data-hhr-view-unrecognized` en la página.
- El aviso de versión nueva («Actualizar» en la barra de Centro HHR) llega antes: la respuesta de GitHub vale una hora en vez de seis. En la página, con la 0.48.211 instalada y la 0.48.218 publicada, la barra todavía no avisaba (27-11-2026); con versiones publicadas varias veces al día, seis horas de respuesta guardada dejaban la instalada atrasada sin aviso.

## 0.48.219

- Una sola familia de iconos. Los iconos rellenos de Eloísa (imprimir, archivar, suspender, comentarios y agregar nota) se dibujan con el contorno de los de la vista (trazo de 1,8 y puntas redondeadas), como Enmendar, Pautas o «Mostrar suspendidos». Conservan su lugar, su tamaño y su nombre.
- La barra de Centro HHR va en la línea de pestañas como parte de ella: una línea fina y sin la sombra que la hacía flotar.
- Nueva comprobación en CI: en el Resumen de ambas fichas, en Plan y en Historial, todo texto debe leerse a 4,5:1 o más (3:1 si es grande) y todo control debe medir 24 px o dejar 24 px libres a su alrededor (WCAG 2.2, 1.4.3 y 2.5.8). Hoy las tres vistas la cumplen.

## 0.48.218

- Cada impresión del Resumen dice qué imprime, con un solo aspecto: el icono y sus palabras en la tinta de una acción, como «Imprimir indicaciones». El icono de la fila diaria, que Eloísa llama solo «Imprimir», se lee «Evolución»: imprime el reporte de evolución (leído en la página el 27-11-2026). El icono al final de Fármacos se lee «Imprimir recetón». Sus nombres para el lector de pantalla siguen siendo los de Eloísa.
- Balance Hídrico sin registros guarda su filtro tras un icono, después de «Sin registros». El icono lo abre y lo cierra, y al abrirlo el foco pasa al filtro. Con registros, el filtro vuelve a ser el de Eloísa.
- Los signos vitales ya no van en cajas grises: cada medición se lee sobre la tarjeta, separada por una línea fina.
- Vale igual para la ficha de lista de trabajo médico y la de Gestión de cuidados; en esta última Eloísa no dibuja el icono de evolución ni Fármacos.
- Verificado en la página real, con el estilo aplicado a mano: con «Evolución», la fila diaria sigue en la línea de pestañas con 130 px libres antes de la barra de Centro HHR, y la cabecera de Fármacos no crece.

## 0.48.217

- Plan de tratamiento e Historial hablan el idioma del Resumen. En Plan, el interruptor de cada tarjeta es un icono de 26 px con su nombre al apuntarlo: el de pausa para «Mostrar Suspendidos» (el mismo del Resumen) y un ojo para «Mostrar realizados, no realizados, archivados y suspendidos» y «Mostrar Finalizados». «Mostrar todos los ocultos», arriba de las tarjetas, queda como una nota pequeña. Las etiquetas «SOS» y «Externo» van al tamaño de etiqueta de la vista (11 px).
- Programación de procedimientos ahora se reconoce: Eloísa deja vacía la primera columna de su tabla (leído en la página el 27-11-2026), y la tarjeta quedaba con su aspecto original. La reconoce su título.
- En Historial, el panel de Filtros se lee como una tarjeta de la vista: título de 15 px, campos a la altura de una línea y «Filtrar» como el botón único del Resumen (línea, sin relleno). Los valores que Eloísa escribe en peso 300 junto a su rótulo («Posología», «Dosis»…) se leen con el peso del texto; los rótulos conservan el suyo. Los detalles en el gris de Eloísa (3,9:1) pasan a la tinta suave de la vista, y «Nuevo» y las demás etiquetas van a 11 px (antes 10 px).
- Un signo vital que Eloísa marca en rojo fuera de rango se lee en el rojo de alarma de la vista (`#c62828`, 5,2:1 sobre blanco), también en la presión.
- Verificado en la página, con el estilo aplicado a mano: las cuatro tarjetas de Plan reconocidas; en Historial, 130 valores y detalles ajustados, 80 rótulos con su peso, ningún texto en el gris de 3,9:1.

## 0.48.216

- El estado de un diagnóstico, de un procedimiento o de una orden de examen se lee como el texto de su columna: sin caja ni flecha, y alineado con las demás celdas (antes 14 px más adentro). Al apuntar su fila o llegar a ella con el teclado aparecen su caja y su flecha, sin que la palabra se mueva; abierto, las conserva. El selector de Eloísa, su menú y lo que escribe no cambian.
- Así Diagnóstico se lee igual en las dos fichas: en la de Gestión de cuidados Eloísa ya escribe el estado como texto (leído en la página el 27-11-2026), y en la de lista de trabajo médico ahora se ve igual hasta que se apunta.
- Verificado en la página, con el estilo aplicado a mano: en reposo sin línea ni flecha y la palabra en el borde de su celda; con el foco, la línea y la flecha de nuevo en el mismo lugar.

## 0.48.215

- «Sin datos» se lee en pocas líneas: un grupo por estado. «Sin registros» y, a continuación, los nombres de las secciones sin registros o sin solicitudes, uno tras otro y separados por un punto; luego «Sin permiso» con los suyos. Cada sección ya no repite su estado. En la página, con el estilo y la colocación aplicados a mano, el grupo pasa de 7 líneas y 179 px a 3 líneas y 71 px en la ficha médica, y de 6 líneas y 153 px a 3 y 71 en la de Gestión de cuidados.
- Los nombres de un grupo empiezan en una misma columna, también al saltar de línea, y se leen en la tinta de lo que explica, sin negrita.
- «Exámenes» y «Cirugía» sin solicitudes van en el grupo sin registros, como las demás.
- El icono de «Mostrar suspendidos» sigue al nombre de su sección.
- Vale igual para la ficha abierta desde la lista de trabajo médico y desde Gestión de cuidados.

## 0.48.214

- Alertas se lee como el resto del Resumen. Cada alerta es una fila: su texto en la tinta y el peso de lo que se lee (antes en negrita), quién la escribió y cuándo en gris, y una línea entre dos filas. La barra ámbar que llevaba cada fila pasa a ser una sola marca junto al título «Alertas», que aparece cuando hay alertas. En la página, con el estilo aplicado a mano, una fila pasa de 49–50 a 45–46 px en las dos fichas.
- «No reanimación» se lee como el interruptor de al lado mientras no está marcada: sin su barra ni su negrita. Marcada, lleva el fondo y la marca de una alerta. No se mueve al marcarla.
- La tarjeta de Alertas mide al menos lo que su lista necesita, hasta unas seis alertas: con una evolución breve, la lista ya no se corta a mitad de una alerta. Más allá, se desplaza dentro. La nota sigue terminando en el mismo borde.
- Vale igual para la ficha abierta desde la lista de trabajo médico y desde Gestión de cuidados.

## 0.48.213

- Un solo botón en el Resumen de la vista Compacta. Eloísa dibuja «Imprimir» y «Filtrar» con relleno verde y «Validar tratamiento» con relleno naranja, y la vista agregaba «Agregar» y «Agregar alerta» con contorno: cuatro aspectos. Ahora todos son una línea alrededor de sus palabras, en la tinta de lo que se puede pulsar, con la misma esquina y la misma letra. Miden 26 px de alto; «Filtrar» mide los 30 de los campos de su fila.
- Un botón deshabilitado se lee en una tinta más clara. Los botones que solo abren una lectura («Ver evoluciones», «Nota completa», «Historial») siguen sin línea.
- No cambian las palabras ni lo que hace cada botón, ni los botones de las filas de una tabla o de las ventanas de Eloísa.
- Vale igual para la ficha abierta desde la lista de trabajo médico y desde Gestión de cuidados: se aplicó a mano en las dos, en la página.

## 0.48.212

- Revisión de la carga de las dos fichas con la 0.48.211 instalada, cuadro por cuadro en la página. La ronda ya se armaba desde el primer cuadro; quedaban tres saltos de un instante, y se corrigen:
  - La parte alta de la ronda ya no espera a la línea de enlaces de sección, que Eloísa dibuja y llena después: Diagnóstico empezaba 60 px más abajo y subía al llegar la nota, los enlaces se alcanzaban a ver unos 160 ms y la fecha del resumen diario aparecía un instante en su propia línea antes de acoplarse. Con las reglas nuevas aplicadas en la página, Diagnóstico queda en su lugar desde el primer cuadro, la nota se mueve 6 px y la fecha pasa directo a la línea de pestañas, en la ficha médica y en la de Gestión de cuidados.
  - Lo que Eloísa dibuja dentro del mismo cuadro, después del turno de la vista, también se presenta antes de pintarse. Signos vitales se vio un cuadro con 624 px de alto en lugar de 134, y Diagnóstico con 130 en lugar de 82.
  - El marcador de carga de Diagnóstico mide lo que dos diagnósticos.

## 0.48.211

- «Ver evoluciones» vuelve a funcionar al entrar a la ficha desde la lista. Decía «Las evoluciones no fueron autorizadas para el episodio de esta pestaña»: Eloísa pasa de la lista a la ficha sin cargar una página, y la extensión comparaba el episodio con la dirección de la lista. Ahora usa la dirección de la pestaña, que el navegador mantiene. Comprobado en la página: desde la lista fallaba siempre y con la ficha cargada directamente leía sus notas.
- Se quita «Imprimir selección (n órdenes)» de Solicitud de examen en la vista Compacta, como pidió el responsable. Cada orden conserva la impresión de su fila.
- «Mostrar suspendidos» es un icono (un círculo con una pausa) en lugar del interruptor con su texto, en Fármacos, Indicaciones libres, Producto no farmacológico y Procedimientos. Es la misma casilla de Eloísa: se lee pulsado mientras muestra lo suspendido, responde al teclado y conserva sus palabras como nombre y como ayuda al pasar el puntero.
- Una evolución breve ya no termina antes que Entrega de turno y Alertas: su tarjeta mide al menos lo que ellas, y el bloque tiene un solo borde inferior.
- Las herramientas de cada fila (suspender, notas, menú, archivar una alerta) esperan en una tinta más tenue y toman su color al apuntar la fila o al llegar con el teclado: una lista se lee primero como su texto.
- Vale igual para la ficha abierta desde la lista de trabajo médico y desde Gestión de cuidados.

## 0.48.210

- La ronda del Resumen se arma desde el primer cuadro de la carga, con los marcadores que Eloísa dibuja mientras llegan los datos: Diagnóstico arriba, Evolución (o Valoración) con Entrega y Alertas a su lado, y Signos vitales debajo, cada uno con el espacio de lo que lo reemplaza. Cada apartado aparece donde se lee. Con la 0.48.209 instalada, medido en la página, la nota, Alertas y Reposo se veían unos 200 ms en la cuadrícula de Eloísa hasta que llegaba la entrega de turno, y Diagnóstico empujaba todo al llegar.
- La fecha del resumen diario se acopla en la línea de pestañas en el mismo pase que arma la ronda; antes esperaba a la línea de enlaces y se veía un instante en su propia línea. El icono «Imprimir indicaciones» no se dibuja solo en su línea mientras Fármacos carga.
- Evolución y Valoración ya no muestran la flecha que contraía la nota, en la ficha abierta desde la lista de trabajo médico y desde Gestión de cuidados. La nota se lee entera. Si Eloísa la entrega cortada y la vista no puede desplegarla, «Leer más» aparece con las demás acciones.
- Toda sección sin registros o sin permiso se lee siempre bajo «Sin datos». Se quitan «Ver vacías» y «Ocultar vacías»: nada se pliega.
- En «Sin datos», una solicitud sin registros (Exámenes, Cirugía) se lee como las demás: su nombre y, enseguida, su estado, en la misma línea que su vecina. El filtro «Mostrar suspendidos» de una sección vacía empieza donde empieza la segunda columna.
- Fármacos e Indicaciones libres comparten bordes y ritmo: la tabla de Fármacos llega al borde de su tarjeta como la de Indicaciones libres y sus columnas empiezan bajo el título (antes 7 px más adentro); el número de días se lee en la línea del medicamento (Eloísa lo dejaba 4 px más abajo); y una fila mide 31 px en las dos tablas (antes 39 en Fármacos y 27 en Indicaciones libres). El mismo ritmo vale para las demás tablas del Resumen.
- Todo vale igual para la ficha abierta desde la lista de trabajo médico y desde Gestión de cuidados.

## 0.48.209

- La ficha ya no se ve pasar del aspecto de Eloísa al de la vista Compacta al abrirse, al recargarse o al actualizarse una tarjeta. Lo que Eloísa dibuja toma la presentación de la vista en el mismo cuadro en que se pinta; antes la tomaba 80 ms después, y cada tarjeta se alcanzaba a ver en su forma original.
- Mientras la ficha carga, cada apartado es una línea con su título (50 px) en lugar de la tarjeta de 176 px de Eloísa. En la ficha leída el 26-11-2026 la página en carga mide 1.659 px en vez de 4.047, cerca de los 1.419 con que termina: llega a su tamaño en lugar de encogerse.
- La fecha del resumen diario e «Imprimir» no se dibujan en su línea de Eloísa mientras la ronda se arma: aparecen en la línea de pestañas. La espera termina sola a los 1,2 s si la ronda no llega a formarse, y la fila queda donde Eloísa la pone, con sus controles.
- Al recargar la página, la vista guardada se nombra antes de que Eloísa dibuje su primera tarjeta.
- Evolución (Valoración en la ficha de Gestión de cuidados) reúne sus acciones en una sola línea, en el encabezado: «Ver evoluciones», «Nota completa», las herramientas de Eloísa como iconos de una familia (Enmendar, Ver enmendados, Pautas), la flecha que contrae o despliega la nota y el menú. Ya no hay una fila de botones bajo el texto.
- «Nota completa» reemplaza a «Leer nota completa» y aparece cuando la nota no cabe en la tarjeta. La flecha es el «Leer más / Leer menos» de Eloísa, en su mismo lugar del árbol.
- La nota tiene más espacio: nunca menos de catorce líneas, y una nota larga crece hasta lo que la ventana deja antes de Signos vitales, que siguen en la primera pantalla (16 líneas a 800 px de alto, 21 a 900, 27 a 1.011 y hasta 30 en una pantalla más alta).
- Las ventanas de lectura son más grandes: «Nota completa» y «Ver evoluciones» abren a 1.216 px de ancho (antes 960) y con el texto a 16 px.
- Vale igual para la ficha abierta desde la lista de trabajo médico y desde Gestión de cuidados.

## 0.48.208

- En el Historial de la vista Compacta, quien firma cada evento se lee con su primer nombre y su primer apellido, como en el Resumen: «Daniel Opazo Damiani» se lee «Daniel Opazo». El nombre completo sigue en la página.
- El filtro «Evoluciones por profesional» del Historial usa el mismo nombre corto. Si dos profesionales se leyeran igual, cada uno conserva su nombre completo.
- El Plan de tratamiento no cambia: no muestra nombres de profesionales.

## 0.48.207

- En el Resumen de la vista Compacta ya no se muestra la barra de enlaces de sección (Alertas, Diagnóstico, Indicaciones libres, Fármacos, Régimen, Evolución o Valoración, Reposo, Dispositivos invasivos, Signos vitales…), ni en la ficha abierta desde la lista de trabajo médico ni en la de Gestión de cuidados. El responsable pidió quitarla. La ficha empieza donde estaba la barra.
- «Ver vacías», que estaba en esa barra, pasa al final de la línea del rótulo «Sin datos»: sigue desplegando y plegando las secciones vacías.
- El cuadro del resumen diario ya no dibuja «Imprimir» sobre la fecha. Eloísa da 180 px a ese campo y, con su nombre delante, el botón quedaba 101 px encima; ahora cada control sigue al anterior: nombre, fecha con su calendario, «Imprimir» y el icono.
- Los profesionales se leen con su primer nombre y su primer apellido, sea médico, enfermera, kinesiólogo u otro: en la firma de cada tarjeta, en quién escribió una alerta, en «Solicitante» y en el lector de evoluciones. «Daniel Opazo Damiani» se lee «Daniel Opazo». El nombre completo sigue en la página para el lector de pantalla, la búsqueda y la impresión.
- La firma de Diagnóstico dice el día y quién, sin la hora.
- En Fármacos e Indicaciones libres, la columna que Eloísa titula «Indication» se lee «Indicación».
- Balance Hídrico sin registros es una línea: su nombre, su filtro, «Sin registros» y, al final, su interruptor y su icono de impresión. Antes medía 125 px y decía «No se presentan registros de balance hídrico para este paciente»; ahora mide 45.
- Si el Resumen no tiene la forma que la vista reconoce, la barra de enlaces se conserva.

## 0.48.206

- En el Resumen de la vista Compacta, en escritorio, la tarjeta de Signos vitales termina con sus mediciones. Hasta ahora se estiraba hasta el alto de la columna de su derecha y dejaba una franja en blanco bajo las mediciones (en la página, 259 px de tarjeta para 135 de contenido).
- Reposo y Régimen pasan a leerse bajo Signos vitales, en su misma mitad de la línea, y el grupo «Sin datos» ocupa la otra mitad desde arriba. En la ficha leída las dos columnas miden 202 y 163 px, y Fármacos empieza 57 px más arriba. Sin secciones para el grupo «Sin datos», Reposo y Régimen siguen junto a Signos.
- Vale igual para la ficha abierta desde la lista de trabajo médico y desde Gestión de cuidados.

## 0.48.205

- La ficha abierta desde Gestión de cuidados muestra su nota como la ficha médica. Su tarjeta se titula «Valoración» y trae un párrafo «Evolución:» antes del texto: por esa diferencia la vista no la reconocía, y la nota quedaba plegada en una caja de 350 px, sin sus catorce líneas ni sus herramientas con nombre. Ahora ocupa el mismo ancho y alto, se abre entera, se desplaza dentro de su cuadro y lleva «Ver evoluciones» y la herramienta que Eloísa le da. La tarjeta conserva su título, «Valoración».
- Con eso lo que sigue a la nota (Signos vitales, Reposo, Régimen, Fármacos) empieza en la misma línea en las dos fichas.
- Dispositivos invasivos se lee como Fármacos: una línea por fila y por encabezado, la fecha de instalación con su hora en una línea, el título con su firma al lado y la tabla dentro de su tarjeta. En la página la tarjeta medía 207 px con un dispositivo y ahora mide 73; la tabla se salía 105 px de su tarjeta.

## 0.48.204

- La vista ya no pierde su forma al abrir el menú lateral de Eloísa ni ninguna de sus ventanas. Mientras el menú estaba abierto, el Resumen detrás volvía al orden de Eloísa: desaparecían la ronda en columnas, la fila diaria acoplada, los editores plegados y la tarjeta de fecha de alta reaparecía. Eloísa marca toda la página como oculta para los lectores de pantalla mientras tiene algo abierto encima, y la extensión lo tomaba por contenido oculto del resumen. Ahora solo cuenta lo que está oculto dentro del resumen. Lo mismo valía para el Plan de tratamiento, el detalle de las indicaciones y la franja de signos.
- En la fila diaria acoplada, el campo de la fecha mide lo que una fecha. En la página se encogía hasta su calendario y la fecha no se leía.

## 0.48.203

- En el Resumen de la vista Compacta, «Ver evoluciones» abre las evoluciones del episodio de todas las profesiones sin salir del Resumen: médicas, de enfermería, de kinesiología y las demás, de la más reciente a la más antigua. Cada una dice su profesión, su autor, su día y su hora, y si fue enmendada, tachada o archivada. Hasta ahora el botón llevaba al Historial.
- Una línea de profesiones, con el número de notas de cada una, deja ver solo las de una profesión. Se leen los últimos 14 días; «Ver más antiguas» amplía a 60 días y después a un año.
- Las horas se muestran en hora de Rapa Nui. El historial de Eloísa las guarda en hora de Chile continental y la extensión las convierte, como exige el contrato de HHR.
- La lectura es nueva y es solo lectura: la extensión pide el historial a Eloísa con la sesión del profesional, para el episodio que su propia pestaña tiene abierto, y no guarda ni envía nada. Si la lectura falla, el lector lo dice y ofrece reintentar: nunca muestra «sin evoluciones» por un fallo.
- «Ver en Historial», dentro del lector, lleva a las notas del Historial con su filtro por profesional, como hacía el botón. En la pestaña Historial el botón sigue filtrando lo que hay en pantalla.

## 0.48.202

- La lista de trabajo médico se lee como la de Gestión de cuidados. La columna Paciente toma el ancho de un nombre completo (de 264 a 328 px, según la ventana) y el nombre va en una línea, con su RUN debajo; si no cabe, se parte entre palabras. Hasta ahora esa columna medía unos 110 px y un nombre se partía dentro de sus palabras, en hasta ocho líneas.
- «Nuevo» se muestra en la lista médica como en Gestión de cuidados: una etiqueta pequeña y verde tras el nombre, en lugar de la etiqueta naranja de Eloísa, que le quitaba sitio al nombre.
- Con eso todas las filas de la lista médica miden lo mismo. En pantallas de menos de 900 px la columna conserva el ancho de Eloísa y su desplazamiento lateral.

## 0.48.201

- En el Resumen de la vista Compacta, en escritorio, Signos vitales ocupa la primera mitad de su línea y deja la otra mitad a Reposo y Régimen y, debajo, al grupo «Sin datos»: las secciones sin registros o sin permiso, dos por fila, con las solicitudes de examen y de cirugía sin registros entre ellas. Antes Signos vitales ocupaba todo el ancho, Reposo y Régimen una línea aparte y el grupo «Sin datos» el final de la ficha.
- Con eso «sin alergias registradas» o «sin RAM» se leen en la primera parte del Resumen, sin llegar al final. Fármacos empieza donde empezaba.
- Las nueve mediciones de Signos vitales se leen en dos filas dentro de su mitad, cinco y cuatro. Sin Reposo, Régimen ni secciones sin datos, Signos vitales conserva todo el ancho.
- La fecha del resumen diario, «Imprimir» y el icono de impresión dejan de ocupar una franja propia sobre la ficha. Van al final de la línea de pestañas (Resumen, Antecedentes, Plan de tratamiento…), a la izquierda de la barra de Centro HHR, y siguen a la vista al desplazar la ficha. Hasta ahora solo subían a la línea de enlaces de sección cuando cabían, y con la barra de Centro HHR desplegada casi nunca cabían: en la ficha del responsable la franja seguía ahí. El resumen empieza 42 px más arriba.
- Si Eloísa cambiara su línea de pestañas (que deje de estar fija o que tape la fila), la fecha e «Imprimir» van al final de la línea de enlaces de sección; los enlaces que no caben se desplazan bajo ellas y el último queda siempre a la vista.
- Procedimientos se lee tan denso como Fármacos: una línea por fila (de 28 a 31 px en lugar de 51), el selector de «Estado» a la altura de la línea y al ancho de su texto, y «Ver más» al final de la línea del fundamento en lugar de debajo. Solicitud interconsulta, Órdenes de atención, Solicitud de examen y Solicitudes de intervención quirúrgica toman el mismo ritmo. A 1440 × 900 la ficha completa mide 106 px menos que en la 0.48.200, y 253 px menos con registros en todas las secciones.
- Una sección plegada tras «Ver vacías» ya no deja un hueco entre las demás.

## 0.48.200

- Al leer el censo desde Ficha Médico, la extensión informa explícitamente `documentType: 'Pasaporte'` cuando Eloísa identifica al paciente con pasaporte (en la cabecera/lista o en el rótulo «Pasaporte:» verificado de la fila o ficha abierta), sin adivinar tipos desconocidos ni confundir RUN materno/progenitor. Así HHR puede reconocer pasaportes numéricos desde la primera sincronización.
- En Centro HHR (recetas, órdenes de laboratorio e imágenes y listas de hospitalizados), un paciente con pasaporte identificado conserva su documento tal cual y se rotula como «Pasaporte», sin formatearlo nunca como RUN chileno aunque sus dígitos coincidan con un dígito verificador válido.

## 0.48.199

- En el Resumen de la vista Compacta, en escritorio, las secciones sin registros o sin permiso cierran la ficha juntas, bajo el rótulo «Sin datos»: cada una dice su nombre y «Sin registros» o «Sin permiso», tres por fila y sin tarjeta propia. Antes cada una ocupaba una tarjeta de una línea, intercalada entre las que tienen datos. Balance Hídrico conserva su tarjeta: su filtro permite buscar otro período.
- Procedimientos, Solicitud interconsulta, Solicitud de examen y Solicitudes de intervención quirúrgica con registros se leen como las demás tablas: mismo título, misma banda de encabezados, mismo tamaño de letra y filas de una a tres líneas. «Imprimir selección» se escribe como «Validar tratamiento». Su forma se leyó en capturas de pantalla y falta confirmarla con la estructura exportada de la página.
- Un Reposo o un Régimen que espera confirmación conserva el color y las herramientas que le da Eloísa, y toma el margen y la letra de las tarjetas que lo rodean: al confirmar cambia de forma, no de aspecto.
- La fila del resumen diario nombra su campo delante de él, «Resumen diario paciente», en lugar de cortarlo sobre su borde, y ya no muestra quién actualizó el resumen. En una línea sin sitio para el nombre, la fila se acopla sin él.
- «Leer nota completa» abre la evolución en una ventana más grande y más limpia: hasta 960 px de ancho y el 92 % del alto de la pantalla, una sola superficie blanca y más aire alrededor del texto.
- En una pantalla ancha el contenido se detiene en 1440 px en lugar de 1600 y queda más centrado.
- El Resumen se abre arriba. Eloísa da el foco al campo de alertas mientras carga y la página lo seguía hasta la mitad del documento; ahora vuelve a su inicio mientras nadie se haya desplazado, pulsado ni escrito.

## 0.48.198

- En el Resumen de la vista Compacta, en escritorio, cada bloque tiene su lugar: Diagnóstico abre la ficha; después Evolución, con Observaciones de entrega y Alertas a su lado; luego Signos vitales a todo el ancho; y una línea con Reposo, Régimen y las solicitudes de examen y cirugía sin registros. Hasta ahora Diagnóstico y Fármacos empezaban hasta 100 px más arriba o más abajo según el largo de la nota y el número de alertas.
- Evolución muestra siempre catorce líneas, en lugar de entre nueve y doce según el alto de la ventana. Una nota corta deja espacio y una larga se desplaza dentro de su cuadro. Observaciones de entrega y Alertas terminan en la misma línea que la nota, y la lista de alertas se desplaza dentro de su cuadro, con los interruptores a la vista.
- La vista respira más. Ningún texto toca el borde de su cuadro: el margen de lectura dentro de cada tarjeta pasa de 10 a 16 px. Entre dos bloques hay 12 px en lugar de 8 y las esquinas miden 8 px. Las tablas conservan el ancho de sus columnas de lectura: caben en una línea las mismas indicaciones que antes.
- Reposo, Régimen y las solicitudes sin registros se leen a la altura del centro de su línea, aunque uno ocupe más alto que el otro.
- Fármacos empieza más abajo: en una ventana de 800 px de alto queda bajo la primera pantalla, que ahora es la ronda completa hasta Signos vitales.

## 0.48.197

- En el Resumen de la vista Compacta, Fármacos vuelve a alinearse con las demás tarjetas, con su título, su botón «Validar tratamiento» e «Imprimir indicaciones» junto al título. Eloísa había puesto la tarjeta dentro de una segunda sección, y la vista dejó de reconocerla: quedaba 10 px más adentro y a su tamaño nativo, y el icono de impresión ocupaba una línea propia.
- La línea «Medico Validador:» de Fármacos se lee bajo el título, en gris y pegada a la tabla. Si nadie ha validado el tratamiento, dice «Tratamiento sin validar».
- El formulario de nueva alerta se pliega aunque Eloísa le dé el foco al abrir la ficha, y suelta ese foco: la siguiente tecla ya no puede escribir una alerta por descuido. «Agregar alerta» lo abre como antes.
- Las secciones vacías o sin permiso se leen todas en una línea: Diagnóstico y Órdenes de atención sin registros, Solicitudes de intervención quirúrgica (que pasa junto a Exámenes en la ronda), Eventos Adversos y Examen Gíneco Obstétrico. Diagnóstico vacío sigue a la vista: no se pliega con las demás secciones vacías.
- Balance Hídrico ocupa 115 px en lugar de 166: su título como el de las demás tarjetas y su filtro a la altura de una línea, con sus campos, sus calendarios y «Filtrar».
- Una indicación libre larga se lee entera, sin «Leer más», como la posología de un fármaco.
- Todas las tarjetas bajo la ronda se titulan igual, aunque Eloísa dibuje dentro algo que la vista no conoce.

## 0.48.196

- En la vista Compacta, la ficha deja el mismo margen a cada lado, y algo más amplio: 35 px a 1280, 42 a 1440, 56 desde 1800. En una pantalla ancha el contenido se detiene en 1600 px y queda centrado. Las tarjetas del Resumen empezaban 16 px más a la izquierda que la línea de secciones. Pestañas, línea de secciones y tarjetas comparten ahora un borde.
- Las vistas de la ficha escriben con la tipografía de Eloísa, Inter, en lugar de la del sistema: una tarjeta ya no mezcla dos letras. Usan dos pesos y cuatro tamaños, y cada tarjeta se titula a 15 px, Evolución incluida.
- El texto usa los grises neutros de Eloísa. El nombre de quien indica un fármaco ya no se confunde con un enlace.
- Entre dos bloques del Resumen hay siempre 8 px, y todas las tarjetas tienen la misma superficie. Cada tabla empieza en el borde de su título, y sus encabezados tienen un solo tamaño.
- Las secciones vacías (Producto no Farmacológico, RAM, Alergias) se leen como las solicitudes vacías: su nombre, un mensaje discreto y, si lo tienen, su filtro al final de la línea.
- En Diagnóstico, la fecha y el estado no se parten, y el título queda arriba. En Fármacos, la etiqueta SOS o Antimic. sigue al nombre en su misma línea.

## 0.48.195

- Cuando hay una versión publicada posterior a la instalada, la barra de Centro HHR muestra «Actualizar» sobre la ficha, y Ajustes dice cuál tienes, cuál está publicada y cómo cambiarla. Chrome no actualiza sola una extensión cargada desde una carpeta, y hasta ahora el aviso solo aparecía al pulsar el icono naranjo.
- Para saberlo, la extensión pregunta a GitHub cuál es la última versión publicada mientras hay una ficha abierta, como mucho una vez cada seis horas. La petición es pública y fija: no lleva credenciales ni datos de la página.

## 0.48.194

- En el Resumen de la vista Compacta, la columna «Tiempo» de Fármacos muestra los días de tratamiento con su unidad: «12 d», en lugar de un triángulo con un número.

## 0.48.193

- En el Resumen de la vista Compacta, Diagnóstico pasa a la primera pantalla: abre las tarjetas bajo la ronda, con una línea por diagnóstico, su estado y sus notas.
- «Imprimir indicaciones» deja su línea propia y va junto al título de Fármacos, con su nombre a la vista.
- Reposo sin registro se lee «Sin registro» en la línea de Régimen, en vez de ocupar una tarjeta a todo el ancho. Régimen muestra su valor y su observación en una línea.
- En Fármacos, el solicitante ocupa una línea y la posología tiene más sitio: la mayoría de las indicaciones cabe en una línea. «Validar tratamiento», los interruptores y el estado de un diagnóstico miden lo que una línea de texto.
- Las pestañas de la ficha y «Validar tratamiento» se escriben como una frase, no en mayúsculas. Las tarjetas bajo la ronda empiezan en su mismo borde.

## 0.48.192

- En la vista Compacta, el Historial se lee como una línea de tiempo: una superficie por día, una línea por evento y la hora en una columna al margen. «Hoy» y «Ayer» muestran su fecha. Las evoluciones médicas y de enfermería llevan el mismo filete lateral que Evolución en el Resumen.
- Cada evento muestra categoría, cargo y profesional en una línea. Los detalles de una administración de medicamentos siguen en la línea de su fármaco. Las iniciales que repetían el cargo dejan de mostrarse y «Nuevo» cierra la primera línea de su evento. «Ver evoluciones» reúne todas las evoluciones del episodio y cada día conserva su fecha.
- En la vista Compacta, cada tarjeta de Plan de tratamiento pone en una línea su título, su interruptor y sus herramientas, que muestran su nombre: «Planificación estandar» y «Planificación única». Cada indicación ocupa una fila tan alta como su texto y su columna conserva al menos 224 px en una ventana estrecha. Las horas y los iconos de estado no cambian.
- En el Resumen, las acciones de la nota usan los nombres de Eloísa: «Enmendar» y «Enmendados», en lugar de «Editar» y «Enmiendas». La fecha del resumen diario e «Imprimir» se reconocen con la forma que tienen en Eloísa: pasan a la línea de secciones cuando caben y su firma se omite cuando repite la de Evolución.
- Los colores, tamaños, márgenes e iconos de las vistas de la ficha se definen en un solo archivo.

## 0.48.191

- En el Resumen compacto de escritorio, la fecha del resumen diario e «Imprimir» pasan a la línea de los enlaces de sección cuando caben entre el último enlace y la barra flotante de Centro HHR. Ahí siguen a la vista al desplazar la ficha. Si no caben, conservan su fila.
- Cada dato se dice una vez. La firma de esa fila se omite cuando repite la de Evolución. Una tarjeta de Fármacos, Indicaciones libres u Órdenes de atención firmada igual que la anterior muestra «↑ misma firma» y la firma completa al pasar el cursor. Signos vitales indica una vez la antigüedad común de las mediciones junto al título; una medición anterior conserva la suya.
- En las tablas de indicaciones, una columna de acciones que solo contiene botones deja de mostrar su rótulo y cede ese ancho al texto.

## 0.48.190

- El consentimiento informado de Imágenes se imprime en una hoja A4 con texto seleccionable y líneas nítidas. La plantilla editable en Word conserva el contenido y los espacios de firma del formulario anterior.

## 0.48.189

- En el Resumen compacto de escritorio, las acciones de Evolución muestran su nombre junto a un icono de la misma familia: «Ver evoluciones», «Editar», «Enmiendas» y «Pautas». El menú de opciones cierra la fila. En una tarjeta estrecha quedan los iconos. Al pie de la nota se leen «Leer nota completa» y «Contraer», y el historial de Signos vitales se rotula «Historial».
- Reposo y Régimen comparten una línea cuando caben sus valores y firmas. Un reposo sin registro se resume como «Sin registro» y una firma común cierra la línea con «Ambas». Las solicitudes de exámenes y de cirugía vacías comparten la última línea del lateral.
- «Agregar» queda en la línea del título de Observaciones de entrega y «Agregar alerta» junto a «Gestión de Visitas». Cada alerta lleva un filete lateral y «No reanimación», una vez marcada, ocupa toda la línea. Fármacos, Indicaciones libres y Órdenes de atención alinean sus columnas con el título de la tarjeta.

## 0.48.188

- En el modo Compacto, las evoluciones largas tienen un área de lectura desplazable con teclado y ratón. «Leer nota completa» abre un lector más amplio para la misma evolución. Las notas breves ocupan solo su altura natural.
- Signos vitales comparte los bordes de Evolución. Observaciones de entrega y Alertas quedan juntas en el lateral aun cuando Eloísa agrupa las tarjetas en filas anidadas. Las solicitudes de exámenes y cirugía vacías ocupan una línea cada una. Reposo y Régimen se compactan también cuando solo uno tiene datos.
- Fármacos e Indicaciones libres muestran las instrucciones completas cuando Eloísa permite desplegarlas dentro de la tabla. SOS y Antimic se distinguen por el texto, un filete de color y la separación del nombre del fármaco.

## 0.48.187

- En el Resumen compacto de escritorio, «Agregar observación» y «Agregar alerta» abren el campo de escritura. Las alertas, los interruptores y los borradores permanecen a la vista.
- En Signos vitales, la PAM y el tiempo de cada medición ganan tamaño y contraste.
- Reposo y Régimen muestran el profesional y la hora en la misma línea que su indicación cuando hay ancho suficiente.
- Al recorrer Fármacos, Indicaciones libres u Órdenes de atención con el puntero o el teclado, una línea guía la lectura hasta la acción de la misma fila. Las instrucciones de cada orden ganan ancho. «Ver vacías» se distingue de los enlaces a las secciones.

## 0.48.186

- En «Pacientes egresados de alta», los nombres usan el ancho de la columna y saltan por palabras. El RUN sigue alineado debajo del nombre y se conservan las etiquetas de alta y fallecimiento.
- En el resumen compacto de escritorio, Evolución se abre completa y comparte los bordes de su columna con Signos vitales. Al contraerla se respeta esa elección en el episodio. Observaciones de entrega queda encima de Alertas, en la segunda columna.
- Signos vitales abrevia las etiquetas conocidas, entre ellas PA, FC, FR y HGT. El nombre completo está disponible al pasar el cursor.
- Reposo y Régimen reúnen valor, observaciones y autoría en menos espacio. Las solicitudes de examen y de intervención quirúrgica vacías se muestran en el lateral. Cuando tienen registros, se usa su sección completa.
- Las órdenes de atención tienen filas más bajas, con espacio para las indicaciones y sus controles nativos.

## 0.48.185

- En el resumen compacto de escritorio, Evolución reúne sus acciones en la cabecera. Pautas conserva su lugar al abrir o plegar la nota.
- Reposo y Régimen se leen debajo de Entrega en dos filas. Cuando ambas indicaciones tienen exactamente la misma firma y hora de origen, la referencia aparece una sola vez.
- Alertas muestra el mensaje primero. Signos vitales, Alertas y Fármacos comparten margen de lectura. El historial de signos se abre con el icono de reloj con flecha.

## 0.48.184

- El Resumen compacto distingue «Agregar a entrega» de «Agregar alerta». Los rótulos de los campos permanecen visibles al escribir. «No reanimación» tiene su propia línea y muestra el estado del interruptor de Eloísa.
- En escritorio, Evolución conserva dos tercios del ancho al abrir y plegar la nota. Entrega, Reposo y Régimen ocupan la columna derecha cuando las indicaciones son de lectura.
- Signos vitales destaca mediante tipografía las mediciones anteriores. La hora y el profesional se muestran cuando Eloísa los identifica en la propia medición.

## 0.48.183

- En escritorio, Evolución comparte el espacio superior con Entrega, Reposo y Régimen. Al expandir la nota, aumenta su ancho y las indicaciones de lectura se sitúan debajo de Entrega. El control de plegado queda junto al texto.
- Signos vitales alinea las cifras debajo de sus etiquetas y presenta cada antigüedad al pie de su celda. En una tarjeta ancha, Alertas coloca los avisos a la izquierda y los interruptores y el campo de observaciones a la derecha.
- La navegación principal subraya la pestaña activa y «Ver evoluciones» incorpora un icono de lista. Se ajusta la separación entre la fecha, la impresión y el inicio de la ronda.

## 0.48.182

- En el Resumen compacto, Evolución comparte fila con una columna estrecha para las observaciones de entrega de turno. En pantallas pequeñas la nota va primero. La fecha estimada de alta queda oculta en esta vista.
- Signos vitales reconoce las tarjetas de la ficha médica y reúne las mediciones en una franja adaptable. El botón de reloj abre el historial original y se puede activar con el teclado.
- Alertas reúne «No reanimación» y «Gestión de visitas» en una fila y compacta los avisos. «Mostrar suspendidos» usa el mismo tamaño de letra que los demás interruptores.
- Los accesos del Resumen calculan su posición con la altura actual de la barra al regresar de Historial o cambiar el ancho de la ventana.

## 0.48.181

- En el Modo 1, Evolución ocupa todo el ancho debajo de la fecha estimada de alta y las observaciones de entrega de turno. «Ver evoluciones» abre las notas del episodio en el Historial, con «Todos» y un filtro por profesional.
- Los encabezados muestran fecha, hora al minuto y nombre. Las notas expandidas usan un botón de repliegue y la barra de secciones usa títulos breves.
- Signos vitales reúne las mediciones en una franja adaptable con antigüedades como «2h». «Ver vacías» recupera los apartados sin registros que se pliegan en el Resumen.

## 0.48.180

- Centro HHR → Ajustes incorpora cuatro vistas de la ficha de hospitalizados. El perfil de Chrome recuerda la elección y la aplica a sus pestañas abiertas. Desactivado recupera el diseño nativo, Equilibrado conserva la densidad anterior y Lectura amplía los valores y el interlineado.
- Compacto es el modo predeterminado. Reduce el espacio de navegación, tarjetas y filas de fármacos. Los mensajes reconocidos de secciones vacías o sin permiso ocupan menos espacio y conservan su texto.

## 0.48.179

- Signos vitales reduce el alto de las tarjetas. El valor destaca a 15 px, la etiqueta usa 12 px y la PAM y la antigüedad usan 11 px con el tamaño de fuente habitual. En pantallas estrechas, los nombres largos permiten que el valor pase al renglón siguiente.

## 0.48.178

- El Resumen conserva el formato compacto cuando una etiqueta lleva subíndice, como O₂. Diagnóstico reúne el título y la última actualización cuando caben.
- En pantallas estrechas los signos vitales se distribuyen según el ancho y las tablas amplias de fármacos se desplazan dentro de su propio cuadro. Las tres acciones de cada fila se mantienen juntas.
- Se incorporan cuatro capturas reproducibles de una ficha ficticia y pruebas de lectura en escritorio y pantalla estrecha.

## 0.48.177

- El Resumen de enfermería reconoce «Valoración» y aplica la densidad aunque falten accesos en la barra. Diagnóstico y Fármacos reducen la altura del encabezado y de las filas.
- Los signos vitales en tarjetas aprovechan el ancho disponible y conservan los valores, los colores, la PAM, los tiempos de medición, las observaciones y el historial. Cuando se muestran en una tabla reconocida, «Ver registros» abre el detalle original.
- Una alerta breve deja el ancho de la fila a Evolución. Las notas consecutivas comparten un separador fino y las tablas de indicaciones reservan más espacio a la prescripción.

## 0.48.176

- Diagnóstico, signos vitales, reposo y régimen ocupan menos espacio. Cuando Alertas y Evolución comparten una fila, el texto de Evolución tiene más ancho.
- Las filas y los iconos de fármacos e indicaciones libres son más compactos. Se conserva el tamaño de la letra y la zona de clic de los iconos es de 24 × 24 px.
- Los apartados que Eloísa identifica como vacíos también se pliegan en la barra de navegación. «Ver vacías» permite recuperarlos.

## 0.48.175

- Resumen distribuye las tarjetas por contenido. Un dato breve comparte línea con el título, los bloques intermedios pueden ocupar media fila y Evolución y las tablas disponen de todo el ancho.
- Se simplifican los bordes entre registros. Fármacos puede reunir el número de filas visibles y la impresión en su cabecera.
- Historial reúne la hora, el tipo de evento y el profesional en una línea cuando caben y mantiene visible la fecha durante el desplazamiento.
- La navegación ocupa menos altura. Las columnas de iconos de las listas médicas y de cuidados reservan más espacio para el diagnóstico.

## 0.48.174

- En Resumen, las tarjetas crecen con el contenido y las cuadrículas se adaptan al ancho disponible. Evolución puede ocupar la fila completa.
- «Ver vacías» recupera los apartados de solicitudes y procedimientos que Eloísa indica como vacíos. Al llegar registros, el apartado vuelve a mostrarse.
- En Historial se reduce el espacio entre los eventos, sus encabezados y el texto.

## 0.48.173

- En Evolución, «Continuar pauta» recupera el borrador de la ficha abierta. Cada profesional puede fijar su pauta favorita con la estrella del selector.
- Al insertar una pauta guardada, el cursor queda al final del texto para seguir escribiendo.
- Se retiran del selector las dos pautas IAAS y el formulario de prueba «Caídas».

## 0.48.172

- En Pautas, «Guardar» guarda en HHR e inserta el texto en Evolución. «Copiar texto» guarda en HHR y copia el texto al portapapeles. En Braden, «Copiar borrador» distingue la copia previa al guardado.
- El selector de plantilla y el botón de actualización comparten una fila. Braden resume el avance con el número de dimensiones completas.

## 0.48.171

- En la tarjeta de Evolución y en el editor que abre el lápiz de Eloísa, un botón circular reúne «Pautas» y el acceso rápido a Braden. Las planillas del catálogo de HHR se pueden rellenar e insertar como texto en la evolución o copiar.
- Se corrigió el parpadeo del editor al abrirlo desde el lápiz. La extensión reconoce el título nativo aunque la cabecera contenga sus propias acciones.

## 0.48.170

- Presupuesto único de captura en Ficha Médico: el relé envía un plazo de 43 s y el lector principal crea un `AbortController` real que cancela todos los `fetch` en vuelo al vencer el plazo, devolviendo `timeoutStage: 'ficha_main_relay'` sin snapshot parcial ni bloqueo espurio de salud (`readBlocked`).
- Protección de integridad clínica ante cancelación (CEN-01): un aborto leyendo egresos (`filterType=2`) se propaga en lugar de tratarse como lista vacía, y ninguna lectura abortada se guarda en caché.

## 0.48.169

- Al abrir «Plantillas» en Evolución, los botones de pautas permanecen en el editor. Al aplicar una pauta, la cabecera conserva su posición durante la carga y Escape permite volver al borrador de Eloísa.

## 0.48.168

- Rendimiento y estabilidad del transporte de Ficha Médico: agrupa en vuelo las consultas concurrentes de sesión (`getFetchInfo`, sin caché persistente) entregando copias congeladas aisladas, manteniendo separadas las lecturas directas de pestaña emisora.
- Selección y permanencia de pestañas: relega las pestañas descartadas por Chrome (`discarded`) detrás de las pestañas activas/vivas y marca como no descartable (`autoDiscardable: false`) únicamente la pestaña activa de Ficha Médico que responde, liberando las demás.

## 0.48.167

- Rendimiento de sincronización con Eloísa: guarda el catálogo estático de códigos CIE-10 (`diagnosisClassify`) en `chrome.storage.local` durante 12 horas (sin datos de pacientes ni sesiones), evitando volver a descargarlo tras recargar pestañas, abrir nuevas pestañas, cambiar de token o reiniciar Chrome.
- Validación estricta de la caché de diagnósticos: rechaza cualquier entrada corrupta o vencida y ejecuta un único refresco de red si aparece un identificador de diagnóstico nuevo ausente en la caché persistida.

## 0.48.166

- Sincronización con Eloísa: corrige el bloqueo que impedía el reintento interno de Ficha Médico tras un corte momentáneo de red, agrega una breve pausa antes de reintentar (cancelable) y conserva el error real del endpoint si la red sigue caída.
- Diagnóstico de fallos de red en Ficha Médico: indica explícitamente `(offline)` cuando el navegador reporta pérdida de conexión local, sin incluir datos del paciente.

## 0.48.165

- Pauta Braden adulto / Braden Q pediátrico (NT 234) en Evolución: agrega acceso directo «Pauta Braden» junto a «Aplicar pauta», matriz rápida 1–4 fiel a la planilla oficial del Hospital Hanga Roa (con sugerencia automática Adulto vs. Pediátrico según edad del paciente y fecha/hora de Rapa Nui prellenadas).
- Calcula en vivo puntaje total, subpuntajes (`PS · H · A · M · N · F [· PO]`), nivel de riesgo (Bajo / Moderado / Alto), intervalo de reevaluación y cuidados planeados según NT 234.
- Permite elegir entre «Guardar e insertar» (guarda automáticamente en HHR e inserta en Evolución), «Guardar en HHR y copiar texto» (respalda en HHR y copia el texto verificado para pegar en Evolución) o «Copiar texto» directo desde la vista previa.

## 0.48.164

- Pautas clínicas en Evolución: monta el botón «Aplicar pauta» dentro de la tarjeta nativa de Evolución (evitando que quede recortado bajo «Instrumentos de evaluación»).
- Mejora la apertura e inserción en el editor real de Eloísa (botones de ícono, cajones/modales MUI, editores `contenteditable`, eventos `input`/`change` e ignorando Centro HHR) y agrega vista previa con botón «Copiar texto» como respaldo.
- Mejora la sincronización de plantillas con HHR: reinyecta automáticamente el relé en pestañas de HHR ya abiertas, prueba todas las pestañas abiertas de HHR, permite sincronizar plantillas desde el diálogo y entrega mensajes claros cuando no hay sesión iniciada en HHR.

## 0.48.163

- Ajustes permite habilitar Pautas clínicas en Evolución. La pauta se guarda en HHR, genera un código verificable y se inserta como borrador en la evolución del mismo episodio.

## 0.48.162

- Centro HHR reúne el módulo, las pestañas y sus acciones en una cabecera común. «Vista» agrupa las opciones de presentación. Minimizar y cerrar quedan a un clic.
- En Imágenes, la primera marca recoge los datos del paciente en una línea con «Editar». «Ajustar al ancho» y «Hoja completa» permiten cambiar la escala manteniendo las marcas en su sitio, también al imprimir.

## 0.48.161

- En Laboratorio puedes elegir de 1 a 99 copias junto a «Imprimir». Al guardar como PDF, todas las copias de la orden quedan en un solo archivo. El borrador recuerda la cantidad del episodio.
- En Imágenes → Informes, «Abrir MMRAD» abre el portal de radiología en otra pestaña. Puedes volver a la solicitud y seguir donde la dejaste.

## 0.48.160

- Se retiró «Abrir HHR» de la cabecera de Centro HHR en todos los módulos. Los controles de la ventana quedan alineados a la derecha.

## 0.48.159

- En Laboratorio e Imágenes, «Personalizados» se indica una sola vez en el selector de paciente. Al ingresar el primer dato, se despeja la ayuda del formulario. Las órdenes en blanco conservan el aviso «Sin identificación» junto a «Imprimir».
- Laboratorio reúne el buscador y «Mis grupos» en una fila cuando hay espacio. Al buscar, solo aparecen las categorías con coincidencias. El contador de exámenes y las acciones de grupo aparecen cuando se pueden usar.
- Ajustes reúne las preferencias en filas alineadas y deja «Descargar ZIP» en la cabecera. Abrir Ajustes ya no requiere cargar los datos del paciente.

## 0.48.158

- En Laboratorio e Imágenes, **De Eloísa** abre el selector junto a **Personalizados**. Busca por nombre, documento o cama, incluso desde la lista de hospitalizados.
- La fila **Cambiar paciente** desaparece de ambos módulos. El nombre y el documento de la orden quedan junto a **Imprimir**. Cerrar el selector conserva la orden que estabas preparando.

## 0.48.157

- En Imágenes, los formularios Solicitud, Contraste y Consentimiento comparten una barra con el médico solicitante y las herramientas de anotación. En pantallas estrechas los controles se distribuyen en dos filas para dejar espacio al documento.
- El botón de sesión abre los detalles de conexión con un clic. Se eliminó el mensaje largo que aparecía al pasar el cursor.

## 0.48.156

- Inicio abre Recetas, resultados, solicitudes de laboratorio y solicitudes de imágenes con un clic.
- En Laboratorio e Imágenes, «Imprimir» queda visible al desplazarse. Junto al botón se indica cuándo la orden sale sin identificación o con datos personalizados. Laboratorio también muestra la cantidad de exámenes.
- El catálogo dedica más espacio al nombre del examen y al tubo. Los controles de copiar el RUN y abrir la ficha tienen una zona de clic más amplia.
- Al regresar a Gestión de cuidados o Lista de trabajo médico, se recuperan la subsección, la búsqueda y la posición del episodio. Una marca breve señala la fila, incluso si el paciente cambió de cama.

## 0.48.155

- Ajustes permite activar o desactivar la entrega de turno en Gestión de cuidados para este perfil de Chrome. El cambio se aplica también a las pestañas abiertas.
- Al abrir varias entregas se comparte la verificación de sesión simultánea. Tras guardar en bloque, las filas confirmadas sin foco retoman su actualización periódica sin abrir una consulta inmediata por paciente.

## 0.48.154

- Inicio vuelve a abrir Recetas, Laboratorio e Imágenes. La cabecera omite el número de episodio y las solicitudes aprovechan mejor la altura del panel.
- Las órdenes de Laboratorio e Imágenes pueden imprimirse con datos de Eloísa, sin identificación o con datos personalizados.

## 0.48.153

- Documenta con anotaciones `clinical-clock-allow` las tres lecturas de hora ya convertidas a `Pacific/Easter` en novedades e historial (`hhr-nursing-novelty.js`, `hhr-nursing-worklist.js` y `hhr-history-date-navigation.js`) para alinearlas con el control `check:clinical-clock` de HHR sin cambios funcionales.

## 0.48.152

- Sincronización CUDYR conserva en sesión las definiciones y el catálogo de profesionales de Gestión de Camas (con refresco ante un profesional nuevo y respaldo si falla una recarga) para evitar degradaciones falsas por microcortes.
- Agrega espera con jitter antes de reintentar lecturas transitorias de CUDYR diario y extiende ese reintento único al informe XLS mensual, renueva silenciosamente la sesión ante HTTP 401 si hay pestaña activa y verifica la sesión antes de aceptar el resultado.
- Unifica el desempate determinístico por ID en categorizaciones del mismo segundo, avisa si Eloísa informa un `formId` CUDYR no reconocido y reduce peticiones redundantes (reutilización única y breve de `/beds` dentro de la misma sincronización y respaldo en Ficha Médico sólo cuando falta algún episodio).

## 0.48.151

- Entrega de turno muestra cuántas notas confirmó HHR, permite reintentar los fallos de conexión o ir a una fila por revisar y muestra en «Tiempos» la espera de apertura y guardado.

## 0.48.150

- Guardar cambios envía hasta diez entregas por bloque y conserva el comprobante individual de cada paciente.

## 0.48.149

- Entrega de turno muestra una sola fecha censal, pestañas Día y Noche y filas más compactas.
- Agrupa la carga de las notas visibles y permite guardar los cambios desde la barra superior, con confirmación por paciente y borradores recuperables.

## 0.48.148

- Entrega de turno en producción registra el equipo una vez en HHR Hospitalizados y después reutiliza ese acceso con el mismo profesional en Eloísa.
- La extensión conserva una identidad fija de Chrome para reutilizar el registro al actualizar.

## 0.48.147

- Añade un paquete de pruebas para editar entregas desde Eloísa después de registrar el equipo una sola vez en HHR.

## 0.48.146

- En Gestión de cuidados, los rótulos de Pacientes hospitalizados y Egresos muestran el total según los filtros vigentes.
- Unifica el grosor de la línea bajo los logos en todo el ancho del panel.

## 0.48.145

- Pinta el fondo y la línea de los logos directamente en el panel lateral, incluso cuando Eloísa recorta el contenedor interior.
- Muestra la barra de la extensión en la fila de controles desde su primer fotograma en las listas de pacientes.

## 0.48.144

- Extiende el encabezado de los logos al ancho del menú y elimina el separador sobre Favoritos.
- Entrega de turno comprueba una vez el acceso a HHR antes de cargar las filas y ofrece un solo botón de conexión.

## 0.48.143

- Favoritos muestra accesos fijos a SysLab, MMRAD y Gmail con los iconos de cada sitio, en el menú lateral y en Ajustes de Centro HHR.
- Alinea el icono y el texto de Gestión de Camas con los de Informes.

## 0.48.142

- Reorganiza el menú de Eloísa con Gestión de Camas debajo de Informes y el tiempo al pie. Retira el reloj y la fecha del panel.
- Favoritos se despliega dentro del menú y conserva el foco al abrir, editar y cerrar.

## 0.48.141

- Separa el refresco de listas y menú de las mutaciones ajenas a esas vistas.
- Define los mensajes del editor de entrega por acción y mantiene los detalles de excepciones fuera de las respuestas y los logs.
- Documenta los responsables, destinos y pruebas de los principales flujos.

## 0.48.140

- Gestión de cuidados conserva la vista nativa si cambian los módulos o la estructura de las listas de Rayen.

## 0.48.139

- Gestión de cuidados combina filas y abre la entrega con el mismo episodio verificado en los enlaces nativos que usa la impresión. Ante enlaces ambiguos, conserva el acceso nativo y desactiva las acciones clínicas de la extensión.

## 0.48.138

- «Un día como hoy» añade hechos históricos enlazados de Wikipedia en español y agrupa los nacimientos adicionales en una sección desplegable.
- El reloj queda bajo los logos y el pronóstico se acerca a las opciones del menú lateral.
- La barra de HHR se alinea con los filtros y deja libre el encabezado de las tablas.
- La entrega de turno muestra un solo acceso a la conexión con HHR sobre la tabla.

## 0.48.137

- Alinea pasaportes y otros números de identificación debajo del inicio del nombre en ambas listas.
- El menú lateral usa «Ejecución de cuidados» y enlaces de fuente discretos para el tiempo y el diálogo «Un día como hoy».
- Muestra hasta ocho nacimientos ordenados por visitas recientes en Wikipedia en español, con enlace a cada biografía.

## 0.48.136

- El encabezado de las tablas clínicas se alinea encima de la primera fila y se fija al desplazar su propio contenedor.
- «Un día como hoy» añade las conmemoraciones de Efemerides.cl junto a los nacimientos de Wikipedia, según la fecha de Rapa Nui.

## 0.48.135

- Gestión de cuidados y Lista de trabajo médico comparten una barra más compacta para pestañas, búsqueda, filtros e impresión. Se retira la tira de camas.
- El tooltip de novedades indica «Último cambio médico hace…».
- «Un día como hoy» muestra nacimientos de la fecha en Rapa Nui en un diálogo dentro de Eloísa.

## 0.48.134

- Entrega de turno muestra la fecha censal y el turno confirmado por HHR. Si cambia el turno durante la edición, permite consultar el vigente y conserva el texto anterior abierto para revisión.
- El editor distingue borrador, guardado en curso y guardado confirmado. Tras un conflicto, conserva la otra versión para consultarla y recuperarla durante la edición.

## 0.48.133

- Gestión de cuidados incorpora una vista breve de la publicación médica junto a la fila, con hora, profesional, extracto y acceso al Historial.
- Las listas clínicas presentan un índice plegable de camas, encabezados fijos al desplazar y más énfasis en la cama y el nombre. Las acciones secundarias ganan contraste al enfocar la fila.

## 0.48.132

- Lista de trabajo médico y Gestión de cuidados muestran el RUN con guion debajo del inicio del nombre. Se ocultan la línea de nombre social y el encabezado Acciones.

## 0.48.131

- Gestión de cuidados conserva una sola tabla de carga hasta que se resuelven las tres fuentes de hospitalizados.
- Las listas clínicas tienen controles y pestañas más definidos, más espacio bajo la barra y un selector de estaciones sin rótulo visible.
- La lista omite la línea de género y muestra el RUN con guion y un acceso para copiarlo.
- El menú lateral presenta un logo y un moái más grandes. La fuente del pronóstico queda en un icono.

## 0.48.130

- Favoritos conserva el foco al abrirse desde el menú lateral y permite agregar un enlace con Enter.
- El pronóstico de Rapa Nui queda siempre visible, con iconos animados según el tiempo y la luz del día. El menú usa un logo Eloísa más pequeño junto al moái de HHR y retira el botón de información.

## 0.48.129

- La búsqueda, el selector nativo y la impresión comparten la fila de pestañas en Gestión de cuidados y Lista de trabajo médico. En pantallas estrechas, los controles pasan a una segunda fila.
- El menú lateral muestra la hora de Rapa Nui, el pronóstico de 72 horas, Favoritos y un acceso a los nacimientos del día. La versión queda detrás del icono de información.
- Entrega de turno se abre desde un botón compacto para toda la tabla. Cada fila conserva su propio editor y guardado.

## 0.48.128

- La tablilla Rongo Rongo reemplaza la flecha que abre la ficha en Pacientes sin médico, Mis pacientes e Interconsulta. El enlace de interconsulta conserva su identificador original.

## 0.48.127

- Gestión de cuidados muestra un solo esqueleto de carga con las columnas de la tabla final.
- La ayuda de novedad aparece junto a su icono y el acceso a la ficha usa la tablilla rongorongo de HHR.

## 0.48.126

- En Gestión de cuidados, la novedad muestra una indicación en azul o una evolución en violeta cuando coincide con una publicación médica del Historial. El pulso ámbar queda para los demás casos. El icono sigue abriendo el Historial del episodio.

## 0.48.125

- El icono de novedad abre el Historial del episodio y resalta la publicación médica más reciente entre las tarjetas cargadas por Eloísa.

## 0.48.124

- En Gestión de cuidados, un icono ámbar junto al nombre identifica los pacientes con novedad y muestra el tiempo desde la última publicación médica cuando Eloísa lo informa.
- La etiqueta «Nuevo» queda más pequeña en Gestión de cuidados y en el Historial de la ficha.

## 0.48.123

- Las entregas en tabla usan filas más compactas y muestran turno, estado y Guardar en la misma línea. La barra indica cuántos borradores quedan y permite volver a la lista.
- La extensión ordena los guardados de distintas filas para evitar conflictos sobre el mismo censo.

## 0.48.122

- En Pacientes hospitalizados, «Entrega de turno» abre un editor en la fila de cada paciente y da espacio a las notas con una tabla de cinco columnas. Cada paciente guarda por separado. Al ocultar las entregas vuelven CRD, Médico tratante, Aislado y Acciones.

## 0.48.121

- Entrega de turno se conecta con el censo de HHR en Netlify. La autorización temporal atribuye la nota a la cuenta de HHR y permite cerrar esa pestaña después de conectar.
- La fila muestra un ✓ con la fecha y el turno confirmados y mantiene visible el foco para navegar con teclado.
- Puedes desconectar la cuenta de HHR y conservar el texto pendiente en el editor hasta reconectar.

## 0.48.120

- La nota aprovecha el espacio del diálogo. Los cambios en conflicto aparecen al lado cuando hay espacio y se puede guardar con Ctrl+Enter o ⌘+Enter.

## 0.48.119

- En el piloto local, «Entrega de turno» abre un diálogo dentro de Gestión de cuidados de Eloísa. Muestra la fecha censal y el turno incluso si falta el censo local, y conserva ese turno al reintentar.

## 0.48.118

- El piloto local abre y guarda la entrega con la sesión habitual de Hospitalizados de Eloísa. Registra el profesional que escribe y retira el código de vinculación.

## 0.48.117

- El paquete local de pruebas agrega «Entrega de turno» en Pacientes hospitalizados. Incluye edición vinculada a HHR, sincronización y confirmación de guardado.

## 0.48.116

- Vuelve a funcionar la sincronización del censo cuando la pestaña de Ficha Médico se abrió antes de actualizar la extensión. Desde 0.48.115 esa pestaña conservaba su lector anterior y la comprobación decía «Gestión de Camas conectada», pero la descarga de egresos la rechazaba y HHR mostraba que faltaba abrir Gestión de Camas.
- La sesión de Camas se vincula con el establecimiento, profesional y rol que confirma la propia sesión de Ficha Médico, como ya informan todas las versiones compatibles. La comprobación y la descarga deciden con la misma regla, así que ya no pueden contradecirse. Se retira el aviso «Recarga Ficha Médico…», que dejó de ser necesario.
- La sincronización confirma la identidad verificada de Ficha Médico antes de leer y de nuevo antes de entregar el resultado, con Camas abierta o cerrada. Si no logra confirmarla al inicio, tras un reintento, no lee y pide iniciar sesión en Ficha Médico. Si el profesional, el establecimiento o el rol cambian durante la lectura, descarta el resultado.

## 0.48.115

- HHR puede sincronizar con Gestión de Camas cerrada después de verificar su sesión oficial con ambos módulos abiertos. La comprobación previa valida la sesión de Camas en segundo plano y usa el informe de egresos del mismo establecimiento.
- La sesión temporal de Camas se vincula al profesional, rol y establecimiento de Ficha Médico. Un cambio de acceso o una sesión rechazada por Rayen pide reconectar.

## 0.48.114

- En Gestión de cuidados, la tabla queda cerca del buscador y el menú de impresión es más compacto.
- La actividad usa el mismo tamaño de letra para el rótulo y la duración, con abreviaturas como «1 h». En las filas se oculta el RUN materno y el número de identificación queda visible sin prefijo.
- El lápiz retoma la edición en la pestaña de Gestión de Camas, incluso cuando quedó pendiente un intento anterior. Si hace falta iniciar sesión, el editor se abre al completar el acceso oficial.

## 0.48.113

- Lista de trabajo médico y Gestión de cuidados ordenan las camas desde R1–R4 y NEO1–NEO2 hasta H1C1–H6C2, con urgencias al final. Las interconsultas mantienen sus grupos por servicio.
- El menú lateral incorpora iconos y deja Gestión de Camas al pie. La columna de asignación es más estrecha y conserva el selector nativo.
- En cuidados, Actividad muestra el tipo de evento y su antigüedad. Alta médica tiene una etiqueta compacta con borde y fondo suaves.

## 0.48.112

- «Cambiar paciente» muestra el nombre completo disponible en el censo. Las listas de trabajo y cuidados conservan el nombre registrado y muestran aparte el nombre social cuando existe.
- Solicitar laboratorio reúne los datos del paciente, procedencia, Fonasa, búsqueda y grupos en una cabecera compacta que se adapta al ancho del panel.
- Imprimir abre directamente el diálogo de Chrome para recetas, solicitudes de laboratorio e imágenes. En Recetas se conserva la elección de formato Estándar o Compacta.

## 0.48.111

- El menú del icono muestra la versión instalada y comprueba la última publicación al abrirse. Si hay una actualización, puedes descargarla desde la misma ventana. Si la consulta falla, ofrece reintentar.
- La guía de instalación y sus imágenes vienen en el ZIP y se leen dentro de la extensión, también sin conexión.

## 0.48.110

- La barra de Chrome muestra el símbolo naranjo del Hospital Hanga Roa. Su menú abre la descarga de la última versión en GitHub, la guía ilustrada de instalación y el interruptor de Chrome para deshabilitar el puente.
- La guía explica cómo extraer y cargar la carpeta, fijar el icono y actualizar una instalación existente.

## 0.48.109

- El calendario de feriados que decide a qué día censal pertenece una captura entre 08:00 y 08:59 (hora de Rapa Nui) coincide con los feriados legales de Chile de 2024 a 2028, igual que en HHR. Pasan a ser hábiles el 30 de junio y el 13 de octubre de 2025, el 2 de noviembre de 2026, el 16 de agosto y el 20 de septiembre de 2027, y el 22 de mayo, el 29 de junio, el 17 de julio, el 12 de octubre y el 31 de octubre de 2028. Pasan a ser feriado el 17 de septiembre de 2027 (Ley 20.983) y el 26 de junio, el 9 de octubre y el 27 de octubre de 2028 (traslados de las leyes 19.668 y 20.299). El Día de los Pueblos Indígenas de 2026 es el domingo 21 de junio (Ley 21.357). Las elecciones cuentan solo cuando votan en Isla de Pascua: se agregan el 24 de noviembre de 2024, el 16 de noviembre y el 14 de diciembre de 2025 y el 29 de octubre de 2028, y se quita la primaria del 9 de junio de 2024, en la que la isla no votó. Todas caen domingo, así que no cambian el turno.

## 0.48.108

- Gestión de cuidados presenta dos pestañas. «Pacientes hospitalizados» reúne ingresos y pacientes con y sin novedad en una tabla con búsqueda, filtro de estación y acciones por episodio. «Egresos» conserva su lista.
- El lápiz abre el editor en la pestaña de Gestión de Camas que ya tiene la sesión del profesional, incluso en otra ventana. Si se precisa el acceso oficial, la edición continúa tras iniciar sesión.
- Las listas de pacientes ocultan la etiqueta «Pendiente» junto al nombre. Ajustes de Centro HHR incluye una descarga directa del último ZIP publicado en GitHub.

## 0.48.107

- Las ocho listas de hospitalizados resaltan la fila con ratón o teclado. Muestran servicio y cama, destacan el nombre de uso y simplifican el selector de médico y los sufijos del diagnóstico de ingreso.
- El panel izquierdo enlaza a Gestión de Camas. En Gestión de cuidados, el lápiz junto al nombre abre el editor oficial del paciente y permite continuar tras iniciar sesión en Camas.

## 0.48.106

- En Gestión de cuidados y Lista de trabajo médico, las pestañas, el buscador y la tabla quedan más juntos. Se ocultan el rótulo «Resultados de búsqueda…» y el icono «Familiar esperando por información». Las interconsultas conservan el nombre de cada servicio.

## 0.48.105

- El buscador y la lista de pacientes quedan centrados y alineados en las ocho subsecciones de hospitalizados. Los márgenes laterales crecen con el ancho disponible y las pantallas estrechas aprovechan todo el espacio.

## 0.48.104

- Las ocho subsecciones de Gestión de cuidados y Lista de trabajo médico muestran filas compactas. Desde cada fila puedes imprimir en un clic las indicaciones vigentes o la última receta completa del episodio. Los dos iconos ocupan el lugar de GES. En «Mis pacientes de interconsulta» aparecen junto a «Paciente».

## 0.48.103

- Las tres listas de hospitalizados mantienen el formato compacto y la lista continua al abrir el panel izquierdo, los menús y el CUDYR, y cuando Eloísa vuelve a dibujar la tabla o sus pestañas.

## 0.48.102

- Al abrir y cerrar el CUDYR desde la columna CRD, las filas de «Pacientes con novedad» y «Pacientes sin novedad» mantienen su altura compacta.

## 0.48.101

- «Pacientes sin médico», «Pacientes con novedad» y «Pacientes sin novedad» muestran todos los resultados filtrados en una sola lista compacta. Se conserva el acceso a la ficha y a la asignación desde cada fila.

## 0.48.100

- «Pacientes sin médico» en Lista de trabajo médico y «Pacientes con novedad» en Gestión de cuidados usan filas compactas. Se reduce el espacio dentro de las celdas y entre las líneas para mostrar más pacientes por pantalla.
- La extensión retira el botón «Copiar para HHR» de Gestión de cuidados.

## 0.48.99

- Historial muestra el selector de fecha y sus flechas en la barra blanca de pestañas, inmediatamente a la derecha de «Historial». En ventanas angostas la fila admite desplazamiento horizontal para acceder a todas las pestañas.

## 0.48.98

- Exámenes: abre directamente «Ver resultados», «Solicitar laboratorio» y «Solicitar imágenes» desde el icono de la barra.
- Barra principal: conserva sólo HHR, Receta, Exámenes y sesión. Favoritos y las preferencias de presentación quedan dentro de Ajustes de Centro HHR.
- Solicitudes: conserva campos, exámenes y marcas al cambiar de módulo, con borradores temporales por episodio dentro del panel abierto. Verifica paciente y profesional antes de restaurar; combina los cambios nuevos con los campos anteriores que no se tocaron. Cerrar o recargar descarta los borradores.
- Reconexión: ofrece «Reconectar y continuar» en consultas y vistas previas con sesión vencida. Retoma la lectura o el informe seleccionado después de verificar el acceso, sin imprimir automáticamente ni continuar una vista abandonada.

## 0.48.97

- Barra principal: reduce su altura y ancho. Recetas usa un icono de receta y Exámenes uno de laboratorio, sin rótulos; retira el subtítulo de conexión bajo el nombre. Conserva los nombres accesibles, las ayudas y el estado de color.
- Historial: compacta la barra a selector de fecha y flechas. Retira los filtros rápidos por categoría y el contador de eventos; conserva los filtros nativos de Eloísa y el salto entre fechas cargadas.
- Centro HHR: vuelve al cuadro de diálogo centrado por defecto, también al actualizar desde el modo lateral anterior. Conserva las demás preferencias y permite elegir después el panel lateral manualmente.
- Historial: reconoce la última fecha al llegar al final de la página aunque su contenido sea breve.

## 0.48.96

- Historial: agrega filtros rápidos de Evoluciones médicas, Enfermería, Medicamentos y Procedimientos. Permite combinarlos, quitar cada selección o restablecer todas; muestra cuántos eventos cargados coinciden y ajusta las fechas disponibles.
- Ficha original: aclara la selección de las cinco pestañas nativas. Los accesos a los apartados de Resumen permanecen fijos, funcionan con teclado y resaltan el apartado visible; su ancho se adapta al espacio disponible.
- Evoluciones: el bloque de lectura de Resumen usa todo el ancho de su contenedor; en Historial el texto ocupa la fila y las etiquetas pasan debajo. Conserva los campos de edición.
- Móvil: mantiene visible la barra del historial cuando Centro HHR muestra su botón flotante en la parte inferior.

## 0.48.95

- Centro HHR: panel lateral acoplable y redimensionable que deja disponible la ficha, con ampliación, minimización sin perder el formulario y paciente/episodio visibles.
- Laboratorio: búsqueda por nombre o abreviatura, etiquetas para quitar seleccionados y grupos propios guardados en el navegador, sin guardar campos del paciente en las preferencias.
- Documentos: vista previa integrada para recetas, laboratorio e imágenes. Recetas permite alternar Estándar/Compacta; los PDF se imprimen con los mismos bytes preparados. Si el tamaño o el espacio temporal impiden la vista previa, se conserva la impresión directa.
- Conexiones: el estado explica qué herramientas están disponibles y muestra acciones para las fuentes pendientes.
- Presentación: barras adaptables, densidad normal/compacta y preferencias de ancho, posición y formato recordadas en este navegador.

## 0.48.94

- Recetas: el selector Estándar/Compacta queda en la parte superior y permanece visible al recorrer la lista, tanto para un paciente como para hospitalizados.
- Ficha Médico: retira los dos iconos de la extensión junto a «Validar tratamiento». Recetas e indicaciones siguen disponibles desde Centro HHR.
- Historial: agrega un navegador persistente con la fecha del grupo visible, selección de día y accesos al día anterior o más reciente entre las fechas cargadas. Se actualiza al filtrar; «Hoy» y «Ayer» incluyen su fecha en Rapa Nui.
- Centro HHR: separa las acciones del encabezado, paciente y solicitud. «Abrir HHR» y «Cambiar paciente» pasan a un estilo secundario; las barras se distribuyen en varias filas cuando falta espacio.

## 0.48.93

- Exalab, computadores compartidos: la reconexión automática queda ligada también a la persona que ingresó a Exalab. El puente informa una huella corta de esa persona, nunca su nombre. Si en el mismo PC otra persona ingresa a Exalab mientras sigue abierta la sesión HHR de quien autorizó, su sesión ya no se vincula sola: HHR vuelve a pedir la conexión manual y la autorización guardada no se borra.
- Si el puente no puede reconocer a la persona de Exalab, la conexión manual funciona igual, pero no se recuerda la autorización automática.

## 0.48.92

- Exalab se conecta solo después de autorizarlo una vez en cada PC. La página de conexión trae marcada la opción «Conectar automáticamente en este PC». Desde entonces:
  - HHR pregunta a la extensión si Exalab tiene una sesión abierta en Chrome y, si la hay, la vincula al puente sin abrir esa página.
  - Al ingresar a Exalab con ClaveÚnica, las pestañas de HHR abiertas reciben un aviso y se reconectan solas.
- HHR solo recibe respuestas de sí o no. Las cookies de Exalab van de la extensión directo al puente, igual que antes.
- La autorización queda ligada al sitio publicado de HHR y a la cuenta HHR que la dieron. El puente informa una huella corta de la cuenta, y la reconexión la exige para que la sesión no termine en otra cuenta. Desde un HHR local o de vista previa se conecta igual, pero no se recuerda la autorización.
- «Desconectar» en HHR borra la autorización automática.
- La prueba en Chromium real cubre también la reconexión automática.

## 0.48.91

- Sincronización con Eloísa: si Ficha Médico quedó bloqueada por un fallo de red reciente, la sincronización ya no se rechaza de inmediato. Intenta leer la ficha. Si la red volvió, la lectura levanta el bloqueo y la sincronización termina normalmente; si no volvió, falla igual que antes y nombra el bloqueo.

## 0.48.90

- Mismo comportamiento que la 0.48.89; compacta la lectura de la sesión de Exalab para respetar el límite de tamaño por archivo que HHR aplica a la extensión.

## 0.48.89

- Exalab: «Conectar mi sesión» vuelve a encontrar la sesión abierta en Chrome. Chrome no entregaba la cookie de sesión por la consulta general, y la página respondía «Primero ingresa a Exalab» aunque la persona ya hubiera ingresado. Ahora lee por nombre solo las dos cookies que necesita el puente.
- Añade una prueba en Chromium real que comprueba que la sesión llega al puente.

## 0.48.88

- Primera gestión independiente del código, pruebas y publicaciones de la extensión.
- Consolida Exalab y el acceso nativo al DAU, ya integrados en HHR; conserva las herramientas del censo, documentos, recetas, Syslab e imágenes.
- Añade una huella de contenido para distinguir paquetes aunque dos ramas usen el mismo número.
- Comprueba la base de cada cambio y bloquea la reutilización de números publicados.
- Incluye notas y metadata verificable en cada publicación.

Origen: HHR `640a035536be5fba1ff258b30e4ba529656a97c9`, que incorpora Exalab y el trabajo de DAU de la línea 0.48.86/0.48.87. La comparación inicial conservó el paquete del MacBook Air `1e5b140a99b4944d89578189d08907ae2b63d641dd9c108d7126c73d66dfc24d` como referencia de funciones, sin incluir datos clínicos.
