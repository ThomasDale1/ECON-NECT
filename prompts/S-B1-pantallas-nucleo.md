# S-B1 — Pantallas núcleo

**Carril B · 17:45–22:00 · Arranca cuando el andamio esté en `main`**

> Leé [AGENTS.md](../AGENTS.md) y **[ui-registry.md](../ui-registry.md) completo**
> antes de escribir un componente. La §1 (psicología del color) manda sobre
> cualquier preferencia estética.

---

## Objetivo

Lo que el jurado va a tocar. Construís contra `lib/tipos/canonico.ts` y
`lib/tipos/ejemplo.ts` — **no esperás a que el carril A termine los conectores.**

**Directorios tuyos:** `components/` · `app/(nect)/` · `app/globals.css`.
No toques nada más. Si necesitás un cambio en el contrato de tipos, **pedilo**.

---

## 0. Primero, los tokens de color

En `app/globals.css`, definir los tokens de [ui-registry §1](../ui-registry.md):

```
--veredicto-coherente      #059669   fondo #ECFDF5
--veredicto-atencion       #D97706   fondo #FFFBEB
--veredicto-riesgo         #DC2626   fondo #FEF2F2
--veredicto-sin-evidencia  #7C3AED   fondo #F5F3FF
--origen-prisma            #2563EB
--origen-startrack         #EA580C
```

**Dos reglas que no se negocian:**

1. **`SIN_EVIDENCIA` es violeta, nunca rojo.** `EN_RIESGO` significa *hay
   evidencia de riesgo*; `SIN_EVIDENCIA` significa *no hay evidencia suficiente
   para decidir*. Pintar la incertidumbre de rojo convierte "no sé" en "alarma",
   que es justo el error que el producto existe para evitar.
2. **El rojo está reservado para severidad.** La identidad de plataforma se dibuja
   con badge de contorno + punto de marca, **nunca con relleno de color**. Si
   Startrack fuera un badge rojo relleno, cada fila de la tabla parecería crítica.

## 1. Componentes base — construilos primero, se usan en todas las pantallas

| Componente | Qué hace |
|---|---|
| `BadgeVeredicto` | Ícono + texto + color. **Nunca solo color** (accesibilidad) |
| `BadgeOrigen` | Contorno + punto de marca. `Prisma (esperado)` / `Startrack (observado)` |
| `BarraConfianza` | Barra `h-1.5 w-12` + porcentaje en `font-mono`. Escala de ui-registry §1.3 |
| `VerOrigen` | Popover con el linaje: endpoint, campo, **valor crudo**, hora de lectura |
| `EstadoConObjeto` | Un estado + su etiqueta de qué objeto describe (recurso / tarea / falla) |

`VerOrigen` y `EstadoConObjeto` son los dos que ganan puntos. No los dejes para
el final.

## 2. Vista de flota — `app/(nect)/flota`

La tabla de todos los equipos. **Es por donde el jurado entra cuando le pidan
elegir un equipo al azar.**

Columnas: código · nombre · clase · proyecto · estado en Prisma · estado en
Startrack · **veredicto** · confianza · ubicación (con su nivel de cascada).

- Buscador por código y por nombre.
- Filtros: veredicto, proyecto, clase.
- **Nada hardcodeado.** Si el jurado pide un equipo cualquiera, tiene que estar.
- Cada fila lleva a la ficha unificada.

## 3. Ficha unificada — `app/(nect)/equipo/[id]` · **la pantalla que gana**

Orden de arriba hacia abajo. **El orden importa**: el veredicto se ve antes que
los campos crudos.

1. **Identidad** — código, nombre, clase, proyecto.
2. **Veredicto**, grande, con:
   - el nombre de la regla que lo produjo, en lenguaje de negocio;
   - la confianza;
   - **por qué**: la lista de hechos que lo dispararon.
3. **Prisma (esperado) | Startrack (observado)** — dos columnas lado a lado.
   ⚠ **Cada estado lleva su etiqueta de qué objeto describe.** Esto es lo que
   resuelve el Caso de Uso 02 de ECON: un recurso ocupado y una tarea completada
   **pueden ser ambos correctos** porque describen objetos distintos. Si las dos
   columnas no dicen qué describe cada estado, la pantalla no resuelve el caso.
4. **Solicitud y tarea de traslado** relacionadas, con sus fechas.
5. **Ubicación**, declarando qué nivel de la cascada está usando:
   *"Ubicación derivada de la geocerca del proyecto (nivel 3 de 3)."*
6. **Acción sugerida + rol responsable** (viene de la matriz de responsabilidades del carril C).

**Cada dato con su `VerOrigen`.** Es lo que hace auditable la afirmación de que no
inventamos nada — cuando el jurado sospeche, se lo demostramos en un clic.

## 4. Bandeja de incoherencias — `app/(nect)/incoherencias`

Toda la flota ordenada por severidad. Estructura en
[ui-registry §3.4](../ui-registry.md).

Columnas: Severidad · Activo / Clase · Proyecto · Prisma (esperado) ·
Startrack (observado) · Confianza · Acción sugerida · Responsable.

- Filtros por veredicto, proyecto y rol responsable.
- **Acción sugerida en lenguaje de negocio**, imperativo:
  ❌ `regla R02 disparada` → ✅ *"Validar disponibilidad antes de movilizar"*.
- **Dato ausente: `Sin registro`** en `text-muted-foreground`. Nunca celda vacía,
  nunca un cero inventado.

## 5. Los seis estados de interfaz — [ui-registry §4](../ui-registry.md)

No basta con "cargando" y "listo". **Los cuatro del medio son el diferenciador
del producto; un estado de error bien diseñado vale más puntos que una gráfica
más.**

- Cargando → skeleton, no spinner de pantalla completa.
- **Una fuente caída** → *"Datos de Prisma disponibles. Startrack no responde;
  interpretación suspendida."* + veredicto `SIN_EVIDENCIA`.
- **Dato viejo** → píldora ámbar con la hora de la última lectura buena.
- **Sin evidencia** → por qué no pudo concluir · qué dato falta · quién valida.
- **Campo sin equivalencia** → se muestra con su etiqueta, **no se oculta**.
- Sin excepciones → *"No hay incoherencias detectadas con la evidencia
  disponible."*

---

## Qué NO hacer

- ❌ **No recalcules reconciliación en el cliente.** La UI solo muestra. El
  veredicto viene del servidor.
- ❌ No ocultes los estados originales detrás del veredicto. Los tres se ven.
- ❌ No uses rojo para incertidumbre.
- ❌ No hardcodees un equipo de demo. El jurado va a pedir otro.
- ❌ No hagas el mapa ni los indicadores todavía. Eso es S-B2 y S-B3.
- ❌ No toques `lib/` ni `app/api/`.

## Terminado cuando

Se puede buscar **cualquier** equipo, abrir su ficha completa con el origen de
cada dato, y la bandeja muestra las incoherencias ordenadas por severidad con su
responsable.

Al terminar, **registrá cada componente en [ui-registry.md §6](../ui-registry.md)**
con el formato que ahí se indica.
