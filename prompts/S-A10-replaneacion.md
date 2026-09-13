# S-A10 — Replaneación: KPIs de ahorro arriba, operador por rating y horas, vista Día y replan ante fallas

**Carriles A → C → B, en una sola sesión de implementación · fase extendida
([AGENTS.md §12.1](../AGENTS.md))**
**Si compite por la misma hora de Carril A con S-A4 (propagación P1), P1 va
primero. Siempre.**

> Leé [AGENTS.md](../AGENTS.md) (§1, §4.3, §7.1, §9, §12),
> [ui-registry.md](../ui-registry.md) completo y este prompt **completo** antes
> de escribir código. Reemplaza en parte a [S-A7](S-A7-optimizador.md),
> [S-B4](S-B4-calendario.md) y [S-C4](S-C4-kpis-optimizador.md): donde
> contradigan a este archivo, manda este.
>
> Planeado en sesión 1 el 13 de septiembre de 2026 a las 01:50 CST, con la
> cobertura del sandbox medida en vivo (solo conteos y nombres de campo).
> Skills: `nextjs-app-router` (ruta), `or-tools` (solver), `shadcn` y `dataviz`
> (tiles y vista Día), `imprint` al terminar la UI, `run` para probar en vivo.
>
> **Una sola sesión recorre los tres carriles, en el orden de los pasos.** Cada
> paso dice de qué carril es. No toques un directorio que ningún paso nombra.

---

## Objetivo

Que `/planeacion` responda cuatro preguntas de negocio sin que nadie tenga que
interpretar un hueco:

1. **¿Cuánto mejora este plan?** KPIs arriba de todo: tarifa, distancia, rating
   y horas de operador, comparados contra **la peor opción válida**, y
   **cuántas solicitudes quedan cubiertas**.
2. **¿Quién opera?** El operador se elige por **mejor rating** y por **menos
   horas trabajadas**, con datos reales de Startrack unidos a Prisma por código.
3. **¿Qué pasa en un día concreto?** Vista **Día** con horas de 00:00 a 24:00.
4. **¿Qué pasa si una máquina cae?** Si una máquina en uso entra en falla, el
   plan **se rehace solo** y dice qué cambió y por qué.

**Solo propone. No escribe nada en Prisma ni en Startrack.**

---

## Decisiones tomadas en planeación — no se renegocian

| Tema | Decisión |
|---|---|
| **Clima** | **Sale completo:** `lib/conectores/clima.ts`, Open-Meteo, clases sensibles, íconos de lluvia y KPI de lluvia |
| **Pila** | `distancia` · `tarifa` · **`ratingOperador`** · **`horasOperador`**. **Sale `holgura`. Sale `continuidadOperador`** |
| **Rating** | `scores[].safety_score` (0–100) del reporte de conductores de Startrack. Más alto = mejor |
| **Horas trabajadas** | Σ `detail[].ignOnTime` (motor encendido) de los **últimos 30 días**, hoy inclusive, `America/El_Salvador`. Menos = mejor. Unidad **minutos, inferida** (ver cobertura) |
| **Unión operador ↔ conductor** | El texto de `fn` de `ajax/drivers.php` **antes del primer `" - "`**, recortado, tiene que ser **idéntico** al `cod_trabajador` de Prisma y único en los dos lados. Si hay conflicto, no se une y se avisa. Nunca por nombre |
| **Sin actividad** | Operador **unido** a un conductor sin filas en `detail` dentro de la ventana → **0 h**, con el motivo *"sin actividad registrada en Startrack en los últimos 30 días"*. No es peor caso |
| **Sin dato** | Operador sin conductor unido, o sin fila en `scores` → `null` → **peor caso declarado** (rating: el mínimo observado; horas: el máximo observado), igual que la tarifa |
| **KPI de ahorro** | Contra **la peor opción válida** de cada solicitud, por objetivo y por separado. Se muestra siempre así rotulado |
| **Dinero** | **USD/h de diferencia, sin total.** El sandbox no tiene horas por jornada. Nota *"moneda inferida"* |
| **Cobertura** | Se renombra **"Solicitudes cubiertas: N de M"**, con la lista de las no cubiertas, su motivo y la acción |
| **Vista Día** | Filas por máquina, columnas 00:00–24:00. Bloques de **día completo** con la nota *"Prisma registra solicitudes y uso por fecha, sin hora"*. **Se elimina el panel lateral del día** |
| **Replan: disparo** | La página vuelve a optimizar **cada 60 s**, pausado con la pestaña oculta y sin corridas superpuestas |
| **Replan: alcance** | **Rehacer todo** (sin nivel de estabilidad). La semilla fija del solver ya da el mismo plan si los datos no cambiaron |
| **Replan: APROBADA rota** | Excepción acotada a la decisión del 13 sep. (APROBADA no se toca): **vuelve a la demanda solo si su máquina confirmada ya no puede operar** (`puedeOperar === false`). Se propone reemplazo con *"la asignación en Prisma no se modifica"* |
| **Replan: disparador de demo** | Se registra una falla o un paro **en Prisma, sobre `NECT_EQUIPO_PROPIO`**. NECT no escribe nada nuevo |
| **Diff de cambios** | Lo calcula **el servidor** (puro, en `ensamblar`), a partir del `planAnterior` que manda el navegador (solo ids). La UI solo muestra |
| **Formato** | Un solo prompt, orden A → C → B |

---

## Cobertura verificada el 13 de septiembre de 2026 (solo conteos)

Es contexto, **no una constante**. El código no asume ningún conteo.

