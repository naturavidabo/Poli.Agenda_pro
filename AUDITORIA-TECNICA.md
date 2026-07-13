# AUDITORÍA TÉCNICA – Agenda Policial v2.3.1

Corrección puntual sobre v2.3.0 por reporte del usuario.

## Validaciones realizadas

- JavaScript validado con `node --check`.
- Activación: campo protegido tipo password y persistencia adicional en `localStorage`.
- Service Worker actualizado a caché `agenda-policial-v2.3.1`.
- Búsqueda de uniformes verificada y reordenada por relevancia.
- `3A`, `3-A` y `uniforme 3A` muestran primero el Artículo 41.
- `3B` y `3-B` muestran primero el Artículo 43.
- `03 B Tropical` muestra primero el Artículo 44.
- Artículos de uniformes muestran imagen principal y bloque visual del artículo cuando existen.
- En el detalle del artículo se restauró el botón **Ver PDF original** con salto a página cuando corresponde.
- Se comprobó existencia de todas las imágenes referenciadas en `imagen_principal` e `imagenes_bloque`.

## Resultado de búsqueda probado

```json
{
  "3A": [
    [
      "Artículo 41",
      "Uniforme N° 3-A",
      340
    ],
    [
      "Artículo 42",
      "Uniforme N° 3-A (Tropical)",
      305
    ],
    [
      "Artículo 30",
      "Botines Y Zapatos",
      165
    ],
    [
      "Artículo 27",
      "Camisa Policial",
      165
    ],
    [
      "Artículo 23",
      "Capa",
      165
    ]
  ],
  "3-A": [
    [
      "Artículo 41",
      "Uniforme N° 3-A",
      340
    ],
    [
      "Artículo 42",
      "Uniforme N° 3-A (Tropical)",
      305
    ],
    [
      "Artículo 30",
      "Botines Y Zapatos",
      165
    ],
    [
      "Artículo 27",
      "Camisa Policial",
      165
    ],
    [
      "Artículo 23",
      "Capa",
      165
    ]
  ],
  "uniforme 3A": [
    [
      "Artículo 41",
      "Uniforme N° 3-A",
      215
    ],
    [
      "Artículo 30",
      "Botines Y Zapatos",
      140
    ],
    [
      "Artículo 27",
      "Camisa Policial",
      140
    ],
    [
      "Artículo 23",
      "Capa",
      140
    ],
    [
      "Artículo 21",
      "Capote",
      140
    ]
  ],
  "03 A tropical": [
    [
      "Artículo 42",
      "Uniforme N° 3-A (Tropical)",
      145
    ],
    [
      "Artículo 46",
      "Uniforme N° 4 (Tropical)",
      145
    ],
    [
      "Artículo 35",
      "Clasificación De Los Uniformes",
      140
    ]
  ],
  "3B": [
    [
      "Artículo 43",
      "Uniforme N° 3-B",
      315
    ],
    [
      "Artículo 44",
      "Uniforme N° 3-B (Tropical)",
      305
    ],
    [
      "Artículo 36",
      "Uniforme N° 1-A Y 1-A (Táctico)",
      170
    ],
    [
      "Artículo 37",
      "Uniforme N° 1-B",
      170
    ],
    [
      "Artículo 50",
      "Uniforme N° 7 (De Sociedad)",
      170
    ]
  ],
  "3-B": [
    [
      "Artículo 43",
      "Uniforme N° 3-B",
      315
    ],
    [
      "Artículo 44",
      "Uniforme N° 3-B (Tropical)",
      305
    ],
    [
      "Artículo 36",
      "Uniforme N° 1-A Y 1-A (Táctico)",
      170
    ],
    [
      "Artículo 37",
      "Uniforme N° 1-B",
      170
    ],
    [
      "Artículo 50",
      "Uniforme N° 7 (De Sociedad)",
      170
    ]
  ],
  "03 B Tropical": [
    [
      "Artículo 44",
      "Uniforme N° 3-B (Tropical)",
      215
    ],
    [
      "Artículo 46",
      "Uniforme N° 4 (Tropical)",
      145
    ],
    [
      "Artículo 35",
      "Clasificación De Los Uniformes",
      140
    ],
    [
      "Artículo 14",
      "Marbetes",
      140
    ]
  ]
}
```

## Alcance

Esta versión corrige lo más urgente detectado en Biblioteca y Activación. La automatización avanzada del horario por imagen queda para la siguiente fase.
