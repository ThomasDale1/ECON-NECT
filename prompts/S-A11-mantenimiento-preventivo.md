# S-A11 — Mantenimiento preventivo por horómetro: alerta, consulta individual y orden de taller

**Carriles A → C → B, en una sola sesión de implementación · fase extendida**
**Si compite por la misma hora de Carril A con S-A4 (propagación P1), P1 va
primero. Siempre.**

> Leé [AGENTS.md](../AGENTS.md) (§1, §4.3, §7.1, §9, §12),
> [docs/03-ARQUITECTURA-IA-ODIN.md](../docs/03-ARQUITECTURA-IA-ODIN.md) §2.3,
> [ui-registry.md](../ui-registry.md) completo y este prompt **completo** antes
> de escribir código.
>
> Planeado en sesión 1 el 13 de septiembre de 2026 (05:30 CST), con la
> cobertura del sandbox medida en vivo (solo conteos y nombres de campo; ningún
> valor entró a este archivo). Skills: `nextjs-app-router` (rutas),
> `shadcn` y `dataviz` (tarjeta, gauge y tiles), `security-review` antes de dar
> por buena la propagación, `imprint` al terminar la UI, `run` para probar en
> vivo.
>
> **Una sola sesión recorre los tres carriles, en el orden de los pasos.** Cada
> paso dice de qué carril es. No toques un directorio que ningún paso nombra.
> **`lib/canonico/` y `lib/reglas/` no se tocan:** la alerta de mantenimiento
> no es una regla de coherencia ni cambia el veredicto (línea roja, 01 H.3).

---

## Objetivo

Que ECON NECT responda, con datos reales y su origen a la vista, cuatro
preguntas que hoy no responde ninguna de las dos plataformas:

1. **¿Cuántas horas lleva esta máquina desde que salió del taller?** Con el
   horómetro GPS de Startrack, que se actualiza en vivo — no con el horómetro
   humano de Prisma, que solo se teclea cuando la máquina ya está en el taller.
2. **¿Cuándo le toca?** Contra un intervalo que sale, en este orden, de: lo que
   fijó Mantenimiento en la pantalla, el historial real de taller del equipo, o
   el manual del fabricante para esa marca y modelo. Si no hay ninguno, la
   pantalla dice qué falta.
3. **¿A quién le avisamos y cómo?** Fila en la bandeja de excepciones, tarjeta
   en la ficha del equipo, contador en el encabezado, aviso del navegador y
   O.D.I.N. explicándolo con evidencia.
4. **¿Qué hace la persona?** Crea la **orden de taller**: confirma, y NECT
   programa el mantenimiento en Prisma y pone el vehículo en "Mantenimiento" en
   Startrack — solo sobre el recurso propio, con rastro, reversible.

**Es una heurística determinística y documentada.** No es IA, no es una
probabilidad entrenada y no se vende como tal.

---

## Decisiones tomadas en planeación — no se renegocian

| Tema | Decisión |
|---|---|
| **Horómetro vivo** | `curOperatingHours` de `ajax/report.php?id=22` (14 vehículos en una llamada; horas). Coincide exactamente con `ign_on_time` de `GET api/vehicle/{id}/status` en 14/14 |
| **Serie diaria** | `detail[].ignOnTime` de `ajax/report.php?id=3` (Resumen Diario), **segundos** por vehículo y día. Σ de la serie ÷ 3600 = horómetro vivo en 14/14 |
| **Dos horómetros distintos** | El GPS (Startrack, arranca en 0 al instalar el equipo, 07-sep-2026) y el humano (`hour_meter` del reporte de falla de Prisma, teclea el operador). **Nunca se comparan en absoluto.** Todo cálculo usa deltas dentro de la misma fuente |
| **Ancla ("última salida de taller")** | La fecha más reciente entre `mantenimiento_fecha_fin` del equipo en Prisma (solo si ≤ hoy) y `updated_at` del último reporte de falla `FINALIZADO` del equipo. Sin ninguna → se cuenta desde el primer día con datos del GPS, y la pantalla lo dice |
| **Intervalo, orden de precedencia** | 1) **sobreescrito** por Mantenimiento en la UI · 2) **aprendido**: mediana de Δ`hour_meter` entre reportes `FINALIZADO` consecutivos del equipo (≥ 2 reportes con horómetro) · 3) **declarado**: catálogo OEM por marca + modelo, régimen estándar o severo · 4) **sin dato** (sin alerta; se dice qué falta) |
| **Régimen** | El catálogo guarda estándar y severo por fila. Por defecto estándar; Mantenimiento marca "condiciones severas" por equipo |
| **Umbrales** | aviso ≥ 80 % · urgente ≥ 90 % · vencido ≥ 100 % del intervalo. Editables como parámetro, con estos valores por defecto |
| **Ritmo** | horas de motor de los últimos **7 días calendario** (hoy inclusive, `America/El_Salvador`) ÷ 7. Un día sin fila cuenta 0 h. Con ritmo 0 no hay fecha estimada, y se dice |
| **Parámetros** | Viven en **`localStorage` del navegador** y viajan al servidor en cada consulta. El servidor no guarda nada; aplica, calcula y devuelve qué parámetros aplicó. Todo parámetro se rotula "fijado a mano en este navegador" |
| **Demo** | Con 500 h de intervalo y menos de 40 h acumuladas nada alerta solo; la alerta viva de la demo se obtiene **bajando el intervalo desde la UI**, rotulado (*"intervalo fijado a mano: N h · OEM: 500 h"*) |
| **Cálculo** | Node puro en `lib/mantenimiento/` (carril A), probado con Vitest, corre en Vercel sin depender del servicio local. Alimenta también `maintenance_signals` de O.D.I.N. |
| **Orden de taller = P4 + P3** | P4: `PATCH /api/maquinaria/equipos/{id}` con `mantenimiento_fecha_inicio`, `mantenimiento_fecha_fin`, `mantenimiento_notas`. P3: `PUT api/vehicle/{id}` en Startrack con `status = 1` (Mantenimiento), de ida y vuelta. Ambas solo sobre `NECT_EQUIPO_PROPIO` y su vehículo, con `confirmado: true`, rol Mantenimiento o admin, rastro, y reversible (`status = 0` al cerrar) |
| **Reporte de falla en Prisma** | **No se crea.** La API web no expone `POST` (nacen en la app de campo con acciones de servidor; el login de trabajador rechaza los 16 códigos de operador). Queda documentado como hueco, no se emula |
| **Tarea en Startrack** | **No.** No hay tipo "Mantenimiento" ni geocerca de taller (0 de 20); crearlos sería tocar catálogos compartidos por 13 equipos |
| **Roles** | La alerta es de **Mantenimiento** (`rolResponsable`). P3/P4 los confirma `MANTENIMIENTO` o `ADMIN` |
| **Unidad de `ignOnTime` del reporte 32** | Fuera de este prompt. Se verificó que coincide con el acumulado del vehículo (6/6) — son horas, no minutos del día. Se anota en AGENTS.md §7.1 para que S-A10 lo corrija en otro prompt |

---

## Cobertura verificada el 13 de septiembre de 2026 (solo conteos)

