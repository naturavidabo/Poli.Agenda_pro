# Auditoría técnica – PoliAgenda Pro v2.1.0

Fecha de revisión: 8 de julio de 2026

## Resultado general

- Auditoría estática: **58/58 verificaciones aprobadas**.
- Prueba funcional automatizada en navegador móvil: **aprobada**.
- Pruebas de lógica del analizador de mensajes: **aprobadas**.
- Desbordamiento horizontal en 390 px: **no detectado**.

## Pruebas funcionales aprobadas

1. Pantalla inicial de activación visible.
2. Rechazo de código incorrecto.
3. Activación con código 271261.
4. Selección de modo Académico.
5. Orden correcto de navegación inferior.
6. Apertura de Formaciones/Actividades.
7. Creación de pendiente.
8. Marcado como resuelto y archivado automático.
9. Consulta posterior en la sección Anteriores.
10. Búsqueda `03 B Tropical`.
11. Priorización correcta del artículo 44 Tropical.
12. Apertura de vista validada de manga corta.
13. Apertura de Configuración.
14. Manifest con iconos PWA.
15. Ausencia de desplazamiento horizontal a 390 px.
16. Creación de formación con varias horas.
17. Tres propuestas de título para comunicado de colegiatura.
18. Cambio de modo Académico a Profesional.

## Integridad documental

- Reglamento de Uniformes: artículos 1–52 secuenciales.
- Reglamento Comisión Sumaria: artículos 1–92 secuenciales.
- Horario base: más de 50 bloques editables.

## Validación visual de uniformes

Se crearon recortes específicos que corrigen el problema de títulos situados debajo de la imagen. La correlación se hizo según la secuencia real del PDF:

- Art. 41: 3-A Estándar – manga larga.
- Art. 42: 3-A Tropical – manga corta; imagen tomada de la parte superior de la página PDF 89.
- Art. 43: 3-B Estándar – manga larga; imagen tomada de la parte superior de la página PDF 91.
- Art. 44: 3-B Tropical – manga corta; imagen tomada de la parte superior de la página PDF 93.
- Art. 45: Uniforme 4 Estándar – manga larga; imagen tomada de la parte superior de la página PDF 95.
- Art. 46: Uniforme 4 Tropical – manga corta; imagen tomada de la página PDF 97.

## PWA y archivos

- Cache principal: `poliagenda-core-v2.1.0`.
- Manifest `standalone` con iconos 192, 512 y maskable.
- Archivo `version.json` para comprobación de actualizaciones.
- Paquete: 24 archivos, sin superar 100 archivos.
- Archivo más grande: PDF oficial, aproximadamente 10 MB; ninguno supera 100 MB.

## Limitación pendiente de validación después de publicar

La instalación real desde Chrome, la actualización del Service Worker desde GitHub Pages y el funcionamiento offline con el dominio definitivo deben comprobarse después de subir esta versión al repositorio HTTPS. Estas funciones no pueden certificarse completamente antes de que GitHub Pages publique los archivos.
