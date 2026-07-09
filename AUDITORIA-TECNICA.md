# Auditoría técnica — PoliAgenda Pro v2.2.0

Fecha de auditoría: 9 de julio de 2026

## Resultado

**146 de 146 comprobaciones superadas.**

## Integridad técnica

- Sintaxis válida en `app.js`, `v22.js` y `sw.js`.
- Manifiesto PWA válido con iconos 192×192, 512×512 y maskable.
- Caché principal identificado como `poliagenda-core-v2.2.0`.
- Todos los recursos enumerados en el caché existen dentro del paquete.
- `index.html` carga primero la base estable y después las extensiones v2.2.
- No existe una ejecución prematura antes de aplicar las extensiones.
- Código de activación 271261 verificado mediante SHA-256.

## Biblioteca normativa

Artículos comprobados:

| Documento | Artículos |
|---|---:|
| Reglamento de Uniformes | 52 |
| Comisión Sumaria ESP–UNIPOL | 92 |
| Constitución Política del Estado | 411 |
| Ley N.º 1178 | 55 |
| D.S. N.º 23215 | 70 |
| D.S. N.º 23318-A | 67 |
| D.S. N.º 26237 | 2 |
| D.S. N.º 29820 | 2 |
| D.S. N.º 29536 | 2 |
| Código Penal | 395 entradas de artículos |
| Código de Procedimiento Penal | 450 entradas de artículos |

Se comprobó la secuencia completa de la CPE, Ley N.º 1178, D.S. N.º 23215, D.S. N.º 23318-A y los dos reglamentos originales.

El D.S. N.º 23318-A se corrigió para que su Artículo 1 empiece en “Fundamento”. El Artículo 21 incorpora la modificación identificada del D.S. N.º 29820 y mantiene las normas modificatorias relacionadas como documentos independientes consultables.

## Uniformes

- Los artículos 36 al 52 tienen imagen superior disponible.
- Artículo 42 vinculado a `Uniforme N.º 3-A (Tropical)`.
- Artículo 44 vinculado a `Uniforme N.º 3-B (Tropical)`.
- Artículo 46 vinculado a `Uniforme N.º 4 (Tropical)`.
- Las fichas muestran la denominación oficial del reglamento sin etiquetas añadidas de “variante” o “manga”.
- El documento original permanece accesible para comprobación.

## Pruebas funcionales en navegador móvil simulado

Viewport utilizado: 390×844 px.

Resultados:

- Activación correcta con 271261.
- Elección de modo Académico.
- Cinco botones de navegación visibles.
- Once documentos mostrados en Biblioteca.
- Búsqueda de “Artículo 251 Policía Boliviana” con el resultado pertinente en primer lugar.
- Búsqueda de “03 B Tropical” abre `Uniforme N.º 3-B (Tropical)` con la imagen tropical correcta.
- No aparecen etiquetas inventadas de manga o variante en la ficha.
- Creación y edición de nota.
- Creación de consigna y comprobación de que no aparece en Inicio.
- Creación y cumplimiento de tarea; traslado al historial.
- Subtareas disponibles.
- Kardex reconoce nombre, cédula y fecha de nacimiento desde texto de prueba.
- El analizador de horario convierte dos filas de texto de prueba.
- Carga de fotografía de horario y generación de vista previa.
- Sin desbordamiento horizontal en Inicio, Biblioteca, artículo, Pendientes y Horario.
- Sin errores de JavaScript durante las pruebas.

## Protección de datos de ejemplo

Se buscó y comprobó que el paquete no contiene precargados los datos personales reales compartidos por el usuario como ejemplo. La ficha Kardex inicia vacía.

## Limitaciones transparentes

1. El OCR de horarios depende del soporte `TextDetector` del dispositivo o de la carga en línea de Tesseract.js. Siempre existe revisión y corrección manual.
2. La consolidación penal y procesal penal parte de una publicación institucional del Tribunal Supremo de Justicia. La app advierte que deben consultarse normas modificatorias posteriores antes de una actuación formal.
3. La instalación PWA y la actualización del Service Worker solo pueden validarse por completo después de publicar los archivos en GitHub Pages bajo HTTPS.
4. La activación local no permite revocar remotamente una instalación ya activada.

## Veredicto

El paquete está preparado para publicación de prueba controlada. Antes de introducir información personal definitiva se recomienda:

1. Publicar en GitHub Pages.
2. Instalar en un Android y un iPhone.
3. Crear datos ficticios.
4. Cerrar y reabrir la app.
5. Probar un respaldo y su restauración.
6. Probar OCR con dos fotografías reales de horarios diferentes.
