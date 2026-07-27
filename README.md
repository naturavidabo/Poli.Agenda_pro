# Agenda Policial v2.6.4

Aplicación PWA de consulta normativa offline y apoyo académico con un área online opcional.

## Pulido del área online

- Panel académico con resumen de la jornada, próximas actividades y publicaciones recientes.
- Tarjetas de acceso rápido para Exámenes, Formaciones, Tareas y Resúmenes.
- Agenda académica mensual que reúne formaciones, vencimientos de tareas y exámenes.
- Filtros por estado: próximas, pendientes, urgentes, completadas, recientes y realizadas.
- Vista general o agrupada por materia en Tareas, Exámenes y Resúmenes.
- Marcación personal de tareas cumplidas sin modificar la publicación oficial.
- Botón de publicación exclusivo para roles autorizados.
- Estado visible de conexión y diseño institucional refinado.

## Base estabilizada

- Horario oficial del Curso de Capacitación Policial, Capitanes A, segundo semestre 2026, con 53 bloques.
- Barra inferior estable con cinco accesos: Inicio, Formación, Tareas, Horario y Biblioteca.
- Acceso académico ubicado en el encabezado y separado de la experiencia offline.
- Biblioteca normativa con PDF locales y textos estructurados.
- Service Worker y caché actualizados a la versión 2.6.4.

## Nómina académica preinstalada

- 54 integrantes identificados.
- 50 registros con C.I. y celular habilitados.
- 4 integrantes permanecen inactivos hasta completar C.I. y celular.
- La cuenta de Mauro Cristhian Espinoza Rivera queda como administrador general.
- Los demás integrantes empiezan como lectores.
- Acceso: usuario = C.I.; contraseña = número de celular.

## Roles

- Administrador general.
- Encargado de curso.
- Administrador académico.
- Asistente académico.
- Lector.

El administrador general asigna los roles desde **Integrantes y funciones**.

## Área académica

- Exámenes.
- Formaciones: formación general o servicio extraordinario, fecha, lugar, hora de control, hora del parte, uniforme, comunicado, observaciones y archivo opcional.
- Tareas con seguimiento personal de cumplimiento.
- Resúmenes con materia, tema, texto y archivo Word, PDF o imagen.

Sin Supabase, la nómina y las pruebas funcionan localmente en cada dispositivo. Para sincronizar publicaciones, roles y accesos entre celulares, ejecutar `supabase-schema.sql`, luego `supabase-roster-seed.sql`, crear el bucket `academic-files` y completar `ONLINE_CFG` en `online.js`.

## Publicación

El proyecto mantiene menos de 100 archivos y puede publicarse en GitHub Pages. No colocar claves secretas ni `service_role` dentro del repositorio.