| Fuente | Endpoint | Forma | Cobertura |
|---|---|---|---|
| Horómetro vivo | `GET ajax/report.php?id=22&format=json&start_date=HOY&end_date=HOY&vehicle_ids=&driver_ids=&retdat=1` | `{timezone, detail[]}`; fila: `vehicle_id, curOperatingHours, curOdometer, veh_status, status, date, place, route, heading, distance, duration, poiId, tag_id, driver_id, comWarn, gpsWarn` | 14 filas; `curOperatingHours` no-nulo 14/14; > 0 en 13/14 |
| Idem, por vehículo | `GET api/vehicle/{id}/status` (ya usado para ubicación nivel 1) | además de x/y: `odometer, sys_odometer, ign_on_time, stat_date, stat_ign_on_time, stat_total_distance, stat_moving_time, fuelmeter, sensor_readings` | `ign_on_time` = `curOperatingHours` en 14/14 (hasta el 4.º decimal). `fuelmeter` = 0 y `sensor_readings` vacío en 14/14: **no hay combustible ni temperatura** |
| Serie diaria | `GET ajax/report.php?id=3&format=json&start_date=…&end_date=…&vehicle_ids=&driver_ids=&retdat=1` | `{timezone, detail[], summary[], fmtDates[], ignOnMatrix[], hrsMatrix[], distMatrix[], speedMatrix[], …}`; `detail[]`: `vehicleId, driver, date, odometerAtStart, odometerAtEnd, distance, trips, rulesBroken, wasIdle, avgMovingSpeed, maxSpeed, timeInMotion, ignOnTime, firstIgnOn, lastIgnOff, fuelConsumed, hourmeterAtStart, idling, ignOffTime, percentOfDay…` | 93 filas, 14 vehículos, 6 días (07 → 12 sep). `ignOnTime` en **segundos** (coincide con `stat_ign_on_time` × 3600 y con `ign_on_hours` del reporte 43). Σ por vehículo ÷ 3600 = horómetro vivo en 14/14. **10 vehículos tienen más de una fila en algún día** (se suman). `timezone` = `America/Guatemala` (mismo UTC−6 sin horario de verano que El Salvador). ⚠ `driver` es un **nombre**: se descarta en el conector |
| Horas por día (alternativa) | `ajax/report.php?id=43` | `detail[]`: `vehicle_description, vehicle_id, date, ign_on_hours, distance, fuelCons_*` | 73 filas, 14 vehículos, 6 días. Redundante con el 3; no se usa |
| Reportes con PII — **prohibidos** | `id=45` (21 mil filas de logins con `phone, mobile, email, first_name, last_name`), `id=37` (`comment, photo_id, lat, lon`), `id=13/22` traen `place`/`lastEventPlace` | — | El conector **no llama** 45 ni 37; de 22 y 3 proyecta solo los campos listados en el Paso 2 |
| Marca y modelo | `GET api/vehicles` (`make`, `model`, `year`) · Prisma `marca`, `modelo` | | Startrack 14/14 con marca y modelo; Prisma 2/17 (una con marca mal escrita). `engine_num` existe en 14/14 y **nunca se lee** (§1.2) |
| Reporte de falla (Prisma) | `GET /api/maquinaria/fallas` → `{items, total, page, limit}` | Esquema observado en la UI de Prisma (no en datos): `id, descripcion, observaciones, cod_trabajador, operator_name, operativa, is_paro, hour_meter, estado, categoria_falla, approver_comment, approver_name, created_at, updated_at, empresa, clave, maquinaria_nombre, clase_equipo, ubicacion, project_name`; detalle `{item, history[], reassignment_preview}` | **0 reportes hoy**; `fallas_count` = 0 en 17/17. La UI de Prisma muestra `hour_meter` como "Horómetro … hrs" |
| Escritura sobre reportes | `PATCH /api/maquinaria/fallas/{id}?action=approve\|reject\|status\|paro\|finalize` | cuerpos: `{categoria_falla, comment}`, `{comment}`, `{new_status, comment}`, `{is_paro, …}`, `{comment, reassign_to_previous_project}` | Existen. **No hay `POST`** en `/api/maquinaria/fallas` (OPTIONS → GET, HEAD, OPTIONS) |
| Mantenimiento del equipo (Prisma) | `GET /api/maquinaria/equipos/{id}` | `mantenimiento_fecha_inicio, mantenimiento_fecha_fin, mantenimiento_notas, motivo_baja, fecha_baja, associated_operators, …` | Existen en 17/17; **vacíos en 17/17**. `PATCH /api/maquinaria/equipos/{id}` (allow: DELETE, GET, HEAD, OPTIONS, PATCH) y `PATCH …/{id}/estado` existen. El diálogo de Prisma envía `estado, project_id, fecha_inicio_uso, fecha_fin_uso, observaciones_asignacion, mark_operator_unavailable, precio_x_hora, motivo_baja, fecha_baja, mantenimiento_notas`; **no se verificó** que el PATCH acepte las fechas de mantenimiento — se prueba en vivo en el Paso 9 |
| Bitácora diaria (Prisma) | `GET /api/projects/{id}/encargado/review?limit=500&offset=0` → `{items, total, dates_with_data}`; filas con `horometro_inicial, horometro_final, horas_extra, combustible_gal, line_item_id` | | **0 filas en 15/15 proyectos.** No se usa; queda documentada como fuente futura del horómetro humano |
| Escritura en Startrack | `OPTIONS api/vehicle/{id}` → GET, PUT · `OPTIONS api/job` → GET, POST, PUT · `GET api/vehicles/status` → catálogo de 10 estados (`0` Normal, `1` Mantenimiento, `2` Fuera de servicio, …) | `GET api/vehicle/{id}` devuelve `{success, data}` con 55 campos, `status` como texto | El `PUT` **no se ha ejecutado nunca**: forma y efecto se verifican en vivo en el Paso 9, solo sobre el vehículo propio |
| Recurso propio | `NECT_EQUIPO_PROPIO` | | ⚠ **Hoy no coincide con ningún `no_activo` ni `id` de los 17 equipos.** Paso 0 lo verifica; sin eso P3/P4 no se prueban |

---

## Catálogo OEM (intervalo del servicio menor: aceite de motor + filtros)

Investigado en línea el 13 de septiembre de 2026 por marca y modelo. Marca y
modelo son atributos de catálogo (`make`/`model`, `marca`/`modelo`); el
**número de motor no se usa** (§1.2, y ningún fabricante publica intervalos por
serie). Cada fila lleva su fuente y su confianza; **una fila sin fuente no
entra.** Estos números son *parámetros declarados con origen externo*, y la
pantalla siempre los rotula así — nunca como dato del sandbox.

| Marca | Modelo (alias) | Clase | Estándar | Severo | Fuente | Confianza · nota |
|---|---|---|---|---|---|---|
| Caterpillar | 262D3 | Minicargador | 500 h | 250 h | https://tractorgearbox.com/cat_262d3_skid_steer_maintenance.html | alta · hidráulico 1 000 h, refrigerante 3 000 h |
| Caterpillar | 252B3 | Minicargador | 500 h | 250 h | https://skidsteerloaderspecs.com/cat_252b3_skid_steer_maintenance.html | alta · hidráulico 1 000 h |
| Caterpillar | 246 | Minicargador | 250 h | 250 h | https://www.ebooklibonline.com/onlinepages/OM-CAT%20246%205SZ00001.pdf | media · serie original (motor 3034, OMM SEBU7468); la vista previa pública no incluye la tabla; el 246D también es 250 h |
| Caterpillar | 950H | Cargador frontal | 500 h | 250 h | https://www.scribd.com/document/459633628/PM2 | alta · PM2 = 500 h (filtros de motor, combustible e hidráulico); PM1 250 h es inspección |
| Caterpillar | 950GC | Cargador frontal | 500 h | 250 h | https://heavyvehicleinspection.com/blog/post/caterpillar-maintenance-schedule-2026 | media · por familia Cat PM1–PM4 (250/500/1 000/2 000) |
| Volvo | EC300DL (EC300D, EC300D L) | Excavadora | 500 h | 250 h | https://www.volvoce.com/united-states/en-us/about-us/news/2021/volvo-construction-equipment-extends-oil-change-intervals-to-1000-hours/ | media-alta · 1 000 h solo con aceite VDS-4.5 + filtro Volvo (no verificable en el sandbox: se usa 500 h) |
| Volvo | 60F (L60F) | Cargador frontal | 500 h | 250 h | misma fuente Volvo 2021 | media |
| John Deere | 310L (310 L) | Retroexcavadora | 500 h | 250 h | https://www.deere.com/assets/pdfs/common/qrg/310slhlf390996.pdf | alta · guía Deere cubre 310L PIN F390996–; 250 h si > 1 829 m, B20+ o polvo; filtros hidráulico y transmisión 1 000 h |
| John Deere | 770G (770 G, 770GP) | Motoniveladora | 500 h | 250 h | https://www.deere.com/assets/pdfs/common/qrg/770gf678818.pdf | alta |
| Case | CX350B (CX350 B) | Excavadora | 500 h | 250 h | https://ironworksinsider.com/articles/excavator-maintenance-schedule/ | media · hidráulico 1 000 h |
| JCB | 3CX (JCB 3CX) | Retroexcavadora | 500 h | 250 h | https://www.manualslib.com/manual/1639183/Jcb-3cx.html?page=50 | media-alta · 250 h filtro en condiciones duras |

