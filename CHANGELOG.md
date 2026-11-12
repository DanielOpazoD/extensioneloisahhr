# Cambios

## 0.48.94

- Recetas: añade «Respaldo HHR de fármacos activos» en Centro HHR, independiente del servidor de PDF oficial. Lee nuevamente el tratamiento y la autoría, excluye suspendidos, archivados, finalizados y eliminados, y separa cada prescriptor y fecha en su propia receta para revisar y firmar. El documento se identifica como respaldo, sin folio ni validación oficial inventados.
- El respaldo se detiene si falta cobertura de algún fármaco, su identidad, posología, vía, autor o fecha; también si cambia el tratamiento o la sesión durante la preparación. No amplía permisos ni escribe en la ficha.
- Un error al imprimir la receta oficial conserva las opciones del panel, permitiendo elegir el respaldo sin cerrarlo.

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
