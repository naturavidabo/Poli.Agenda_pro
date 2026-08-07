# Agenda Policial v2.8.0

Aplicación PWA institucional con biblioteca normativa offline y área académica online opcional.

## Estabilización del horario

- Horario oficial Capitanes A incorporado dentro de la versión con 53 bloques.
- Hora mística únicamente el lunes de 06:45 a 07:15.
- Organización y control de martes a viernes en el mismo bloque.
- Los bloques de 11:50 a 12:35 están identificados como **HORARIO NO LECTIVO · NO SE PASAN CLASES**.
- Los bloques no lectivos no participan en próxima actividad, cuenta regresiva, cronología, alertas ni estado “en curso”.
- Migración selectiva mediante `appVersion`, `scheduleVersion` y `databaseVersion`; no borra tareas, sesión, perfil, activación ni configuraciones.

## Interfaz

- Colores sobrios y constantes por materia en horario, tareas y cronología.
- Cronología separada por HOY, MAÑANA y fecha completa.
- Barra inferior estable con Inicio, Formación, Tareas, Horario y Biblioteca.
- Selector **Elige tu horario**, preparado para habilitar otros cursos o paralelos.

## Área académica online

- Formaciones, Tareas, Exámenes y Resúmenes.
- Tareas con vista general o por materia, docente, contadores reales y estados Pendiente, Urgente, Entregada, Vencida y Sin tareas.
- Sesión persistente: una pérdida temporal de internet no envía al formulario de acceso.
- Los roles y publicaciones se sincronizan mediante Supabase.
- Las credenciales internas de mantenimiento no se muestran en la interfaz ni en la lista de integrantes.

## Roles

- Administrador general.
- Encargado de curso.
- Administrador académico.
- Asistente académico.
- Lector.

## Datos protegidos

La actualización conserva:

- activación principal `271261`;
- clave secundaria `2026JINETES` con su lógica vigente;
- biblioteca, reglamentos y leyes;
- datos personales locales;
- tareas y configuraciones;
- sesión académica válida.

## Supabase

Proyecto conectado: `lkwrulzrulmbfypwywmo`.

La aplicación utiliza solo la URL y la clave publicable. Nunca debe incorporarse una clave secreta o `service_role` al repositorio.

El archivo `supabase-v268-migration.sql` documenta las modificaciones de esta versión.

## Publicación

El proyecto se mantiene por debajo de 100 archivos y puede publicarse en GitHub Pages. Se debe subir el contenido de la carpeta raíz del ZIP, conservando la estructura de archivos.


## v2.8.0 — estabilización y seguridad

- El Banco de Preguntas se opera por RPC; sus tablas internas no quedan expuestas directamente al cliente.
- La nómina estática del paquete no contiene C.I., celulares ni roles reales. Esos datos se administran desde la aplicación y se guardan en Supabase.
- El administrador general ve indicadores de adopción online: verde (ya ingresó), amarillo (sin ingreso) y gris (datos incompletos), además de primer/último ingreso y cantidad de accesos.
- El formato CSV del Banco de Preguntas se mantiene: `pregunta;A;B;C;D;correcta;explicacion`.
- La actualización PWA exige que los archivos esenciales estén completos antes de reemplazar la versión estable anterior.
