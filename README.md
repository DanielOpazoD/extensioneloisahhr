# Extensión Eloísa → HHR

Este repositorio es la fuente del código, las pruebas y las publicaciones de la extensión.
El MacBook Air y el Mac mini deben trabajar en ramas de este mismo repositorio. HHR consume
una revisión comprobada; su copia de la extensión es una dependencia, no otra línea de desarrollo.

[Mapa de arquitectura y contratos clínicos](docs/arquitectura.md)

[Descargar la extensión (.zip)](https://github.com/DanielOpazoD/extensioneloisahhr/releases/latest/download/eloisa-hhr.zip) · [Guía ilustrada para instalar y actualizar en Chrome](docs/instalacion/README.md)

## Lectura de la ficha

En Resumen, las tarjetas se ajustan a su contenido y Evolución aprovecha el ancho de la fila cuando los apartados comparten una cuadrícula. «Ver vacías» muestra los apartados de solicitudes y procedimientos que Eloísa ha marcado como vacíos. Sus etiquetas se pliegan y reaparecen junto con el contenido. Diagnóstico, signos vitales, reposo y régimen usan menos relleno. Fármacos e indicaciones libres conservan el tamaño del texto y compactan las filas. Cuando Alertas y Evolución comparten una fila, Evolución recibe más ancho. Los apartados con un único dato breve comparten línea con su título. Las tablas usan todo el ancho y las cabeceras de fármacos pueden mostrar el número de filas visibles y la acción de impresión. En Historial, una fecha acompaña el recorrido y los eventos con hora, categoría y profesional reconocibles reúnen esos datos en una cabecera que se adapta a la pantalla.

## Pautas en Evolución

En «Acciones de evolución», «Continuar pauta» recupera las respuestas al cerrar y abrir el formulario en la misma ficha y pestaña. La estrella junto al selector fija o quita la pauta favorita del profesional en ese perfil de Chrome. «Guardar» inserta la pauta confirmada por HHR y deja el cursor al final de la evolución para continuar escribiendo. La firma se realiza en Eloísa.

## Preparar un cambio

Usa Node 22.22 y `npm ci`. Crea una rama desde `main`, realiza el cambio y guarda un commit.
Después ejecuta `npm run prepare:publication`: incorpora la base actual y prepara el siguiente
número en el manifiesto y los dos lectores. No guarda ni descarta ediciones pendientes.
El número, los lectores y el lockfile se actualizan juntos. Completa la entrada correspondiente
de `CHANGELOG.md`, guarda el cambio, abre una PR y espera las comprobaciones.

La versión numérica es provisional mientras vive en una rama. Cada paquete añade una huella
SHA-256 de su contenido; dos paquetes distintos no se consideran iguales por compartir número.
Al publicar, la versión debe superar la base y conservar su historia. Un conflicto necesita
resolución y nuevas pruebas; no se mezclan ZIP a ciegas.

## Comprobar y empaquetar

- `npm test`: pruebas aisladas de los módulos de la extensión, sin pacientes reales.
- `npm run check:release`: dependencias, permisos, sintaxis y funciones obligatorias.
- `npm run test:runtime`: ZIP real en Chromium con fuentes sintéticas.
- `npm run test:dau`: acceso nativo al DAU con un portal simulado.
- `npm run build`: ZIP y `release.json`, con huella, checksum, notas y commit de origen.

Las pruebas de integración con la aplicación HHR permanecen en su propio repositorio.
`contracts/` conserva la versión del protocolo y la CSP de HHR usada para probar el acceso
nativo de DAU; HHR verifica además su configuración actual.
La huella identifica una compilación; tras editar una carpeta descomprimida hay que volver
a empaquetar y recargar Chrome. Una carpeta fuente sin empaquetar no afirma una identidad.

### Entrega de turno con equipo registrado

El ZIP publicado abre HHR Hospitalizados para registrar el equipo una sola vez.
Confirma con tu cuenta individual habilitada de enfermería o con tu cuenta
administradora institucional. Después usa Eloísa en el mismo perfil de Chrome.
La entrega solo confirma el guardado al recibir respuesta de HHR. «Desconectar»
revoca la llave del equipo.

Guarda y verifica las entregas abiertas antes de reemplazar o recargar la
extensión. Esta versión usa una identidad fija en Chrome. Si vienes del ZIP
estándar anterior, guarda una copia de esa carpeta hasta verificar el acceso
con la versión nueva y desactiva la copia anterior en `chrome://extensions`.

`node scripts/build-handoff-device-pilot.mjs` genera un ZIP aislado con
`HHR_HANDOFF_TEST_ORIGIN`, `HHR_HANDOFF_TEST_ENDPOINT` y
`HHR_HANDOFF_TEST_PUBLIC_KEY` propios del entorno de pruebas. Usa un backend
con datos sintéticos y una identidad de Chrome distinta de la publicada.

## Controles de la interfaz

Gestión de cuidados reúne ingresos, pacientes con novedad y pacientes sin novedad en «Pacientes hospitalizados», y mantiene «Egresos» aparte. La tabla de carga sigue visible hasta que responden las tres fuentes. Si un episodio aparece en varias listas se presenta una vez, con preferencia por la fila con novedad. Ambas vistas y las cuatro subsecciones de Lista de trabajo médico muestran los resultados filtrados en tablas compactas. En cada fila, «Imprimir» reúne dos iconos para el informe vigente de indicaciones y la receta completa del episodio. Sustituye GES y, en interconsultas, queda junto a «Paciente». El buscador, el filtro nativo y la impresión comparten la barra compacta de pestañas. Las listas alinean el RUN, el pasaporte y el número de identificación con el inicio del nombre. El RUN usa guion y se copia con un clic. Se omiten las líneas de género y nombre social y el encabezado Acciones. Se ocultan los rótulos de resultados y el icono «Familiar esperando por información». En interconsultas sigue visible el servicio de cada grupo. La tabla mantiene la densidad al abrir el panel lateral de Rayen, desplegar un menú o completar el CUDYR.

El encabezado de la tabla queda visible durante el desplazamiento. En Gestión de cuidados, el icono de novedad abre una vista breve cuando la publicación se puede identificar en Eloísa. El enlace abre el Historial y resalta la tarjeta cuando coincide una sola publicación médica de esa fecha y hora.

Al volver de una ficha a su lista, se recuperan la subsección y la búsqueda de esa pestaña.
Si el episodio sigue en los resultados, su fila recupera el foco y queda marcada unos segundos,
incluso después de un traslado de cama.

En el menú lateral y en Ajustes de Centro HHR, «Favoritos» reúne los accesos fijos a SysLab, MMRAD y Gmail. Los iconos se incluyen en el paquete a partir de los favicons de los tres sitios y los enlaces se abren en otra pestaña.

En el menú lateral, «Un día como hoy» reúne las conmemoraciones de Efemerides.cl, hasta tres hechos históricos destacados por Wikipedia en español y hasta ocho nacimientos ordenados por visitas recientes. Cada hecho y nacimiento enlaza a su artículo. La lista de nacimientos muestra tres al abrirse y permite desplegar el resto.

La ubicación muestra servicio y cama. Las filas se ordenan por cama desde R1–R4 y NEO1–NEO2 hasta H1C1–H6C2. Las ubicaciones adicionales siguen a las camas de sala y las de urgencias cierran la lista. En interconsultas se aplica el orden dentro de cada servicio. La fila se resalta al pasar el cursor o enfocar sus controles. En Gestión de cuidados, el lápiz junto al nombre abre «Modificación del paciente» en Gestión de Camas. El lápiz reutiliza la pestaña de Camas del profesional, incluso en otra ventana. Si hace falta iniciar sesión, se usa el acceso oficial de Camas. El editor comprueba profesional, establecimiento, episodio, paciente y disponibilidad de la acción nativa. El profesional revisa los datos y decide si guardar.

Las recetas y las indicaciones se abren desde Centro HHR; la extensión no agrega iconos
junto a «Validar tratamiento». El selector Estándar/Compacta está sobre el contenido
desplazable, tanto para un paciente como para el censo.

En Ajustes de Centro HHR, «Descargar extensión desde GitHub (.zip)» descarga la última versión publicada.

Centro HHR se abre por defecto como un cuadro de diálogo centrado. Al actualizar esta
versión se restablece esa apertura; después puedes elegir y guardar el panel lateral.
En pantallas amplias, el botón de acoplar deja espacio para la ficha al lado derecho.
El borde permite ajustar su ancho con el mouse o las flechas del teclado. La cabecera
reúne el módulo activo, sus pestañas y sus acciones. «Vista» permite ajustar la densidad,
acoplar o desacoplar el panel y ampliar el cuadro. Minimizar conserva el formulario;
cerrar libera el espacio de la página. En Inicio, «Abrir recetas»,
«Ver resultados», «Solicitar laboratorio» y «Solicitar imágenes» llevan a su pantalla con un clic.

La solicitud de laboratorio permite buscar nombres y abreviaturas, quitar seleccionados
desde sus etiquetas y guardar hasta 20 grupos propios. Añadir un grupo conserva los exámenes
ya seleccionados. Chrome guarda sólo preferencias de presentación y nombres/claves de esos
grupos; los campos del paciente y la solicitud no forman parte de esas preferencias.

Recetas, laboratorio e imágenes abren directamente el diálogo de impresión de Chrome.
En Laboratorio e Imágenes, «De Eloísa» abre el censo para buscar por nombre, documento o cama.
La orden conserva su origen hasta que se elige un paciente. Junto a «Imprimir» se ve el nombre
y el documento si se eligió alguien del censo, o «Sin identificación» si la orden está en blanco.
Para una orden personalizada, los datos se ven en el propio formulario. En Laboratorio, el contador
y la opción de guardar un grupo aparecen al seleccionar exámenes.
En Laboratorio, «Copias» junto a «Imprimir» permite elegir de 1 a 99 ejemplares de la misma
orden. «Guardar como PDF» los reúne en un archivo, con una copia por página.
En Imágenes, al marcar la primera cruz o confirmar un texto, los datos del paciente
se recogen en una línea. «Editar» vuelve a abrirlos. «Ajustar al ancho» y «Hoja completa»
cambian la escala en pantalla y conservan la posición de las marcas en el documento.
En Imágenes, la pestaña «Informes» ofrece «Abrir MMRAD». El portal se abre en otra pestaña
para consultar los estudios con la sesión del profesional.
En Recetas se elige Estándar o Compacta antes de imprimir. En el diálogo de Chrome se puede
seleccionar una impresora o guardar el documento como PDF.

La barra principal usa iconos para recetas y exámenes, sin subtítulo de conexión.
Exámenes abre directamente «Ver resultados», «Solicitar laboratorio» o «Solicitar imágenes».
La barra conserva HHR, Receta, Exámenes y sesión. Las preferencias de presentación
están dentro de Ajustes de Centro HHR.
El botón de sesión muestra el estado y abre el panel de conexiones con un clic.
Allí se detallan las dependencias de cada herramienta y sus acciones de reconexión. Syslab se
comprueba al abrir resultados de laboratorio; no se deduce su estado de las otras sesiones.

Al cambiar entre módulos, las solicitudes de laboratorio e imágenes conservan su selección,
campos y marcas mientras Centro HHR siga abierto. Cada episodio tiene su propio borrador;
antes de restaurarlo se verifica nuevamente el paciente y el profesional de la sesión.
Las solicitudes de paciente nuevo también se conservan dentro de ese panel. Estos borradores
viven sólo en memoria: cerrar el panel o recargar la página los descarta. No guardan documentos,
credenciales ni respuestas clínicas en las preferencias del navegador.

Si una consulta o impresión falla por la sesión, «Reconectar y continuar» mantiene el trabajo
y retoma la lectura tras verificar la conexión. Cuando hace falta ingresar en la página oficial,
se vuelve al panel y se pulsa «Continuar». Syslab conserva su formulario de acceso y retoma la
consulta, el informe o el análisis seleccionado. La recuperación no imprime ni envía solicitudes automáticamente.

El navegador de fechas aparece en la fila de pestañas de Eloísa, junto a «Historial».
Mantiene visible la fecha y permite saltar entre los grupos
que Eloísa ya cargó. Al cambiar los filtros se actualizan las fechas disponibles. No consulta
otros días ni cambia el rango del filtro nativo; «Hoy» y «Ayer» muestran además su fecha
en `Pacific/Easter`. La prueba del ZIP cubre scroll de página y de un contenedor, filtros,
salida del historial y distribución de la fila a 1280, 840, 707 y 390 píxeles.

La barra del historial es compacta y conserva sólo el selector de fecha y sus dos flechas.
Los filtros por categoría y el contador de eventos de la extensión se retiran. Los filtros
nativos de Eloísa siguen determinando los eventos y fechas disponibles.

La navegación principal conserva las pestañas nativas con una selección más clara. Los
accesos a los apartados de Resumen permanecen visibles, permiten navegar con teclado y
resaltan el apartado que se está leyendo. Las evoluciones de lectura aprovechan el ancho
de su contenedor; sus etiquetas quedan disponibles junto al texto ampliado.

## Publicar

**Publish extension** corre solo cuando la CI de `main` aprueba un commit cuya versión aún no
está publicada; un commit sin versión nueva (documentación, CI) no publica nada. También puede
lanzarse a mano desde `main`. En ambos casos publica solo si el autor del cambio es el
propietario y la CI aprobó ese commit exacto. El trabajo de publicación se serializa y comprueba la última release antes de crear
otra: exige una versión superior y una base que la contenga. No sobrescribe releases ni assets.
Cada release incluye ZIP, `release.json` y notas. Nadie necesita introducir manualmente la huella
de la base: se obtiene de la publicación anterior.

El futuro catálogo de HHR puede mostrar estas publicaciones, separar pruebas de la versión
activa y limitar su aprobación a administradores. Una subida de ZIP será un candidato hasta
verificar su identidad, procedencia, base y pruebas. La mera presencia de archivos no demuestra
que todas las funciones se conserven.

No incluir pacientes, cookies, contraseñas, perfiles de Chrome ni archivos `.env` en código,
pruebas, notas o publicaciones. Se conservan las licencias y la trazabilidad de los vendors
en `extension/vendor-lock.json` y en sus archivos originales.

## Entrega de turno

En Gestión de cuidados, «Entrega de turno» abre los editores en la tabla. La fecha censal y
las pestañas Día y Noche aparecen una vez arriba. Se puede editar el turno vigente y consultar
el otro turno de la misma fecha. HHR proporciona las notas visibles en una lectura agrupada.
La extensión comprueba el acceso antes de cargar las filas y muestra un solo aviso de conexión.

«Guardar cambios» envía las entregas modificadas en bloques de hasta diez y muestra un ✓ por cada paciente que HHR
confirme. Los borradores que requieren revisión se conservan durante la misma vista de Eloísa,
incluso al filtrar. Si cambia el turno, se puede abrir el vigente y consultar el borrador anterior
mientras su editor siga abierto. En caso de conflicto, el editor permite comparar y recuperar
el texto conservado.

## Piloto local de entrega de turno

Ejecuta `functions/scripts/runNursingHandoffPilot.cjs` desde el repositorio de HHR con
`HHR_HANDOFF_EXTENSION_CHECKOUT` apuntando a este checkout. Una ejecución prepara el
emulador local y la extensión y verifica la entrega en Chromium. El modo `--interactive`
prepara una carpeta para Chrome y un caso ficticio. En la lista de Hospitalizados de
Eloísa, añade `hhrHandoffTest=1` a los parámetros y abre «Abrir entrega del paciente ficticio».
La extensión comprueba la sesión y envía el identificador del profesional a HHR local.
