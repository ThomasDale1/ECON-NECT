# S-A7 — Optimizador de planeación: contrato, solver CP-SAT y adaptador en vivo

> ⚠ **Reemplazado en parte por [S-A10](S-A10-replaneacion.md) (13 sep. 2026,
> 01:50 CST).** Ya no rigen:
> - el clima: `clima.ts`, Open-Meteo, `AlertaClima` y `clasesSensiblesLluvia`;
> - los objetivos `holgura` y `continuidadOperador`;
> - `AsignacionManual` y la exclusión total de las APROBADA (vuelven a la
>   demanda si su máquina deja de operar).
>
> El contrato vigente es el de S-A10. Donde este archivo contradiga a S-A10,
> manda S-A10.

**Carril A · fase extendida, priorizada tras S-C2 ([AGENTS.md §12.1](../AGENTS.md))**
**Si S-A7 compite por la misma hora con S-A4 (propagación P1), P1 va primero.
Siempre.**

> Leé [AGENTS.md](../AGENTS.md) (§1, §4.3, §9, §12) y
> [01 Parte C, D.7, E.2, E.4 y E.10](../docs/01-DEFINICION-DE-NEGOCIO.md) antes de
> escribir código. Leé este prompt **completo**: el Paso 1 es el contrato que
> destraba a B (S-B4) y a C (S-C4), y va primero.
>
> Planeado en sesión 1 el 12 de septiembre de 2026, con la cobertura del sandbox
> medida en vivo (solo conteos). Skills: `nextjs-app-router` para la ruta;
> `or-tools` para el modelo. Si esta última no está en `.claude/skills/`, buscala
> con `npx skills find or-tools`; si no hay una de calidad razonable, reportá el
> hueco y usá la documentación oficial de CP-SAT.

---

## Objetivo

Para cada **solicitud de maquinaria real** de Prisma, proponer **qué máquina y
qué operador** asignar en las fechas que pidió el solicitante:

- sin romper nunca una hard constraint,
- optimizando la pila de prioridades del usuario en orden **lexicográfico**,
- y diciendo **por qué**, en lenguaje de negocio, cuando una solicitud no se
  puede cubrir.

**Solo propone. No escribe nada en Prisma ni en Startrack.**

**Directorios tuyos en este sprint:**
- `services/solver/` (nuevo).
- `lib/optimizador/` (nuevo).
- `lib/conectores/`: solo `clima.ts` nuevo.
- `lib/canonico/`: solo los agregados del Paso 4a y 4b.
- `app/api/optimizar/`.
- `scripts/`.
- Los dos `package.json` (raíz y `apps/web`), `vitest.config.ts`,
  `.env.example` y `.gitignore` (en este último, solo agregar líneas).

**No toques:**
- `lib/tipos/canonico.ts`: está congelado; **ni siquiera para ampliar
  `Plataforma`**.
- `components/`, `app/(nect)/`, `lib/kpi/`, `lib/mapeo/`, `lib/gobernanza/`,
  `lib/acceso/`, `lib/reglas/`.

---

## Decisiones tomadas en planeación — no se renegocian

| Tema | Decisión |
|---|---|
| **Datos** | **Solo en vivo.** Nada inventado: ni en la app, ni en las pruebas, ni un ejemplo para B |
| **Lo que el sandbox no tiene** | **No entra.** Sin lowboy, sin cabezal, sin horario laboral, sin velocidad de traslado, sin certificación de operador por clase. Ningún "supuesto del planificador" fuera de los que nombra este prompt |
| **Fuente externa** | Solo el clima (Open-Meteo), y **solo como alerta**: no cambia la asignación |
| **Fechas** | **Fijas**: las de la solicitud. El solver no mueve fechas. Granularidad: **día**. "Hoy" = fecha actual en `America/El_Salvador` |
| **Alcance** | Toda la flota visible del sandbox (16 máquinas de 15 "empresas" hoy). Solo lectura |
| **Demanda** | Todas las solicitudes `PENDIENTE` y `APROBADA`. Las `APROBADA` llevan además su **asignación manual observada** (`maquinaria_id`), con la que S-C4 compara |
| **Infactibilidad** | **Por solicitud, con motivo.** Primero se cubre la mayor cantidad posible; `infactible` global solo si no se asigna ninguna |
| **Distancia sin origen** | **Peor caso declarado** (regla exacta en el Paso 4d) |
| **Moneda** | **USD**, siempre con la nota *"moneda inferida: la operación es en El Salvador; Prisma no la declara"* |
| **Tolerancia lexicográfica** | **0.** El óptimo de cada nivel se fija antes de optimizar el siguiente |
| **Clima** | Día de lluvia = `precipitation_probability_max ≥ 50 %`. Clases sensibles: las marca el usuario. Coordenada **redondeada a 1 decimal** |
| **Operador en pantalla** | Solo `cod_trabajador`. El `nombre` **nunca sale del servidor** |
| **Hosting del solver** | Local + `Dockerfile`. El hosting se decide en S-TODOS |
| **Confirmación** | No existe en este sprint. Cuando P1 exista, otro prompt la conecta |

