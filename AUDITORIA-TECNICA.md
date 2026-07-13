# Auditoría técnica - Agenda Policial v2.4.0

## Estado

Versión correctiva construida sobre v2.3.1 para añadir el módulo de horario inteligente desde imagen.

## Verificaciones realizadas

- Sintaxis de `app.js` verificada con `node --check`.
- Versión interna actualizada a `2.4.0`.
- Cache del Service Worker actualizado a `agenda-policial-v2.4.0`.
- `version.json` actualizado a `2.4.0`.
- Campo de activación permanece oculto y con código local 271261.
- Conserva búsqueda corregida de uniformes 3A, 3-A, 3B, 3-B y 03 B Tropical.
- Conserva botón Ver PDF original en artículos.
- Horario permite imagen desde galería/archivos o cámara.
- Horario permite ver, reemplazar y eliminar imagen.
- Se agregó OCR asistido con Tesseract.js cuando está disponible.
- Se agregó alternativa con TextDetector si el navegador lo soporta.
- Se agregó fallback manual cuando OCR no está disponible.
- El parser acepta líneas con día + hora + materia.
- El parser acepta filas de tabla con rango horario y varias celdas asignadas a lunes-viernes.
- Antes de guardar, las filas detectadas se muestran para revisión y edición.
- Al reemplazar horario, se conserva historial local del horario anterior.

## Limitación conocida

La lectura de horarios desde fotografía depende de la nitidez, perspectiva, resolución y capacidad OCR del navegador. La aplicación no guarda interpretaciones sin revisión del usuario.
