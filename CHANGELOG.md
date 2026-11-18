# Cambios

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