| Insumo | Campo real | Cobertura observada |
|---|---|---|
| Reporte de conductores | `GET ajax/report.php?id=32&format=json&start_date=AAAA-MM-DD&start_time=00%3A00&end_date=AAAA-MM-DD&end_time=23%3A59&driver_ids=&retdat=1` (sesión por cookie, igual que el resto de `ajax/*.php`) | Top-level: `timezone`, `detail[]`, `detailAlerts[]`, `scores[]`. **No trae `success`** si la sesión es válida |
| Rating | `scores[]`: `driver_id` (number), `safety_score` (number, 0–100) + otros contadores | 9 conductores con fila; 4 valores distintos |
| Horas | `detail[]`: `driver_id`, `vehicle_id`, `date` (`AAAA-MM-DD`), `ignOnTime`, `movingTime`, `distance`… (una fila por conductor y día) | 10 conductores; `ignOnTime > 0` en 11 de 12 filas; **todos los valores ≤ 1440** → minutos (la web de Startrack los muestra en "horas, minutos") |
| Conductores | `ajax/drivers.php?cmd=list` → `data[]`: `i` (id, igual a `driver_id` del reporte), `fn`, `ln`, … | 16 conductores; `fn` con forma `"código - nombre"` en 15, y 1 sin `" - "` |
| Unión | prefijo de `fn` = `cod_trabajador` de Prisma | **15 de 16** operadores con exactamente un conductor; 0 duplicados. Los 9 de `scores` y los 10 de `detail` se unen a un operador |
| Operadores Prisma | `/api/maquinaria/operadores`: `id`, `cod_trabajador`, `nombre`, `proveedor`, `is_active`, `active_assignment_count` | 16. **No hay detalle por id** (`/api/maquinaria/operadores/{id}` → 405) |
| Horas del día | `solicitudes.fecha_inicio/fecha_fin`, `equipos.fecha_inicio_uso/fecha_fin_uso` | **0 con hora**: todo es fecha `AAAA-MM-DD` |

> ⚠ **PII (AGENTS.md §1.2).** `fn` trae el **nombre** del conductor después del
> código, y `detailAlerts[].driver.name` también. `drivers.php` trae además
> correo y teléfono. **Nada de eso sale del conector:** se proyecta al leer
> (Paso 2). Ningún `Linaje.valorCrudo` lleva un nombre. Nada se loguea.

---

## Paso 0 — Punto de partida

- Rama `thomas`. Hay cambios **sin commitear** de A y de B (adaptador, tipos,
  planear, timeline, `detalle-dia.tsx` y `flota.test.ts`). **Son la base: no los
  revientes ni los reviertas.** Corré `git status` y `git diff --stat` antes de
  empezar y reportalo.
- Levantá el solver (`services/solver`: `uv run uvicorn app.main:app --port 8000`)
  y verificá que `npm run test` pase **antes** de tocar nada. Anotá lo que ya
  fallaba.

---

## Paso 1 — 🟦 A · Contrato `lib/optimizador/tipos.ts`

Reescribí el contrato con esta forma. Podés ajustar la sintaxis y agregar
comentarios, pero no cambiar la forma. Lo que no aparece acá **se borra**
(`AlertaClima`, `AsignacionManual`, `clasesSensiblesLluvia`, `holgura`,
`continuidadOperador`, `continuidad`, `lluviaClasesSensibles`, `coberturaPlan`).

