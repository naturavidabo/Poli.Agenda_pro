# Auditoría técnica — Agenda Policial v2.6.4

Fecha de estabilización: 27 de julio de 2026.

## Interfaz y navegación

- Barra inferior limitada a cinco opciones, sin segunda fila ni deformación de Biblioteca.
- Acceso académico separado en el encabezado.
- Botón flotante contextual: en el área online solo aparece para roles con permiso de publicación.
- Encabezado ajustado para pantallas angostas, con truncado controlado y sin desplazamiento horizontal visible.
- Panel online reorganizado con resumen de la jornada, agenda, accesos rápidos y actividad reciente.

## Área online

- Tablero con próxima formación, tareas pendientes, próximo examen y resúmenes recientes.
- Sección “Hoy y próximos días” ordenada cronológicamente.
- Agenda académica mensual para formaciones, vencimientos de tareas y exámenes.
- Filtros por estado en cada módulo.
- Vista general o agrupada por materia en Tareas, Exámenes y Resúmenes.
- Marcación personal de tareas cumplidas, almacenada por usuario y sin alterar el contenido oficial.
- Menú de publicación único para Exámenes, Formaciones, Tareas y Resúmenes.
- Panel de integrantes con búsqueda, filtro por rol, estado activo/inactivo y edición individual.

## Horario

- 53 bloques oficiales cargados.
- Hora mística y organización/control de lunes a viernes.
- Acondicionamiento físico el lunes de 14:00 a 16:00.
- Tiro policial el jueves de 14:00 a 16:00.
- Migración v2.6.4 conserva un historial local antes de sustituir un horario incorrecto.

## Nómina

- 54 integrantes identificados en el Paralelo A.
- 50 con credenciales completas y acceso activo.
- 4 pendientes de C.I. y celular, conservados como inactivos.
- Administrador general preasignado al registro N.º 17.
- Un celular de nueve dígitos queda marcado para revisión dentro de los datos preinstalados.

## Pruebas ejecutadas

- Sintaxis de `app.js` y `online.js` validada con Node.js.
- Lectura válida de todos los archivos JSON.
- Generación de vistas HTML del panel, módulos y agenda en un entorno aislado.
- Pruebas lógicas de filtros, agrupación por materia, resumen diario y calendario.
- Revisión visual móvil a 390 × 844 px.
- Conteo del repositorio por debajo del límite de 100 archivos.
- Verificación de la firma del horario oficial y de la nómina preinstalada.

## Actualización

La versión conserva IndexedDB, localStorage, activaciones, roles locales y publicaciones de la v2.6.3. El caché `agenda-policial-v2.6.4` sustituye los cachés antiguos de Agenda Policial sin borrar los datos del usuario.