---

## Cobertura verificada el 12 de septiembre de 2026 (solo conteos)

Es contexto para diseñar, **no una constante**. El sandbox cambia (ya pasó de 15
a 16 equipos, y entró uno con clase `ddd`). **El código no asume ningún conteo.**

| Insumo | Campo real | Cobertura observada |
|---|---|---|
| Demanda | `solicitudes`: `status`, `tipo`, `fecha_inicio`, `fecha_fin`, `project_id`, `project_name`, `maquinaria_id` | 9 (4 PENDIENTE, 5 APROBADA); fechas `AAAA-MM-DD` en 9/9; `maquinaria_id` en 5/9 |
| Destino | geocerca con `PROY-###` en `name` → `x`, `y` | los 14 proyectos tienen geocerca por código; 9/9 solicitudes resuelven destino |
| Máquina | `equipos`: `estado`, `clase_equipo`, `project_id`, `fecha_inicio_uso`, `fecha_fin_uso`, `active_failure_*` | 16; estado 9 DISPONIBLE · 5 OCUPADA · 2 OBSOLETA; ventana de uso en 7/16 |
| Detalle de máquina | `/api/maquinaria/equipos/{id}`: `effective_precio_x_hora`, `associated_operators[] {id, nombre, cod_trabajador, is_active}` | tarifa efectiva en 8/16; operador asociado en 3/16 |
| Operadores | `/api/maquinaria/operadores`: `id`, `cod_trabajador`, `nombre`, `is_active`, `active_assignment_count` | 16, todos `is_active=true`; **no hay agenda por fecha** |
| Origen de máquina | `EquipoUnificado.ubicacion` (cascada nivel 2 o 3) | de las 9 DISPONIBLE: 0 con proyecto, 1 con traslado → **origen desconocido en 8/9** |
| Transporte | `vehicle_type`: excavator · forklift · tractor | **no existe ningún lowboy ni cabezal** |
| Clima | Open-Meteo `daily.time`, `daily.precipitation_probability_max` | 16 días; 8/9 solicitudes terminan dentro de ese horizonte |

---

## Paso 0 — Dependencias y esqueleto

1. En `apps/web`: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`.
   Las usa B en S-B4; vos sos el dueño de `package.json`. **No instales nada
   más.**
2. `services/solver/`, gestionado con `uv`:
   - `pyproject.toml`: `requires-python >= 3.12`; `fastapi`, `uvicorn`,
     `ortools >= 9.15` (ya publica builds para Python 3.14 en Windows y Linux) y
     `pydantic` v2. Versioná `uv.lock`.
   - `app/main.py`, `app/esquema.py` y `app/modelo.py`.
   - `Dockerfile` (`python:3.14-slim`, `uv sync --frozen`, `uvicorn` en
     `0.0.0.0:8000`) y `.dockerignore`.
   - `README.md` corto: cómo levantarlo con
     `uv run uvicorn app.main:app --port 8000`.
3. `.gitignore`: **agregar** `__pycache__/`, `.venv/` y `*.pyc`. No quites ni
   debilites ninguna regla existente.
4. `.env.example`: `SOLVER_BASE_URL=http://127.0.0.1:8000`, con un comentario que
   diga que es de servidor y que solo existe si se construye S-A7.

---

## Paso 1 — El contrato: `lib/optimizador/tipos.ts` · **entregar primero**

Destraba a B y a C. **Sin implementación y sin datos de ejemplo.** Avisá en voz
alta cuando esté listo. Después de eso, cambiarlo exige avisar a B y C (misma
regla que `canonico.ts`).