Regla de "severo": donde el fabricante no publica un valor distinto, severo =
estándar ÷ 2 **y la fila lo dice** (`severoDeclaradoPorFabricante: false`). Es
la regla general de Deere y JCB para condiciones duras; se rotula como regla,
no como dato del fabricante.

---

## Paso 0 — Punto de partida

1. `git status` limpio sobre la rama del carril. `npm run typecheck && npm run
   lint && npm run test` verdes antes de tocar nada.
2. `npm run leer` en vivo: Prisma y Startrack responden.
3. **Verificar `NECT_EQUIPO_PROPIO`** contra `/api/maquinaria/equipos` en tu
   terminal (comparar `no_activo`, `id` y `clave`, sin imprimir valores). Si no
   coincide con ningún equipo, **detenerse y pedir al usuario el valor
   correcto** antes de llegar al Paso 9. Los Pasos 1–8 no dependen de esto.
4. Leer `lib/conectores/startrack.ts` (`leerReporteConductores`,
   `leerEstadoVehiculo`, `crearTarea`), `lib/conectores/prisma.ts`
   (`leerEquipo`, `leerFallas`), `lib/lectura/flota.ts`, `lib/propagacion/p1.ts`
   y `restriccion.ts`, `lib/inteligencia/contexto.ts` y `tipos.ts`,
   `components/nect/propagar-traslado.tsx` y `dialogo-accion.tsx`,
   `components/comando/ficha-equipo.tsx`, `tabla-excepciones.tsx`,
   `barra-superior.tsx`. Este prompt reutiliza esos patrones; no se reinventan.

---

## Paso 1 — 🟦 A · Contrato `lib/mantenimiento/tipos.ts`

Carpeta nueva `lib/mantenimiento/` (carril A; misma justificación que
`lib/optimizador/`: no cabe en conectores ni en canónico). Tipos, todos con
comentario de origen:

```ts
export type HorometroVivo = {
  vehiculoId: string
  horasMotor: number | null      // curOperatingHours (h)
  odometroKm: number | null      // curOdometer (km, odom_units = 1 en 14/14)
  linaje: Linaje                 // startrack · ajax/report.php?id=22 · curOperatingHours
}

export type FilaSerieDiaria = {
  vehiculoId: string
  fecha: string                  // AAAA-MM-DD, zona del reporte
  motorEncendidoSeg: number | null   // ignOnTime (segundos)
  enMovimientoSeg: number | null     // timeInMotion
  ralentiSeg: number | null          // idling
}

export type SerieDiaria = { desde: string; hasta: string; filas: FilaSerieDiaria[]; linaje: Linaje }

/** Proyección del reporte de falla de Prisma. Nunca `operator_name` ni `approver_name`. */
export type ReporteFallaPrisma = {
  id: string
  maquinariaId: string | null    // ver Paso 3: nombre real del campo a verificar cuando exista un reporte
  estado: string | null          // catálogo de 8 valores (01 E.2)
  esParo: boolean | null
  horometroHumano: number | null // hour_meter — NUNCA se compara con horasMotor
  categoria: string | null
  creadoEn: string | null
  actualizadoEn: string | null
  linaje: Linaje
}

export type MantenimientoEquipoPrisma = {
  fechaInicio: string | null; fechaFin: string | null; notas: string | null; linaje: Linaje
}

export type ParametrosMantenimiento = {
  version: 1
  porEquipo: Record<string, { intervaloHoras?: number; severo?: boolean }>
  umbrales?: { aviso: number; urgente: number; vencido: number }   // porcentajes, defecto 80/90/100
}

export type NivelIntervalo = 'sobreescrito' | 'aprendido' | 'declarado' | 'sin_dato'
export type NivelAlerta = 'aviso' | 'urgente' | 'vencido' | null
export type TipoAncla = 'mantenimiento_fecha_fin' | 'reporte_finalizado' | 'inicio_serie_gps'

export type IntervaloResuelto = {
  nivel: NivelIntervalo
  horas: number | null
  regimen: 'estandar' | 'severo' | null
  origen: string                 // texto para pantalla: "OEM Caterpillar 262D3, estándar" · "mediana de 3 reportes FINALIZADO" · "fijado a mano en este navegador"
  fuente: string | null          // URL del catálogo, endpoint de Prisma, o "navegador"
  confianza: 'alta' | 'media' | 'baja' | null
  oemHoras: number | null        // lo que diría el catálogo aunque esté sobreescrito, para el rótulo
}

export type PronosticoMantenimiento = {
  equipoId: string
  codigoActivo: string | null
  vehiculoId: string | null
  clase: string | null
  marcaModelo: string | null
  estadoTaller: 'operando' | 'en_taller' | 'parada_por_falla'
  ancla: { tipo: TipoAncla; fecha: string; linaje: Linaje } | null
  horasDesdeAncla: number | null
  horasMotorTotales: number | null
  intervalo: IntervaloResuelto
  avance: number | null          // horasDesdeAncla / intervalo.horas
  nivelAlerta: NivelAlerta
  ritmoHorasPorDia: number | null
  diasConMotorUltimos7: number
  fechaEstimadaAviso: string | null
  fechaEstimadaVencido: string | null
  registros: Linaje[]            // todo número usado, con endpoint, campo y hora
  parametrosAplicados: string[]  // "intervalo fijado a mano: 40 h", "régimen severo"
  faltantes: string[]            // "intervalo: sin fila OEM para <marca modelo> y sin historial"
  advertencias: string[]         // "la serie diaria y el contador difieren en 0.3 h"
  leidoEn: string
}

export type ResultadoMantenimiento = {
  pronosticos: PronosticoMantenimiento[]
  alertas: PronosticoMantenimiento[]   // nivelAlerta !== null, orden vencido > urgente > aviso, luego avance desc
  resumen: { equipos: number; conHorometro: number; conIntervalo: number; enAlerta: number; enTaller: number }
  salud: SaludFuente[]; degradacion: Degradacion; leidoEn: string
}
```

`Linaje`, `SaludFuente` y `Degradacion` se importan de `lib/tipos/canonico` y
`lib/lectura/flota`; no se duplican.

---

## Paso 2 — 🟦 A · Conector Startrack: dos lecturas y una escritura

