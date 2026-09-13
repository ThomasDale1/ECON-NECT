// Conector de Startrack. server-only. Única puerta de este proyecto a la
// superficie legado `ajax/*.php` (AGENTS.md §4.3).
//
// Elección de autenticación: los lectores que pide S-A1 (vehículos, geocercas,
// conductores) viven todos en la superficie legado `ajax/*.php`, que se
// autentica por cookie de sesión (`POST /login.php`) — no por la API REST
// moderna bajo `/api/` (que acepta autenticación básica pero cubre otro
// dominio). Por eso este conector usa sesión por cookie.
//
// Verificado contra el hallazgo 01 E.7 / AGENTS.md §7.1: la sesión expirada se
// detecta por `success === false` en el CUERPO, nunca por el código HTTP —
// `ajax/events.php` devuelve 200 con `{success:false}`. `desenvolverStartrack`
// se implementa antes que cualquier lector, como pide S-A1 §1.

import 'server-only'
import type { CodigoConductorStartrack, ReporteConductoresStartrack } from '@/lib/canonico/tipos-crudos'
import { hoyElSalvador } from '@/lib/mantenimiento/fechas'
import type { FilaSerieDiaria, HorometroVivo, SerieDiaria } from '@/lib/mantenimiento/tipos'
import type { Linaje } from '@/lib/tipos/canonico'
import { asegurarEntornoCargado } from './entorno'
import { SesionExpirada, ErrorConector, ErrorEscritura } from './errores'
import { conCache, invalidarCache } from './cache'
import { envolver, type RespuestaConector } from './tipos'

asegurarEntornoCargado()

const PLATAFORMA = 'startrack' as const

function config() {
  const baseUrl = process.env.STARTRACK_BASE_URL
  const cliente = process.env.STARTRACK_CLIENT
  const usuario = process.env.STARTRACK_USER
  const clave = process.env.STARTRACK_PASSWORD
  if (!baseUrl || !cliente || !usuario || !clave) {
    throw new ErrorConector(
      PLATAFORMA,
      'config',
      'faltan STARTRACK_BASE_URL, STARTRACK_CLIENT, STARTRACK_USER o STARTRACK_PASSWORD en .env.local',
    )
  }
  return { baseUrl: baseUrl.replace(/\/$/, ''), cliente, usuario, clave }
}

/** Envoltura de respuesta de Startrack: `{ success, errorMsg, ... }`
 * (verificado, 01 E.7 / S-A1 §1). Si `success === false`, la sesión expiró —
 * sin importar el código HTTP. Esta función se escribió antes que cualquier
 * lector, como exige S-A1 §1. */
export function desenvolverStartrack<T>(payload: unknown, endpoint: string): T {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'success' in payload &&
    (payload as { success: unknown }).success === false
  ) {
    throw new SesionExpirada(PLATAFORMA, endpoint)
  }
  return payload as T
}

// Nombres de campo del formulario de `POST /login.php` verificados contra el
// sandbox real el 12 de septiembre de 2026: `client` / `username` / `password`.
// Un login con nombres incorrectos también responde 302 con PHPSESSID, pero
// redirige a `index.php?loginError=...`; el correcto redirige a
// `members-new.php` sin `loginError`. Por eso `iniciarSesion` valida el
// `location` de la redirección, no solo la presencia de la cookie.
//
// Segundo hallazgo verificado: el login exitoso manda DOS `Set-Cookie:
// PHPSESSID=...` — el servidor regenera el id de sesión tras autenticar (para
// no arrastrar la sesión anónima previa). Quedarse con el primero deja la
// sesión vieja y todo lector responde `success:false` aunque el login haya
// redirigido sin error. Por eso se usa `getSetCookie()` y se toma el ÚLTIMO
// valor de cada nombre de cookie, no el primero.
let cookieSesion: string | null = null

function cookieHeaderDesde(setCookies: string[]): string {
  const porNombre = new Map<string, string>()
  for (const cruda of setCookies) {
    const par = cruda.split(';')[0]
    const nombre = par.split('=')[0]
    porNombre.set(nombre, par) // el último Set-Cookie con este nombre gana
  }
  return [...porNombre.values()].join('; ')
}

