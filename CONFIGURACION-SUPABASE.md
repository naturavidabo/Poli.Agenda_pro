# Supabase conectado — Agenda Policial v2.8.0

- Project ref: `lkwrulzrulmbfypwywmo`
- Bucket: `academic-files`
- Acceso académico: usuario asignado y contraseña asignada.
- La aplicación contiene únicamente URL y clave publicable.
- No contiene `service_role`, contraseña de base de datos ni claves secretas.
- El paquete público no contiene C.I. ni celulares reales; las credenciales se mantienen únicamente en Supabase.
- Las tablas internas del Banco de Preguntas y membresías no tienen acceso directo para `anon`/`authenticated`; el cliente opera mediante RPC con token de sesión.

## Estado

- Nómina Capitanes A cargada y separada de otros paralelos.
- 54 integrantes visibles para administración; los registros incompletos permanecen inactivos.
- La cuenta interna de mantenimiento está excluida de las listas visibles.
- Roles sincronizados mediante RPC.
- Horario Capitanes A sincronizado con 53 bloques y versión `2026-07-28-04`.
- Progreso individual de tareas preparado en `academic_task_progress`.
- La sesión válida permanece almacenada durante pérdidas temporales de red.

## Actualización

La migración de base correspondiente está en `supabase-v268-migration.sql`. Ya fue aplicada al proyecto conectado; el archivo se incluye como respaldo técnico.