Tipos que tiene que exportar, con estos nombres. Podés ajustar sintaxis y
agregar comentarios, pero no cambiar la forma:

```ts
import type { ClaseEquipoCatalogo } from '@/lib/canonico/catalogos'
import type { Dato, Linaje } from '@/lib/tipos/canonico'

/** Soft constraints disponibles: solo las que salen de campos reales. */
export const SOFT_CONSTRAINTS = ['distancia', 'tarifa', 'continuidadOperador', 'holgura'] as const
export type IdSoftConstraint = (typeof SOFT_CONSTRAINTS)[number]

// ── Navegador → /api/optimizar ─────────────────────────────────────────────
export type PeticionOptimizar = {
  /** Índice 0 = se protege primero. Sin repetidos. Vacía = solo se maximiza la cobertura. */
  pila: IdSoftConstraint[]
  /** Criterio del planificador, no dato de ECON. */
  clasesSensiblesLluvia: ClaseEquipoCatalogo[]
}
// + `PeticionOptimizarSchema` (Zod) que valida exactamente eso: ids del enum,
//   sin repetidos, clases del CATALOGO_CLASE_EQUIPO, sin repetidos.

// ── Honestidad de cada valor ────────────────────────────────────────────────
export type ValorObjetivo = {
  valor: number | null            // valor real; null si no es calculable
  peorCasoAplicado: boolean       // true si el solver usó el peor caso porque valor es null
  motivo: string | null           // por qué es null / por qué peor caso; null si hay valor real
  unidad: 'km' | 'USD/h' | 'días' | 'sí/no'
  linaje: Linaje[]                // campos de origen que produjeron el valor
}
export type ObjetivosAsignacion = Record<IdSoftConstraint, ValorObjetivo>

export type AlertaClima =
  | { estado: 'no_aplica'; motivo: string }
  | { estado: 'sin_pronostico'; motivo: string }
  | {
      estado: 'evaluado'
      diasConLluvia: number
      diasEvaluados: number
      diasSinPronostico: number
      umbralProbabilidadPct: 50
      fuente: { proveedor: 'open-meteo'; endpoint: string; leidoEn: string; decimalesCoordenada: 1 }
    }

// ── Respuesta de /api/optimizar ────────────────────────────────────────────
export type SolicitudPlan = {
  id: string
  estado: Dato<string>            // status
  clase: Dato<string>             // tipo
  proyecto: Dato<string>          // project_name
  codigoProyecto: string | null   // PROY-### extraído de project_name
  inicio: Dato<string>            // fecha_inicio (AAAA-MM-DD)
  fin: Dato<string>               // fecha_fin
  inicioEfectivo: string          // max(hoy, fecha_inicio)
}

export type AsignacionManual = {
  maquina: { id: string; codigoActivo: Dato<string> }
  objetivos: ObjetivosAsignacion  // mismas reglas que la propuesta (Paso 4d)
}

export type AsignacionPropuesta = {
  solicitud: SolicitudPlan
  maquina: { id: string; codigoActivo: Dato<string>; clase: Dato<string> }
  operador: { id: string; codTrabajador: Dato<string> }
  objetivos: ObjetivosAsignacion
  manual: AsignacionManual | null // solo en APROBADA
  clima: AlertaClima
}

export type ConteoCandidatas = {
  claseCompatible: number
  operables: number               // además puedeOperar
  libresEnVentana: number         // además sin choque con la ocupación real
  conOperadorLibre: number        // además hay un operador libre en la ventana
}

export type SolicitudSinAsignacion = {
  solicitud: SolicitudPlan
  motivo: string
  candidatas: ConteoCandidatas
  manual: AsignacionManual | null
}

export type SolicitudExcluida = { solicitud: SolicitudPlan; motivo: string }

export type OcupacionReal = {
  inicio: Dato<string>            // fecha_inicio_uso
  fin: Dato<string>               // fecha_fin_uso
  esDeSolicitudId: string | null  // si es la ocupación propia de una APROBADA
}

export type FilaMaquina = {
  id: string
  codigoActivo: Dato<string>
  clase: Dato<string>
  claseEnCatalogo: boolean
  estado: Dato<string>
  puedeOperar: boolean
  motivoNoOpera: string | null
  ocupacionReal: OcupacionReal[]
}

export type NivelLexicografico = {
  objetivo: 'cobertura' | IdSoftConstraint
  valor: number
  unidad: string
  probadoOptimo: boolean          // false = se agotó el tiempo; el valor igual se fijó
}

export type KpiAhorroObjetivo = {
  objetivo: IdSoftConstraint
  mejoraTotal: number | null      // positivo = la propuesta es mejor
  unidad: string
  comparables: number
  totalAprobadas: number
  datoFaltante: string | null
}

export type KpisOptimizador = {
  ahorroPorObjetivo: KpiAhorroObjetivo[]
  lluviaClasesSensibles: {
    asignacionesConLluvia: number | null
    asignacionesSensibles: number
    sinPronostico: number
    datoFaltante: string | null
  }
  coberturaPlan: {
    valor: number | null
    asignadas: number
    evaluadas: number
    excluidas: number
    datoFaltante: string | null
  }
}

export type RespuestaOptimizar = {
  generadoEn: string
  hoy: string
  horizonte: { desde: string; hasta: string }
  estado: 'optimo' | 'factible' | 'infactible'
  motivoInfactible: string | null
  pila: IdSoftConstraint[]
  clasesSensiblesLluvia: string[]
  niveles: NivelLexicografico[]
  maquinas: FilaMaquina[]
  asignaciones: AsignacionPropuesta[]
  sinAsignacion: SolicitudSinAsignacion[]
  excluidas: SolicitudExcluida[]
  avisos: string[]
  kpis: KpisOptimizador | null
  kpisPendientesMotivo: string | null
}
export type RespuestaOptimizarSinKpis = Omit<RespuestaOptimizar, 'kpis' | 'kpisPendientesMotivo'>

export type ErrorOptimizar = {
  error: 'peticion_invalida' | 'solver_no_disponible' | 'fuente_no_disponible' | 'verificacion_fallida'
  mensaje: string
  fuente?: { plataforma: string; endpoint: string }
}

// ── Formato de cable con services/solver: anonimizado, solo ids y enteros ──
export type EntradaSolver = {
  solicitudes: { id: string; inicioDia: number; finDia: number }[]   // días desde hoy, inclusive
  pares: { solicitudId: string; maquinaId: string; distanciaM: number; tarifaCentavos: number; holguraDias: number }[]
  operadoresPorSolicitud: { solicitudId: string; operadorIds: string[] }[]
  continuidad: { maquinaId: string; operadorId: string }[]
  pila: IdSoftConstraint[]
  tiempoLimitePorNivelS: number   // 5
}
export type SalidaSolver = {
  estado: 'ok' | 'sin_asignaciones'
  asignaciones: { solicitudId: string; maquinaId: string; operadorId: string }[]
  niveles: { objetivo: 'cobertura' | IdSoftConstraint; valor: number; probadoOptimo: boolean }[]
}
```