```ts
import { z } from 'zod'
import type { Dato, Linaje } from '@/lib/tipos/canonico'

/** Soft constraints disponibles: solo las que salen de campos reales. */
export const SOFT_CONSTRAINTS = ['distancia', 'tarifa', 'ratingOperador', 'horasOperador'] as const
export type IdSoftConstraint = (typeof SOFT_CONSTRAINTS)[number]

/** Ventana de horas trabajadas: 30 días que terminan hoy (inclusive), America/El_Salvador. */
export const DIAS_VENTANA_HORAS = 30

// ── Navegador → /api/optimizar ─────────────────────────────────────────────
export type AsignacionPlanAnterior = { solicitudId: string; maquinaId: string; operadorId: string }

export type PeticionOptimizar = {
  /** Índice 0 = se protege primero. Sin repetidos. Vacía = solo se maximiza la cobertura. */
  pila: IdSoftConstraint[]
  /** Solo ids del plan que el navegador tenía en pantalla. `null` = no calcular
   * cambios (carga inicial y "Re-optimizar" manual). NO influye en la
   * optimización: siempre se rehace todo. */
  planAnterior: AsignacionPlanAnterior[] | null
}
// + PeticionOptimizarSchema (Zod): pila del enum y sin repetidos; planAnterior
//   null o arreglo de ≤ 500 elementos, cada id string no vacío de ≤ 100 caracteres.

// ── Honestidad de cada valor ────────────────────────────────────────────────
export type ValorObjetivo = {
  valor: number | null            // valor real; null si no es calculable
  peorCasoAplicado: boolean       // true si el solver usó el peor caso porque valor es null
  motivo: string | null           // por qué es null / por qué peor caso / por qué 0 h
  unidad: 'km' | 'USD/h' | 'pts' | 'h'
  linaje: Linaje[]
}
export type ObjetivosAsignacion = Record<IdSoftConstraint, ValorObjetivo>

/** La peor opción que TAMBIÉN cumplía las hard constraints de esta solicitud,
 * evaluada por separado para cada objetivo, solo entre valores reales (nunca
 * un peor caso sustituido). Máquinas candidatas para distancia/tarifa;
 * operadores candidatos para rating/horas. */
export type PeorOpcionValida = {
  valor: number | null            // null si ninguna candidata tiene dato real
  candidatasValidas: number
  candidatasConDato: number
}

export type DestinoGeografico = { lat: Dato<number>; lon: Dato<number> }   // sin cambios

export type SolicitudPlan = { /* sin cambios, incluido `destino` */ }

/** Una APROBADA cuya máquina confirmada en Prisma ya no puede operar. */
export type ConfirmadaRota = {
  maquina: { id: string; codigoActivo: Dato<string> }
  motivo: string                  // el motivoNoOpera de esa máquina
}

export type AsignacionPropuesta = {
  solicitud: SolicitudPlan
  maquina: { id: string; codigoActivo: Dato<string>; clase: Dato<string> }
  operador: { id: string; codTrabajador: Dato<string> }
  objetivos: ObjetivosAsignacion
  peorOpcionValida: Record<IdSoftConstraint, PeorOpcionValida>
  reemplazaConfirmada: ConfirmadaRota | null
}

export type ConteoCandidatas = { /* sin cambios */ }

export type SolicitudSinAsignacion = {
  solicitud: SolicitudPlan
  motivo: string
  candidatas: ConteoCandidatas
  reemplazaConfirmada: ConfirmadaRota | null
}

export type SolicitudExcluida = { /* sin cambios */ }
export type OcupacionReal = { /* sin cambios */ }
export type FilaMaquina = { /* sin cambios */ }
export type NivelLexicografico = { /* sin cambios */ }

// ── Cambios respecto del plan anterior (replan) ────────────────────────────
export type LadoCambio = {
  maquina: { id: string; codigoActivo: string | null }
  operador: { id: string; codTrabajador: string | null }
}
export type CambioPlan = {
  solicitudId: string
  codigoProyecto: string | null
  antes: LadoCambio | null        // null = no estaba asignada en el plan anterior
  ahora: LadoCambio | null        // null = quedó sin asignación o dejó de ser evaluable
  motivo: string
}

export type CoberturaOperadores = {
  total: number                   // operadores de Prisma
  conConductor: number            // unidos 1:1 a un conductor de Startrack
  conRating: number
  conHoras: number                // incluye los de 0 h por falta de actividad
  ventanaHoras: { desde: string; hasta: string }
  conflictosIdentidad: number     // prefijos que no se unieron por ambigüedad
}

// ── KPIs (los calcula C en lib/kpi/optimizador.ts) ─────────────────────────
export type KpiAhorroObjetivo = {
  objetivo: IdSoftConstraint
  enPila: boolean
  mejoraTotal: number | null      // Σ por asignación comparable; positivo = el plan es mejor
  mejoraPromedio: number | null   // mejoraTotal / comparables
  unidad: 'km' | 'USD/h' | 'pts' | 'h'
  comparables: number
  asignaciones: number
  datoFaltante: string | null
}

export type SolicitudNoCubierta = {
  solicitudId: string
  codigoProyecto: string | null
  clase: string | null
  motivo: string
}

export type KpisOptimizador = {
  ahorroPorObjetivo: KpiAhorroObjetivo[]   // siempre los 4, en el orden de SOFT_CONSTRAINTS
  solicitudesCubiertas: {
    cubiertas: number
    evaluadas: number
    excluidas: number
    noCubiertas: SolicitudNoCubierta[]
    datoFaltante: string | null
  }
}

// ── Respuesta de /api/optimizar ────────────────────────────────────────────
export type RespuestaOptimizar = {
  generadoEn: string
  hoy: string
  horizonte: { desde: string; hasta: string }
  estado: 'optimo' | 'factible' | 'infactible'
  motivoInfactible: string | null
  pila: IdSoftConstraint[]
  niveles: NivelLexicografico[]
  maquinas: FilaMaquina[]
  asignaciones: AsignacionPropuesta[]
  sinAsignacion: SolicitudSinAsignacion[]
  excluidas: SolicitudExcluida[]
  cambios: CambioPlan[]           // [] si planAnterior es null o no cambió nada
  coberturaOperadores: CoberturaOperadores
  avisos: string[]
  kpis: KpisOptimizador | null
  kpisPendientesMotivo: string | null
}
export type RespuestaOptimizarSinKpis = Omit<RespuestaOptimizar, 'kpis' | 'kpisPendientesMotivo'>

export type ErrorOptimizar = { /* sin cambios */ }

// ── Formato de cable con services/solver: anonimizado, solo ids y enteros ──
export type EntradaSolver = {
  solicitudes: { id: string; inicioDia: number; finDia: number }[]
  pares: { solicitudId: string; maquinaId: string; distanciaM: number; tarifaCentavos: number }[]
  operadoresPorSolicitud: { solicitudId: string; operadorIds: string[] }[]
  /** Enteros con el peor caso ya aplicado. ratingDecimas = round(safety_score × 10). */
  operadores: { operadorId: string; ratingDecimas: number; minutosMotor: number }[]
  pila: IdSoftConstraint[]
  tiempoLimitePorNivelS: number   // 5
}
export type SalidaSolver = {
  estado: 'ok' | 'sin_asignaciones'
  asignaciones: { solicitudId: string; maquinaId: string; operadorId: string }[]
  niveles: { objetivo: 'cobertura' | IdSoftConstraint; valor: number; probadoOptimo: boolean }[]
}
```

---

## Paso 2 — 🟦 A · Conector `lib/conectores/startrack.ts` + `lib/canonico/tipos-crudos.ts`

Dos lectores nuevos. Los dos **proyectan dentro del conector**: lo que no se
necesita (nombres, correos, teléfonos, alertas) **no sale de la función**.

1. **`leerCodigosConductor(): Promise<RespuestaConector<CodigoConductorStartrack[]>>`**
   - Reusa `leerConductores()` (mismo caché, sin segunda llamada).
   - Por cada conductor devuelve **solo** `{ id: String(i), prefijoFn }`.
   - `prefijoFn` = el texto de `fn` antes del **primer** `" - "`, recortado. Si
     `fn` no contiene `" - "`, o el prefijo queda vacío → **`null`**. Nunca
     devuelvas `fn` entero: el conductor sin separador tiene solo nombre.
2. **`leerReporteConductores(desde: string, hasta: string): Promise<RespuestaConector<ReporteConductoresStartrack>>`**
   - Endpoint exacto de la tabla de cobertura, con `start_time=00%3A00` y
     `end_time=23%3A59`. Constante `ID_REPORTE_CONDUCTORES = 32`, con un
     comentario que diga que se verificó el 13 de septiembre de 2026.
   - Usa `peticionAjax` (reautentica por cuerpo `success:false` y por 401, igual
     que el resto).
   - Si el cuerpo no trae `scores` y `detail` como arreglos → `ErrorConector`
     *"respuesta sin scores/detail"*. **Nunca devuelvas vacío en silencio**
     (AGENTS.md §3.3).
   - Proyección: `scores` → `{ driver_id: string, safety_score: number | null }`;
     `detail` → `{ driver_id: string, date: string | null, ignOnTime: number | null }`.
     **`detailAlerts` se descarta entero.**
   - `conCache` con TTL de **5 min** (dato histórico), clave con el rango.

En `tipos-crudos.ts`: `CodigoConductorStartrack` y `ReporteConductoresStartrack`
con exactamente esos campos.

---

