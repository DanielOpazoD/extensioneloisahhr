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