En `lib/conectores/startrack.ts`, con el mismo `peticionAjax`/`peticionApiJson`,
reautenticación por cuerpo y `conCache`:

**2a. `leerHorometrosFlota(): Promise<RespuestaConector<HorometroVivo[]>>`**
`ajax/report.php?id=22&format=json&start_date=HOY&end_date=HOY&vehicle_ids=&driver_ids=&retdat=1`
(HOY en `America/El_Salvador`). De cada fila de `detail[]` sale **solo**
`vehicle_id`, `curOperatingHours`, `curOdometer`. Se descartan `place`,
`driver_id`, `route`, `heading`, `distance`, `duration`, `poiId` y el resto.
TTL 60 s. Constante `ID_REPORTE_FLOTA = 22`, junto a `ID_REPORTE_CONDUCTORES`.

**2b. `leerResumenDiario(desde, hasta): Promise<RespuestaConector<SerieDiaria>>`**
`ajax/report.php?id=3&format=json&start_date=…&end_date=…&vehicle_ids=&driver_ids=&retdat=1`.
De cada fila de `detail[]` sale **solo** `vehicleId`, `date` (recortado a
`AAAA-MM-DD`), `ignOnTime`, `timeInMotion`, `idling`. **`driver` se descarta
dentro del conector** (es un nombre — AGENTS.md §1.2). `summary`, matrices y
`fmtDates` se descartan. Varias filas por vehículo y día se conservan todas
(se suman en el cálculo). TTL 5 min. Constante `ID_REPORTE_RESUMEN_DIARIO = 3`.
Guardar `timezone` del cuerpo en el linaje (`valorCrudo: { timezone }`) para
que la ficha pueda decirlo.

**2c. `leerVehiculo(id)` y `actualizarEstadoVehiculo(id, status)`** —
escritura, misma familia que `crearTarea` (errores `ErrorEscritura`, sin
reintento en bucle):
1. `GET api/vehicle/{id}` → `data` (55 campos). Si falla, aborta: **nunca se
   manda un cuerpo que no salió de la propia API**.
2. `PUT api/vehicle/{id}` con el mismo objeto y `status` reemplazado por el
   texto `"1"` (Mantenimiento) o `"0"` (Normal) — `status` llega como texto;
   se respeta el tipo observado.
3. `GET api/vehicle/{id}` de verificación: `status` cambió y **ningún otro de
   los 55 campos cambió**. Si algo más cambió, se lanza `ErrorEscritura` con la
   lista de campos alterados y se **revierte** con el objeto original.
4. Devuelve `{ antes, despues, endpoint, metodo: 'PUT', hora }` para el rastro.

`engine_num`, `license_plate`, `vin` y `driver_id` viajan de ida y vuelta
dentro del cuerpo del PUT porque la API lo exige; **no se registran, no se
devuelven a la ruta, no se muestran**. El rastro solo nombra `status`.

**2d. `lib/canonico/tipos-crudos.ts`** — solo agregar campos numéricos-como-texto
a `EstadoVehiculoStartrackCrudo` (`odometer, ign_on_time, stat_date,
stat_ign_on_time`) con su comentario de observación. **No** se cambia ninguna
función de `lib/canonico/`.

---

## Paso 3 — 🟦 A · Conector Prisma: reportes proyectados, mantenimiento del equipo, PATCH

En `lib/conectores/prisma.ts`:

**3a. `leerReportesFalla(): Promise<RespuestaConector<ReporteFallaPrisma[]>>`**
Envuelve `leerFallas()` y proyecta. `operator_name`, `approver_name`,
`descripcion`, `observaciones`, `approver_comment` **no salen del conector**
(los tres últimos son texto libre de personal de ECON; §1.2 aplica igual).
⚠ **Hoy la lista está vacía.** El nombre del campo que enlaza el reporte con
el equipo no pudo observarse (la parte visible del esquema de la UI empieza en
`descripcion`). Implementar `maquinariaId` leyendo, en este orden,
`maquinaria_id` → `equipo_id` → `machinery_id`; si ninguno existe en la primera
fila real que aparezca, el conector devuelve `maquinariaId: null` y agrega la
advertencia *"el reporte no expone el id del equipo; no se une"*. **Nunca se
une por `maquinaria_nombre` ni por `clave`.** Anotarlo como hueco en el
reporte final si al terminar siguen sin existir reportes.

**3b. `leerMantenimientoEquipo(id)`** — usa `leerEquipo(id)` (ya cacheado por
S-A7) y proyecta `mantenimiento_fecha_inicio`, `mantenimiento_fecha_fin`,
`mantenimiento_notas`. Ampliar `DetalleEquipoPrismaCrudo` con esos tres campos
(`string | null`, observados vacíos en 17/17).

**3c. `programarMantenimiento(id, { fechaInicio, fechaFin, notas })`** —
`PATCH /api/maquinaria/equipos/{id}` con cuerpo JSON
`{ mantenimiento_fecha_inicio, mantenimiento_fecha_fin, mantenimiento_notas }`
(fechas `AAAA-MM-DD`, como todo Prisma). Luego `GET` de verificación: los tres
campos persistieron. Si el PATCH responde 2xx pero el GET no refleja las
fechas, lanzar `ErrorEscritura('prisma', endpoint, 'el PATCH no persistió las
fechas de mantenimiento')` — **no** intentar `…/estado` ni otro cuerpo por
cuenta propia: se reporta y el usuario decide. `notas` ≤ 500 caracteres
(límite del formulario de Prisma).

---

## Paso 4 — 🟦 A · `lib/mantenimiento/intervalos-oem.ts` (puro)

- `CATALOGO_OEM: FilaOem[]` con las 11 filas de la tabla de arriba:
  `{ marca, modelo, alias: string[], clase, estandarHoras, severoHoras,
  severoDeclaradoPorFabricante: boolean, fuente, confianza, nota }`.
- `claveOem(marca, modelo)`: minúsculas, sin espacios ni signos
  (`"John Deere" + "770 G"` → `johndeere770g`; `"Case" + "CX350 B"` →
  `casecx350b`; `"Volvo" + "60F"` → `volvo60f`).
- `buscarIntervaloOem({ marca, modelo })` prueba, en orden: marca+modelo,
  marca+alias, y **solo modelo** como último recurso (para la fila de Prisma
  con la marca mal escrita: modelo `JCB 3CX` → `jcb3cx`). Devuelve la fila o
  `null`; nunca "la más parecida".
- Prueba pura `intervalos-oem.test.ts`: cada fila tiene `fuente` (URL) y
  `confianza`; `estandarHoras > 0`; las 11 claves son únicas; las
  normalizaciones de arriba resuelven. (No usa registros de ECON: son las filas
  del catálogo.)

---

## Paso 5 — 🟦 A · Parámetros del navegador: contrato y validación

`lib/mantenimiento/parametros.ts` (puro):
- `parametrosSchema` (Zod): `version: 1`; `porEquipo` con ≤ 100 entradas,
  `intervaloHoras` entero 1..20 000, `severo` booleano; `umbrales` con
  `0 < aviso < urgente < vencido ≤ 500`. Defecto `UMBRALES_DEFECTO = { aviso: 80, urgente: 90, vencido: 100 }`.
- `leerParametrosDeQuery(searchParams)`: parsea `?parametros=<JSON>` (≤ 8 KB);
  inválido → 400 con el mensaje de Zod; ausente → `{ version: 1, porEquipo: {} }`.
- El servidor **no guarda nada**: aplica y devuelve `parametrosAplicados`.

---

## Paso 6 — 🟦 A · `lib/mantenimiento/calcular.ts` — **puro**