## Paso 3 — 🟦 A · Identidad operador ↔ conductor, `lib/canonico/identidad.ts` (puro)

```ts
export function resolverConductoresDeOperadores(
  operadores: OperadorPrismaCrudo[],
  conductores: CodigoConductorStartrack[],
): { conductorPorOperadorId: Map<string, string>; conflictos: number }
```

- Une si `prefijoFn === cod_trabajador` (**exacto**, después de recortar los dos).
- Si un `cod_trabajador` coincide con **más de un** conductor, o un prefijo con
  **más de un** operador → **no se une ninguno de esos** y cuenta un conflicto.
  **No se elige "el primero".**
- Sin coincidencia → el operador no aparece en el mapa.
- Las pruebas de S-A2 tienen que seguir pasando.

---

## Paso 4 — 🟦 A · Quitar el clima

- Borrá `lib/conectores/clima.ts`.
- En `planear.ts`: fuera `resolverClima`, `resolverClimaPorAsignacion`,
  `fechasEnVentana` (si nadie más la usa) y el import de clima.
- Buscá `clima|lluvia|Lluvia|open-meteo|Open-Meteo` en `apps/web/lib`,
  `apps/web/app`, `apps/web/scripts` y `services/`: **cero resultados** al
  terminar (los componentes los limpia el Paso 10).

---

## Paso 5 — 🟦 A · Insumos y adaptador

### 5a. `lib/optimizador/insumos.ts`

- `leerInsumosOptimizador(hoy: string)`. Suma, en paralelo con lo que ya lee:
  `startrack.leerCodigosConductor()` y
  `startrack.leerReporteConductores(hoy − 29 días, hoy)`.
- Devuelve `conductores`, `reporteConductores` (cada uno con su procedencia) y
  `ventanaHoras: { desde, hasta }`.

### 5b. `lib/optimizador/adaptador.ts` — **puro**

1. **Fuera:** `holgura` (cálculo, `holguraPorClave`, `holguraDias`),
   `continuidadOperador`, `continuidad`, `operadoresAsociadosPorMaquinaId` **como
   insumo de objetivo** (sigue sirviendo para H3), `manualPorSolicitudId`,
   `InfoManual` y `objetivosParciales` de la manual.
2. **APROBADA rota.** Se mantiene la regla del 13 sep. (una APROBADA no entra a la
   demanda), **salvo** que se cumplan todas estas condiciones:
   - `maquinaria_id` no nulo;
   - el equipo con ese id existe;
   - `puedeOperar(equipo) === false`;
   - tiene `fecha_inicio` y `fecha_fin`;
   - `fecha_fin ≥ hoy`.

   En ese caso entra a `solicitudesEvaluables` y queda registrada en
   `confirmadaRotaPorSolicitudId` con `{ maquina, motivo: motivoNoOperar(equipo) }`.
   Todo lo demás (H1/H2/H3, ocupación propia, candidatas) se le aplica igual que
   a una PENDIENTE. Su máquina rota queda fuera por H2 sin código especial.
3. **Rating y horas por operador** (con linaje real):
   - Unión con `resolverConductoresDeOperadores` (Paso 3).
   - **Rating:** fila de `scores` con `driver_id` igual al conductor unido. Si
     hay **más de una**, el valor es `null` con el motivo *"más de una
     calificación para el conductor"*: **no se promedia**. Unidad `pts`.
     Linaje: `ajax/report.php?id=32` · campo `scores[].safety_score`, más la
     unión `ajax/drivers.php?cmd=list` · campo `fn (código antes de " - ")` con
     `valorCrudo` = **solo el código**.
   - **Horas:** Σ `ignOnTime` de las filas de `detail` de ese conductor con
     `date` dentro de la ventana, ÷ 60, en unidad `h`. Si el conductor está unido
     pero no tiene filas → `0` con el motivo de la tabla de decisiones. Si alguna
     fila tiene `ignOnTime` null → se ignora esa fila y se agrega el aviso
     *"N filas de actividad sin ignOnTime"*.
   - **Sin conductor unido** → rating y horas `null`, con el motivo
     *"el operador no tiene un conductor de Startrack con el mismo código"*.
4. **Peor caso declarado** para `ratingOperador` y `horasOperador`, con la misma
   mecánica que ya tienen `distancia` y `tarifa`: sobre los operadores
   candidatos de esta corrida (la unión de `operadoresPorSolicitud`).
   - rating `null` → el **mínimo** observado;
   - horas `null` → el **máximo** observado;
   - `peorCasoAplicado: true` + motivo;
   - si nadie tiene dato → 0 y el aviso *"objetivo X sin datos en ningún
     candidato: no discrimina"*.
5. **`peorOpcionValida`** por solicitud evaluable y objetivo, **solo con valores
   reales** (`peorCasoAplicado === false` y `valor !== null`):
   - `distancia` y `tarifa`: el **máximo** entre los pares candidatos de esa
     solicitud;
   - `ratingOperador`: el **mínimo** entre sus operadores candidatos;
   - `horasOperador`: el **máximo** entre sus operadores candidatos.

   Guardalo en `peorOpcionPorSolicitudId`.
6. **`EntradaSolver`**:
   - `pares` sin `holguraDias`;
   - `operadores[]`: un elemento por operador candidato, con
     `ratingDecimas = round(rating × 10)` y
     `minutosMotor = round(horas × 60)`, ya con el peor caso aplicado;
   - sin `continuidad`;
   - **sin nombres, sin coordenadas, sin textos.**
7. **`coberturaOperadores`**: los conteos del contrato, sobre **todos** los
   operadores de Prisma.
8. **Avisos**:
   - peor caso aplicado en rating u horas (con el conteo);
   - *"N operadores sin conductor de Startrack con el mismo código"*;
   - *"N conflictos de identidad operador↔conductor: no se unieron"*.

---

## Paso 6 — 🟦 A · `services/solver/` (Python)

- `esquema.py`:
  - `IdSoftConstraint` y `ObjetivoNivel` con los ids nuevos;
  - `ParEntrada` sin `holgura_dias`;
  - fuera `ContinuidadEntrada` y `continuidad`;
  - nuevo `OperadorEntrada` (`operador_id`, `rating_decimas`, `minutos_motor`,
    alias camelCase) y `operadores` en `EntradaSolver`.
  - Validador: todo `operadorId` de `operadoresPorSolicitud` existe en
    `operadores` → si no, **422**.
