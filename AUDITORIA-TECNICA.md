# Auditoría técnica — Agenda Policial v2.4.8

## Verificación

- `app.js`: sintaxis JavaScript verificada con `node --check`.
- `sw.js`: sintaxis JavaScript verificada con `node --check`.
- `version.json`: actualizado a 2.4.8.
- Service Worker: caché actualizado a `agenda-policial-v2.4.8`.
- Total de archivos: por debajo del límite operativo indicado.

## Correcciones auditadas

### Tareas académicas

- Campo Materia cambia a selector `<select>` basado en materias únicas del horario activo.
- Se agrega botón Próxima clase.
- La hora de entrega se calcula automáticamente con la primera hora de la materia en la fecha elegida.
- Subtareas se renombra a Puntos de trabajo.
- Parser de mensaje inteligente separa numeraciones, guiones y requisitos.

### Inicio

- Se separa actividad actual de próxima actividad.
- Se añade contador visible en cápsula destacada.
- Se evita duplicar la actividad principal en la cronología.
- Formaciones pasadas se muestran como concluidas.

### Configuración

- Se retiran de la vista principal indicadores no interactivos: conexión, activación e instalación.
- Botones de actualización se ordenan como 1 y 2.
- Acciones peligrosas quedan diferenciadas con advertencia.
- Herramientas técnicas quedan en bloque avanzado.

### Docentes / instructores

- Panel generado desde docentes registrados en el horario activo.
- Clasificación: Tranquilo, Normal, Estricto, Muy estricto, Cuidado especial.
- Indicador visual discreto por color.

### iPhone

- Se aplica `env(safe-area-inset-top)` y `env(safe-area-inset-bottom)`.
- Botones superiores más grandes para evitar conflicto con la barra de estado.

## Observación

La revisión fina de imágenes del Reglamento de Uniformes se mantiene como control de baja incidencia para una versión posterior si se detecta un artículo puntual con recorte incompleto.
