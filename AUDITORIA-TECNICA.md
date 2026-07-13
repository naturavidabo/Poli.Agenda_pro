# Auditoría técnica - Agenda Policial v2.4.7

## Correcciones aplicadas

### Fecha local del dispositivo

Se reemplazó el uso de `new Date().toISOString().slice(0,10)` para la fecha operativa de la agenda. Esa expresión trabaja en UTC y provocaba que, en Bolivia, durante la noche del domingo la app creyera que ya era lunes. Como luego la hora seguía siendo domingo por la zona local, se marcaban las actividades del lunes como finalizadas y saltaba indebidamente al martes.

Ahora `todayISO()` devuelve fecha local con año, mes y día del dispositivo.

### Biblioteca normativa

Se corrigió `openDoc()` para que cada documento abra su propia vista estructurada, en vez de lanzar una búsqueda genérica de “artículo”.

Se agregó:

- vista de documento;
- listado de artículos;
- búsqueda interna por documento;
- botón visible “Ver documento original PDF” para documentos con PDF;
- enlace PDF desde cada artículo normativo usando `art.fuente_pdf` y el catálogo local.

## Pruebas estáticas realizadas

- `node --check app.js`: correcto.
- `node --check sw.js`: correcto.
- `version.json`: JSON válido.
- Conteo del paquete: por debajo del límite solicitado.

## Pendiente funcional

El OCR de horario sigue dependiendo de la capacidad del navegador y Tesseract.js. Esta versión no cambia el motor OCR; corrige fecha/agenda y biblioteca normativa.