- `modelo.py`:
  - Fuera `z`, `expr_holgura` y `expr_continuidad`.
  - `expr_rating` = `Σ rating_decimas[o] · y[t,o]` → **maximizar**.
  - `expr_horas` = `Σ minutos_motor[o] · y[t,o]` → **minimizar**.
  - Lexicográfico, tolerancia 0 y semilla fija: **sin cambios**.
- Nunca loguees el cuerpo.

---

## Paso 7 — 🟦 A · `ensamblar.ts` (puro) y `planear.ts`

### 7a. Ensamblar

- Asignaciones con:
  - `objetivos` (distancia, tarifa, rating, horas);
  - `peorOpcionValida`;
  - `reemplazaConfirmada` (de `confirmadaRotaPorSolicitudId`, o `null`).
- `sinAsignacion` con `reemplazaConfirmada`.
- `niveles` con unidades:

  | Objetivo | Unidad | Conversión |
  |---|---|---|
  | cobertura | `solicitudes` | — |
  | distancia | `km` | ÷ 1000 |
  | tarifa | `USD/h` | ÷ 100 |
  | ratingOperador | `pts (suma)` | ÷ 10 |
  | horasOperador | `h (suma, 30 d)` | ÷ 60 |

- `coberturaOperadores` y `avisos`.
- **`cambios`** (solo si `peticion.planAnterior !== null`). Para cada
  `solicitudId` de la unión entre el plan anterior y las asignaciones nuevas:
  - Si máquina y operador son iguales → **no hay cambio**.
  - Si no, un `CambioPlan` con `antes`/`ahora`. Los códigos se resuelven contra
    los datos de **esta** lectura; si el id ya no existe, el código va en `null`.
  - El `motivo` es **la primera regla que aplique**:
    1. la máquina de `antes` ya no puede operar →
       `"{codigoActivo} ya no puede operar: {motivoNoOpera}"`;
    2. el operador de `antes` ya no existe o no está activo →
       `"el operador {codTrabajador} ya no está activo en Prisma"`;
    3. `ahora === null` y la solicitud está en `excluidas` → su motivo de
       exclusión;
    4. `ahora === null` y está en `sinAsignacion` → su motivo;
    5. `ahora === null` y la solicitud ya no es evaluable (no aparece, o es
       APROBADA con máquina operable) → `"la solicitud cambió en Prisma"`;
    6. `antes === null` y tiene `reemplazaConfirmada` →
       `"su máquina confirmada ya no opera: {motivo}"`;
    7. `antes === null` → `"la solicitud entró al plan"`;
    8. si nada de lo anterior aplica →
       `"el plan se recalculó con los datos vivos del sandbox; ninguna restricción de esta asignación cambió"`.

  **No inventes un motivo más específico que ese.**

### 7b. Planear

Orden: `insumos(hoy) → adaptar → cliente → verificar → ensamblar → KPIs`.

---

## Paso 8 — 🟦 A · Ruta y script

- `app/api/optimizar/route.ts`: sin cambios de forma (valida con el Schema nuevo).
- `scripts/optimizar.ts`: `planear({ pila: [...SOFT_CONSTRAINTS], planAnterior: null })`.
  Además de lo que ya imprime, imprime **solo conteos** de:
  - `coberturaOperadores`;
  - asignaciones con `reemplazaConfirmada`.

  Nunca ids, códigos, fechas ni nombres.

---

## Paso 9 — 🟩 C · KPIs y mapeo

### 9a. `lib/kpi/catalogo.ts`

- **Borrá** `lluvia-clases-sensibles-optimizador`.
- **Reescribí** `ahorro-por-objetivo-optimizador`. Se conservan el id y los seis
  campos; los textos pueden pulirse, pero no cambiar su contenido.
  - **nombre:** *Ahorro del plan frente a la peor opción válida*
  - **queMide:** por cada solicitud que el plan cubre, cuánto mejor es la máquina
    y el operador elegidos que la peor opción que también cumplía todas las
    restricciones duras de esa solicitud, en tarifa efectiva (USD/h), distancia
    al proyecto (km), rating del operador (pts, Startrack) y horas trabajadas del
    operador (h con motor encendido, últimos 30 días).
  - **porQueImporta:** muestra el costo de asignar sin criterio dentro de lo que
    es válido: la diferencia entre la mejor y la peor decisión posible con la
    flota y la gente disponibles hoy. Es el argumento de costo por hora,
    traslado, seguridad y reparto de carga, con su cobertura a la vista.
  - **formula:** por objetivo, Σ sobre las asignaciones comparables de
    (peor − elegido) para tarifa, distancia y horas, y (elegido − peor) para
    rating. Positivo = el plan es mejor. Comparable = valor elegido real (no nulo
    y sin peor caso) y peor opción con dato real. Para rating se muestra además
    el promedio por asignación.
  - **referencia:** contra 0 (elegir la peor opción válida). La peor opción se
    evalúa por separado para cada objetivo y solo entre valores reales.
    Cobertura verificada el 13 de septiembre de 2026:
    - tarifa efectiva en 8 de 16 equipos;
    - rating en 9 de 16 operadores;
    - horas en 10 de 16 (0 h si el conductor unido no tuvo actividad);
    - unión operador↔conductor por código en 15 de 16.

    Sin total en USD: el sandbox no registra horas por jornada. Moneda: USD
    inferido.
  - **accionQueDispara:** confirmar con Logística la asignación propuesta antes de
    asignar a mano. Si un objetivo tiene baja cobertura, pedir que se registre el
    dato faltante (tarifa efectiva en Prisma, o el código de trabajador en el
    nombre del conductor en Startrack).
  - **porQueNingunaPlataformaLoVeSola:** Prisma tiene las solicitudes, la
    disponibilidad y la tarifa; Startrack tiene las geocercas, la calificación y
    las horas de motor de cada conductor. Ninguna une al operador con su
    conductor ni compara la decisión contra las alternativas válidas.