`calcularPronostico(entrada): PronosticoMantenimiento`, con
`entrada = { equipo: EquipoUnificado, marcaModelo: { marca, modelo }[] (Startrack primero, Prisma después),
horometro: HorometroVivo | null, serie: FilaSerieDiaria[] (del vehículo), reportes: ReporteFallaPrisma[] (del equipo),
mantenimiento: MantenimientoEquipoPrisma | null, parametros, hoy: 'AAAA-MM-DD', leidoEn }`.

Orden del cálculo — cada paso agrega su `Linaje` a `registros` o su texto a
`faltantes`:

1. **Estado de taller.** `mantenimiento.fechaInicio ≤ hoy < fechaFin` →
   `en_taller` (sin alerta; nota *"en taller hasta F"*). `equipo.falla` con
   paro activo → `parada_por_falla` (sin alerta). Si no, `operando`.
2. **Ancla.** Candidatas: `mantenimiento.fechaFin` si ≤ hoy; `actualizadoEn`
   (fecha) del reporte `FINALIZADO` más reciente del equipo. Gana la más
   reciente. Sin candidatas → `inicio_serie_gps` = primer día con fila en la
   serie del vehículo; `faltantes` recibe *"sin salida de taller registrada en
   Prisma: se cuenta desde el primer día con datos del GPS"*. Sin serie ni
   horómetro → `ancla: null`.
3. **Horas desde el ancla.** Σ `motorEncendidoSeg` ÷ 3600 de las filas con
   `fecha > ancla.fecha` (el día de salida **no** cuenta; se declara). Si la
   serie no llega hasta el ancla (primer día de la serie > ancla.fecha), se usa
   lo disponible y `advertencias` lo dice. Cruce: si hay `horometro.horasMotor`
   y el ancla es `inicio_serie_gps`, `|Σ serie − horasMotor| > 0.05` →
   advertencia *"la serie diaria y el contador difieren en X h"* (se sigue con
   la serie).
4. **Intervalo**, precedencia fija:
   1. `parametros.porEquipo[id].intervaloHoras` → `sobreescrito`, origen
      *"fijado a mano en este navegador"*, `oemHoras` = lo que diría el
      catálogo (o `null`).
   2. **Aprendido:** reportes `FINALIZADO` del equipo con `horometroHumano`
      numérico, ordenados por `creadoEn`; diferencias consecutivas; se
      descartan las ≤ 0 (con advertencia). Con ≥ 1 diferencia válida →
      mediana; confianza `baja` con 1–2 diferencias, `media` con 3–4, `alta`
      con ≥ 5. Origen *"mediana de N reportes FINALIZADO"*.
   3. **Declarado:** `buscarIntervaloOem` sobre `marcaModelo` (primera que
      resuelva). `regimen` = `severo` si `parametros.porEquipo[id].severo`,
      si no `estandar`. Origen *"OEM <marca> <modelo>, <régimen>"*, `fuente` =
      URL.
   4. `sin_dato`: `faltantes` recibe *"intervalo: sin fila OEM para <marca
      modelo> y sin reportes FINALIZADO con horómetro"*.
5. **Avance y nivel.** `avance = horasDesdeAncla / intervalo.horas` (null si
   falta cualquiera). Con `estadoTaller !== 'operando'` → `nivelAlerta: null`.
   Si no: `≥ vencido/100` → `vencido`; `≥ urgente/100` → `urgente`;
   `≥ aviso/100` → `aviso`; else `null`.
6. **Ritmo.** Σ horas de las filas con `hoy − 6 días ≤ fecha ≤ hoy` ÷ 7;
   `diasConMotorUltimos7` = días distintos con Σ > 0.
7. **Fechas estimadas.** `fecha = hoy + ceil((umbral × intervalo − horasDesdeAncla) / ritmo)` días,
   para aviso y vencido; ya superado → `hoy`; ritmo 0 o sin intervalo →
   `null` con `faltantes` *"ritmo 0 h/día en los últimos 7 días: sin fecha
   estimada"*.
8. `parametrosAplicados` lista cada parámetro que cambió el resultado.

Funciones auxiliares exportadas para las pruebas: `resolverAncla`,
`horasDesde`, `resolverIntervalo`, `intervaloAprendido`, `ritmo7d`,
`nivelPorAvance`. Fechas con `date-fns`/`Intl` en `America/El_Salvador`; nada
de `new Date()` sin zona.

---

## Paso 7 — 🟦 A · Orquestación y rutas

**`lib/lectura/mantenimiento.ts`** (server-only, mismo papel que `flota.ts`):
`leerMantenimiento(parametros): Promise<ResultadoMantenimiento>` y
`leerPronostico(equipoId, parametros)`:
1. `leerFlota()` (equipos unificados, datos crudos, salud, degradación).
2. En paralelo: `leerHorometrosFlota()`, `leerResumenDiario(hoy − 30 días, hoy)`,
   `leerReportesFalla()`, y `leerMantenimientoEquipo(id)` para cada equipo con
   contraparte (cacheado; el optimizador ya lee los detalles).
3. Por equipo: serie y horómetro por `vehiculoId` (identidad ya resuelta en
   `EquipoUnificado`), reportes por `maquinariaId === equipo.id`, marcas y
   modelos de `datos.vehiculos` (`make`, `model`) y `datos.equipos` (`marca`,
   `modelo`). `calcularPronostico(...)`.
4. Equipo sin contraparte en Startrack → pronóstico con `faltantes`
   *"sin vehículo unido en Startrack: no hay horómetro GPS"*; no se inventa.
5. Degradación: si Startrack está caída, todos quedan sin horómetro y la
   respuesta lo dice por `salud`/`degradacion`, igual que `flota.ts`.

**Rutas** (delgadas, `exigirSesion`, `force-dynamic`):
- `GET /api/mantenimiento?parametros=` → `ResultadoMantenimiento`.
- `GET /api/mantenimiento/[id]?parametros=` → `PronosticoMantenimiento` (404 si
  el equipo no existe en la lectura).

---

## Paso 8 — 🟦 A · O.D.I.N. recibe señales reales

- `lib/inteligencia/contexto.ts`: `crearContextoOdin(equipo, pronostico: PronosticoMantenimiento | null)`.
  `maintenance_signals` deja de ser `null` cuando hay pronóstico:
  `maintenance_overdue` = `avance ≥ umbral vencido` (null sin intervalo);
  `operating_hours_since_maintenance` = `horasDesdeAncla`;
  `maintenance_interval_hours` = `intervalo.horas`;
  `recent_failures` = reportes del equipo con `creadoEn` en los últimos 30 días
  (0 real si la lista está vacía y Prisma respondió);
  `abnormal_temperature_events` = `null` **siempre** (`sensor_readings` vacío
  en 14/14: no hay sensor; el índice lo declara faltante);
  `utilization_last_7d` = Σ horas 7 días ÷ (7 × 24), rotulado en el snapshot
  como *"fracción del tiempo calendario"*.
- `lib/inteligencia/tipos.ts`: `maintenance_signals` pasa a
  `z.object({...}).nullable()` espejo de `MaintenanceSignals` de Python;
  `solicitudOdinSchema` acepta `parametros` opcional (mismo schema del Paso 5).
- `app/api/odin/chat/route.ts`: lee el pronóstico del equipo con los
  parámetros recibidos y lo pasa al contexto.
- **Python no cambia**: el contrato `MaintenanceSignals` ya existe y el índice
  responde `UNKNOWN` cuando todo es `null`. Verificar en vivo que
  `EXPLAIN_MAINTENANCE_RISK` devuelve un nivel distinto de `UNKNOWN` para un
  equipo con horómetro e intervalo, y que la respuesta nombra
  `abnormal_temperature_events` entre los faltantes.

