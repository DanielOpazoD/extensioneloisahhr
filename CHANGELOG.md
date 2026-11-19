# Cambios

## 0.48.118

- El piloto local abre y guarda la entrega con la sesión de Eloísa de pruebas. Retira el código de vinculación y el paso por HHR.

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
