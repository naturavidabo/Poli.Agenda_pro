# Auditoría técnica — Agenda Policial v2.4.1

Fecha: 13/07/2026

## Objetivo
Corrección general sobre la v2.4.0, enfocada en:
- actualización desde GitHub/Service Worker;
- estética e interfaz;
- bloc de notas sin botones sobre el texto;
- conservación de datos locales;
- verificación de Biblioteca, uniformes y reglamentos.

## Correcciones aplicadas

### 1. Actualización desde GitHub
- Se cambió el Service Worker a `agenda-policial-v2.4.1`.
- `version.json`, `index.html`, `app.js` y `styles.css` ahora usan estrategia network-first para no quedar atrapados en caché viejo.
- El botón `Buscar actualización` consulta `version.json` con `cache: no-store`.
- Se agregó `applyUpdate()` para actualizar registro de Service Worker, limpiar cachés `agenda-policial-*` y recargar sin borrar IndexedDB ni localStorage.
- Se añadió soporte de mensaje `SKIP_WAITING` en el Service Worker.

### 2. Activación
- Se conserva el código oculto mediante `input type="password"`.
- La activación se mantiene en `localStorage` y en estado local.
- No se borra por una actualización normal de archivos.

### 3. Bloc de notas
- El formulario de notas deja de tener botones flotantes/pegados encima del área de escritura.
- `Guardar` y `Cancelar` quedan debajo del contenido, sin obstruir el texto.
- Se amplió el área de escritura para uso real como bloc de notas policial.

### 4. Interfaz
- Se refinó la cabecera institucional.
- Se ajustaron tamaños de botones.
- Se mejoraron tarjetas, sombras, bordes y contraste.
- Configuración dejó de verse como una pantalla blanca plana y ahora tiene encabezado institucional.
- Se mantuvo navegación inferior: Inicio, Formaciones, Tareas, Horario, Biblioteca.

### 5. Biblioteca normativa
- Se verificó integridad de los principales JSON.
- Reglamento de Uniformes: 52 artículos.
- Reglamento Sumario: 92 artículos.
- Imágenes referenciadas en Reglamento de Uniformes: 33 rutas, 0 faltantes.
- Se mantiene botón `Ver PDF original` en artículos de uniformes cuando existe página asociada.

## Pruebas realizadas

| Prueba | Resultado |
|---|---:|
| `node --check app.js` | OK |
| `node --check sw.js` | OK |
| JSON `version.json` | OK |
| JSON `manifest.webmanifest` | OK |
| JSON `reglamento-uniformes.json` | OK |
| JSON `reglamento-sumario-unipol.json` | OK |
| Artículos uniforme 1–52 | OK |
| Artículos sumario 1–92 | OK |
| Imágenes declaradas en uniformes existen | OK |
| ZIP generado | OK |

## Limitaciones pendientes

- La instalación real y la actualización efectiva deben confirmarse después de subir esta versión al repositorio GitHub Pages, porque dependen del origen HTTPS y del caché real del navegador.
- El OCR de horario continúa dependiendo del navegador/dispositivo y de la nitidez de la imagen.
- Si un teléfono conserva datos corruptos de versiones anteriores, puede requerir usar `Buscar actualización`, cerrar y abrir, o borrar caché del sitio una vez.

