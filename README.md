# Agenda Policial v2.4.1

Versión correctiva de auditoría general.

## Cambios principales

- Corrección del sistema de actualización desde GitHub Pages.
- Service Worker con nueva caché `agenda-policial-v2.4.1`.
- `version.json`, `app.js`, `styles.css` e `index.html` se consultan por red primero para evitar quedarse en versiones antiguas.
- Botón **Buscar actualización desde GitHub** más confiable.
- Código de activación oculto.
- Conservación de datos locales durante actualización.
- Interfaz más pulida, institucional y menos plana.
- Bloc de notas corregido: los botones ya no quedan encima del texto.
- Auditoría de biblioteca, reglamentos e imágenes de uniformes.

## Publicación

1. Descomprimir el ZIP.
2. Subir/reemplazar los archivos en el repositorio `Poli.Agenda_pro`.
3. Confirmar el commit.
4. Esperar GitHub Pages.
5. Abrir la app.
6. Entrar a Configuración → **Buscar actualización desde GitHub**.
7. Si aparece aviso, pulsar **Actualizar**.
8. Cerrar y volver a abrir la app.

## Importante

No borrar la carpeta `assets/pages` si existe en el repositorio y contiene material visual adicional. Esta versión no debe borrar IndexedDB ni localStorage.

