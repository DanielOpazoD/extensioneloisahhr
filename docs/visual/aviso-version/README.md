# Aviso de versión nueva

## En la barra de Centro HHR y en Ajustes, desde 0.48.195

La extensión se carga desde una carpeta y Chrome no la actualiza. Cuando hay una versión publicada posterior a la instalada, la barra de Centro HHR lo dice sobre la ficha y Ajustes explica qué hacer.

| Dónde | Imagen |
| --- | --- |
| Barra de Centro HHR, con su ayuda al pasar el cursor | [Barra](0.48.195/aviso-version-barra.png) |
| Ajustes de Centro HHR | [Ajustes](0.48.195/aviso-version-ajustes.png) |

Las imágenes salen de la prueba de ejecución, con la extensión cargada en Chromium sobre una ficha ficticia. La versión «99.0.0» es la que esa prueba hace pasar por publicada.

- **Con la versión al día** la barra es la de siempre y Ajustes dice que la instalada es la misma que la última publicada. Con una versión local posterior, lo dice también.
- **Con la barra contraída** el aviso es un punto ámbar sobre el logo.
- **Sin respuesta de GitHub** se conserva la última respuesta; sin ninguna previa, no se muestra aviso.

```sh
HHR_VISUAL_ARTIFACT_DIR=/tmp/aviso npm run test:runtime
```
