# Cambios

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
