# PoliAgenda Pro v2.1.0

Actualización estructural para la aplicación publicada en:

`https://naturavidabo.github.io/Poli.Agenda_pro/`

## Importante antes de subir

Este paquete contiene menos de 100 archivos para facilitar la actualización desde GitHub. **No elimines la carpeta existente `assets/pages/` del repositorio**, porque contiene las 121 páginas visuales del Reglamento de Uniformes.

Puedes reemplazar los demás archivos y carpetas con los de este ZIP. La carpeta `assets/pages/` debe permanecer tal como está.

## Cambios principales

- Activación local/offline con el código `271261`.
- El código se solicita solo en la primera instalación o después de borrar los datos del sitio.
- Selección inicial entre modo Académico y Profesional.
- Navegación: Inicio, Académica/Profesional, Formaciones, Biblioteca y Pendientes.
- Botón flotante para crear notas, pendientes, actividades o pegar mensajes.
- Actividades con varias horas: arribo, formación, parte, inicio o final.
- Calendario vinculado con actividades y pendientes.
- Notas activas/resueltas; al resolver se archivan y pueden consultarse en Anteriores.
- Pendientes vencidos resaltados sin borrarse.
- Mensaje WhatsApp inteligente con tres títulos sugeridos.
- Horario semanal con actividad en curso, próxima y finalizadas.
- Perfil voluntario sin protección adicional.
- Recordatorio de respaldo cada 7 días.
- Comprobación automática de actualización y botón manual.
- Vistas recortadas y validadas para 3-A, 3-A Tropical, 3-B, 3-B Tropical, 4 y 4 Tropical.

## Cómo actualizar el repositorio

1. Descarga y descomprime el ZIP.
2. Abre el repositorio `Poli.Agenda_pro`.
3. Sube el contenido descomprimido a la raíz del repositorio.
4. Acepta el reemplazo de archivos con el mismo nombre.
5. Conserva la carpeta existente `assets/pages/`.
6. Confirma el cambio con **Commit changes**.
7. Espera entre 2 y 10 minutos para que GitHub Pages publique la actualización.
8. Abre la aplicación y pulsa **Configuración → Buscar actualización** si el navegador conserva la versión anterior.

## Primera apertura

1. Ingresa el código `271261`.
2. Selecciona modo Académico o Profesional.
3. El horario académico de referencia se carga automáticamente si eliges el modo Académico.

## Datos locales

Los datos se guardan en IndexedDB. Una actualización normal de GitHub no debe borrarlos. Borrar los datos del sitio, desinstalar limpiando almacenamiento o usar herramientas de limpieza del navegador puede eliminarlos. Por eso la aplicación recuerda realizar un respaldo cada 7 días.

## Nota sobre instalación PWA

La instalación completa debe validarse después de publicar bajo HTTPS en GitHub Pages. El paquete incluye manifest, tres iconos y Service Worker. Si Chrome conserva un Service Worker anterior, usa el botón **Buscar actualización** y luego **Actualizar y reiniciar**.