---

## Paso 9 — 🟦 A · Propagación P4 + P3: la orden de taller

**`lib/propagacion/taller.ts`** (server-only, mismo esqueleto que `p1.ts`):

`abrirOrdenTaller({ equipoId, fechaInicio, fechaFin, notas, rol })` — en orden,
cada paso aborta con `PropagacionRechazada(motivo)`:
1. `leerFlota()` → el equipo (`equipo_no_encontrado`), su `vehiculoId`
   (`sin_vehiculo`), su pronóstico actual (para las notas).
2. `equipo.equipo.valor === 'OBSOLETA'` → `equipo_obsoleto`. Ventana de
   mantenimiento vigente (`fechaInicio ≤ hoy < fechaFin` en Prisma) →
   `orden_ya_abierta`.
3. `fechaInicio ≤ fechaFin`, ambas `AAAA-MM-DD` (`fechas_invalidas`).
4. **`verificarRecursoPropio`** con `codigoActivo`, `equipoId`, `vehiculoId`,
   proyecto del equipo → `recurso_ajeno` (403). **Falla cerrada** si no hay
   `NECT_EQUIPO_PROPIO`.
5. Notas que van a Prisma: `"[ECON NECT] Orden de taller preventiva. Horómetro GPS: N h desde <ancla> · intervalo <M h, origen> · avance P %. " + notas del usuario`,
   recortado a 500. (Las cifras vienen de Startrack: escribir un dato del
   sandbox dentro del sandbox no viola §1.2.)
6. **P4** `programarMantenimiento(...)` → paso del rastro.
7. **P3** `actualizarEstadoVehiculo(vehiculoId, '1')` → paso del rastro. Si
   falla después de que P4 escribió: se devuelve `parcial: true` con ambos
   pasos y su resultado; **no se revierte P4** (una fecha de mantenimiento
   programada sin el estado en Startrack sigue siendo un hecho verdadero).
8. Rastro: `{ pasos: [{ plataforma, endpoint, metodo, campos: string[], hora, rol, resultado: 'ok' | 'error', mensaje? }], parcial, leidoEn }`.

`cerrarOrdenTaller({ equipoId, rol })`: guardas 1 y 4; **solo** P3 inverso
(`status '0'`). Prisma no se toca: `mantenimiento_fecha_fin` ya quedó
escrita y es el ancla del contador cuando la fecha pase. Si el vehículo no
está en `1`, `orden_no_abierta`.

**Ruta `POST /api/propagar/taller`**: cuerpo Zod
`{ accion: 'abrir' | 'cerrar', equipoId, fechaInicio?, fechaFin?, notas?: string ≤ 300, confirmado: z.literal(true) }`;
guardas en orden: sesión con rol que pueda programar taller (Paso 10a) →
`confirmado` → recurso propio (dentro de `taller.ts`). Mapa de motivos a
códigos como en `traslado/route.ts` (`recurso_ajeno` 403, `orden_ya_abierta`
409, `fechas_invalidas` 400, `fuente_no_disponible` 503, `ErrorEscritura` 502).

**Verificación en vivo, obligatoria antes de dar P3/P4 por buenos, y solo
sobre `NECT_EQUIPO_PROPIO`:**
1. PUT de **no-op** en Startrack (mismo cuerpo que el GET, sin cambiar nada):
   GET después idéntico en 55 campos. Si algo cambia → **P3 sale**, se reporta
   qué campos alteró, y `actualizarEstadoVehiculo` queda sin llamar desde la
   ruta.
2. PATCH de mantenimiento en Prisma con fechas de prueba → GET refleja las tres.
   Si no persiste → **P4 sale**, se reporta, y la UI muestra la orden como
   borrador copiable (Paso 11e) con el texto *"Prisma no aceptó las fechas por
   API; registrar a mano"*.
3. Abrir → verificar en las dos plataformas → cerrar → verificar `status 0`.
   Dejar el equipo propio como estaba (fechas de mantenimiento en `null` no se
   pueden volver a poner si el PATCH no acepta `null`: probar; si no, dejar la
   ventana en el pasado y anotarlo).

Correr `security-review` sobre `taller.ts` y la ruta antes de seguir.

---

## Paso 10 — 🟩 C · Acceso, KPIs, matriz, RACI

**10a. `lib/acceso/verificar.ts` + `servidor.ts`:** `puedeProgramarTaller(rol)` =
`MANTENIMIENTO | ADMIN`; `exigirSesionQuePuedaProgramarTaller(request)` con el
mensaje *"Según la RACI, la orden de taller la abre la Gerencia de
Mantenimiento"*. No cambia `puedePropagar` (P1 sigue siendo de Logística).
Prueba pura junto a las existentes de `verificar`.

**10b. `lib/kpi/catalogo.ts`:** dos KPIs con los seis campos:
- `avance-intervalo-mantenimiento` — *Avance al intervalo de mantenimiento*:
  qué mide (horas de motor GPS desde la última salida de taller ÷ intervalo
  vigente), por qué importa (el horómetro humano de Prisma solo se escribe
  cuando la máquina ya está en el taller; el GPS lo mide todos los días),
  fórmula, referencia (80/90/100 %, o el intervalo aprendido del propio
  equipo), acción (abrir la orden de taller antes del 100 %), por qué ninguna
  plataforma lo ve sola (Startrack tiene las horas; Prisma tiene el taller y el
  intervalo aprendido; ninguna cruza), `datoFaltante`: *"intervalo: hoy sale
  del catálogo OEM (parámetro con fuente) porque el sandbox no tiene reportes
  FINALIZADO con horómetro; sensores de temperatura y combustible: no
  existen"*.
- `equipos-en-alerta-preventiva` — *Equipos en alerta preventiva (N de M)*:
  conteo por nivel, acción (priorizar la orden de taller y sacar la máquina de
  la demanda del optimizador), `datoFaltante: null` (calculable; la cobertura
  se muestra a la vista: M = equipos con horómetro e intervalo).
- **Corregir `tiempo-muerto-quetzales`:** su `datoFaltante` afirma que las
  horas reales de uso no existen en el sandbox. **Sí existen** (reportes 22 y
  3 de Startrack, 13/14 vehículos). Reescribir: lo que falta son tarifa y
  mínimo contratado (2/17) — el KPI sigue no calculable, pero por otra razón.
  `lib/kpi/catalogo.test.ts` sigue verde.

**10c. `lib/mapeo/matriz.ts`:** filas nuevas, con evidencia estructural y
confianza:
- *Horómetro GPS* (`curOperatingHours` / `ign_on_time`) ↔ *Horómetro del
  reporte de falla* (`hour_meter`): **sin equivalencia directa** — dos
  instrumentos, dos escalas (el GPS arranca en 0 al instalarse); NECT solo usa
  deltas dentro de cada uno. Confianza alta.
- *Serie diaria de motor encendido* (`ignOnTime`, segundos, reporte 3): solo
  Startrack. Evidencia: 93 filas, 14 vehículos, Σ = contador en 14/14.
- *Mantenimiento programado del equipo* (`mantenimiento_fecha_inicio/fin/notas`):
  solo Prisma; vacío en 17/17; NECT lo escribe en P4.
- *Estado del vehículo `1 = Mantenimiento`* (Startrack) ↔ *mantenimiento
  programado / reporte activo* (Prisma): **hipótesis propagada por P3**, no
  observada en datos (0 vehículos en `1`, 0 reportes). Confianza media.
