---
name: imprint
description: Registrar un componente nuevo o modificado en ui-registry.md §6 al terminar una sesión de implementación de UI, reusando el baseline de §2 en vez de inventar clases.
---

# imprint

Se invoca al **terminar** una sesión de implementación que construyó o
modificó un componente en `apps/web/components/`.

## Antes de escribir el componente

1. Abrí `ui-registry.md` y leé las entradas de §6 **de su mismo tipo** (card,
   botón, input, tabla, badge, tile, overlay, formulario). Si ya existe un
   patrón para ese tipo, **reusá esas clases** — no inventes una variante
   nueva sin necesidad.
2. Revisá el baseline en §2 (radios, sombras, padding, variantes de `Button`,
   etc.) y las reglas de color en §1. La regla que no se negocia:
   **`SIN_EVIDENCIA` es violeta (`--veredicto-sin-evidencia`), nunca rojo.**

## Al terminar

Agregá al final de §6 una entrada con este formato exacto:

```markdown
### NombreDelComponente
File: apps/web/components/<carpeta>/<archivo>.tsx
Tipo: card | tabla | badge | tile | overlay | formulario
Clases: <las que usa del baseline §2>
Tokens de color: <cuáles de §1 y por qué>
Notas: <desviaciones del baseline y su justificación>
Registrado: <sprint> · <fecha>
```

No dejes el registro para "después" — es parte de terminar la tarea, no un
paso opcional.
