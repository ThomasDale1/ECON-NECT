# S-A2 — Modelo canónico y motor de reconciliación

**Carril A · 17:30–21:00 · Después de S-A1**

> Leé [AGENTS.md](../AGENTS.md), [01 Parte C, D y E](../docs/01-DEFINICION-DE-NEGOCIO.md)
> y el contrato congelado [lib/tipos/canonico.ts](../apps/web/lib/tipos/canonico.ts)
> antes de escribir código. El contrato ya tiene los tipos que vas a llenar
> (`EquipoUnificado`, `EstadoOrigen`, `ResultadoRegla`, `Veredicto`); **no lo
> cambies** salvo la única excepción autorizada del §Contrato de abajo.

---

## Objetivo

El corazón del producto: resolver la identidad de cada equipo entre Prisma y
Startrack, conservar los estados de ambas sin fusionarlos, y calcular el
**veredicto** con la regla que lo produjo.

**Directorios tuyos:** `lib/conectores/` (solo agregar el lector de tareas del
Paso 0) · `lib/canonico/` · `lib/reglas/` · `scripts/`.
**No toques** `lib/tipos/` (salvo §Contrato), `components/`, `app/`, `lib/mapeo/`,
`lib/gobernanza/`, `lib/kpi/`, `lib/acceso/`.

**Regla de capa (AGENTS.md §4.3):** `lib/canonico` y `lib/reglas` **no conocen
HTTP**. Reciben datos ya leídos por los conectores y devuelven el modelo y el
veredicto. Se prueban sin red. Solo `scripts/` y (después) las rutas llaman a los
conectores.

---

## Paso 0 — Completar el lector de tareas (hueco que S-A1 dejó documentado)

S-A1 dejó en [startrack.ts](../apps/web/lib/conectores/startrack.ts) un `TODO`
diciendo que no encontró la ruta de tareas. **Ya está encontrada y verificada en
vivo el 12 de septiembre.** Implementala en `lib/conectores/startrack.ts` (mismo
carril A) y borrá el `TODO`.

- **Ruta:** `GET /api/job` — superficie REST moderna, **acepta la cookie de
  sesión** de `login.php` (verificado: HTTP 200 con cookie; **no** hace falta
  Basic Auth). Los 404 de S-A1 fueron por probar `ajax/jobs.php` y `/api/tasks`:
  la ruta real es `/api/job` (singular).
- **Envoltura:** `{ success, data, count }` — la lista de tareas va en `data`.
  Reutilizá `desenvolverStartrack` (ya valida `success === false` → `SesionExpirada`),
  pero como `/api/` **no** es `ajax/`, escribí un helper aparte `peticionApiJson`
  que:
  1. use la cookie de sesión (misma que `peticionAjax`),
  2. trate **401 como sesión expirada** (la superficie REST sí usa 401),
  3. pase el cuerpo por `desenvolverStartrack` (cubre el 200-con-`success:false`),
  4. reautentique y reintente **una sola vez**, igual que `peticionAjax`.
- **Paginación:** `?page_num=0&page_size=200&sort_by=start_date&sort_dir=asc`.
  Hay ~32 tareas en el sandbox compartido; con `page_size` grande entran en una
  página. No hace falta el filtro de fechas del UI para leerlas todas.
- **Exportá** `leerTareas(): Promise<RespuestaConector<unknown[]>>` con caché y
  linaje, igual que los otros lectores. Envolvé `data`, no el objeto entero.
- **Opcional, barato y útil:** `leerTiposTarea()` desde `GET /api/job/type?include_readonly=1`
  para mapear `job_type_id → nombre` (el catálogo trae `Traslado`, `Pedido`,
  `Visita`, `ENTREGA DE AGREGADOS`, `Nuevo`). Lo usa R4 y el enlace de traslados.
- **Actualizá `scripts/leer.ts`** para que lea tareas también (imprime conteo,
  nombres de campo y ms — **nunca valores**, §1.2).
- **Prueba obligatoria:** `peticionApiJson` reautentica ante **401** y ante
  **200-con-`success:false`**, y reintenta una sola vez.

> Regla dura que sigue vigente: la sesión expirada se detecta por el **cuerpo**
> (`success:false`), no solo por el status. Es el fallo que se ve como éxito
> (01 E.7).

---

