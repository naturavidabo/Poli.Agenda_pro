# Auditoría técnica — Agenda Policial v2.6.1

Fecha de estabilización: 25 de julio de 2026.

## Interfaz

- Barra inferior limitada a cinco opciones y verificada a 390 px de ancho.
- Biblioteca permanece dentro de la misma fila, sin desbordamiento horizontal.
- El acceso académico online se trasladó al encabezado.
- Se eliminó la búsqueda global del encabezado.
- La Biblioteca conserva un buscador propio, contextual y mejorado por nombre de ley, artículo y palabras clave.

## Biblioteca normativa

- Ley N.º 777: 36 artículos estructurados + PDF local.
- Ley N.º 101: 103 artículos estructurados + PDF local.
- Ley Orgánica de la Policía Nacional, Ley N.º 734: 138 artículos estructurados + PDF local.
- Ley N.º 004: 40 artículos estructurados + PDF local.
- Ley N.º 348: 100 artículos estructurados + PDF local.
- Los accesos priorizan el PDF incorporado; no dependen de enlaces externos para estos cinco documentos.

## Pruebas ejecutadas

- Sintaxis de `app.js`: correcta.
- Sintaxis de `online.js`: correcta.
- Validación de todos los archivos JSON: correcta.
- Apertura e información básica de los cinco PDF: correcta y sin cifrado.
- Prueba de interfaz simulada a 390 × 844 px: cinco botones de navegación, sin desbordamiento y sin errores JavaScript.
- Prueba de acceso al Área Académica Online: correcta.
- Prueba de búsqueda y apertura de la Ley N.º 101 y Ley N.º 348: correcta.
- Archivos totales del repositorio: 86, por debajo del límite solicitado de 100.

## Actualización

La versión conserva IndexedDB y la activación local existente. El Service Worker usa el caché `agenda-policial-v2.6.1` y elimina cachés antiguos de Agenda Policial durante la activación.