Estado global en `RespuestaOptimizar`:
- `infactible`: hay al menos una solicitud evaluable y ninguna quedó asignada.
  También cuando no hay ninguna evaluable; en ese caso el motivo lo dice.
- `optimo`: hay al menos una asignación y todos los niveles tienen
  `probadoOptimo: true`.
- `factible`: el resto de los casos.

---

## Paso 2 — `services/solver/` (Python)

- `GET /salud` → `{ "ok": true }`.
- `POST /optimizar`: recibe `EntradaSolver` y devuelve `SalidaSolver`. Los
  modelos Pydantic replican el contrato con alias camelCase. Un id que aparezca
  en `pares` o `continuidad` y no exista en la entrada → **422**.
- **Modelo CP-SAT:**
  - Variables: `a[t]` (solicitud asignada), `x[t,m]` por cada par permitido y
    `y[t,o]` por cada operador permitido para esa solicitud.
  - `Σ_m x[t,m] == a[t]` y `Σ_o y[t,o] == a[t]`.
  - **Sin choques entre propuestas:** para cada par de solicitudes cuyos
    intervalos `[inicioDia, finDia]` se enciman (inclusive), una misma máquina
    no puede ir a las dos (`x[t1,m] + x[t2,m] ≤ 1`). Lo mismo para cada
    operador.
  - Continuidad: `z[t,m,o]` para cada `(m,o)` de `continuidad` con `x[t,m]` y
    `y[t,o]` existentes, linealizado con `z ≤ x`, `z ≤ y` y `z ≥ x + y − 1`.
