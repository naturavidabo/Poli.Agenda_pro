# Agenda Policial v2.4.9

Versión correctiva enfocada en dos puntos:

1. Reloj/contador de la actividad actual.
2. Apertura de PDFs de la biblioteca normativa, especialmente el Reglamento de la Comisión Sumaria.

## Correcciones principales

- La tarjeta **Actividad actual** ya no muestra `Finalizado` mientras la clase sigue en curso.
- Durante una actividad actual muestra el tiempo restante hasta finalizar.
- La próxima actividad sigue mostrando el tiempo que falta para iniciar.
- Se incorporó el PDF del Reglamento de la Comisión Sumaria ESP-UNIPOL.
- Se revisaron las rutas de los demás PDFs de la biblioteca.
- Caché actualizado a v2.4.9.

## Instalación / actualización

Subir todo el contenido del ZIP al repositorio.

Abrir:

```text
index.html?v=2.4.9
```

Si aparece una versión anterior:

```text
reset.html
```

Luego volver a abrir:

```text
index.html?v=2.4.9
```

## Respaldo

Antes de actualizar una instalación con datos reales, se recomienda usar la opción de respaldo JSON desde Configuración.


## Versión 2.5.0
- Horario actualizado.
- Clave secundaria temporal 2026JINETES hasta 30/08/2026 para nuevas activaciones.
- Cinco normas incorporadas al catálogo.
- Optimización del repositorio: menos de 100 archivos.


## Versión 2.6.0 — Área Académica Online

- Acceso opcional mediante número de carnet y número de celular.
- Roles: administrador general, encargado de curso, administrador académico, asistentes académicos y lectores.
- Módulos online: Exámenes, Formaciones, Tareas y Resúmenes.
- Formaciones: tipo, fecha, lugar, hora de control, hora del parte, uniforme, comunicado, observaciones y archivo.
- Resúmenes: materia, tema, texto y archivo Word/PDF/imagen.
- Los usuarios no registrados conservan íntegramente el funcionamiento offline.
- Incluye `supabase-schema.sql`; para publicar el sistema real se deben completar URL y anon key en `online.js`, crear el bucket `academic-files` y cargar la nómina.
- Modo de prueba local: carnet `0000`, celular `0000`.