async function iniciarSesion(): Promise<string> {
  const { baseUrl, cliente, usuario, clave } = config()
  const cuerpo = new URLSearchParams({ client: cliente, username: usuario, password: clave })

  const respuesta = await fetch(`${baseUrl}/login.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: cuerpo,
    redirect: 'manual',
  })

  const setCookies = respuesta.headers.getSetCookie()
  const ubicacion = respuesta.headers.get('location') ?? ''
  if (setCookies.length === 0 || !setCookies.some((c) => c.includes('PHPSESSID')) || ubicacion.includes('loginError')) {
    throw new ErrorConector(
      PLATAFORMA,
      '/login.php',
      `login rechazado (status ${respuesta.status}, location "${ubicacion}")`,
    )
  }

  cookieSesion = cookieHeaderDesde(setCookies)
  return cookieSesion
}

/** Encuentra el primer valor de tipo arreglo en la respuesta ya desenvuelta
 * (descartando `success`/`errorMsg`). Los endpoints legado de Startrack no
 * comparten un nombre de campo documentado para la lista de resultados
 * (S-A1 §3 no lo especifica); esta heurística estructural evita inventar un
 * nombre de campo concreto sin haberlo visto. Se verifica y ajusta contra la
 * respuesta real en `npm run leer`. */
function extraerLista(payload: Record<string, unknown>): unknown[] {
  for (const [clave, valor] of Object.entries(payload)) {
    if (clave === 'success' || clave === 'errorMsg') continue
    if (Array.isArray(valor)) return valor
  }
  return []
}

async function peticionAjax(endpoint: string): Promise<Record<string, unknown>> {
  const { baseUrl } = config()
  if (!cookieSesion) await iniciarSesion()

  const intentar = async (): Promise<Record<string, unknown>> => {
    const respuesta = await fetch(`${baseUrl}/${endpoint}`, {
      headers: { Cookie: cookieSesion! },
    })

    // Algunos endpoints legado sí usan 401 para sesión vencida (S-A1 §1);
    // otros devuelven 200 con success:false. Se cubren los dos casos.
    if (respuesta.status === 401) {
      throw new SesionExpirada(PLATAFORMA, endpoint)
    }

    let cuerpo: unknown
    try {
      cuerpo = await respuesta.json()
    } catch {
      throw new ErrorConector(PLATAFORMA, endpoint, `respuesta no-JSON (status ${respuesta.status})`)
    }

    return desenvolverStartrack<Record<string, unknown>>(cuerpo, endpoint)
  }

  try {
    return await intentar()
  } catch (error) {
    if (error instanceof SesionExpirada) {
      // Reautentica y reintenta UNA sola vez — nunca en bucle (S-A1 §3).
      await iniciarSesion()
      return await intentar()
    }
    throw error
  }
}

async function leerLista(endpoint: string): Promise<RespuestaConector<unknown[]>> {
  return conCache(`startrack:${endpoint}`, async () => {
    const cuerpo = await peticionAjax(endpoint)
    return envolver(extraerLista(cuerpo), PLATAFORMA, endpoint)
  })
}

// Verificado contra el sandbox real: cada endpoint legado despacha varias
// acciones por `?cmd=`, y sin ese parámetro responde 400 `{success:false,
// errorMsg:"Missing cmd"}` — un tercer disfraz de "no autenticado" que no
// está en 01 E.7, así que NO es un caso de `SesionExpirada` (no lo dispara
// `desenvolverStartrack`, que solo mira `success`... y este payload también
// tiene `success:false`). Se resuelve pasando siempre `cmd=list`, que
// devuelve la lista completa bajo la clave `data`.
/**
 * Estado de flota en vivo — el poller que alimenta el mapa de rastreo.
 *
 * Es el endpoint que más aporta de toda la superficie de Startrack: en **una
 * sola llamada** trae, por vehículo, la posición GPS (`x`/`y`), la dirección ya
 * geocodificada (`p`), el sitio nombrado más cercano (`rpn`), el estado legible
 * (`moving_status`), el último evento (`rl`), el conductor asignado (`un`) y la
 * antigüedad de la última comunicación (`coms_age_seconds`).
 *
 * Resuelve el **nivel 1 de la cascada de ubicación**, que 01 E.10 daba por no
 * obtenible por REST: la página lo consulta cada 60 s.
 *
 * El parámetro `cb` de la página envuelve la respuesta en JSONP; sin él responde
 * `application/json` limpio, así que no se manda.
 */
export function leerEstadoFlota(): Promise<RespuestaConector<unknown[]>> {
  return leerLista('ajax/fsupdate.php')
}

export function leerVehiculos(): Promise<RespuestaConector<unknown[]>> {
  return leerLista('ajax/vehicles.php?cmd=list')
}

export function leerGeocercas(): Promise<RespuestaConector<unknown[]>> {
  return leerLista('ajax/namedPlaces.php?cmd=list')
}

export function leerConductores(): Promise<RespuestaConector<unknown[]>> {
  return leerLista('ajax/drivers.php?cmd=list')
}

// ── Geometría de las geocercas (13 de septiembre de 2026) ───────────────────
//
// **Corrección de un hallazgo previo.** El proyecto documentaba en tres puntos
// que "Startrack publica el centro de la geocerca pero no su radio", y de ahí
// que no se pudiera afirmar "dentro" ni "fuera". La afirmación salió de sondear
// `ajax/namedPlaces.php?cmd=list`, que efectivamente devuelve nueve campos sin
// geometría (id, name, address, group_id, created_by, creation_date, user_ids,
// x, y).
//
// El radio sí existe, en la superficie REST moderna — el mismo patrón que ya
// había pasado con las tareas, donde `ajax/jobs.php` daba 404 y la ruta buena
// era `GET /api/job`. Verificado en vivo contra el sandbox:
//
//   GET /api/pois  → 20 registros. `radius` poblado en 20 de 20 (18 con valor
//   mayor que cero), `is_round` con los dos valores 0 y 1, `geom` en 20 de 20,
//   `corners` en 2 de 20.
//
// La otra vía es `ajax/namedPlaces.php?cmd=detail&id=<id>`, que agrega
// `radius`, `is_round`, `vertices` y `bounding_box_wkt`. Se elige `/api/pois`
// porque resuelve las 20 en una sola llamada en vez de una por geocerca.
//
// Proyecta dentro del conector: de todos los campos del POI salen solo los seis
// que la cascada de ubicación necesita. `contact`, `url`, `photo_id` y los de
// recurrencia de visitas no se leen.
const ENDPOINT_POIS = 'api/pois'

export function leerGeocercasConGeometria(): Promise<RespuestaConector<unknown[]>> {
  return conCache(`startrack:${ENDPOINT_POIS}`, async () => {
    const cuerpo = await peticionApiJson(ENDPOINT_POIS)
    const lista = Array.isArray(cuerpo.data) ? (cuerpo.data as unknown[]) : []

    const proyectadas = lista.map((cruda) => {
      const p = cruda as Record<string, unknown>
      return {
        id: p.id,
        name: p.name ?? null,
        x: p.x ?? null,
        y: p.y ?? null,
        // Llegan como texto en la respuesta real; se parsean en la capa canónica.
        radius: p.radius ?? null,
        is_round: p.is_round ?? null,
      }
    })

    return envolver(proyectadas as unknown[], PLATAFORMA, ENDPOINT_POIS)
  })
}

// ── Operadores del optimizador (S-A10 Paso 2) ───────────────────────────────
//
// Los dos lectores de abajo PROYECTAN dentro del conector: lo que no se
// necesita (nombres, correos, teléfonos, alertas) no sale de la función.
// `fn` de `ajax/drivers.php` junta el código de trabajador y el nombre del
// conductor (`"código - nombre"`), y `detailAlerts[].driver.name` del reporte
// trae el nombre otra vez (AGENTS.md §1.2).

const SEPARADOR_FN = ' - '

function prefijoDeFn(fn: unknown): string | null {
  if (typeof fn !== 'string') return null
  const indice = fn.indexOf(SEPARADOR_FN)
  // Sin separador, `fn` es solo un nombre: nunca se devuelve entero.
  if (indice === -1) return null
  const prefijo = fn.slice(0, indice).trim()
  return prefijo === '' ? null : prefijo
}

/** Código de trabajador de cada conductor, sin nombre. Reusa `leerConductores()`
 * (mismo caché, sin segunda llamada). Un registro sin `i` no se puede unir a
 * nada y no se devuelve. */
export async function leerCodigosConductor(): Promise<RespuestaConector<CodigoConductorStartrack[]>> {
  const respuesta = await leerConductores()
  const codigos: CodigoConductorStartrack[] = []
  for (const crudo of respuesta.datos) {
    if (typeof crudo !== 'object' || crudo === null) continue
    const { i, fn } = crudo as { i?: unknown; fn?: unknown }
    if (i === null || i === undefined) continue
    codigos.push({ id: String(i), prefijoFn: prefijoDeFn(fn) })
  }
  return { datos: codigos, linaje: respuesta.linaje }
}

/** Id del reporte de conductores de Startrack, verificado contra el sandbox el
 * 13 de septiembre de 2026 (`ajax/report.php?id=32&format=json`). */
export const ID_REPORTE_CONDUCTORES = 32

/** El reporte es histórico: no cambia en segundos como la flota. */
const TTL_REPORTE_CONDUCTORES_MS = 5 * 60 * 1000

function numeroONulo(valor: unknown): number | null {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor
  if (typeof valor === 'string' && valor.trim() !== '' && Number.isFinite(Number(valor))) return Number(valor)
  return null
}

function idConductor(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null
  const id = String(valor).trim()
  return id === '' ? null : id
}

/** Calificación (`scores[].safety_score`) y contador acumulado de horas de
 * motor (`detail[].ignOnTime`, en horas — ver tipos-crudos) de los conductores
 * con actividad entre `desde` y `hasta`
 * (AAAA-MM-DD, inclusive). La respuesta válida no trae `success`; la vencida
 * trae `success:false` y `peticionAjax` reautentica por el cuerpo. */
export function leerReporteConductores(
  desde: string,
  hasta: string,
): Promise<RespuestaConector<ReporteConductoresStartrack>> {
  const endpoint =
    `ajax/report.php?id=${ID_REPORTE_CONDUCTORES}&format=json` +
    `&start_date=${desde}&start_time=00%3A00&end_date=${hasta}&end_time=23%3A59&driver_ids=&retdat=1`

  return conCache(
    `startrack:${endpoint}`,
    async () => {
      const cuerpo = await peticionAjax(endpoint)
      if (!Array.isArray(cuerpo.scores) || !Array.isArray(cuerpo.detail)) {
        // Nunca vacío en silencio (AGENTS.md §3.3).
        throw new ErrorConector(PLATAFORMA, endpoint, 'respuesta sin scores/detail')
      }

      const scores: ReporteConductoresStartrack['scores'] = []
      for (const fila of cuerpo.scores as unknown[]) {
        if (typeof fila !== 'object' || fila === null) continue
        const { driver_id, safety_score } = fila as { driver_id?: unknown; safety_score?: unknown }
        const id = idConductor(driver_id)
        if (id === null) continue
        scores.push({ driver_id: id, safety_score: numeroONulo(safety_score) })
      }

      const detail: ReporteConductoresStartrack['detail'] = []
      for (const fila of cuerpo.detail as unknown[]) {
        if (typeof fila !== 'object' || fila === null) continue
        const { driver_id, date, ignOnTime } = fila as { driver_id?: unknown; date?: unknown; ignOnTime?: unknown }
        const id = idConductor(driver_id)
        if (id === null) continue
        detail.push({
          driver_id: id,
          date: typeof date === 'string' ? date : null,
          ignOnTime: numeroONulo(ignOnTime),
        })
      }

      // `detailAlerts` no se copia: se descarta entero.
      return envolver<ReporteConductoresStartrack>({ scores, detail }, PLATAFORMA, endpoint)
    },
    TTL_REPORTE_CONDUCTORES_MS,
  )
}

// ── Horómetro GPS y serie diaria (S-A11 Paso 2) ─────────────────────────────
//
// Dos reportes más de `ajax/report.php`, proyectados dentro del conector igual
// que el de conductores. Lo que no se necesita **no sale de la función**:
// `place`, `route`, `driver_id`, `heading`, `distance`, `duration`, `poiId` del
// reporte 22; `driver` (un nombre — AGENTS.md §1.2), `summary`, las matrices y
// `fmtDates` del reporte 3. Los reportes 45 y 37 (PII masiva) y 13 no se
// llaman nunca.

/** Estado de flota: `curOperatingHours` por vehículo. Verificado el 13 de
 * septiembre de 2026 (14 filas; coincide con `ign_on_time` de
 * `api/vehicle/{id}/status` en 14/14). */
export const ID_REPORTE_FLOTA = 22

/** Resumen Diario: `ignOnTime` en **segundos** por vehículo y día (Σ ÷ 3600 =
 * horómetro vivo en 14/14). Verificado el 13 de septiembre de 2026. */
export const ID_REPORTE_RESUMEN_DIARIO = 3

/** El contador cambia con la operación: mismo orden que el estado de flota. */
const TTL_HOROMETROS_MS = 60 * 1000

/** La serie es histórica por día; 5 min como el reporte de conductores. */
const TTL_RESUMEN_DIARIO_MS = 5 * 60 * 1000

function idVehiculo(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null
  const id = String(valor).trim()
  return id === '' ? null : id
}

/** Horómetro y odómetro acumulados de cada vehículo, leídos en una sola
 * llamada. De cada fila salen **solo** `vehicle_id`, `curOperatingHours` y
 * `curOdometer`; el resto se descarta acá. */
export function leerHorometrosFlota(): Promise<RespuestaConector<HorometroVivo[]>> {
  const hoy = hoyElSalvador()
  const endpoint =
    `ajax/report.php?id=${ID_REPORTE_FLOTA}&format=json` +
    `&start_date=${hoy}&end_date=${hoy}&vehicle_ids=&driver_ids=&retdat=1`

  return conCache(
    `startrack:${endpoint}`,
    async () => {
      const cuerpo = await peticionAjax(endpoint)
      if (!Array.isArray(cuerpo.detail)) {
        throw new ErrorConector(PLATAFORMA, endpoint, 'respuesta sin detail')
      }
      const leidoEn = new Date().toISOString()
      const filas: HorometroVivo[] = []
      for (const fila of cuerpo.detail as unknown[]) {
        if (typeof fila !== 'object' || fila === null) continue
        const { vehicle_id, curOperatingHours, curOdometer } = fila as {
          vehicle_id?: unknown
          curOperatingHours?: unknown
          curOdometer?: unknown
        }
        const id = idVehiculo(vehicle_id)
        if (id === null) continue
        filas.push({
          vehiculoId: id,
          horasMotor: numeroONulo(curOperatingHours),
          odometroKm: numeroONulo(curOdometer),
          linaje: {
            plataforma: PLATAFORMA,
            endpoint,
            campo: 'curOperatingHours',
            valorCrudo: curOperatingHours ?? null,
            leidoEn,
          },
        })
      }
      return envolver(filas, PLATAFORMA, endpoint)
    },
    TTL_HOROMETROS_MS,
  )
}

/** Serie diaria de motor encendido entre `desde` y `hasta` (AAAA-MM-DD,
 * inclusive). Varias filas por vehículo y día se conservan todas: el cálculo
 * las suma. `timezone` del cuerpo viaja en el linaje para que la ficha pueda
 * decir en qué zona están los días. */
export function leerResumenDiario(desde: string, hasta: string): Promise<RespuestaConector<SerieDiaria>> {
  const endpoint =
    `ajax/report.php?id=${ID_REPORTE_RESUMEN_DIARIO}&format=json` +
    `&start_date=${desde}&end_date=${hasta}&vehicle_ids=&driver_ids=&retdat=1`

  return conCache(
    `startrack:${endpoint}`,
    async () => {
      const cuerpo = await peticionAjax(endpoint)
      if (!Array.isArray(cuerpo.detail)) {
        throw new ErrorConector(PLATAFORMA, endpoint, 'respuesta sin detail')
      }
      const leidoEn = new Date().toISOString()
      const filas: FilaSerieDiaria[] = []
      for (const fila of cuerpo.detail as unknown[]) {
        if (typeof fila !== 'object' || fila === null) continue
        // `driver` NO se desestructura: es un nombre y muere acá.
        const { vehicleId, date, ignOnTime, timeInMotion, idling } = fila as {
          vehicleId?: unknown
          date?: unknown
          ignOnTime?: unknown
          timeInMotion?: unknown
          idling?: unknown
        }
        const id = idVehiculo(vehicleId)
        if (id === null || typeof date !== 'string' || date.length < 10) continue
        filas.push({
          vehiculoId: id,
          fecha: date.slice(0, 10),
          motorEncendidoSeg: numeroONulo(ignOnTime),
          enMovimientoSeg: numeroONulo(timeInMotion),
          ralentiSeg: numeroONulo(idling),
        })
      }
      const linaje: Linaje = {
        plataforma: PLATAFORMA,
        endpoint,
        campo: 'detail[].ignOnTime',
        valorCrudo: { timezone: typeof cuerpo.timezone === 'string' ? cuerpo.timezone : null },
        leidoEn,
      }
      return envolver<SerieDiaria>({ desde, hasta, filas, linaje }, PLATAFORMA, endpoint)
    },
    TTL_RESUMEN_DIARIO_MS,
  )
}

/** Solo para pruebas: olvida la cookie de sesión entre casos. */
export function _reiniciarParaPruebas(): void {
  cookieSesion = null
}

// Lector de tareas (S-A2 Paso 0) — la ruta que S-A1 no encontró. Verificada en
// vivo el 12 de septiembre de 2026: `GET /api/job` (superficie REST moderna,
// singular — los 404 de S-A1 fueron por probar `ajax/jobs.php` y `/api/tasks`),
// y acepta la cookie de sesión de `login.php`: no hace falta Basic Auth.
//
// Esta superficie sí usa 401 para sesión vencida (a diferencia de algunos
// endpoints legado que devuelven 200 con success:false) — por eso necesita su
// propio helper en vez de reusar `peticionAjax`, que solo mira el cuerpo.
async function peticionApiJson(endpoint: string): Promise<Record<string, unknown>> {
  const { baseUrl } = config()
  if (!cookieSesion) await iniciarSesion()

  const intentar = async (): Promise<Record<string, unknown>> => {
    const respuesta = await fetch(`${baseUrl}/${endpoint}`, {
      headers: { Cookie: cookieSesion! },
    })

    if (respuesta.status === 401) {
      throw new SesionExpirada(PLATAFORMA, endpoint)
    }

    let cuerpo: unknown
    try {
      cuerpo = await respuesta.json()
    } catch {
      throw new ErrorConector(PLATAFORMA, endpoint, `respuesta no-JSON (status ${respuesta.status})`)
    }

    // Cubre también el 200-con-success:false (01 E.7): desenvolverStartrack
    // lanza SesionExpirada sin importar que el status ya haya pasado el
    // chequeo de 401 de arriba.
    return desenvolverStartrack<Record<string, unknown>>(cuerpo, endpoint)
  }

  try {
    return await intentar()
  } catch (error) {
    if (error instanceof SesionExpirada) {
      // Reautentica y reintenta UNA sola vez — nunca en bucle (S-A1 §3, igual
      // que peticionAjax).
      await iniciarSesion()
      return await intentar()
    }
    throw error
  }
}

const ENDPOINT_TAREAS = 'api/job?page_num=0&page_size=200&sort_by=start_date&sort_dir=asc'

/** ~32 tareas en el sandbox compartido; con page_size=200 entran en una sola
 * página. No hace falta el filtro de fechas del UI para leerlas todas. */
export function leerTareas(): Promise<RespuestaConector<unknown[]>> {
  return conCache(`startrack:${ENDPOINT_TAREAS}`, async () => {
    const cuerpo = await peticionApiJson(ENDPOINT_TAREAS)
    const lista = Array.isArray(cuerpo.data) ? (cuerpo.data as unknown[]) : []
    return envolver(lista, PLATAFORMA, ENDPOINT_TAREAS)
  })
}

const ENDPOINT_TIPOS_TAREA = 'api/job/type?include_readonly=1'

/** Catálogo job_type_id → nombre (Traslado, Pedido, Visita, ENTREGA DE
 * AGREGADOS, Nuevo). Lo usa R4 y el enlace de traslados en lib/canonico. */
export function leerTiposTarea(): Promise<RespuestaConector<unknown[]>> {
  return conCache(`startrack:${ENDPOINT_TIPOS_TAREA}`, async () => {
    const cuerpo = await peticionApiJson(ENDPOINT_TIPOS_TAREA)
    const lista = Array.isArray(cuerpo.data) ? (cuerpo.data as unknown[]) : []
    return envolver(lista, PLATAFORMA, ENDPOINT_TIPOS_TAREA)
  })
}

// Nivel 1 de la cascada de ubicación (01 E.10) — corrección de hallazgo,
// verificada en vivo el 13 de septiembre de 2026. La investigación original
// buscó telemetría bajo `ajax/*.php` y no la encontró; existe en la
// superficie REST moderna, sin envoltura `{success, ...}` (no hace falta
// `desenvolverStartrack`, pero sí reautentica igual que `api/job` ante 401 o
// success:false — se reusa `peticionApiJson` por eso).
export function leerEstadoVehiculo(vehiculoId: string): Promise<RespuestaConector<unknown>> {
  const endpoint = `api/vehicle/${vehiculoId}/status`
  return conCache(`startrack:${endpoint}`, async () => {
    const cuerpo = await peticionApiJson(endpoint)
    return envolver(cuerpo, PLATAFORMA, endpoint)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Escritura — Propagación P1 (S-A4). Única escritura de este conector.
// ─────────────────────────────────────────────────────────────────────────────
//
// Dos diferencias deliberadas respecto de los lectores de arriba:
//
// 1. **No se reintenta ante `success:false`.** La superficie de Startrack usa
//    ese mismo cuerpo para "sesión vencida" y para "tu petición no me gustó"
//    (01 E.7). En una lectura, reintentar es gratis; en una escritura, un
//    reintento a ciegas puede crear DOS tareas cuando la primera sí se había
//    creado. Solo se reintenta ante un 401 explícito, que sí garantiza que el
//    servidor no procesó nada.
// 2. **No pasa por caché.** Y al terminar invalida la caché de tareas, para que
//    la vista que se refresca detrás del diálogo ya no muestre la incoherencia
//    que se acaba de resolver.
//
// Ningún campo de contacto (`contact_name`, `contact_email`, `phone_number`) se
// escribe ni se lee acá: son PII de personal real de ECON (AGENTS.md §1.2).

/** Cuerpo de creación de tarea. Los nombres de campo son los que devuelve
 * `GET /api/job` sobre el mismo recurso — el contrato de escritura del sandbox
 * no está documentado de nuestro lado, así que se espeja la forma de lectura y
 * se verifica contra la API real. Todo campo opcional que no tengamos se omite:
 * no se manda un valor inventado para rellenar (AGENTS.md §1.1). */
export type NuevaTareaStartrack = {
  job_type_id: number | string
  /** El id de la solicitud de Prisma. Es el punto de toda la propagación: lo
   * que vuelve determinística la unión entre las dos plataformas (01 E.5). */
  remote_id: string
  start_date?: string | null
  end_datetime?: string | null
  poi_id?: number | string | null
  origin_poi_id?: number | string | null
  assigned_vehicle_id?: number | string | null
  address?: string | null
  x?: number | null
  y?: number | null
  name?: string | null
}

const ENDPOINT_CREAR_TAREA = 'api/job'

function sinCamposVacios(tarea: NuevaTareaStartrack): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(tarea).filter(([, valor]) => valor !== null && valor !== undefined),
  )
}

export async function crearTarea(
  tarea: NuevaTareaStartrack,
): Promise<RespuestaConector<Record<string, unknown>>> {
  const { baseUrl } = config()
  if (!cookieSesion) await iniciarSesion()

  const cuerpoPeticion = JSON.stringify(sinCamposVacios(tarea))

  const intentar = async (): Promise<Response> =>
    fetch(`${baseUrl}/${ENDPOINT_CREAR_TAREA}`, {
      method: 'POST',
      headers: { Cookie: cookieSesion!, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: cuerpoPeticion,
    })

  let respuesta = await intentar()
  if (respuesta.status === 401) {
    // 401 = el servidor no procesó la petición. Reautenticar y reintentar una
    // sola vez es seguro; cualquier otro código, no.
    await iniciarSesion()
    respuesta = await intentar()
  }

  let cuerpo: unknown
  try {
    cuerpo = await respuesta.json()
  } catch {
    throw new ErrorEscritura(
      PLATAFORMA,
      ENDPOINT_CREAR_TAREA,
      `respuesta no-JSON (status ${respuesta.status})`,
    )
  }

  const comoObjeto = (cuerpo ?? {}) as Record<string, unknown>

  if (!respuesta.ok) {
    throw new ErrorEscritura(
      PLATAFORMA,
      ENDPOINT_CREAR_TAREA,
      `status ${respuesta.status}: ${String(comoObjeto.errorMsg ?? comoObjeto.message ?? 'sin detalle')}`,
    )
  }

  if (comoObjeto.success === false) {
    throw new ErrorEscritura(
      PLATAFORMA,
      ENDPOINT_CREAR_TAREA,
      String(comoObjeto.errorMsg ?? 'la plataforma respondió success:false sin detalle'),
    )
  }

  // La tarea nueva tiene que verse en la próxima lectura, no dentro de 45s.
  invalidarCache('startrack:api/job')

  return envolver(comoObjeto, PLATAFORMA, ENDPOINT_CREAR_TAREA)
}

// ─────────────────────────────────────────────────────────────────────────────
// Escritura — Propagación P3 (S-A11 Paso 2c): estado del vehículo.
// ─────────────────────────────────────────────────────────────────────────────
//
// Misma familia que `crearTarea`: `ErrorEscritura`, sin reintento ante
// `success:false`, sin caché. Tres reglas propias:
//
// 1. **Nunca se manda un cuerpo que no salió de la propia API.** Primero `GET
//    api/vehicle/{id}` (55 campos); si falla, se aborta. El PUT lleva ese
//    mismo objeto con `status` reemplazado — `status` llega como texto y se
//    respeta el tipo observado ("1" Mantenimiento, "0" Normal).
// 2. **Se verifica y se revierte.** Un GET después del PUT confirma que
//    `status` cambió y que ningún otro campo cambió; si algo más cambió, se
//    revierte con el objeto original y se lanza `ErrorEscritura` con la lista.
// 3. **PII de ida y vuelta, nunca de salida.** `engine_num`, `license_plate`,
//    `vin` y `driver_id` viajan dentro del cuerpo porque la API lo exige; no se
//    registran, no se devuelven a la ruta, no se muestran. El rastro solo
//    nombra `status`.

export type EstadoVehiculoEscribible = '0' | '1'

/** Cuerpo de `GET api/vehicle/{id}`: `{ success, data }` con 55 campos
 * (verificado el 13 de septiembre de 2026). Se tipa laxo a propósito: el PUT
 * espeja lo leído sin interpretar ningún campo salvo `status`. */
export type VehiculoStartrackCompleto = Record<string, unknown>

async function leerVehiculoCompleto(
  vehiculoId: string,
): Promise<{ endpoint: string; datos: VehiculoStartrackCompleto }> {
  const endpoint = `api/vehicle/${vehiculoId}`
  const cuerpo = await peticionApiJson(endpoint)
  const datos = cuerpo.data
  if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) {
    throw new ErrorEscritura(
      PLATAFORMA,
      endpoint,
      'GET sin `data`: no se escribe un cuerpo que no salió de la API',
    )
  }
  return { endpoint, datos: datos as VehiculoStartrackCompleto }
}

/** Lectura de verificación, sin caché: sirve para saber en qué estado está
 * el vehículo antes de abrir o cerrar una orden. Solo devuelve `status` y el
 * conteo de campos — el objeto completo trae PII y se queda acá. */
export async function leerVehiculo(
  vehiculoId: string,
): Promise<RespuestaConector<{ status: string | null; campos: number }>> {
  const { endpoint, datos } = await leerVehiculoCompleto(vehiculoId)
  return envolver(
    { status: datos.status == null ? null : String(datos.status), campos: Object.keys(datos).length },
    PLATAFORMA,
    endpoint,
  )
}

/** Campos que difieren entre dos lecturas del mismo vehículo, comparando por
 * JSON (los valores llegan como texto, arreglos o null). */
export function camposQueDifieren(
  antes: VehiculoStartrackCompleto,
  despues: VehiculoStartrackCompleto,
): string[] {
  const claves = new Set([...Object.keys(antes), ...Object.keys(despues)])
  const distintos: string[] = []
  for (const clave of claves) {
    if (JSON.stringify(antes[clave] ?? null) !== JSON.stringify(despues[clave] ?? null)) {
      distintos.push(clave)
    }
  }
  return distintos.sort()
}

async function ponerRecurso(endpoint: string, cuerpo: VehiculoStartrackCompleto): Promise<void> {
  const { baseUrl } = config()
  if (!cookieSesion) await iniciarSesion()

  const intentar = async (): Promise<Response> =>
    fetch(`${baseUrl}/${endpoint}`, {
      method: 'PUT',
      headers: { Cookie: cookieSesion!, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(cuerpo),
    })

  let respuesta = await intentar()
  if (respuesta.status === 401) {
    // 401 = el servidor no procesó nada; reautenticar una sola vez es seguro.
    await iniciarSesion()
    respuesta = await intentar()
  }

  let json: unknown = null
  try {
    json = await respuesta.json()
  } catch {
    // Un PUT puede responder sin cuerpo; el GET de verificación decide.
  }
  const comoObjeto = (json ?? {}) as Record<string, unknown>

  if (!respuesta.ok) {
    throw new ErrorEscritura(
      PLATAFORMA,
      endpoint,
      `status ${respuesta.status}: ${String(comoObjeto.errorMsg ?? comoObjeto.message ?? 'sin detalle')}`,
    )
  }
  if (comoObjeto.success === false) {
    throw new ErrorEscritura(
      PLATAFORMA,
      endpoint,
      String(comoObjeto.errorMsg ?? 'la plataforma respondió success:false sin detalle'),
    )
  }
}

export type RastroEstadoVehiculo = {
  antes: string | null
  despues: string | null
  endpoint: string
  metodo: 'PUT'
  hora: string
}

/**
 * Cambia `status` del vehículo en Startrack de ida (`'1'` Mantenimiento) o de
 * vuelta (`'0'` Normal). Solo la llama `lib/propagacion/taller.ts`, después de
 * la restricción de recurso propio; esta función no la vuelve a verificar
 * porque no conoce Prisma ni el proyecto — igual que `crearTarea`.
 *
 * `camposIgnorados`: campos que el servidor actualiza solo al escribir. Se
 * declaran desde lo observado en el no-op del Paso 9, nunca se adivinan acá.
 * Vacío = cualquier diferencia fuera de `status` revierte.
 */
export async function actualizarEstadoVehiculo(
  vehiculoId: string,
  status: EstadoVehiculoEscribible,
  camposIgnorados: string[] = [],
): Promise<RastroEstadoVehiculo> {
  const { endpoint, datos: original } = await leerVehiculoCompleto(vehiculoId)
  const antes = original.status == null ? null : String(original.status)

  await ponerRecurso(endpoint, { ...original, status })

  const { datos: verificado } = await leerVehiculoCompleto(vehiculoId)
  const despues = verificado.status == null ? null : String(verificado.status)

  const alterados = camposQueDifieren(original, verificado).filter(
    (campo) => campo !== 'status' && !camposIgnorados.includes(campo),
  )
  if (alterados.length > 0) {
    // Se revierte con el objeto original tal cual salió de la API; si la
    // reversión también falla, ese error es el que llega, con su endpoint.
    await ponerRecurso(endpoint, original)
    throw new ErrorEscritura(
      PLATAFORMA,
      endpoint,
      `el PUT alteró campos además de status (${alterados.join(', ')}); se revirtió al objeto original`,
    )
  }
  if (despues !== status) {
    throw new ErrorEscritura(
      PLATAFORMA,
      endpoint,
      `el PUT respondió sin error pero status sigue en ${despues ?? 'null'} (se pidió ${status})`,
    )
  }

  invalidarCache('startrack:ajax/vehicles.php')
  invalidarCache(`startrack:${endpoint}`)

  return { antes, despues, endpoint, metodo: 'PUT', hora: new Date().toISOString() }
}

// ─────────────────────────────────────────────────────────────────────────────
// Escritura — estado de una tarea (coherencia R2, centro de comando).
// ─────────────────────────────────────────────────────────────────────────────
//
// Mismas tres reglas que `actualizarEstadoVehiculo`: el PUT espeja el objeto
// que devolvió `GET api/job/{id}` (70 campos, verificado el 13-sep-2026; OPTIONS
// anuncia GET y PUT) con solo `status` reemplazado; un GET posterior verifica;
// si cambió algo más que el estado, se revierte. `contact_name`,
// `contact_email` y `phone_number` viajan dentro del cuerpo porque el PUT
// espeja el objeto, pero no se registran ni salen de esta función.

/** `0` Pendiente · `2` Cancelada (`GET api/job/status`). Una tarea ya
 * cancelada no se puede modificar: el PUT responde 403 "no puede modificar una
 * Tarea cancelada" (verificado el 13-sep-2026), así que `2` es definitivo. */
export type EstadoTareaEscribible = '0' | '2'

/** Campos del mismo objeto tarea que registran el propio cambio de estado. Se
 * nombran por lo que son, no por lo observado en un PUT: si el primer PUT real
 * altera otro campo, la verificación lo revierte y lo reporta. */
const CAMPOS_BITACORA_DE_ESTADO_TAREA = ['changed_date', 'last_status_change_date', 'closed_date', 'status_changes']

async function leerTareaCompleta(tareaId: string): Promise<{ endpoint: string; datos: Record<string, unknown> }> {
  const endpoint = `api/job/${tareaId}`
  const cuerpo = await peticionApiJson(endpoint)
  const datos = cuerpo.data
  if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) {
    throw new ErrorEscritura(PLATAFORMA, endpoint, 'GET sin `data`: no se escribe un cuerpo que no salió de la API')
  }
  return { endpoint, datos: datos as Record<string, unknown> }
}

export type RastroEstadoTarea = {
  tareaId: string
  antes: string | null
  despues: string | null
  endpoint: string
  metodo: 'PUT'
  hora: string
}

/** Cambia `status` de una tarea. Solo la llama `lib/propagacion/coherencia.ts`,
 * después de la restricción de recurso propio. */
export async function actualizarEstadoTarea(tareaId: string, status: EstadoTareaEscribible): Promise<RastroEstadoTarea> {
  const { endpoint, datos: original } = await leerTareaCompleta(tareaId)
  const antes = original.status == null ? null : String(original.status)

  await ponerRecurso(endpoint, { ...original, status })

  const { datos: verificado } = await leerTareaCompleta(tareaId)
  const despues = verificado.status == null ? null : String(verificado.status)

  const alterados = camposQueDifieren(original, verificado).filter(
    (campo) => campo !== 'status' && !CAMPOS_BITACORA_DE_ESTADO_TAREA.includes(campo),
  )
  if (alterados.length > 0) {
    await ponerRecurso(endpoint, original)
    throw new ErrorEscritura(
      PLATAFORMA,
      endpoint,
      `el PUT alteró campos además de status (${alterados.join(', ')}); se revirtió al objeto original`,
    )
  }
  if (despues !== status) {
    throw new ErrorEscritura(
      PLATAFORMA,
      endpoint,
      `el PUT respondió sin error pero status sigue en ${despues ?? 'null'} (se pidió ${status})`,
    )
  }

  invalidarCache('startrack:api/job')

  return { tareaId, antes, despues, endpoint, metodo: 'PUT', hora: new Date().toISOString() }
}
