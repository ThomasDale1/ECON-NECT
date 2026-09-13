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
import { asegurarEntornoCargado } from './entorno'
import { SesionExpirada, ErrorConector } from './errores'
import { conCache } from './cache'
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
export function leerVehiculos(): Promise<RespuestaConector<unknown[]>> {
  return leerLista('ajax/vehicles.php?cmd=list')
}

export function leerGeocercas(): Promise<RespuestaConector<unknown[]>> {
  return leerLista('ajax/namedPlaces.php?cmd=list')
}

export function leerConductores(): Promise<RespuestaConector<unknown[]>> {
  return leerLista('ajax/drivers.php?cmd=list')
}

/** Solo para pruebas: olvida la cookie de sesión entre casos. */
export function _reiniciarParaPruebas(): void {
  cookieSesion = null
}

// TODO(tareas): sin lector de tareas. Se investigó contra el sandbox real
// (12 sep 2026) y no se encontró la ruta:
// - Legado `ajax/{task,tasks,workOrder,workOrders,jobs,assignments,
//   mobileWorker}.php?cmd=list` → 404 en los siete (no existen como archivo).
// - Moderna `/api`, `/api/tasks`, `/api/v1/tasks`, `/api/mobileworker/tasks`
//   con autenticación básica (usuario/clave, y variantes con el número de
//   cliente combinado) → 401 en todas: la Basic Auth no se aceptó con ningún
//   formato probado.
// - `/api/tasks` con la cookie de sesión legado → 404 (la ruta no existe bajo
//   esa auth).
// Conclusión: la ruta de lectura de tareas no está entre las variantes
// estructurales razonables: se necesita el nombre exacto (o una credencial
// de API distinta a STARTRACK_USER/PASSWORD) para no seguir adivinando
// (AGENTS.md §1.1). Documentado como hueco verificado, no inventado.
