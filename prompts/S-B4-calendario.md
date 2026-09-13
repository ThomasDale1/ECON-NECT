# S-B4 — Calendario de planeación (timeline por máquina)

> ⚠ **Reemplazado en parte por [S-A10](S-A10-replaneacion.md) (13 sep. 2026,
> 01:50 CST).**
> - Ya no rigen: las clases sensibles y la alerta de lluvia, la comparación con
>   la asignación manual, los rótulos de holgura y continuidad, ni el panel
>   lateral del día.
> - Se agregan: KPIs arriba de todo, vista Día (00:00–24:00), replan automático
>   cada 60 s con aviso de cambios, y la pila con rating y horas de operador.
>
> Donde este archivo contradiga a S-A10, manda S-A10.

**Carril B · fase extendida, priorizada tras S-C2 ([AGENTS.md §12.1](../AGENTS.md))**
**Depende de:** el contrato `lib/optimizador/tipos.ts` (S-A7, Paso 1) para
arrancar, y de la ruta `POST /api/optimizar` (S-A7) para ver datos.

> Leé [AGENTS.md](../AGENTS.md), **[ui-registry.md](../ui-registry.md) completo**
> y el contrato `lib/optimizador/tipos.ts` antes de escribir un componente. La
> §1 del registro (el color significa severidad del veredicto, y nada más) manda
> sobre cualquier preferencia estética.
>
> Skills: `shadcn` para componentes, `dataviz` para los tiles, `imprint` al
> terminar y `run` para probar en vivo antes de reportar.

---

## Objetivo

La pantalla donde Logística ve la **propuesta del optimizador sobre las máquinas
reales**. Ahí puede:
- reordenar qué se protege primero;
- marcar qué clases son sensibles a la lluvia;
- ver **por qué** una solicitud no se puede cubrir.

**Solo muestra. No calcula nada y no escribe nada.**

**Directorios tuyos:**
- `components/calendario/` (nuevo) y `app/(nect)/planeacion/` (nuevo).
- `components/nect/`, si hace falta un `VerOrigen` reutilizable.
- `components/comando/barra-lateral.tsx`, **solo** para agregar el ítem de
  navegación.
- `components/ui/`, para componentes de shadcn.

**No toques** `lib/`, `app/api/` ni `package.json`.

---

## Decisiones tomadas en planeación — no se renegocian

| Tema | Decisión |
|---|---|
| **Datos** | **Solo en vivo**, desde `POST /api/optimizar`. **Sin datos de ejemplo ni fixtures.** Mientras A no entregue la ruta, construís contra los tipos; la verificación visual se hace con la ruta real |
| **Vista** | Timeline estilo Notion: **filas por máquina, columnas por día**. Arriba, un carril *"Sin asignación posible"* |
| **Confirmación** | **Solo propuesta.** Aviso fijo: *"Propuesta del optimizador — no se escribe nada en Prisma ni Startrack."* **Sin botón de aceptar** |
| **Pila** | Reordenable con **@dnd-kit + botones ↑↓**. La cobertura no se reordena: siempre va primero |
| **Clima** | Alerta en la tarjeta. **No mueve nada.** Las clases sensibles las marca el usuario |
| **Operador** | Solo `cod_trabajador` (el nombre ni siquiera llega) |
| **Moneda** | USD, con la nota *"moneda inferida — la operación es en El Salvador; Prisma no la declara"* |
| **KPIs** | Tiles de S-C4 **en esta misma página** |

> Si `@dnd-kit` todavía no está en el `package.json` de tu rama, empezá con los
> botones ↑↓ y agregá el arrastre cuando A lo mergee. **No lo instales vos.** Si
> el CLI de shadcn intenta modificar `package.json` al agregar un componente,
> detenete y pedíselo a A.

---

## 1. Ruta — `app/(nect)/planeacion/page.tsx`

- Server component con `metadata`. Título: *"Planeación de maquinaria"*.
  Renderiza el cliente `<Planeador />`.
- La hora de lectura que muestre `BarraSuperior` sale de
  `respuesta.generadoEn`. **Nunca una hora fija.**
- En `BarraLateral`: ítem **"Planeación"** (ícono `CalendarRange` de lucide) →
  `/planeacion`. No refactorices la lógica de ítem activo.

## 2. `components/calendario/planeador.tsx` (`'use client'`)