- **Reescribí** `cobertura-plan-optimizador` (se conserva el id):
  - **nombre:** *Solicitudes cubiertas por el plan*
  - **queMide:** de las solicitudes con período vigente (PENDIENTE, y APROBADA
    cuya máquina confirmada ya no puede operar), cuántas tienen máquina y
    operador que cumplen todas las restricciones duras.
  - **formula:** cubiertas de evaluadas, donde evaluadas = cubiertas + sin
    asignación posible. Las excluidas se reportan aparte.
  - **accionQueDispara:** por cada no cubierta, según su motivo: rentar
    (0 máquinas de la clase), reprogramar (máquinas ocupadas en la ventana) o
    reasignar operador.
  - Los demás campos se ajustan a este sentido.

### 9b. `lib/kpi/optimizador.ts` — **puro**

`calcularKpisOptimizador(respuesta: RespuestaOptimizarSinKpis): KpisOptimizador`

- **`ahorroPorObjetivo`:** los 4 objetivos, en el orden de `SOFT_CONSTRAINTS`.
  - `enPila` = el objetivo está en `respuesta.pila`.
  - `asignaciones` = total de asignaciones.
  - `comparables` = asignaciones con `objetivos[o].valor !== null`,
    `!peorCasoAplicado` y `peorOpcionValida[o].valor !== null`.
  - `mejoraTotal` = Σ con el sentido de la fórmula.
  - `mejoraPromedio` = `mejoraTotal / comparables`.
  - `unidad` = la del objetivo.
  - Si `comparables === 0` → `mejoraTotal` y `mejoraPromedio` en `null`, y
    `datoFaltante` con los **motivos reales** sin repetir. Si no hay
    asignaciones: *"El plan no cubre ninguna solicitud."*
- **`solicitudesCubiertas`:**
  - `cubiertas` = asignaciones; `evaluadas` = cubiertas + sin asignación;
    `excluidas` = excluidas.
  - `noCubiertas` = `sinAsignacion` proyectado a `SolicitudNoCubierta`.
  - Si `evaluadas === 0` → `datoFaltante: 'No hay solicitudes con período vigente para evaluar.'`

### 9c. `lib/mapeo/matriz.ts`

- La fila de *"operador asignado ↔ Asignar/Conductor"* sube a `confianza: 'alta'`
  en la parte de la unión por código. Evidencia **estructural**: *"verificado
  contra la API real el 13 de septiembre de 2026: `fn` de `ajax/drivers.php` con
  forma `código - nombre`; el prefijo coincide exacto y 1:1 con `cod_trabajador`
  en 15 de 16 operadores; 0 duplicados"*. **Sin pegar ningún valor.**
- Dos filas nuevas, `tipoRelacion: 'solo en Startrack'`, `campoPrisma: null`:
  - *Calificación de seguridad del conductor* —
    `scores[].safety_score` (reporte 32).
  - *Horas con motor encendido por conductor y día* — `detail[].ignOnTime`
    (reporte 32). Unidad **minutos inferida** (todos los valores ≤ 1440 y la web
    los muestra en horas y minutos), `confianza: 'media'`.

---

## Paso 10 — 🟪 B · UI de `/planeacion`

**Territorio:** `components/calendario/`, `app/(nect)/planeacion/`,
`components/nect/` si hace falta, `components/ui/`. Ni `lib/` ni `app/api/`.

### 10a. Limpieza

- **Borrá** `clases-sensibles-lluvia.tsx` y `detalle-dia.tsx`.
- Fuera de `timeline-maquinas.tsx`, `planeador.tsx` y `detalle-asignacion.tsx`:
  todo `CloudRain`, lluvia, clima y `manual`.

### 10b. `objetivos.ts` y `pila-prioridades.tsx`

| Id | Rótulo en la pila | Nombre corto |
|---|---|---|
| `distancia` | Distancia al proyecto (km, en línea recta) | Distancia |
| `tarifa` | Tarifa efectiva (USD/h, moneda inferida) | Tarifa |
| `ratingOperador` | Operador con mejor rating (Startrack, 0–100) | Rating de operador |
| `horasOperador` | Operador con menos horas trabajadas (motor encendido, 30 días) | Horas de operador |

Debajo de la pila, en `text-muted-foreground`, va la cobertura:
*"Rating disponible para {conRating} de {total} operadores · horas para
{conHoras} de {total} · sin dato = peor caso declarado"*.

### 10c. Orden de la página (`planeador.tsx`)

1. `BarraSuperior`, con la última lectura y *"se actualiza cada 60 s"*.
2. Aviso compacto: *"Propuesta del optimizador — no se escribe nada en Prisma ni
   Startrack."*
3. **Fila de KPIs** (10d), la primera sección de contenido.
4. **Aviso de cambios** (10f), si hay.
5. Pila de prioridades + resumen de niveles, con **Re-optimizar**.
6. **Calendario**, con selector **Semana | Día** (10e).
7. Excluidas y avisos.

### 10d. `tiles-kpi-optimizador.tsx` — la fila de arriba

Leé la skill `dataviz` (stat tiles). Cinco tiles en una grilla responsiva:

| Tile | Cifra principal | Línea de cobertura |
|---|---|---|
| Tarifa | `{mejoraTotal} USD/h menos` | *"vs. la peor opción válida · {comparables} de {asignaciones} asignaciones con dato · moneda inferida"* |
| Distancia | `{mejoraTotal} km menos` | *"vs. la peor opción válida · {comparables} de {asignaciones}"* |
| Rating de operador | `+{mejoraPromedio} pts por asignación` | *"vs. el operador válido de menor rating · {comparables} de {asignaciones}"* |
| Horas de operador | `{mejoraTotal} h menos (30 d)` | *"vs. el operador válido con más horas · {comparables} de {asignaciones}"* |
| Solicitudes cubiertas | `{cubiertas} de {evaluadas}` | Lista corta de `noCubiertas`: código · clase · motivo; debajo, la acción del catálogo. Si hay excluidas: *"{excluidas} excluidas (período vencido)"* |

- Si `enPila === false` → etiqueta *"no está en la pila: el plan no lo
  optimizó"*.
