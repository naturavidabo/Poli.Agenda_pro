# Agenda Policial v2.12.0

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

Los archivos `supabase-v290-migration.sql` y `supabase-v210-migration.sql` documentan las migraciones acumulativas recientes.

## Publicación

El proyecto se mantiene por debajo de 100 archivos y puede publicarse en GitHub Pages. Se debe subir el contenido de la carpeta raíz del ZIP, conservando la estructura de archivos.




## v2.10.0 — Banco de Preguntas Mixto

- Un mismo banco puede combinar **Selección múltiple**, **Verdadero/Falso**, **Relacionar conceptos** y **Completar concepto**.
- Los bancos y preguntas A-B-C-D existentes continúan funcionando sin recarga ni conversión manual.
- En intentos aleatorios, si existen varios tipos, se incluye al menos una pregunta de cada modalidad disponible y el resto se completa al azar.
- Modo Estudio muestra corrección y explicación después de responder; Simulacro mantiene la solución oculta hasta finalizar.
- Completar concepto ignora diferencias de mayúsculas, minúsculas y tildes y admite varias respuestas válidas.
- Relacionar conceptos mezcla las correspondencias y evita reutilizar una misma opción.
- Nueva plantilla CSV mixta; la plantilla CSV histórica sigue siendo compatible como selección múltiple.
- La importación muestra detectadas, cargadas y rechazadas.

## v2.9.0 — Lector académico DOCX/PDF

- Lectura interna de archivos Word `.docx` y PDF desde el modo online.
- PDF con vista de página integrada y navegación página anterior/siguiente.
- Extracción de texto para lectura cómoda y lectura en voz alta mediante el motor del dispositivo.
- Controles de pausa/continuación, anterior/siguiente, velocidad y tamaño de texto.
- Detección de PDF escaneado: mantiene la vista interna y avisa cuando no existe texto suficiente para voz.
- Se mantiene siempre la opción **Abrir archivo original**.
- Pulido visual del modo online sin cambiar la ubicación de sus módulos.

## v2.8.1 — estabilización y seguridad

- El Banco de Preguntas se opera por RPC; sus tablas internas no quedan expuestas directamente al cliente.
- La nómina estática del paquete no contiene C.I., celulares ni roles reales. Esos datos se administran desde la aplicación y se guardan en Supabase.
- El administrador general ve indicadores de adopción online: verde (ya ingresó), amarillo (sin ingreso) y gris (datos incompletos), además de primer/último ingreso y cantidad de accesos.
- El formato CSV del Banco de Preguntas se mantiene: `pregunta;A;B;C;D;correcta;explicacion`.
- La actualización PWA exige que los archivos esenciales estén completos antes de reemplazar la versión estable anterior.


## v2.12.0 — Mezcla automática
Los bancos históricos A/B/C/D pueden generar automáticamente intentos mixtos sin duplicar preguntas. Para un intento de 20 preguntas la distribución objetivo es 10 selección múltiple, 4 Verdadero/Falso, 4 Completar y 2 Relacionar. Los bancos que ya contienen preguntas mixtas creadas manualmente conservan su lógica nativa.

## v2.12.0 — Visualizador académico y navegación completa
- Menú online en cuadrícula: Panel, Formaciones, Tareas, Exámenes, Banco y Material siempre visibles sin desplazamiento horizontal; Nómina/Cursos se añaden según permisos.
- Documentos DOCX/PDF con tres acciones: Leer y escuchar, Ver documento y Descargar.
- Visualizador DOCX dentro de Agenda Policial mediante docx-preview 0.4.0 (cargado solo cuando se usa), sin alterar el archivo original.
- Lector DOCX mejorado con títulos, subtítulos, listas, tablas, negritas/cursivas compatibles y resaltado durante la voz.
- Continuidad de lectura local por documento.
- Administración del Banco: acción segura Archivar banco para retirar bancos incorrectos/obsoletos del curso.
- No se modifican activación, credenciales, sesiones, cursos ni la base local de la app.
