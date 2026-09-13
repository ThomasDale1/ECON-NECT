# S-C2 — Matriz tipada, RACI y catálogo de KPIs

**Carril C · 17:45–01:00 · Después de S-C1**

> Leé [AGENTS.md](../AGENTS.md) y [01 Parte C.5, D.7 y E](../docs/01-DEFINICION-DE-NEGOCIO.md).
> El principio que manda: **la documentación y el prototipo son el mismo objeto**
> (C.5). Estructura tipada → pantalla → exportación. No pueden contradecirse
> porque son la misma fuente.

---

## Objetivo

Cerrar los tres entregables tipados de C contra los **campos reales** ya
verificados en vivo, y dejar cada KPI honesto sobre qué es calculable y qué no.

**Directorios tuyos:** `lib/mapeo/` · `lib/gobernanza/` · `lib/kpi/` ·
`app/(nect)/mapeo/page.tsx` (cruce ya autorizado a C en S-C1 — B puede moverla
después). **No toques** `lib/tipos/`, `lib/canonico/`, `lib/reglas/`,
`lib/conectores/`, `components/` ni otras rutas.

**Punto de partida:** [matriz.ts](../apps/web/lib/mapeo/matriz.ts),
[raci.ts](../apps/web/lib/gobernanza/raci.ts) y
[catalogo.ts](../apps/web/lib/kpi/catalogo.ts) **ya existen** de S-C1. Esto es
refinar, no reescribir.

---

## Tarea 1 — Matriz contra los campos reales

Agregá a cada fila relevante el **nombre literal del campo de la API** junto a la
etiqueta del diccionario, y corregí las filas que hoy afirman algo que la API en
vivo desmiente. Cada corrección va como **hecho estructural** (§1.2), nunca
pegando un registro.

Correcciones verificadas el 12 de septiembre (conteos, no valores):

- **`clase_equipo` ↔ `veh_type`:** hoy dice `exacta`. **Cambiar a `con
  transformación`** y bajar confianza a `media`: `veh_type` en Startrack es un
  **código entero** (se observaron 8, 11 y 12), no el texto de la clase. El mapeo
  código→clase **no está verificado** — decilo, no lo inventes.
- **`remote_id` (tareas):** hoy dice "vacío en la totalidad de los registros".
  **Corregir a lo cierto:** ECON **no lo llena en su operación**; los valores
  presentes en el sandbox son **escrituras de prueba de los equipos del
  hackathon** (verificado: aparece poblado en parte de las tareas del pool
  compartido, incluida una nuestra que enlaza una solicitud por `remote_id`). La
  recomendación de arquitectura se mantiene y **se refuerza**: el mecanismo
  persiste, falta que Prisma lo llene sistemáticamente. Confianza `alta`. Ruta
  real: `GET /api/job`, campo `remote_id`.
- **`remote_id` (vehículos, geocercas):** hoy dice "vacío en todos". **Corregir:**
  el campo **no aparece en la proyección del listado** de `ajax/vehicles.php` ni
  `ajax/namedPlaces.php` (no se ve ni poblado ni vacío ahí); su existencia se
  documenta por el diccionario. Confianza `media`. No afirmar "vacío" de algo que
  la proyección no devuelve.
- **Tipo de tarea `Traslado`:** el diccionario lo escribe `Trasalado` [sic]; la
  API en vivo (`GET /api/job/type`) devuelve **`Traslado` bien escrito**. El typo
  es del diccionario, no del dato. Dejá ambas grafías con esa nota.
- **Bandera de paro:** hoy es `hipotesis` con "nombre exacto no confirmado". **Ya
  confirmado:** `active_failure_is_paro` (en `/api/maquinaria/equipos`). Subir a
  `alta`. Igual `active_failure_status` (estado de la falla activa) y
  `occupied_without_project` (en el detalle del equipo, para R6).
- **`estado` de vehículo (Startrack):** se observó constante (`"0"` en 14/14):
  describe la salud del rastreo, no la disponibilidad operativa; poblado de forma
  uniforme. Ajustá la evidencia a ese hecho.
- **marca/modelo/año en Prisma:** la fila dice "vacío en la totalidad"; lo
  observado es **poblado en 1 de 15** (vacío en 14). Corregir el absoluto a "14 de
  15 observados".

Mantené el filtro por tipo de relación en la página y la exportación CSV
(ya existen); si agregaste columnas, incluílas en el CSV.

## Tarea 2 — KPIs honestos: cada término con su endpoint o su hueco

Regla 1.1: ninguna cifra sin poder señalar de qué endpoint sale; si no es
calculable, se declara qué dato falta. Hoy dos KPIs dicen `datoFaltante: null`
pero **no** son calculables. Corregí:

- **`tiempo-muerto-quetzales`:** **no calculable hoy.** `datoFaltante =` el
  sandbox **no expone las horas reales de uso** por endpoint (404 en las rutas de
  uso/bitácora probadas: `.../uso`, `.../usage`, `.../eventos`, `.../events`,
  `.../historial`, y las de nivel de módulo); además `precio_x_hora` y
  `minimum_usage_hours` vienen poblados **solo en 1 de 15** equipos observados.
  La fórmula queda declarada; el valor se muestra como "No disponible — falta el
  timestamp/horas reales", nunca un número inventado (D.7).