- **Expresiones objetivo:**

  | Objetivo | Expresión | Sentido |
  |---|---|---|
  | cobertura | `Σ a` | maximizar |
  | distancia | `Σ distanciaM·x` | minimizar |
  | tarifa | `Σ tarifaCentavos·x` | minimizar |
  | holgura | `Σ holguraDias·x` | maximizar |
  | continuidadOperador | `Σ z` | maximizar |

- **Lexicográfico, tolerancia 0:** el nivel 0 siempre es `cobertura`; después
  vienen los de `pila`, en orden. Por nivel:
  1. Optimizar con `max_time_in_seconds = tiempoLimitePorNivelS` y semilla fija.
  2. Si el resultado es `OPTIMAL`, fijar `expr == valor`.
  3. Si es `FEASIBLE`, fijar `expr ≥ valor` (o `≤` si el objetivo se minimiza) y
     reportar `probadoOptimo: false`.
  4. Pasar al siguiente nivel.

  Fijar la cobertura antes que todo garantiza que un objetivo de costo nunca
  "suelta" una solicitud para mejorar su número. Si el nivel 0 no es factible
  (no debería pasar, porque `a = 0` siempre lo es), respondé **500** con el
  mensaje.
- `estado: 'sin_asignaciones'` si la cobertura final es 0.
- **Nunca loguees ni imprimas el cuerpo de la petición.** Nada de persistencia.

> Las hard constraints que dependen de datos (clase, operabilidad, ventana real,
> operador activo) **no** se evalúan en Python. Llegan ya prefiltradas en
> `pares` y `operadoresPorSolicitud` desde TypeScript (Paso 4d). Python solo
> impide choques entre propuestas y optimiza. El verificador del Paso 4f vuelve
> a comprobar **todo** del lado de Node.

---

## Paso 3 — `lib/conectores/clima.ts` (`server-only`)

- `leerPronosticoLluvia(lat: number, lon: number)` devuelve
  `{ dias: { fecha: string; probabilidadMaxPct: number | null }[], endpoint, leidoEn }`.
- **Redondea `lat` y `lon` a 1 decimal dentro de la función.** Así ningún
  llamador puede saltárselo.
- URL:
  `https://api.open-meteo.com/v1/forecast?latitude=…&longitude=…&daily=precipitation_probability_max&forecast_days=16&timezone=America%2FEl_Salvador`.
  Campos verificados: `daily.time` y `daily.precipitation_probability_max`. Sin
  clave ni cuenta.
- `conCache`, con la clave por coordenada redondeada y TTL de 30 min (declaralo
  en un comentario). Timeout de 8 s.
- Error propio: `ErrorClima`. No uses `ErrorConector`, que exige una
  `Plataforma` del contrato congelado.
- **Nunca loguees la coordenada ni la respuesta.**

---

## Paso 4 — Lectura, adaptación, verificación y orquestación

### 4a. `lib/canonico/tipos-crudos.ts` — agregados

Todos son campos observados con `npm run leer` el 12 de septiembre:
- `EquipoPrismaCrudo`: `fecha_inicio_uso`, `fecha_fin_uso`.
- `SolicitudPrismaCruda`: `project_name`.
- Nuevo `OperadorPrismaCrudo`: `id`, `cod_trabajador`, `nombre`, `is_active`,
  `active_assignment_count`. `nombre` se tipa, **pero no puede salir del
  servidor**.
- Nuevo `DetalleEquipoPrismaCrudo`: `id`, `effective_precio_x_hora`,
  `associated_operators: { id, nombre, cod_trabajador, is_active }[] | null`.

Antes de tipar el detalle, verificá imprimiendo **solo nombres de campo** si la
respuesta de `leerEquipo(id)` viene envuelta (por ejemplo en `data`).

### 4b. `lib/canonico/identidad.ts`

Extraé `geocercaPorCodigoProyecto(nombreProyecto, geocercas)` y hacé que
`geocercaDeProyecto` la use. El comportamiento no cambia: **las pruebas de S-A2
tienen que seguir pasando.**

### 4c. `lib/optimizador/insumos.ts` (`server-only`)

- Lee en paralelo: equipos, solicitudes, vehículos, geocercas, tareas, tipos de
  tarea, operadores y el **detalle de cada equipo**.
- Devuelve `DatosCrudos`, operadores y detalles, cada uno con su procedencia.
- El helper `comoFuente` de `scripts/reconciliar.ts` pasa a un módulo compartido
  y ese script lo importa. No lo dupliques.

