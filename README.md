# Agenda Policial v2.6.1

Aplicación PWA de consulta normativa y apoyo académico.

## Cambios de estabilización

- Barra inferior corregida y limitada a cinco accesos: Inicio, Formación, Tareas, Horario y Biblioteca.
- Acceso al Área Académica Online trasladado al encabezado principal.
- Eliminación de la búsqueda general imprecisa del encabezado; la Biblioteca conserva su buscador contextual.
- Leyes N.º 777, N.º 101, Ley Orgánica de la Policía Nacional, N.º 004 y N.º 348 incorporadas como PDF local y texto estructurado para búsqueda.
- Apertura prioritaria de documentos locales; no depende de enlaces externos para estas normas.
- Service Worker y caché actualizados a la versión 2.6.1.
- Compatible con actualización sobre versiones anteriores sin eliminar los datos guardados en IndexedDB.

## Área académica online

La interfaz y la estructura base están preparadas. La conexión real requiere configurar el proyecto Supabase, ejecutar `supabase-schema.sql`, colocar la URL y la clave publicable, y cargar la nómina académica.

## Publicación

El contenido del directorio puede publicarse en GitHub Pages. No se deben exponer claves secretas de Supabase ni la clave `service_role`.