## Formas reales observadas (12 sep 2026) — tipá contra esto, no inventes campos

**Prisma `equipos`** (`/api/maquinaria/equipos`): `id, empresa, clave, no_activo,
nombre, clase_equipo, marca, modelo, anio, precio_x_hora, minimum_usage_hours,
estado, project_id, project_name, active_failure_id, active_failure_status,
active_failure_is_paro, fallas_count, …`
El detalle (`/api/maquinaria/equipos/{id}`) agrega: `occupied_without_project,
associated_operators[], catalog_precio_x_hora, current_project_rate,
project_rates[], effective_precio_x_hora, motivo_baja, …`

**Prisma `solicitudes`** (`/api/maquinaria/requests`): `id, project_id, tipo,
status, approved_at, approved_by_name, maquinaria_id, maquinaria_no_activo,
maquinaria_nombre, maquinaria_clave, fecha_inicio, fecha_fin, created_at, …`

**Startrack `vehiculos`** (`ajax/vehicles.php?cmd=list`): `id, description,
veh_type, make, model, status, tags, unit_id, driver_id, license_plate, …`
(`veh_type` es un **código entero** — 8/11/12 —, no el texto de la clase.
`remote_id` **no viene** en esta proyección.)

**Startrack `geocercas`** (`ajax/namedPlaces.php?cmd=list`): `id, name, address,
x, y, group_id`. (Las coordenadas llegan en grados decimales.)

**Startrack `tareas`** (`GET /api/job`): `id, status, status_name, job_type_id,
start_date, end_datetime, creation_date, poi_id, poi_name, origin_poi_id,
origin_poi_name, assigned_vehicle_id, assigned_user_ids, remote_id, x, y,
address, …`

**Catálogos verificados** (tipá como uniones literales, no `string`):
- estado equipo: `DISPONIBLE · OCUPADA · OBSOLETA`
- estado solicitud: `PENDIENTE · APROBADA · RECHAZADA`
- estado falla: `SIN_REVISAR · PENDIENTE_INTERVENCION · EN_PROCESO ·
  ESPERA_REPUESTOS · TRASLADO_STD · EN_PRUEBAS · FINALIZADO · RECHAZADO`
- clase de equipo: `Cargador frontal · Excavadora · Minicargador ·
  Motoniveladora · Retroexcavadora` (⚠ hay **un** registro con `Retroexcavadoras`
  en plural — es el hallazgo E.4, lo dispara R8; no lo "corrijas")
- tipo de tarea: `Traslado · Pedido · Visita · ENTREGA DE AGREGADOS · Nuevo`

---

## `lib/canonico/identidad.ts`

- Une **`no_activo` de Prisma contra `description` de Startrack**, normalizando:
  mayúsculas, `trim`, y tomar el código (prefijo antes de `" - "`, o el patrón
  `^[A-Z]{2,4}-?\d{1,4}`). **Verificado: coincide en 14 de 15.**
- El registro que no une es un **huérfano real** (no tiene vehículo en Startrack):
  se registra explícitamente con `identidadResuelta: false`, no se fuerza.
- Cadena de respaldo documentada, en orden: (1) `remote_id` de la tarea si apunta
  a un id de Prisma; (2) `no_activo` × `description`; (3) `clave` del equipo si
  estuviera poblada. Cada nivel deja constancia de cuál resolvió.
- Enlaces derivados que las reglas necesitan (documentá la confianza de cada uno):
  - **solicitud → equipo:** `solicitud.maquinaria_id === equipo.id` (verificado
    5/5), corroborado por `maquinaria_no_activo === no_activo`.
  - **tarea → solicitud:** determinístico por `tarea.remote_id === solicitud.id`
    (hoy enlaza 1 de 5). Si no hay `remote_id`, heurística documentada de menor
    confianza: `assigned_vehicle_id → vehiculo.description → no_activo`.
  - **tarea → geocerca destino:** `tarea.poi_id`/`poi_name` → geocerca; el nombre
    de geocerca trae el código `PROY-###` (nivel 2 de la cascada de ubicación).

## `lib/canonico/estados.ts`

- Convierte cada estado crudo en un `EstadoOrigen` (`valor`, `objeto`, `linaje`
  con `valorCrudo`). **Conserva los dos catálogos, nunca los fusiona** (C.3).
