# Agenda Policial v2.4.0

Actualización enfocada en la segunda parte solicitada: análisis de horario desde imagen.

## Cambios principales

- Conserva las correcciones de v2.3.1: activación local con código oculto, persistencia de activación, búsqueda de uniformes 3A/3B y botón Ver PDF original.
- En Horario se mantiene:
  - Subir imagen desde galería/archivos.
  - Tomar foto con cámara.
  - Ver imagen actual del horario.
  - Reemplazar o eliminar imagen.
- Nuevo flujo de análisis:
  - Botón **Leer imagen automáticamente**.
  - OCR asistido cuando el navegador tenga acceso al motor Tesseract.js.
  - Si el OCR no está disponible, se puede pegar/corregir texto manualmente.
  - Parser de líneas con días, horas y materias.
  - Parser de filas tipo tabla: una hora y varias celdas para lunes a viernes.
  - Pantalla de revisión antes de guardar.
  - Corrección editable de día, hora, materia, docente y observación.
  - Opción de **Reemplazar horario** o **Crear/Agregar parcial**.
  - Conservación del horario anterior en historial local cuando se reemplaza.

## Nota sobre OCR

El OCR desde imagen requiere que el navegador cargue Tesseract.js. En la primera lectura puede necesitar internet. Si el dispositivo no permite OCR o la imagen es poco nítida, la app no guarda nada automáticamente: permite pegar texto o registrar manualmente.

## Publicación

Reemplazar los archivos del repositorio actual conservando la estructura. Después de publicar, abrir la app y usar Buscar actualización o recargar dos veces para asegurar que el Service Worker tome la versión 2.4.0.
