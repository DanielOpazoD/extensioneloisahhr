# Trabajo en la extensión

- Esta es la fuente del código de la extensión. HHR es un consumidor; no desarrollar dos copias en paralelo.
- Leer README.md y CHANGELOG.md antes de cambiar el código. Usar una rama desde main y PR.
- Incorporar la última base antes de publicar. No omitir CI ni debilitar la validación de versiones.
- Conservar las funciones existentes. Una eliminación funcional requiere indicación expresa del responsable, contrato actualizado y pruebas equivalentes.
- Cada versión debe tener notas. La identidad de un paquete incluye su huella, no solo su número.
- Solo publicar con CI aprobada del commit exacto y mediante el workflow del propietario.
- No incluir datos reales de pacientes, credenciales ni perfiles del navegador. Las pruebas son sintéticas.
- No modificar vendors sin conservar procedencia, licencia y hashes. No ampliar permisos sin motivo y revisión.
- Commits en inglés con Conventional Commits; PR, notas e informes al responsable en español.

## Contrato clínico que acompaña al código

Antes de modificar lecturas o escrituras clínicas, consultar el [contrato operativo de HHR](https://github.com/DanielOpazoD/HHR-entornodeprueba/blob/main/docs/DOMAIN_RULES.md). La separación del repositorio conserva estas reglas:

- La identidad es la persona más su episodio; la cama es una ubicación. Madre y recién nacido son personas distintas. Un pasaporte nunca se convierte en RUT ni se compara como RUT.
- Los días, horas y turnos clínicos se interpretan en `Pacific/Easter`. No cortar un instante ISO para inferir su día ni descartar su desfase.
- Una captura parcial, una fuente fallida o un paciente ausente no demuestran un egreso ni autorizan borrar información. Conservar el último dato conocido y el fallo por su canal.
- Una escritura rechazada no es un guardado. Conservar los controles de autorización, identidad, episodio, confirmación y recuperación existentes. No sustituir una lectura clínica fresca por una caché aparentemente sana.
- Las sesiones de los profesionales y sus credenciales permanecen en sus límites actuales. Nunca incorporarlas a mensajes para la página, pruebas, logs, repositorio o releases.

Las pruebas sintéticas de estos módulos viven aquí; las de compatibilidad con HHR y su autoridad clínica permanecen en HHR. Un cambio de estas reglas necesita una indicación expresa del responsable.
