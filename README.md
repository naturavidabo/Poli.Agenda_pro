# PoliAgenda Pro v2.2.0

Aplicación PWA académica y profesional para consulta normativa, organización de horarios, formaciones, actividades, tareas, notas y consignas.

## Publicación en el repositorio actual

Repositorio previsto: `naturavidabo/Poli.Agenda_pro`

1. Descomprime el ZIP.
2. En el repositorio actual, reemplaza los archivos anteriores por el contenido de esta carpeta.
3. No subas el ZIP: sube sus archivos y carpetas.
4. Confirma que GitHub Pages use la rama `main` y la carpeta `/root`.
5. Espera a que finalice el flujo de Pages y abre:
   `https://naturavidabo.github.io/Poli.Agenda_pro/`
6. En la primera apertura usa el código local de activación `271261`.

El paquete contiene 54 archivos y cada archivo individual está por debajo del límite de 100 MB de GitHub.

## Cambios principales

- Biblioteca ampliada a 11 documentos normativos.
- Activación local y offline.
- Modos Académico y Profesional sin borrar información al alternar.
- Tareas con subtareas compactas y marcado real.
- Notas libres editables.
- Consignas permanentes en sección propia.
- Notificaciones y mensajes originales conservados.
- Ficha Kardex voluntaria, vacía por defecto, con importación desde texto.
- Fotografía de horario reemplazable, giratoria y eliminable.
- Reconocimiento del horario con revisión obligatoria antes de guardar.
- Opción de reemplazar el horario vigente o crear un nuevo horario/parcial.
- Imagen principal antes del texto en las fichas de uniformes.
- Respaldo integral, autoguardado y actualización desde GitHub.

## Biblioteca normativa

Incluye:

1. Reglamento de Uniformes de la Policía Boliviana.
2. Reglamento de la Comisión Sumaria ESP–UNIPOL.
3. Constitución Política del Estado.
4. Ley N.º 1178 SAFCO.
5. D.S. N.º 23215.
6. D.S. N.º 23318-A.
7. D.S. N.º 26237.
8. D.S. N.º 29820.
9. D.S. N.º 29536.
10. Código Penal.
11. Código de Procedimiento Penal.

Los PDF institucionales quedan disponibles como respaldo documental. El Código Penal y el Código de Procedimiento Penal se identifican dentro de la app como compilaciones institucionales base y muestran una advertencia para verificar modificaciones posteriores antes de utilizarlos en una actuación formal.

## Reconocimiento de horario desde fotografía

La app ofrece tres caminos:

1. `TextDetector` del dispositivo, cuando el navegador lo admita.
2. Tesseract.js, descargado en línea al iniciar el reconocimiento en navegadores compatibles.
3. Pegar o corregir manualmente el texto reconocido.

El funcionamiento general de PoliAgenda sigue siendo offline. En algunos dispositivos, el primer reconocimiento OCR puede requerir internet para cargar el motor Tesseract. La fotografía, el texto reconocido y el horario revisado se guardan localmente.

## Datos y seguridad

- Los datos personales no vienen precargados.
- Horarios, tareas, notas, consignas, actividades, Kardex y fotografía se almacenan en IndexedDB.
- El código de activación es una restricción local; no permite revocación remota.
- El respaldo JSON incluye todos los datos creados por el usuario.
- Conviene exportar un respaldo cada siete días y antes de borrar datos del navegador.

## Actualización

La app consulta `version.json` cuando existe conexión. Si detecta una versión nueva, muestra un aviso y permite actualizar y reiniciar. También existe un botón manual en Configuración.

Después de publicar esta versión, conviene borrar el caché del sitio una sola vez si el teléfono continúa mostrando una interfaz antigua:

- Chrome → Configuración → Configuración de sitios → `naturavidabo.github.io` → Borrar datos.
- Abrir de nuevo el enlace e instalar la app.

## Pruebas pendientes después de publicar

Las siguientes comprobaciones requieren la URL HTTPS ya actualizada:

- Instalación final como PWA en Android.
- Agregar a pantalla de inicio desde Safari en iPhone.
- Cambio real del Service Worker desde una versión publicada anterior.
- Reconocimiento OCR en los modelos concretos de teléfonos que utilizarán la app.