- Actualizar la fila *Mantenimiento (Startrack)* del diccionario: el módulo
  (proveedor, mecánico, odómetro, horómetro) **no está expuesto en la API del
  sandbox** (404 en las 20 rutas probadas bajo `ajax/*` y `api/*`); lo que sí
  existe es el horómetro GPS por reporte.

**10d. `lib/gobernanza/raci.ts`:** fila *"Abrir la orden de taller preventiva
(P4 + P3)"*: R y A Mantenimiento, C Logística (la máquina sale de operación),
I Proyectos y Costos; `estado: 'propuesta'`; fuente: este prompt.

---

## Paso 11 — 🟪 B · Interfaz

Carpeta nueva `components/mantenimiento/` (carril B). Reusar el baseline de
`ui-registry.md` §2 y los componentes de `components/nect/` (`VerOrigen`,
`BadgeOrigen`, `DialogoAccion`, `Faltantes`). Todo lo que muestre un número
lleva `VerOrigen` con su `Linaje`. Antes de tocar `ficha-equipo.tsx`,
`tabla-excepciones.tsx` o `barra-superior.tsx`, leerlos completos.

**11a. `parametros-navegador.ts`** (cliente): lee/escribe
`localStorage['nect.mantenimiento.parametros']` validando con
`parametrosSchema`; `try/catch` en cada acceso; sin `localStorage` funciona con
`{ version: 1, porEquipo: {} }`. Serializa a `?parametros=` para las rutas.

**11b. `proveedor-mantenimiento.tsx`** (cliente): un solo `fetch` a
`/api/mantenimiento?parametros=…` cada 60 s (pausado con la pestaña oculta,
sin corridas superpuestas — mismo patrón que el replan de `/planeacion`),
compartido por contexto a la bandeja, el badge y el notificador.

**11c. `tarjeta-mantenimiento.tsx`** — en la ficha (`app/(nect)/equipo/[id]`),
como sección nueva "Mantenimiento preventivo" debajo de las dimensiones.
Cliente; consume `/api/mantenimiento/{id}?parametros=`. Muestra, en este orden:
- gauge de avance (skill `dataviz`; color por nivel; sin intervalo, gauge vacío
  con el texto de `faltantes`),
- *"N h desde <tipo de ancla en llano> (<fecha>)"* con `VerOrigen`,
- *"Intervalo: M h · <origen>"*; si está sobreescrito: *"fijado a mano en este
  navegador · OEM: X h"* en tono de aviso,
- *"Ritmo: R h/día (D de 7 días con motor)"*, *"Al 80 % el <fecha>"*, *"Al 100 %
  el <fecha>"*,
- `estadoTaller` como badge (*en taller hasta F* / *parada por falla*),
- **"Registros usados (N)"** desplegable: una fila por `Linaje` (plataforma ·
  endpoint · campo · hora), la lista que el usuario pidió,
- `advertencias` y `faltantes` con `Faltantes`.

**11d. `panel-parametros.tsx`** — dentro de la tarjeta, sección "Parámetros de
este navegador": interruptor *"condiciones severas"* (muestra el valor severo
del catálogo y si es regla ÷ 2), campo *"intervalo a mano (h)"* con botón
*"volver al OEM"*, y umbrales (80/90/100) en un desplegable "avanzado".
Guardar → `localStorage` → refetch. Rótulo permanente: *"Estos parámetros viven
en este navegador; no se escriben en Prisma ni en Startrack."* Solo visible
para `MANTENIMIENTO` y `ADMIN` (lectura de rol desde la sesión como ya hace
`propagar-traslado.tsx`); los demás roles ven los valores, no los editan.

**11e. `dialogo-orden-taller.tsx`** — botón *"Crear orden de taller"* en la
tarjeta (solo `MANTENIMIENTO`/`ADMIN`; deshabilitado con `estadoTaller !==
'operando'` y con `equipo OBSOLETA`, con el motivo en tooltip). Diálogo con
`DialogoAccion`: fecha inicio (defecto hoy), fecha fin (defecto hoy + 1 día),
notas (≤ 300), resumen de lo que se va a escribir en **cada plataforma** (dos
bloques: *Prisma → PATCH equipos/{id}: mantenimiento_fecha_inicio, …* ·
*Startrack → PUT vehicle/{id}: status → Mantenimiento*), casilla de
confirmación y botón. Respuesta: el rastro paso por paso; `parcial` en ámbar
con qué faltó; `recurso_ajeno` como en P1 (*"solo sobre el equipo asignado a
nuestro equipo"*). Botón *"Cerrar orden"* cuando el vehículo está en
Mantenimiento. Si P4 salió en el Paso 9, el diálogo muestra el texto de la
orden como borrador copiable y solo ejecuta P3.

**11f. Bandeja** — `tabla-excepciones.tsx` (o una `fila-alerta-mantenimiento.tsx`
que la tabla renderiza al final de sus filas, según lo que menos toque el
componente existente): una fila por alerta con badge de nivel, *"N h de M h
(P %)"*, fecha estimada, rol **Mantenimiento**, acción *"Abrir orden de
taller"* (enlace a la ficha). Rótulo de sección: *"Mantenimiento preventivo —
no es una incoherencia entre plataformas; es una proyección de horas"*. Filtro
`?rol=MANTENIMIENTO` la muestra; los otros roles la ven solo en la vista total.

**11g. Badge en `barra-superior.tsx`:** ícono de llave con el número de
`resumen.enAlerta`; 0 → sin badge. Tooltip con el desglose por nivel.

**11h. `notificador-mantenimiento.tsx`:** botón *"Activar avisos del
navegador"* (pide permiso solo al hacer clic). Con permiso concedido, en cada
refresco del proveedor notifica los pares `(equipoId, nivel)` que no estén en
`localStorage['nect.mantenimiento.notificados']`; título *"ECON NECT ·
<código> al P % del intervalo"*, cuerpo con la fecha estimada; clic abre la
ficha. Sin permiso o sin API: no hace nada y no rompe. Solo mientras la
pestaña esté abierta; se dice en el tooltip.

**11i. O.D.I.N.** — `consola-odin.tsx` manda `parametros` del navegador en la
solicitud. Sugerencia rápida nueva: *"¿Cuándo le toca mantenimiento?"*.

Al terminar: skill `imprint` sobre cada componente nuevo en `ui-registry.md` §6.

---

## Paso 12 — Pruebas

Reglas: **ningún registro inventado** (memoria del proyecto: solo datos reales,
también en pruebas). Lo que se prueba con datos de ECON corre **en vivo**
(`npm run test:vivo`, `lib/mantenimiento/mantenimiento.vivo.test.ts`)
transformando insumos reales; lo puro se prueba solo cuando sus entradas son
parámetros nuestros, no registros del sandbox.

**Puras (`npm run test`):**
- `intervalos-oem.test.ts` (Paso 4).
- `parametros.test.ts`: Zod rechaza `intervaloHoras` 0, 20 001, decimal;
  umbrales desordenados; > 100 equipos; JSON > 8 KB.
- `calcular.test.ts` **solo** con entradas vacías o de parámetros: sin serie ni
  horómetro → `horasDesdeAncla null`, `nivelAlerta null`, `faltantes` nombra el
  horómetro; sin fila OEM ni reportes → `intervalo.nivel 'sin_dato'`; parámetro
  `intervaloHoras` sin serie → sigue sin alerta (no se inventa avance);
  `nivelPorAvance` en los tres umbrales y en el borde exacto.
- `restriccion`/`taller`: la ruta y `abrirOrdenTaller` rechazan `recurso_ajeno`
  con `NECT_EQUIPO_PROPIO` vacío o distinto (variables de entorno de prueba,
  no datos de ECON); rechazan sin `confirmado: true`; rechazan rol
  `LOGISTICA`.
- `acceso`: `puedeProgramarTaller`.
- `kpi/catalogo.test.ts` sigue verde con los dos KPIs nuevos.

**En vivo (`npm run test:vivo`):**
1. **Proyección sin PII:** ninguna fila de `leerResumenDiario` tiene la clave
   `driver`; ninguna de `leerHorometrosFlota` tiene `place`, `route` ni
   `driver_id`; ninguna de `leerReportesFalla` tiene `operator_name` ni
   `approver_name` (si la lista está vacía, la prueba verifica la proyección
   con el tipo y lo dice en el nombre del caso).
2. **Consistencia:** para cada vehículo con filas, `|Σ serie ÷ 3600 −
   horasMotor| < 0.05` (verificado 14/14 en planeación; la prueba lo vuelve a
   medir).
3. **Ancla transformada:** tomar un vehículo real con ≥ 3 días de serie;
   pasar a `calcularPronostico` un `mantenimiento` con `fechaFin` = su segundo
   día con filas; `horasDesdeAncla` debe ser Σ de las filas posteriores,
   calculada aparte en la prueba; `ancla.tipo === 'mantenimiento_fecha_fin'`.
4. **Bandas por parámetro:** con el mismo vehículo, `intervaloHoras` =
   `ceil(horas / 0.85)`, `ceil(horas / 0.95)` y `floor(horas)` → `aviso`,
   `urgente`, `vencido`; `intervalo.nivel === 'sobreescrito'` y `oemHoras` igual
   al catálogo; `parametrosAplicados` lo nombra.
5. **Régimen severo:** `severo: true` sobre un vehículo con fila OEM →
   `intervalo.horas === severoHoras` y `regimen 'severo'`.
6. **Sin dato honesto:** un equipo de Prisma **sin** contraparte en Startrack
   (existen: 17 equipos, 14 vehículos) → `horasDesdeAncla null`, sin alerta,
   `faltantes` lo dice.
7. **Ruta:** `GET /api/mantenimiento` sin sesión → 401/redirección; con
   sesión → `resumen.equipos === 17`, `conHorometro ≥ 13`.
8. **O.D.I.N.:** `EXPLAIN_MAINTENANCE_RISK` para un equipo con horómetro e
   intervalo devuelve `risk_level !== 'UNKNOWN'` y `missing_features` incluye
   `abnormal_temperature_events`. Se salta con mensaje si el servicio local no
   responde.
9. **P3/P4 (escritura):** solo con `NECT_PRUEBAS_ESCRITURA=1` y
   `NECT_EQUIPO_PROPIO` resuelto; abrir → verificar en ambas plataformas →
   cerrar → verificar. Sin esas variables se salta **diciendo por qué**.

**Reportar siempre el resultado real.** Nunca afirmar que una prueba pasó sin
haberla corrido.

---

## Paso 13 — Documentación (mismo carril que cada archivo)

- `AGENTS.md` §7.1: tres gotchas nuevos — (1) Startrack **sí** expone horómetro
  GPS (`ign_on_time` / reporte 22) y serie diaria en segundos (reporte 3);
  (2) `ignOnTime` del reporte 32 coincide con el acumulado del vehículo (6/6):
  **horas acumuladas, no minutos del día** — S-A10 lo asume mal y se corrige en
  otro prompt; (3) reportes 45 y 37 traen PII masiva y no se llaman nunca;
  `driver` del reporte 3 es un nombre. §1.2 "ojo concreto": agregar esos tres.
- `docs/01-DEFINICION-DE-NEGOCIO.md` Parte E: **E.11 "El horómetro sí existe —
  en la plataforma que nadie miraba"** (cuatro párrafos: qué hay, qué no hay,
  los dos instrumentos, por qué esto es la línea punteada 3 con datos).