- `objeto` por origen: `equipo`→`recurso`, `vehiculo`→`recurso`, `falla`→`falla`,
  `tarea`→`tarea`. La **solicitud** se etiqueta `recurso` (decisión del usuario:
  no se toca el contrato; la ficha la rotula por su nombre "Solicitud", no por la
  etiqueta — imprecisión menor y reversible, dejala anotada en un comentario).
- ⚠ **La disponibilidad NO es el campo `estado`** (01 E.2). Derivá un booleano
  interno `puedeOperar` del cruce: `estado !== 'OBSOLETA'` **y**
  `active_failure_is_paro !== true` **y** (sin falla activa que impida operar).
  Es un dato **derivado** para las reglas; **no sobrescribe** ningún estado de
  origen. Hoy `active_failure_status` es `null` y `active_failure_is_paro` es
  `false` en los 15 (no hay fallas en el sandbox) — la falla queda `null` y la
  rama de `puedeOperar` por falla no dispara. Correcto, no lo forces.

## `lib/canonico/modelo.ts`

- Ensambla `EquipoUnificado` (tipo del contrato) con **linaje campo por campo**:
  cada `Dato<T>` y cada `EstadoOrigen` guarda `plataforma, endpoint, campo,
  valorCrudo, leidoEn`. Es el insumo del "ver origen" (C.4).
- Un campo que no se pudo leer es `null` con su linaje, nunca `""` ni inventado.

## `lib/canonico/reconciliacion.ts` — el motor

Función **pura** `reconciliar(datosCrudos) → EquipoUnificado[]` que recibe lo ya
leído (equipos, solicitudes, fallas, proyectos, vehículos, geocercas, tareas,
tipos de tarea) y para cada equipo: resuelve identidad → arma estados y modelo →
corre las reglas → agrega el veredicto.

**Agregación del veredicto (heurística determinística, documentada — no ML):**
```
POR REGLA
  no aplica al equipo    -> no aparece en reglas[], no resta
  aplica y concluye      -> aporta su ResultadoRegla
  aplica, falta insumo   -> SIN_EVIDENCIA + camposFaltantes

POR EQUIPO
  1. veredicto = máx. precedencia entre las reglas que concluyeron:
       EN_RIESGO > ATENCION > COHERENTE
  2. confianza = 100
       - 60 si la identidad no se resolvió (R5)
       - 20 por cada regla que aplica y no concluyó
  3. ninguna regla concluyó -> veredicto = SIN_EVIDENCIA
  4. confianza < 45         -> veredicto = SIN_EVIDENCIA   (umbral del contrato)
```
`SIN_EVIDENCIA` **nunca** es rojo en la UI, pero eso es de B; acá solo se calcula.

---

## `lib/reglas/` — una regla por archivo

Definí en `lib/reglas/tipos.ts` la interfaz común:
```ts
type Regla = {
  id: string; nombre: string; descripcion: string   // lenguaje de negocio
  severidad: Severidad; rolResponsable: Rol; camposEntrada: string[]
  evaluar(eq: EquipoUnificado, ctx: ContextoReglas): ResultadoRegla | null // null = no aplica
}
```
`ContextoReglas` lleva lo que una regla necesita del resto de la flota (tareas,
solicitudes, catálogo de clases, tipos de tarea). Un `index.ts` lista las 8.

Cada regla, un archivo (`r1-estados-compatibles.ts`, …), con caso que dispara y
caso que no. **Rol responsable = enum `Rol` del contrato**; el enlace a la matriz de responsabilidades lo
hace C leyendo ese `Rol` (no lo dupliques acá).

