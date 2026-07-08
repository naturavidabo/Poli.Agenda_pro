# PoliAgenda Pro v2.0.1 — corrección integral

PWA offline-first para biblioteca normativa, agenda académica/profesional y recordatorios.

## Cambios principales

- Interfaz reconstruida con enfoque **mobile-first** y una sola columna en celulares.
- Navegación inferior estable: **Inicio, Biblioteca, Académico/Profesional, Recordatorios y Más**.
- Modo académico activable/desactivable sin borrar la información.
- Formación del día: uniforme, arribo, formación, parte, lugar, enlace y observaciones.
- Horario de la ESP Sub Sede Sucre precargado con **58 bloques**, totalmente editable y con historial por parcial.
- Reglamento de Uniformes: **52 artículos**, búsqueda normalizada y referencias a las páginas visuales existentes.
- Reglamento Comisión Sumaria: **92 artículos completos**, sin textos provisionales.
- Accesos directos a faltas leves, graves, gravísimas, sanciones y prescripción.
- Búsqueda equivalente para `3B`, `3 B`, `3-B` y `N.º 3-B`.
- Recordatorios en fichas: guardar mensaje literal u organizarlo localmente; marcar cumplido, archivar y eliminar.
- Detección de rectificaciones, cambios de hora, lugar, suspensión y postergación.
- PWA instalable con iconos 192, 512 y maskable.
- Service Worker nuevo que elimina el caché defectuoso `poliagenda-pro-v1`.
- Respaldo/restauración JSON, conservando también los datos antiguos de portafolio y PIN aunque todavía no se muestren en esta fase.
- Compatibilidad con la base IndexedDB anterior `poliagenda-db`; se agregan identificadores a registros antiguos sin borrarlos.

## Publicar en el repositorio actual

Repositorio de destino: `Poli.Agenda_pro`.

1. Descarga y descomprime este ZIP en la computadora.
2. **No borres la carpeta existente `assets/pages/` del repositorio.** Contiene las 121 imágenes del reglamento y no viene duplicada en este paquete.
3. Reemplaza en la raíz del repositorio:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `manifest.webmanifest`
   - `sw.js`
   - `README.md`
   - `.nojekyll`
4. Sube o reemplaza las carpetas:
   - `data/`
   - `icons/`
   - Los archivos nuevos de `assets/`: `escudo-policia.png`, `horario-referencia.webp` y `reglamento-uniformes-2021.pdf`.
5. Confirma el cambio con un commit y espera a que GitHub Pages termine de publicar.

El paquete tiene pocos archivos. No es necesario volver a subir las 121 imágenes de `assets/pages/`, por lo que no aparece el problema de “más de 100 archivos”.

## Después de publicar

1. Abre la web con `?v=201`, por ejemplo: `.../Poli.Agenda_pro/?v=201`.
2. Espera unos segundos y recarga una vez.
3. Si Chrome todavía muestra el diseño anterior:
   - abre la información del sitio;
   - entra en **Configuración del sitio**;
   - pulsa **Borrar y restablecer**;
   - vuelve a abrir la página.
4. En la app entra en **Más** y pulsa **Instalar aplicación**.
5. La instalación inicial guarda la app y los textos. Para tener también las 121 imágenes y el PDF sin conexión, usa **Más → Imágenes y PDF sin conexión**.

## Seguridad de datos

Los horarios, formaciones, recordatorios y preferencias se guardan en IndexedDB. Actualizar los archivos del repositorio no debe borrar esos datos. Antes de cambios importantes usa **Más → Respaldo y restauración → Exportar**.

## Alcance de las pruebas

Se verificaron sintaxis JavaScript, integridad de JSON, secuencia de artículos, rutas locales, iconos, manifiesto, caché, normalización de búsqueda y análisis de comunicados. La instalación real en Chrome requiere publicar primero esta versión bajo HTTPS y realizar la validación final desde el teléfono.