### 4d. `lib/optimizador/adaptador.ts` — **puro, sin HTTP**

Firma: `adaptar(insumos, peticion, hoy)`. Recibe `hoy` como parámetro para poder
probarlo.

1. `reconciliar(datos)` → `EquipoUnificado[]`. De ahí sale la **ubicación en
   cascada con su linaje**. No reimplementes ubicación.
2. **Solicitudes:**
   - Se excluyen con motivo si `status` no es `PENDIENTE` ni `APROBADA`, si
     falta una fecha, o si `fecha_fin < hoy` (*"el período ya terminó"*).
   - `inicioEfectivo = max(hoy, fecha_inicio)`.
3. **Ocupación real de una máquina:** `[fecha_inicio_uso, fecha_fin_uso]` si
   existen las dos. Es la **ocupación propia** de una solicitud `APROBADA` si
   `solicitud.maquinaria_id === equipo.id` y
   `solicitud.project_id === equipo.project_id`. La ocupación propia **no choca**
   con esa solicitud.
4. **H1 — clase:** `solicitud.tipo === equipo.clase_equipo`, exacto. Una clase
   fuera de `CATALOGO_CLASE_EQUIPO` no es compatible con nada y lo dice en su
   fila.
5. **H2 — máquina disponible de verdad:** `puedeOperar(equipo)` (de
   `lib/canonico/estados.ts`, no la dupliques) **y** ninguna ocupación real no
   propia se encima con `[inicioEfectivo, fecha_fin]`.
6. **H3 — operador disponible:** `is_active === true` **y**, si aparece en
   `associated_operators` de una máquina con ocupación real, esa ventana no se
   encima con `[inicioEfectivo, fecha_fin]`. Queda exceptuada la ocupación
   propia de esa misma solicitud.
7. **`ConteoCandidatas` y motivo precomputado** cuando algún conteo da 0. El
   motivo es concreto y sale del dato vivo, por ejemplo: *"0 máquinas de clase
   Excavadora operables y libres entre 2026-09-14 y 2026-09-18"*. No se
   hardcodea ninguna clase ni fecha.
8. **Objetivos por par (reglas exactas):**
   - **`distancia` (km):**
     - Se calcula con haversine entre `EquipoUnificado.ubicacion` (lat/lon,
       nivel 2 o 3) y la geocerca `PROY-###` del `project_name` de la solicitud.
     - Es `null` si falta el origen o el destino. También es `null` si el par es
       **la asignación manual de esa misma solicitud aprobada**, porque la
       máquina ya está en el proyecto por esa asignación y su origen previo es
       desconocido.
     - `motivo` dice cuál faltó. Si hay origen, incluye el nivel de la cascada.
     - `linaje`: `x`/`y` de las dos geocercas.
   - **`tarifa` (USD/h):** `effective_precio_x_hora` del detalle, o `null` si
     falta.
   - **`holgura` (días):**
     - Si la máquina tiene una ocupación real no propia que termina antes:
       `inicioEfectivo − fecha_fin_uso`.
     - Si no la tiene: `inicioEfectivo − hoy`.
     - Es `null` solo para la asignación manual de su propia solicitud, porque
       la ocupación previa es desconocida.
   - **`continuidadOperador` (sí/no):** vale 1 si el operador elegido está en
     `associated_operators` de esa máquina, y 0 si no. En `manual` vale `null`
     con el motivo *"la solicitud no registra operador"*.
9. **Peor caso declarado**, solo para `distancia` y `tarifa`:
   - Un `null` se sustituye por el **máximo valor no nulo observado** entre
     todos los pares candidatos de esa corrida.
   - Se marca `peorCasoAplicado: true` con su motivo.
   - Si ningún par tiene dato, se usa 0 para todos y se agrega el aviso
     *"objetivo X sin datos en ningún candidato: no discrimina"*.
   - `holgura` y `continuidadOperador` siempre son calculables para un par
     candidato.
10. **Construye `EntradaSolver` con ids y enteros** (metros, centavos, días).
    **Sin nombres, sin coordenadas, sin textos.**
11. `tiempoLimitePorNivelS = 5`.

### 4e. `lib/optimizador/cliente.ts` (`server-only`)

- `POST ${SOLVER_BASE_URL}/optimizar`.
- Timeout = (cantidad de niveles × tiempo límite) + 10 s.
- Error propio: `ErrorSolver`.