| Id | Nombre | Dispara cuando | Veredicto · Severidad | Rol | Caso vivo hoy |
|---|---|---|---|---|---|
| **R1** | Estados compatibles | recurso y tarea describen objetos distintos y no se contradicen (p. ej. OCUPADA + sin tarea viva, o + tarea completada) | `COHERENTE` · baja | LOGISTICA | la mayoría |
| **R2** | Traslado sobre equipo que no puede operar | existe tarea tipo `Traslado` no cancelada para un equipo con `puedeOperar=false` (OBSOLETA o paro) | `EN_RIESGO` · alta | LOGISTICA | evalúa; hoy depende de que un traslado caiga sobre una OBSOLETA |
| **R3** | Solicitud aprobada sin tarea de traslado | `solicitud.status='APROBADA'` y no hay tarea `Traslado` enlazada (por `remote_id`, o heurística) | `ATENCION` · media | LOGISTICA | **dispara en 4 de 5** (1 ya enlazada por `remote_id`) |
| **R4** | Falla en `TRASLADO_STD` sin tarea | `falla.status='TRASLADO_STD'` y no hay tarea `Traslado` en Startrack para ese equipo | `EN_RIESGO` · alta | MANTENIMIENTO | **0 fallas** → no aplica (correcto, sin insumo) |
| **R5** | Identidad no resuelta / campo crítico ausente | `identidadResuelta=false` o falta un campo crítico | `SIN_EVIDENCIA` · media | LOGISTICA | **1** (el huérfano) |
| **R6** | Equipo ocupado sin proyecto | `estado='OCUPADA'` y `project_id` nulo (o `occupied_without_project=true` del detalle) | `ATENCION` · media | LOGISTICA | **0** (correcto) |
| **R7** | Asignado a proyecto en estado incompatible | `project_id` no nulo y `estado='OBSOLETA'` → EN_RIESGO alta; `estado='DISPONIBLE'` → ATENCION media (OCUPADA+proyecto es normal, no dispara) | ver celda | LOGISTICA | **dispara en 2** (OBSOLETA con proyecto) |
| **R8** | Valor fuera del catálogo declarado | un valor de catálogo no está en el catálogo verificado (p. ej. `clase_equipo='Retroexcavadoras'`) | `ATENCION` · baja | LOGISTICA | **1** (`Retroexcavadoras`, es E.4) |

> R2/R3/R4 dependen del lector de tareas del Paso 0 — por eso va primero. Con la
> fuente disponible **calculan de verdad**; no las dejes en `SIN_EVIDENCIA` por
> defecto. R4 no dispara hoy porque no hay fallas, que es lo correcto: "no aplica"
> ≠ "sin evidencia".

---

## `scripts/reconciliar.ts` — criterio de terminado

Corre con `npx tsx scripts/reconciliar.ts` (agregá el alias en `package.json` de
`apps/web` si querés, p. ej. `reconciliar`). Lee ambas plataformas por los
conectores, llama a `reconciliar(...)`, e **imprime para los 15 equipos**: código
de activo, veredicto, confianza y **la regla que lo produjo**. **Solo eso —
nunca coordenadas, placas ni nombres de personas** (§1.2).

---

## Pruebas obligatorias (§9)

1. **Identidad:** une 14 y **reporta el huérfano** como `identidadResuelta:false`,
   sin forzarlo.
2. **Cada regla R1–R8:** un caso que dispara y uno que no (datos canónicos
   fabricados, no del sandbox).
3. **No sobrescritura:** `reconciliar` **jamás** modifica un `EstadoOrigen` de
   entrada (compará el objeto de origen antes/después; debe ser idéntico).
4. **Conector de tareas:** reautentica ante 401 **y** ante 200-con-`success:false`,
   y reintenta una sola vez (Paso 0).
5. **Agregación:** un equipo con dos reglas (EN_RIESGO + ATENCION) resuelve a
   EN_RIESGO; uno sin ninguna regla concluida resuelve a SIN_EVIDENCIA; la puerta
   de confianza <45 degrada a SIN_EVIDENCIA.

Corré `npm run typecheck`, `npm run lint` y `npm run test`. **Reportá el resultado
real de cada uno**, no lo que debería pasar.

## Qué NO hacer

- ❌ No cambies `lib/tipos/canonico.ts` (está congelado; la solicitud se etiqueta
  `recurso` sin tocar el tipo).
- ❌ No fusiones ni "corrijas" estados de origen. El veredicto es un **tercer**
  dato; los dos originales se conservan intactos.
- ❌ No inventes un enlace tarea↔equipo que no verificaste; marcá su confianza.
- ❌ No metas HTTP en `lib/canonico` ni en `lib/reglas`.
- ❌ No implementes escritura ni propagación (eso es S-A4).
- ❌ No imprimas valores del sandbox en ningún script.

## Terminado cuando

`scripts/reconciliar.ts` imprime el veredicto de los 15 equipos con su regla, y
las cinco pruebas pasan. Reportá archivos tocados, resultado real de
typecheck/lint/test, y cualquier desviación de este prompt.
