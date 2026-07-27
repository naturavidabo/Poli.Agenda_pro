# Configuración de Supabase — Agenda Policial v2.6.4

1. Crear un proyecto nuevo en Supabase.
2. Abrir SQL Editor y ejecutar `supabase-schema.sql`.
3. Ejecutar `supabase-roster-seed.sql` para cargar la nómina inicial.
4. En Storage, crear el bucket `academic-files`. Para la primera versión puede configurarse como público, porque `online.js` genera enlaces públicos de descarga.
5. En `online.js`, completar únicamente:

```js
const ONLINE_CFG = {
  url: 'https://SU-PROYECTO.supabase.co',
  anonKey: 'SU_CLAVE_PUBLICABLE_O_ANON',
  bucket: 'academic-files'
};
```

6. No copiar la clave secreta ni `service_role` al proyecto.
7. Publicar la carpeta en GitHub Pages y probar primero con la cuenta del administrador general.
8. Desde Integrantes y roles, asignar encargado de curso, administrador académico y asistentes.

El SQL incluye funciones para cerrar o reabrir el periodo académico. El cierre archiva publicaciones, desactiva a los usuarios no administradores y conserva la aplicación offline.