### 4f. `lib/optimizador/verificar.ts` — **puro**

- Recibe la entrada adaptada y la `SalidaSolver`.
- Devuelve la lista de violaciones de:
  - H1, H2 y H3;
  - "par no permitido";
  - choques entre propuestas (la misma máquina u operador en solicitudes que se
    enciman);
  - solicitud asignada dos veces.
- **Se corre en cada respuesta.** Con una sola violación, `planear` **no
  devuelve la asignación**: lanza `verificacion_fallida` con el detalle. Nunca
  se fuerza.

### 4g. `lib/optimizador/ensamblar.ts` — **puro**

Arma `RespuestaOptimizarSinKpis`:
- `maquinas`: **todas** las filas, incluidas las no operables y las de clase
  fuera de catálogo, con su ocupación real y su linaje.
- Asignaciones con sus objetivos y con `manual`.
- `sinAsignacion` con su motivo. Si había candidatas pero el solver no cubrió la
  solicitud: *"hay N máquinas compatibles libres, pero quedaron asignadas a otras
  solicitudes del plan que se enciman en fechas"* (lo mismo para operadores).
- `niveles` con su unidad: cobertura en solicitudes, distancia en km, tarifa en
  USD/h, holgura en días, continuidad en asignaciones.
- `horizonte`: desde hoy hasta la mayor `fecha_fin` entre las solicitudes
  evaluadas y las ocupaciones vigentes.
- Estado global y `avisos`: peor caso aplicado en N pares, clima no disponible,
  etc.

### 4h. Clima