- Si la cifra es `null` → `datoFaltante`, **nunca** un 0 inventado.
- "Ver fórmula" desde `CATALOGO_KPI`.
- Mientras carga, skeleton de la fila.
- **Colores:** el de marca o neutros. **Nunca** un color de veredicto
  (ui-registry §1).

### 10e. Calendario: Semana | Día

- **Semana** es lo que ya existe, sin lluvia. Clic en la **cabecera de un día**
  → vista Día de esa fecha. El clic en una barra sigue abriendo
  `DetalleAsignacion`.
- **Día** (`vista-dia.tsx`, nuevo):
  - Cabecera: `‹` fecha legible `›` (navega día a día dentro de `horizonte`),
    *"Hoy"* si corresponde, y **"Volver a semana"** (vuelve a la semana que
    contiene la fecha).
  - Resumen, filtrando la misma respuesta: *"{n} máquinas con ocupación ·
    {n} propuestas · {n} sin asignación posible"*.
  - Grilla con la columna de máquina fija (mismas etiquetas y motivos que la
    semana) y **24 columnas de hora**, rotuladas `00:00 … 23:00`, con `24:00` al
    cierre, y scroll horizontal en su propio contenedor. Si la fecha es hoy, una
    línea vertical en la hora actual de `America/El_Salvador`.
  - Carril superior *"Sin asignación posible"* con las solicitudes activas ese
    día: neutro, borde discontinuo, nunca rojo ni violeta.
  - Bloques de **00:00 a 24:00**:
    - **Ocupación real (Prisma):** gris rayado. Si la máquina `!puedeOperar`, el
      texto agrega *"la máquina ya no opera"*.
    - **Propuesta:** color de marca, `PROY-### · MOT-###`. Si
      `reemplazaConfirmada`, una etiqueta *"Reemplaza a {codigo} (confirmada en
      Prisma)"*.
  - Nota fija bajo la grilla: *"Prisma registra solicitudes y uso de maquinaria
    por fecha, sin hora: cada bloque cubre el día completo."*
- La posición de los bloques es presentación. **No calcules choques ni
  candidatas.**

### 10f. Replan automático y aviso de cambios

- **Cada 60 s**, si `document.visibilityState === 'visible'` y no hay otra
  petición en curso: `POST /api/optimizar` con la **última pila aplicada** (no
  la editada sin aplicar) y `planAnterior` = las asignaciones en pantalla (solo
  ids).
- La carga inicial y el botón **Re-optimizar** mandan `planAnterior: null`.
- La actualización automática **no** muestra skeleton ni resetea la vista
  (semana o día, fecha, detalle abierto).
- Si falla, se conserva el plan en pantalla y aparece un aviso no bloqueante:
  *"La actualización automática falló: {mensaje}. Se reintenta en 60 s."*
- Si `respuesta.cambios.length > 0`: `Alert` neutro con ícono
  (`ArrowRightLeft`), sin color de veredicto.
  - Título: *"Plan rehecho por un cambio en el sandbox · {hora}"*.
  - Una línea por cambio: `PROY-### — {antes: CF-01 · MOT-013 | "sin asignar"} → {ahora | "sin asignación posible"} — {motivo}`.
  - Botón **"Entendido"** para cerrarlo. Una actualización con cambios nuevos lo
    reemplaza.
- Asignaciones con `reemplazaConfirmada`, en la semana y en el detalle: la
  etiqueta *"Reemplazo propuesto — la asignación en Prisma no se modifica"*.

### 10g. `detalle-asignacion.tsx`

- Tabla de objetivos con columnas **Plan** · **Peor opción válida** ·
  **Mejora**, con unidades.
  - `Sin registro` + motivo si es `null`.
  - *"peor caso declarado"* + motivo si corresponde.
  - El motivo de *"0 h — sin actividad registrada"*.
- Fila de rating y fila de horas con **Ver origen** (reporte 32 + unión por
  código). Nunca un nombre.
- Si `reemplazaConfirmada`: máquina confirmada, su motivo y la leyenda de que
  Prisma no se modifica.

Al terminar: `imprint` en ui-registry §6. Hay que registrar `vista-dia`, el
aviso de cambios y los tiles, y **quitar** `clases-sensibles-lluvia` y
`detalle-dia`.

---

## Paso 11 — Pruebas

**Reglas de siempre:**
- **Sin datos inventados.** Cada caso especial se arma filtrando o transformando
  insumos leídos en vivo.
- Sin snapshots y sin escribir archivos.
- **Ningún valor en un mensaje de falla:** calculá un booleano o un conteo y
  hacé `expect` sobre eso.
- Si falta el sandbox o el solver, la prueba **falla con mensaje etiquetado**.
  Nunca `skip`.

### `lib/optimizador/optimizador.vivo.test.ts`

Se mantienen 1 (hard constraints), 2 (sin candidatas), 3 (infactible), 5
(verificador), 6 (peor caso de distancia), 6b (APROBADA operable no entra) y la
ruta (petición con `pila: ['inexistente']` → 400), ajustados al contrato.

**Sale** la 7 (clima). **Cambia** la 4 y **entran**:

- **4. Lexicográfico.** Como está, más una segunda comparación entre
  `['ratingOperador','horasOperador']` y `['horasOperador','ratingOperador']`,
  con la misma propiedad de ≤ por nivel y cobertura igual.
- **7. Identidad sin fugas.**
  - `resolverConductoresDeOperadores` sobre datos vivos: ningún operador con dos
    conductores y ningún conductor con dos operadores.
  - `conConductor > 0`; si no, falla etiquetada.
  - Leyendo `drivers.php` crudo **en la prueba**: ningún `fn` completo que
    contenga `" - "`, ni el texto después del separador, aparece en
    `JSON.stringify(respuesta)`. `expect(fugas).toBe(0)`.
- **8. Reporte proyectado.** Cada elemento de `scores` y de `detail` que
  devuelve `leerReporteConductores` tiene **solo** las claves permitidas, y la
  respuesta no tiene `detailAlerts`.
