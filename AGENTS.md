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