- **Estado:**
  - `pila`: orden inicial = `SOFT_CONSTRAINTS`, todas incluidas.
  - `clasesSensiblesLluvia`: vacío al inicio. No se presupone ninguna.
  - `respuesta` y `estadoDeCarga`.
- Llama a `POST /api/optimizar` **al montar** y con el botón **"Re-optimizar"**.
  No llama en cada arrastre. Si la pila o las clases cambiaron desde la última
  corrida, muestra *"Hay cambios sin aplicar"*.
- Compone: aviso fijo de solo propuesta · pila · clases sensibles · resumen de
  niveles · timeline · tiles de KPI · avisos.

## 3. `pila-prioridades.tsx`

- Lista numerada 1…n. Subtítulo visible: **"Más arriba se protege primero"**.
  Pista: *"una prioridad de abajo nunca empeora a una de arriba"*.
- Nota fija encima de la lista, fuera de ella: **"Siempre primero: cubrir la
  mayor cantidad de solicitudes posible."**
- Cada ítem lleva: nombre de negocio con unidad, casilla **incluir** (desmarcarla
  la saca de la pila), botones ↑↓, asa de arrastre y `aria-label` en cada
  control.

  | Id | Rótulo |
  |---|---|
  | `distancia` | Distancia al proyecto (km, en línea recta) |
  | `tarifa` | Tarifa efectiva (USD/h, moneda inferida) |
  | `continuidadOperador` | Operador que ya conoce la máquina |
  | `holgura` | Holgura antes del inicio (días) |

## 4. `clases-sensibles-lluvia.tsx`

- Una casilla por clase de `CATALOGO_CLASE_EQUIPO`, importada de
  `lib/canonico/catalogos.ts`. No escribas la lista a mano.
- Etiqueta visible: **"Criterio del planificador — no viene de Prisma ni
  Startrack."** Debajo: *"Día de lluvia: probabilidad máxima ≥ 50 % (Open-Meteo,
  16 días)."*

## 5. `timeline-maquinas.tsx`

- **Columnas:** un día desde `respuesta.horizonte.desde` hasta `hasta`,
  inclusive. La cabecera muestra día y día de semana, con "hoy" marcado. Scroll
  horizontal dentro de `overflow-x-auto rounded-xl border border-border`
  (ui-registry §2).
- **Carril superior "Sin asignación posible"** (solo si hay casos):
  - Una barra por solicitud sobre su período efectivo, con estilo **neutro**:
    borde discontinuo, `bg-muted` e ícono (`Ban` o `CircleSlash`).
  - Texto: clase · código de proyecto · **motivo**.
  - **Nunca rojo:** no es evidencia de riesgo, es un hecho de planeación. Tampoco
    violeta: ese color es exclusivo del veredicto `SIN_EVIDENCIA`.
- **Excluidas** (período vencido): una lista plegable con conteo y motivo, debajo
  del timeline.
- **Filas por máquina:** todas las de `respuesta.maquinas`.
  - Etiqueta: `codigoActivo` + clase.
  - Si `!puedeOperar`: `motivoNoOpera` en `text-muted-foreground`.
  - Si `!claseEnCatalogo`: *"clase fuera de catálogo"*.
- **Ocupación real:** bloque gris rayado con *"Ocupación real · Prisma"* y
  `BadgeOrigen`, más su "ver origen" (linaje de `fecha_inicio_uso` y
  `fecha_fin_uso`).
- **Barra de propuesta:**
  - Color de marca (`marca`), **nunca un color de veredicto**.
  - Texto: código de proyecto · `codTrabajador`.
  - Si `clima.estado === 'evaluado'` y `diasConLluvia > 0`: ícono `CloudRain` +
    *"Lluvia probable en 2 de 4 días"*, con ícono y texto, sin color de
    veredicto.
  - Si `sin_pronostico`: el motivo en `text-muted-foreground`.
- La posición de cada barra (qué columna ocupa) es presentación. **No calcules
  choques, objetivos ni candidatas.**
- Clic en una barra → abre el detalle.

## 6. `detalle-asignacion.tsx` (`Sheet`)

- **Solicitud:** estado, clase, proyecto, período pedido e **inicio efectivo**.
- **Máquina** (`codigoActivo`) y **operador** (`codTrabajador`).
- **Objetivos:** tabla con valor y unidad.
  - Si `valor === null`: `Sin registro`, más el motivo.
  - Si `peorCasoAplicado`: la etiqueta **"peor caso declarado"**, más el motivo.
