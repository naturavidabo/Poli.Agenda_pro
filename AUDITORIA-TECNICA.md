# Auditoría técnica — PoliAgenda Pro v2.0.1

## Diagnóstico de la versión publicada anterior

- Diseño de dos columnas forzado también en pantallas pequeñas.
- Navegación horizontal con controles desiguales y contenido desbordado.
- Manifiesto sin iconos, por lo que no cumplía correctamente los requisitos de instalación PWA.
- Caché `poliagenda-pro-v1` sin limpieza al actualizar.
- Reglamento de Uniformes con solo 12 artículos detectados.
- Reglamento Sumario con 92 posiciones, pero gran parte del texto era provisional.
- Búsqueda literal que no trataba `3B`, `3-B`, `3 B` y `N.º 3-B` como equivalentes.
- Agenda, analizador, pendientes, portafolio y respaldo mezclados en la misma estructura visual.

## Correcciones implementadas

- Reconstrucción completa de interfaz móvil.
- Páginas separadas y barra inferior fija.
- PWA con iconos válidos, manifiesto completo y Service Worker versionado.
- Eliminación automática del caché antiguo.
- 52 artículos de Uniformes y 92 artículos del Sumario.
- Filtros directos de faltas, sanciones y prescripción.
- Horario base con 58 bloques extraídos de la fotografía.
- Migración no destructiva de datos antiguos de IndexedDB.
- Guardado y restauración en JSON.
- Descarga opcional del contenido visual para no bloquear la instalación inicial.

## Pruebas automáticas superadas

- `node --check app.js`.
- `node --check sw.js`.
- 52 artículos de Uniformes en secuencia 1–52.
- 92 artículos del Sumario en secuencia 1–92.
- Cero textos provisionales detectados en el Sumario.
- 58 bloques del horario académico.
- Iconos de 192×192 y 512×512 válidos.
- Manifiesto con `start_url`, `scope`, modo `standalone` e icono maskable.
- Búsqueda normalizada: `3B`, `3-B`, `3 B` y `N.º 3-B` → `3b`.
- Analizador: fecha, hora, arribo, lugar, uniforme, urgencia y rectificación.
- Rutas locales principales respondieron correctamente en servidor de prueba.
- CSS móvil: tarjetas y formularios en una columna; navegación en cinco columnas iguales.

## Validación pendiente después del despliegue

- Instalación real desde Chrome/Brave bajo la URL HTTPS de GitHub Pages.
- Apertura desde el icono instalado.
- Cierre/reapertura conservando IndexedDB.
- Prueba offline real en el teléfono.
- Revisión visual en el modelo concreto del dispositivo.

Estas últimas pruebas dependen de que los archivos corregidos estén publicados en GitHub Pages.