Se consulta **solo** para las asignaciones cuya clase está en
`clasesSensiblesLluvia`:
- Si la clase no está marcada → `no_aplica` (*"clase no marcada como sensible"*).
- Si no hay geocerca destino → `sin_pronostico`.
- Si hay pronóstico:
  - Los días del período efectivo con `probabilidadMaxPct ≥ 50` cuentan como
    lluvia.
  - Los días fuera del horizonte de 16 días cuentan como `diasSinPronostico`,
    **nunca como días secos**.
  - Si todos los días quedan fuera → `sin_pronostico` (*"el período cae fuera de
    los 16 días de pronóstico"*).
- Si Open-Meteo falla → `sin_pronostico` más un aviso. **Nunca tumba la
  respuesta.**

### 4i. `lib/optimizador/planear.ts` (`server-only`) — el orquestador

Orden: `insumos → adaptar → cliente → verificar → clima → ensamblar → KPIs →
RespuestaOptimizar`.

- Los KPIs vienen de `calcularKpisOptimizador` de `@/lib/kpi/optimizador` (S-C4,
  carril C).
- **Si ese archivo todavía no existe en tu rama, no lo crees ni lo importes**:
  es territorio de C. Dejá `kpis: null` y
  `kpisPendientesMotivo: 'Cálculo de KPIs pendiente (S-C4)'`, y anotalo como
  desviación. Conectarlo después es una línea.

---

## Paso 5 — `app/api/optimizar/route.ts`

- `POST`. Parsea con `PeticionOptimizarSchema.safeParse` → **400**
  `peticion_invalida`.
- Delega en `planear()`. **Ninguna lógica de optimización vive en la ruta.**
- Errores:

  | Error | Respuesta |
  |---|---|
  | `ErrorSolver` | **503** `solver_no_disponible` |
  | `ErrorConector` o `SesionExpirada` | **503** `fuente_no_disponible`, con `plataforma` y `endpoint` |
  | Verificación | **500** `verificacion_fallida` |
  | Todo bien | **200** `RespuestaOptimizar` |

- Nunca devuelve una credencial ni el `nombre` de un operador.

## Paso 6 — `scripts/optimizar.ts`

- Alias `optimizar` en `apps/web` y en la raíz.
- Corre `planear` con la pila en el orden de `SOFT_CONSTRAINTS` y sin clases
  sensibles.
- Imprime **solo**: estado, conteos (asignadas · sin asignación · excluidas),
  niveles (objetivo, valor, `probadoOptimo`) y la cantidad de avisos.
- **Nunca** ids, códigos, fechas, coordenadas ni nombres.

---

## Paso 7 — Pruebas en vivo (§9.6)

**Reglas, decididas en planeación:**
- **Sin datos inventados.** Cada caso especial se arma **filtrando o
  transformando los insumos leídos en vivo**.
- **Sin `toMatchSnapshot`** y sin escribir archivos: serían volcados (§1.2).
- Los `expect` son sobre conteos y propiedades. Nunca se imprimen valores.
- **Precondición:** el sandbox accesible y el solver levantado. Si falta alguno,
  la prueba **falla con un mensaje etiquetado** (*"solver no disponible en
  SOLVER_BASE_URL"*). **Nunca `skip` en silencio.**

**Configuración:**
- `vitest.config.ts`: excluir `**/*.vivo.test.ts` de `npm run test`, para que
  las ventanas de merge no dependan del sandbox.
- Nuevo `vitest.vivo.config.ts`: incluye solo `*.vivo.test.ts`, con timeout de
  120 s.
- Scripts `test:vivo` en `apps/web` y en la raíz.

**`lib/optimizador/optimizador.vivo.test.ts`:**

1. **Nunca viola una hard constraint.** `planear` en vivo da 0 violaciones en
   `verificar`. Además hay una comprobación independiente contra los datos
   crudos: clase, `puedeOperar`, ocupación, operador activo y ausencia de
   choques.
2. **Sin asignación posible, por solicitud.** Tomar los insumos vivos y quitar
   todas las máquinas de la clase de una solicitud evaluable. Esa solicitud cae
   en `sinAsignacion` con `candidatas.claseCompatible === 0`, un motivo que
   nombra la clase y ninguna asignación.
3. **Infactible global.** Insumos vivos sin operadores → `estado: 'infactible'`,
   0 asignaciones y un motivo que menciona a los operadores.
4. **Lexicográfico.** Correr con pila `['tarifa','distancia']` y con
   `['distancia','tarifa']`:
   - el nivel `tarifa` de la primera corrida es ≤ al de la segunda;
   - el nivel `distancia` de la segunda es ≤ al de la primera;
   - la `cobertura` es igual en las dos.
5. **El verificador atrapa una violación.** Tomar la salida viva y cambiar la
   máquina de una asignación por una máquina viva de otra clase: `verificar` la
   reporta.
6. **Peor caso y manual.** Todo par con distancia `null` tiene
   `peorCasoAplicado: true` y su motivo. Toda `APROBADA` con `manual` tiene
   `manual.objetivos.distancia.valor === null`, con el motivo de origen previo
   desconocido.
7. **Clima redondeado.** Espiar `fetch`: la URL que arma `clima.ts` para una
   geocerca viva lleva latitud y longitud con ≤ 1 decimal.
8. **Ruta.** Un POST con `pila: ['inexistente']` → 400 `peticion_invalida`. Es
   una petición malformada, no un dato de ECON.

Corré también `npm run test` normal: las pruebas de S-A2 tienen que seguir
pasando.

---

## Qué NO hacer

- ❌ No agregues lowboy, cabezal, horario laboral, velocidad de traslado,
  certificación de operador ni ningún supuesto que este prompt no nombre.
- ❌ No inventes datos: ni un ejemplo para B, ni fixtures, ni snapshots.
- ❌ No muevas las fechas de una solicitud.
- ❌ No escribas en Prisma ni en Startrack: ni botón, ni endpoint. P1 es S-A4.
- ❌ No le mandes al solver nombres, coordenadas ni textos. No loguees payloads,
  ni en Python ni en Node.
- ❌ No le mandes a Open-Meteo una coordenada sin redondear, y no la loguees.
- ❌ No amplíes `Plataforma` en `lib/tipos/canonico.ts`.
- ❌ No pongas lógica de optimización en la ruta.
- ❌ No crees `lib/kpi/optimizador.ts`: es de C.
- ❌ No hagas `git commit`, `push` ni merge.

## Terminado cuando

- En `services/solver`, `uv run uvicorn app.main:app --port 8000` responde
  `/salud`, y `docker build` del servicio termina. Si Docker no está instalado,
  reportalo; no lo instales.
- `npm run optimizar` imprime estado, conteos y niveles desde el sandbox vivo.
- `POST /api/optimizar` devuelve una `RespuestaOptimizar` que el verificador
  aprueba.
- `npm run test:vivo` pasa los 8 casos, y `typecheck`, `lint`, `test` y `build`
  pasan.

Reportá: archivos tocados · checklist de prueba manual · **resultado real** de
cada comando · qué no se pudo verificar · desviaciones de este prompt ·
`git status`.
