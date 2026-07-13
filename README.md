# Agenda Policial v2.4.7 - Fecha local y biblioteca normativa

Versión correctiva enfocada en dos fallas detectadas en uso real:

1. La pantalla de Inicio calculaba mal el día cuando el dispositivo estaba en Bolivia y la hora local aún era domingo, pero UTC ya era lunes. Se corrigió el cálculo para usar fecha local del dispositivo, no UTC.
2. Los documentos normativos distintos al Reglamento de Uniformes no abrían correctamente. Ahora cada documento tiene vista propia, listado de artículos, búsqueda interna y botón visible para abrir el PDF original cuando el paquete lo incluye.

## Publicación

Suba todo el contenido del ZIP al repositorio de GitHub Pages y abra:

`index.html?v=2.4.7`

Si el navegador sigue mostrando una versión anterior, abra primero:

`reset.html`

Luego vuelva a abrir `index.html?v=2.4.7`.

## Verificación rápida

- Configuración debe mostrar v2.4.7.
- En domingo por la noche, la próxima actividad académica debe ser lunes, no martes.
- La Hora Mística del lunes debe aparecer como actividad real del horario.
- Biblioteca → Código Penal debe mostrar listado de artículos y botón PDF.
- Biblioteca → Código de Procedimiento Penal debe mostrar listado de artículos y botón PDF.
- Biblioteca → Ley 1178, D.S. 23215, D.S. 23318-A, D.S. 26237, D.S. 29820, D.S. 29536 y CPE deben abrir su vista documental.
- Reglamento de Uniformes conserva bloques visuales y PDF original.