- **`latencia-solicitud-traslado`:** **calculable pero parcial.** Insumos reales:
  `solicitud.approved_at` (Prisma, poblado en las 5 aprobadas) y
  `tarea.creation_date` (Startrack `/api/job`). El enlace tarea↔solicitud es
  `remote_id` → hoy cubre **1 de 5**. Dejá `datoFaltante: null` pero documentá la
  **cobertura** en `referencia`: "calculable donde `remote_id` enlaza; hoy 1 de 5
  aprobadas — el resto espera que P1 llene `remote_id`". Eso es honesto y es
  justamente el argumento del producto.
- **`tasa-coherencia`** y **`cobertura-interpretacion`:** calculables sobre
  `EquipoUnificado[]`. Se quedan como están (revisá que la fórmula cite el campo
  `identidadResuelta` y `veredicto`).

## Tarea 3 — RACI: enlace con las reglas y refuerzo con los organigramas

- **Enlace RACI ↔ reglas de A.** Cada regla de A expone un `rolResponsable`
  (enum `Rol`). Agregá en `raci.ts` un mapa **`PASO_DE_REGLA: Record<string,
  string>`** que asocia cada id de regla (`R1`…`R8`) al `paso` del proceso que la
  resuelve (p. ej. `R3 → "Programar el traslado"`, `R4 → "Reasignar por
  mantenimiento"`, `R7 → "Asignar equipo y operador"`). Con eso y el
  `ROL_A_AGENTE` que ya existe, la bandeja de incoherencias puede decir, para cada
  incoherencia, **qué paso y qué agente la resuelve**. Ese enlace es lo que la
  vuelve utilizable y no decorativa (criterio 3.4). **No dupliques** los ids ni
  los roles de A; leelos.
- **Refuerzo con los organigramas.** Usá la **estructura** de los organigramas de
  ECON (mantenimiento, logística/maquinaria, gerencia técnica) para fortalecer el
  campo `fuente` de las filas — como **hecho estructural**, sin transcribir la
  imagen ni pegar nombres de personas (§1.2, §1.5). Hechos que la estructura
  respalda: Operadores dependen de Logística vía Supervisor de Campo (refuerza
  "Programar traslado": Logística A, Operadores R); Mantenimiento es autoridad
  técnica sobre la falla (R2/R4 → MANTENIMIENTO); "Licitaciones y Control de
  Costos" cuelgan de Gerencia Técnica.
- **Estado.** Los organigramas dan **jerarquía, no proceso**: no dicen quién
  aprueba una solicitud. Por eso las filas siguen en **`propuesta`**; pasar a
  `validada` sigue exigiendo la respuesta textual de un mentor (regla del propio
  archivo). Dejá a la vista las preguntas pendientes ([02 §3](../docs/02-ROADMAP.md)).

## Tarea 4 — Cálculo de KPIs en `lib/kpi/`

Funciones **puras** (sin HTTP; las alimenta después una ruta o un script):

- `calcularTasaCoherencia(equipos: EquipoUnificado[])` → `{ valor, numerador,
  denominador }` (COHERENTE ÷ identidad resuelta).
- `calcularCobertura(equipos: EquipoUnificado[])` → `{ valor, resueltos, total }`.
- `calcularLatencia(pares)` → `{ valor, cobertura, muestras }`, donde `pares` son
  `{ approvedAt, taskCreatedAt }` ya enlazados por `remote_id` (los arma quien
  llame, no `lib/kpi`). Devuelve `null` en `valor` si no hay pares.
- `tiempoMuertoQuetzales(...)` → devuelve el `datoFaltante` declarado, **no un
  número**, mientras no exista el endpoint de horas reales.

Importá los tipos de `lib/tipos/canonico.ts` (contrato compartido). Si S-A2 aún no
está mergeado, codificá contra el tipo y contra `lib/tipos/ejemplo.ts`.

---

## Pruebas

- Cada `datoFaltante` refleja la realidad verificada (tiempo muerto: no calculable;
  latencia: parcial con cobertura).
- `calcularTasaCoherencia` y `calcularCobertura` validadas a mano contra
  `EQUIPOS_EJEMPLO` (resultado esperado escrito en el test).
- La matriz no contiene ningún absoluto que la API en vivo desmienta (remote_id,
  marca/modelo/año, clase↔veh_type).

Corré `npm run typecheck`, `npm run lint` y `npm run test`. **Reportá el resultado
real.**

## Qué NO hacer

- ❌ No inventes una equivalencia ni un nombre de campo no verificado (§1.1). "Sin
  equivalencia directa" es una respuesta válida.
- ❌ No transcribas los organigramas ni pegues nombres de personas (§1.2, §1.5).
- ❌ No muestres un número de KPI que no sea calculable con lo que hay.
- ❌ No pases una fila de RACI a `validada` sin respuesta de un mentor.
- ❌ No toques `lib/canonico/`, `lib/reglas/` ni el contrato de tipos.

## Terminado cuando

La matriz, la RACI y el catálogo de KPIs renderizan en `/mapeo` sin afirmar nada
que la API en vivo contradiga, la RACI enlaza cada regla con su paso y agente, y
los KPIs calculables se calculan mientras los no calculables declaran su hueco.
Reportá archivos tocados, resultado real de typecheck/lint/test, y desviaciones.
