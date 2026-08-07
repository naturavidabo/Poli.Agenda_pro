# Auditoría técnica — Agenda Policial v2.8.0

Fecha de estabilización: 7 de agosto de 2026.

## Objetivo de la versión

La v2.8.0 prioriza estabilización, seguridad, compatibilidad y despliegue. No modifica la lógica principal de activación, el formato de los bancos de preguntas ni la información académica ya existente.

## Seguridad y datos

- Las tablas internas del Banco de Preguntas y membresías tienen RLS habilitado y no admiten acceso directo de los roles públicos de la API.
- El acceso a esas funciones se realiza mediante RPC que valida sesión, curso y rol.
- La nómina incluida en el paquete público conserva únicamente datos no sensibles necesarios para la interfaz: no contiene C.I., celulares ni credenciales activas.
- Los C.I., celulares y roles reales permanecen administrados en Supabase.
- Se agregaron validaciones para evitar C.I. y celulares duplicados al crear o editar integrantes.
- Las funciones internas usadas como disparadores no quedan expuestas como acciones directas del cliente.

## Administración de integrantes

- El administrador general puede completar o corregir C.I. y celular directamente desde la aplicación.
- El listado distingue el uso del panel online mediante indicadores:
  - verde: ya realizó al menos un ingreso;
  - amarillo: tiene acceso preparado, pero nunca ingresó;
  - gris: faltan datos para habilitar el acceso.
- El panel muestra total de integrantes, cantidad y porcentaje que ya ingresó, personas sin ingreso y registros incompletos.
- En la ficha individual se muestran primer ingreso, último ingreso y cantidad de accesos registrados.

## Banco de Preguntas

- Se conserva el formato CSV compatible: `pregunta;A;B;C;D;correcta;explicacion`.
- Se mantiene compatibilidad con bancos e intentos creados en v2.7.9.
- Las respuestas correctas no se incluyen en la carga inicial de una evaluación.
- Si una importación supera 500 preguntas, la aplicación informa antes de limitar la carga a las primeras 500.

## Actualización y PWA

- Service Worker renovado con caché `agenda-policial-v2.8.0`.
- Los archivos esenciales se validan como conjunto: si falla uno, la nueva versión no completa su instalación.
- Los archivos complementarios se almacenan sin impedir la instalación cuando uno opcional no está disponible.
- Los archivos principales usan estrategia de red primero para reducir el riesgo de conservar una versión antigua después de una actualización.
- El restablecimiento total también elimina sesiones y cachés académicos locales, pero no borra información remota de Supabase.
- La restauración de respaldos JSON realiza validación básica y conserva valores predeterminados compatibles.

## Pruebas ejecutadas

- Sintaxis de `app.js`, `online.js` y `sw.js` validada con Node.js.
- `version.json`, `manifest.webmanifest` y la nómina pública validados como JSON.
- Todos los archivos obligatorios y opcionales declarados en el Service Worker existen en el paquete.
- La nómina pública contiene 0 C.I. y 0 celulares.
- Comparación contra las credenciales del paquete anterior: 0 coincidencias dentro de los archivos públicos de v2.8.0.
- Revisión de las RPC v2.8.0 contra Supabase y comprobación de métricas de acceso.
- Conteo final del paquete por debajo del límite de 100 archivos.
- Compatibilidad conservada con las RPC anteriores durante la transición desde v2.7.9.

## Nota de arquitectura

La aplicación continúa utilizando su sistema de sesión académica por token mediante RPC para conservar compatibilidad. Las tablas sensibles están cerradas al acceso directo; las operaciones autorizadas se realizan únicamente mediante las funciones previstas por la aplicación.