- `prompts/README.md`: fila de S-A11 en la fase extendida.
- `.env.example`: `NECT_PRUEBAS_ESCRITURA=` con comentario. Ninguna otra
  variable nueva.

---

## Escalera de recorte interna

De primero a último en salir, si el reloj aprieta:

1. Notificación del navegador (11h).
2. Señales a O.D.I.N. (Paso 8) — `maintenance_signals` vuelve a `null`.
3. Segundo KPI y fila RACI (10b/10d) — queda al menos
   `avance-intervalo-mantenimiento`.
4. Umbrales editables (11d "avanzado") — quedan fijos 80/90/100.
5. P3 (estado en Startrack) — queda P4 solo, y el diálogo lo dice.
6. Intervalo aprendido (Paso 6.4.2) — hoy no cambia ningún resultado (0
   reportes); queda documentado como hueco.

**Nunca se recorta:** lectura del horómetro y la serie, cálculo puro, tarjeta
en la ficha con registros usados, fila en la bandeja, P4 con confirmación y
restricción de servidor, catálogo OEM con fuentes.

---

## Qué NO hacer

- **No** tocar `lib/canonico/` (salvo los cuatro campos crudos del Paso 2d) ni
  `lib/reglas/`. La alerta no altera veredicto, confianza ni la tasa de
  coherencia.
- **No** comparar `hour_meter` con `horasMotor`, ni sumar uno al otro, ni
  "calibrar" uno con el otro.
- **No** inventar un intervalo cuando no hay fila OEM ni historial: `sin_dato`
  y la pantalla dice qué falta.
- **No** llamar los reportes 45, 37 ni 13; **no** proyectar `driver`, `place`,
  `engine_num`, `license_plate`, nombres de personas ni texto libre de ECON.
- **No** crear tipos de tarea, geocercas ni tareas en Startrack; **no** crear
  reportes de falla en Prisma (no hay API); **no** usar `?action=…` sobre
  reportes de otros.
- **No** escribir sin `confirmado: true`, sin rol permitido, ni sobre un
  recurso que no sea `NECT_EQUIPO_PROPIO`. **No** ejecutar el PUT de Startrack
  antes del no-op del Paso 9.
- **No** persistir parámetros en el servidor ni agregar una base de datos.
- **No** mostrar un porcentaje sin su intervalo y su origen al lado.
- **No** hacer `git commit`, `push` ni merge.

---

## Terminado cuando

- `npm run typecheck`, `npm run lint`, `npm run test` verdes; `npm run
  test:vivo` corrido con su resultado real en el reporte (incluidos los casos
  que se saltaron y por qué).
- `/equipo/[id]` muestra la tarjeta con gauge, ancla, intervalo con origen,
  ritmo, fechas y la lista de registros usados, para un equipo con contraparte
  en Startrack; y muestra `faltantes` en llano para uno sin contraparte.
- Bajando el intervalo desde el panel de parámetros, la bandeja muestra la
  fila, el badge cuenta 1 y la fila se va al volver al OEM — sin recargar.
- La orden de taller escribe en Prisma y en Startrack sobre el equipo propio,
  devuelve el rastro con dos pasos, y "Cerrar orden" devuelve el vehículo a
  Normal; sobre cualquier otro equipo la ruta responde 403 **desde el
  servidor**.
- O.D.I.N. explica el riesgo con horas reales y nombra lo que falta.
- La matriz de mapeo declara *sin equivalencia directa* entre los dos
  horómetros, con evidencia.
- `ui-registry.md` §6 registra los componentes nuevos.
- Reporte final: archivos tocados · checklist de prueba manual · resultado
  real de cada check · qué no se pudo verificar (p. ej. la forma del PATCH si
  Prisma no aceptó las fechas; el campo de enlace del reporte si sigue sin
  haber reportes) · desviaciones del prompt · `git status`.
