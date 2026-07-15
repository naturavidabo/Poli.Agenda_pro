# Auditoría técnica - Agenda Policial v2.4.9

## Correcciones aplicadas

### 1. Reloj de actividad actual
- Se corrigió el contador de la tarjeta **Actividad actual**.
- Antes calculaba el tiempo contra la hora de inicio de la clase; por eso, durante una clase en curso, podía mostrar **Finalizado**.
- Ahora, si la actividad está en curso, calcula contra la hora de finalización y muestra:
  - `Finaliza en X min`
  - `Finaliza en X h Y min`
- La próxima actividad mantiene el cálculo contra la hora de inicio: `Faltan X min`.

### 2. Fecha y hora local
- Se mantiene el cálculo con fecha local del dispositivo.
- La agenda recurrente semanal se ordena por día local y hora local.
- Se revisaron las funciones de actividad actual, próxima actividad y cronología.

### 3. Biblioteca normativa y PDFs
- Se incorporó el PDF del **Reglamento de la Comisión Sumaria ESP-UNIPOL** como archivo local.
- El documento Sumario ahora muestra botón **Ver documento original PDF**.
- Se revisó el catálogo completo de PDFs.

## Verificación de PDFs

| Documento | PDF | Verificación |
|---|---|---|
| Reglamento de Uniformes | assets/reglamento-uniformes-2021.pdf | OK |
| Reglamento Comisión Sumaria | assets/reglamento-comision-sumaria-unipol.pdf | OK |
| Constitución Política del Estado | assets/cpe.pdf | OK |
| Ley 1178 / D.S. 23215 | assets/ley-1178-ds-23215.pdf | OK |
| D.S. 23318-A | assets/ds-23318-a.pdf | OK |
| D.S. 26237 | assets/ds-26237.pdf | OK |
| D.S. 29820 | assets/ds-29820.pdf | OK |
| D.S. 29536 | assets/ds-29536.pdf | OK |
| Código Penal / Procedimiento Penal | assets/codigo-penal-procedimiento-penal.pdf | OK |

## Pruebas realizadas

- `node --check app.js`: OK.
- `node --check sw.js`: OK.
- `version.json`: actualizado a 2.4.9.
- Service Worker: caché actualizado a `agenda-policial-v2.4.9`.
- PDF Sumario renderizado: 11 páginas, primera página verificada visualmente.
- Catálogo PDF: rutas existentes y archivos no vacíos.

## Observación

Para que el celular deje de mostrar una versión anterior, después de subir esta versión al repositorio se recomienda abrir `reset.html` una vez y luego ingresar con `index.html?v=2.4.9`.