- **Comparación con la asignación manual** (si `manual` existe): dos columnas,
  *"Manual observada (Prisma)"* y *"Propuesta del optimizador"*.
- **Clima:** días con lluvia, días evaluados, días sin pronóstico y fuente
  (`open-meteo`, coordenada redondeada a 1 decimal, hora de lectura).
- **Ver origen:** el `linaje` de cada valor (plataforma, endpoint, campo, valor
  crudo y hora). Si todavía no existe un `VerOrigen` reutilizable en
  `components/nect/`, construí uno mínimo ahí.

## 7. `resumen-niveles.tsx`

- Estado global (`optimo` / `factible` / `infactible`), con `motivoInfactible`
  si corresponde.
- Los niveles en orden, con valor y unidad. Si `probadoOptimo === false`: *"no
  se probó el óptimo en el tiempo límite"*.

## 8. `tiles-kpi-optimizador.tsx`

- Tres tiles. Cada uno lee `respuesta.kpis` y la entrada del catálogo por id
  desde `CATALOGO_KPI` (`lib/kpi/catalogo.ts`): nombre, **acción que dispara** y
  fórmula (en un "ver fórmula").

  | Id | Contenido |
  |---|---|
  | `ahorro-por-objetivo-optimizador` | Una línea por objetivo de la pila: mejora con unidad y *"N de M aprobadas comparables"*, o su `datoFaltante` |
  | `lluvia-clases-sensibles-optimizador` | `asignacionesConLluvia` de `asignacionesSensibles`, más las que no tienen pronóstico, o su `datoFaltante` |
  | `cobertura-plan-optimizador` | Porcentaje, más *"asignadas / evaluadas"* y las excluidas aparte, o su `datoFaltante` |

- Si `kpis === null`: el tile muestra `kpisPendientesMotivo`. Si la entrada del
  catálogo no existe (C no mergeó): *"KPI pendiente de catálogo (S-C4)"*.
- Un número sin su dato de cobertura no se muestra solo (ui-registry §1.4).

## 9. Estados de interfaz obligatorios (ui-registry §4)

| Estado | Qué muestra |
|---|---|
| Cargando | Skeleton del timeline, nunca un spinner a pantalla completa |
| **Solver no disponible** (503 `solver_no_disponible`) | *"El optimizador no responde. No se propone nada hasta que vuelva."* + Reintentar |
| **Fuente no disponible** (503 `fuente_no_disponible`) | Qué plataforma y qué endpoint fallaron |
| **Verificación fallida** (500) | *"El optimizador devolvió una propuesta que rompía una restricción y se descartó."* |
| **Infactible global** | El `motivoInfactible`, con el carril *"Sin asignación posible"* completo |
| Sin solicitudes evaluables | Lo dice, con la lista de excluidas |
| Avisos | La lista de `respuesta.avisos` (p. ej. clima no disponible, peor caso aplicado) |

---

## Qué NO hacer

- ❌ **No recalcules nada en el cliente:** ni objetivos, ni KPIs, ni choques, ni
  filtrado de candidatas. La UI solo muestra.
- ❌ No uses datos de ejemplo ni fixtures, ni siquiera "temporales".
- ❌ No agregues un botón de aceptar ni ninguna escritura.
- ❌ No pintes de rojo *"sin asignación posible"* ni la alerta de lluvia. El rojo
  es solo para `EN_RIESGO`.
- ❌ No muestres el nombre de un operador.
- ❌ No instales dependencias. No toques `lib/` ni `app/api/`.
- ❌ No uses capturas de esta pantalla en el entregable sin revisar que no salgan
  datos del sandbox (§1.2).
- ❌ No hagas `git commit`, `push` ni merge.

## Terminado cuando

Con el solver y la ruta de S-A7 levantados (probado con la skill `run`):
- se reordena la pila, se re-optimiza y el calendario cambia;
- marcar o desmarcar una clase sensible hace aparecer o desaparecer las alertas
  de lluvia;
- cada solicitud sin asignación posible muestra su motivo;
- los tres tiles muestran su cifra con cobertura, o su dato faltante;
- apagar el solver muestra el estado *"Solver no disponible"*.

`npm run typecheck` y `npm run lint` pasan. Registrá cada componente en
[ui-registry.md §6](../ui-registry.md) con `imprint`.

Reportá: archivos tocados · checklist de prueba manual · **resultado real** de
typecheck/lint · qué no se pudo verificar · desviaciones · `git status`.
