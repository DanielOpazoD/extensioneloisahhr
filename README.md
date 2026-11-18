# Extensión Eloísa → HHR

Este repositorio es la fuente del código, las pruebas y las publicaciones de la extensión.
El MacBook Air y el Mac mini deben trabajar en ramas de este mismo repositorio. HHR consume
una revisión comprobada; su copia de la extensión es una dependencia, no otra línea de desarrollo.

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

## Controles de la interfaz

Las ocho subsecciones de Gestión de cuidados y Lista de trabajo médico muestran los resultados filtrados en tablas compactas. En cada fila, «Imprimir» reúne dos iconos para el informe vigente de indicaciones y la receta completa del episodio. Sustituye GES y, en interconsultas, queda junto a «Paciente». El buscador queda junto a la tabla. Se ocultan los rótulos de resultados y el icono «Familiar esperando por información». En interconsultas sigue visible el servicio de cada grupo. La tabla mantiene la densidad al abrir el panel lateral de Rayen, desplegar un menú o completar el CUDYR.

La ubicación muestra servicio y cama. La fila se resalta al pasar el cursor o enfocar sus controles. En Gestión de cuidados, el lápiz junto al nombre abre «Modificación del paciente» en Gestión de Camas. Si hace falta iniciar sesión, se usa el acceso oficial de Camas. El editor comprueba profesional, establecimiento, episodio, paciente y disponibilidad de la acción nativa. El profesional revisa los datos y decide si guardar.

Las recetas y las indicaciones se abren desde Centro HHR; la extensión no agrega iconos
junto a «Validar tratamiento». El selector Estándar/Compacta está sobre el contenido
desplazable, tanto para un paciente como para el censo.

Centro HHR se abre por defecto como un cuadro de diálogo centrado. Al actualizar esta
versión se restablece esa apertura; después puedes elegir y guardar el panel lateral.
En pantallas amplias, el botón de acoplar deja espacio para la ficha al lado derecho.
El borde permite ajustar su ancho con el mouse o las flechas del teclado. El encabezado
incluye desacoplar, ampliar, minimizar y densidad compacta. Minimizar conserva el formulario;
cerrar libera el espacio de la página. Paciente y episodio permanecen visibles, y las
solicitudes manuales identifican al paciente nuevo en la misma franja.

La solicitud de laboratorio permite buscar nombres y abreviaturas, quitar seleccionados
desde sus etiquetas y guardar hasta 20 grupos propios. Añadir un grupo conserva los exámenes
ya seleccionados. Chrome guarda sólo preferencias de presentación y nombres/claves de esos
grupos; los campos del paciente y la solicitud no forman parte de esas preferencias.

Recetas e imágenes preparan una vista previa del PDF dentro del panel. La impresión usa
exactamente los bytes preparados, vinculados a la pestaña y ruta que los solicitaron, con
caducidad de diez minutos y un límite de 5 MB por vista previa. Los documentos mayores
conservan la opción de impresión directa. Al cambiar formato o cerrar
se libera el documento anterior. Laboratorio muestra el mismo HTML de la solicitud impresa;
su pestaña de impresión se abre sólo al pulsar Imprimir. El visor PDF carga su código bajo
demanda y muestra una página a la vez. No se amplían permisos ni se escriben datos en Eloísa.

La barra principal usa iconos para recetas y exámenes, sin subtítulo de conexión.
Exámenes abre directamente «Ver resultados», «Solicitar laboratorio» o «Solicitar imágenes».
La barra conserva HHR, Receta, Exámenes y sesión; Favoritos y las preferencias de presentación
están dentro de Ajustes de Centro HHR.
El estado sigue disponible en el indicador de color, el texto accesible y la ayuda al pasar
el cursor; el panel de conexiones
muestra las dependencias de cada herramienta y sus acciones de reconexión. Syslab se
comprueba al abrir resultados de laboratorio; no se deduce su estado de las otras sesiones.

Al cambiar entre módulos, las solicitudes de laboratorio e imágenes conservan su selección,
campos y marcas mientras Centro HHR siga abierto. Cada episodio tiene su propio borrador;
antes de restaurarlo se verifica nuevamente el paciente y el profesional de la sesión.
Las solicitudes de paciente nuevo también se conservan dentro de ese panel. Estos borradores
viven sólo en memoria: cerrar el panel o recargar la página los descarta. No guardan documentos,
credenciales ni respuestas clínicas en las preferencias del navegador.

Si una consulta o vista previa falla por la sesión, «Reconectar y continuar» mantiene el trabajo
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