- **9. Peor caso de operador.** Todo operador sin conductor unido tiene rating y
  horas con `peorCasoAplicado: true` y su motivo. Todo operador unido sin filas
  en la ventana tiene horas `0` y `peorCasoAplicado: false`.
- **10. APROBADA rota.**
  - Tomá los insumos vivos y una APROBADA con `maquinaria_id` cuyo equipo exista.
    Si no hay ninguna, falla etiquetada: *"el sandbox no tiene una APROBADA con
    máquina para probar"*.
  - En una **copia**, poné `active_failure_is_paro = true` a ese equipo.
  - Resultado esperado: la solicitud aparece en `asignaciones` o en
    `sinAsignacion`, con `reemplazaConfirmada.maquina.id` igual a ese equipo, y
    **ninguna** asignación usa esa máquina.
- **11. Cambios.**
  - Corré el plan A con `planAnterior: null` sobre insumos vivos. Si no hay
    asignaciones, falla etiquetada.
  - Tomá la máquina de una asignación de A y, en una copia de los insumos,
    marcala con paro.
  - Corré con `planAnterior` = ids de A.
  - Resultado esperado: `cambios` incluye esa solicitud, con un `motivo` que
    contiene el `motivoNoOpera` de la máquina, y ninguna asignación nueva usa esa
    máquina.
  - Sin la mutación, con `planAnterior` = ids de A → `cambios` vacío (semilla
    fija, **el mismo objeto de insumos**, sin releer). Si algún nivel de las dos
    corridas tiene `probadoOptimo: false`, reportá esta aserción como **no
    concluyente**, no como pasada: CP-SAT sin óptimo probado puede devolver otra
    solución.

### `lib/kpi/optimizador.vivo.test.ts`

Sale el caso de lluvia. Entran o se ajustan:

- **Cubiertas:** `cubiertas === asignaciones.length`,
  `evaluadas === cubiertas + sinAsignacion.length` y
  `noCubiertas.length === sinAsignacion.length`.
- **Ahorro:**
  - `comparables` nunca cuenta un valor nulo o con peor caso;
  - **toda mejora por asignación comparable es ≥ 0** (lo elegido es una opción
    válida con dato real y la peor es el extremo entre esas);
  - `mejoraTotal` coincide con una suma manual hecha en la prueba.

### `lib/kpi/catalogo.test.ts`

Los ids del optimizador son 2 (`ahorro-por-objetivo-optimizador`,
`cobertura-plan-optimizador`), cada uno con sus seis campos no vacíos, y ya no
existe el de lluvia.

**Comandos:** `npm run typecheck`, `npm run lint`, `npm run test`,
`npm run test:vivo` (con el solver levantado) y `npm run build`. **Reportá el
resultado real de cada uno.**

---

## Escalera de recorte interna

Si el reloj aprieta, se corta **de abajo hacia arriba**. Nunca un paso de arriba
por uno de abajo:

1. Pasos 1–9 (contrato, rating y horas, sin clima ni holgura, APROBADA rota,
   cambios, KPIs y mapeo). **No se cortan.**
2. Paso 10a–10d y 10f–10g (limpieza, pila, KPIs arriba, replan con aviso,
   detalle).
3. Paso 10e, **vista Día**: lo primero que se corta. Si se corta, el panel
   lateral del día **igual se elimina** (el usuario no lo quiere) y se reporta
   como pendiente.

---

## Qué NO hacer

- ❌ No unas operador y conductor por nombre, por parecido ni "por el primero".
  Solo prefijo exacto y 1:1.
- ❌ No devuelvas `fn` entero, un nombre, un correo ni un teléfono fuera del
  conector. Tampoco en `Linaje.valorCrudo`, logs ni mensajes de prueba.
- ❌ No inventes horas por jornada, total en USD ni horas del día. Los bloques
  del día son de 00:00 a 24:00 porque el dato es por fecha.
- ❌ No promedies calificaciones duplicadas ni conviertas un `null` en 0, salvo
  la regla de *"unido sin actividad = 0 h"*.
- ❌ No agregues un nivel de estabilidad: el replan rehace todo.
- ❌ No escribas en Prisma ni en Startrack, ni agregues un botón de mantenimiento.
- ❌ No calcules el diff de cambios, los KPIs ni las candidatas en el cliente.
- ❌ No toques `lib/tipos/canonico.ts`, `lib/reglas/`, `lib/acceso/` ni
  `lib/gobernanza/`.
- ❌ No instales dependencias.
- ❌ No hagas `git commit`, `push` ni merge.

## Terminado cuando

- `npm run optimizar` imprime estado, conteos, niveles con los ids nuevos,
  `coberturaOperadores` y reemplazos, todo desde el sandbox vivo.
- Con `grep` no queda `clima`, `lluvia`, `holgura`, `continuidadOperador` ni
  `Open-Meteo` en `apps/web` ni en `services/`.
- `/planeacion` (probado con `run`):
  - abre con la fila de KPIs arriba;
  - la pila tiene los 4 objetivos nuevos;
  - clic en un día abre la vista Día con horas;
  - apagar y prender el solver muestra el error y se recupera.
- `typecheck`, `lint`, `test`, `test:vivo` y `build` pasan.

**Checklist manual para el usuario** (no lo puede hacer el agente):

1. En la web de Startrack → Conductores, con un rango de 30 días, confirmar que
   la columna de horas coincide con `ignOnTime` ÷ 60 de un mismo conductor. Si
   no coincide, avisar **antes** de la demo: la unidad es una inferencia.
2. Antes de la demo, verificar en `/planeacion` que `NECT_EQUIPO_PROPIO`
   aparezca en una asignación o en una ocupación confirmada. Si no, la falla no
   dispara ningún reemplazo visible.
3. Demo: registrar una falla o un paro **en Prisma sobre `NECT_EQUIPO_PROPIO`**
   (nunca sobre equipo de otro de los 13 equipos). En ≤ ~105 s (caché de 45 s +
   ciclo de 60 s) aparece *"Plan rehecho…"* con el reemplazo.
4. Al terminar la demo, cerrar la falla en Prisma para no dejar el sandbox
   alterado.

Reportá: archivos tocados · **resultado real** de cada comando · qué no se pudo
verificar · desviaciones de este prompt · `git status`.
