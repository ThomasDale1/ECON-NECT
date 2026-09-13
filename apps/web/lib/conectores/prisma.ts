// Conector de Prisma. server-only.
//
// Login: `POST /api/auth/login` (verificado, S-A1 §2 / AGENTS.md §7). Fija
// una cookie `Secure; HttpOnly; SameSite=strict` — hay que guardarla y
// reenviarla en cada llamada siguiente. No es un bearer token.

import 'server-only'
import type { DetalleEquipoPrismaCrudo } from '@/lib/canonico/tipos-crudos'
import type { MantenimientoEquipoPrisma, ReporteFallaPrisma } from '@/lib/mantenimiento/tipos'
import { asegurarEntornoCargado } from './entorno'
import { ErrorConector, ErrorEscritura } from './errores'
import { conCache, invalidarCache } from './cache'
import { envolver, type RespuestaConector } from './tipos'

asegurarEntornoCargado()

const PLATAFORMA = 'prisma' as const

function config() {
  const baseUrl = process.env.PRISMA_BASE_URL
  const email = process.env.PRISMA_EMAIL
  const password = process.env.PRISMA_PASSWORD
  if (!baseUrl || !email || !password) {
    throw new ErrorConector(
      PLATAFORMA,
      'config',
      'faltan PRISMA_BASE_URL, PRISMA_EMAIL o PRISMA_PASSWORD en .env.local',
    )
  }
  return { baseUrl: baseUrl.replace(/\/$/, ''), email, password }
}

let cookieSesion: string | null = null

async function iniciarSesion(): Promise<string> {
  const { baseUrl, email, password } = config()

  const respuesta = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const setCookie = respuesta.headers.get('set-cookie')
  if (!respuesta.ok || !setCookie) {
    throw new ErrorConector(
      PLATAFORMA,
      '/api/auth/login',
      `login falló (status ${respuesta.status})`,
    )
  }

  cookieSesion = setCookie.split(';')[0]
  return cookieSesion
}

async function peticionJson(ruta: string): Promise<Record<string, unknown>> {
  const { baseUrl } = config()
  if (!cookieSesion) await iniciarSesion()

  const hacer = async (): Promise<Response> =>
    fetch(`${baseUrl}${ruta}`, { headers: { Cookie: cookieSesion! } })

  let respuesta = await hacer()
  if (respuesta.status === 401) {
    // La cookie de Prisma también puede vencer; un solo reintento tras
    // relogin, igual que en Startrack (S-A1 §3).
    await iniciarSesion()
    respuesta = await hacer()
  }

  if (!respuesta.ok) {
    throw new ErrorConector(PLATAFORMA, ruta, `status ${respuesta.status}`)
  }

  return (await respuesta.json()) as Record<string, unknown>
}

/** Encuentra el primer valor de tipo arreglo en la respuesta (heurística
 * estructural, igual que en startrack.ts: S-A1 §2 no documenta el nombre
 * literal del campo de lista para cada endpoint). Se ajusta contra la
 * respuesta real en `npm run leer`. */
function extraerLista(payload: Record<string, unknown>): unknown[] {
  for (const valor of Object.values(payload)) {
    if (Array.isArray(valor)) return valor
  }
  return []
}

const CAMPOS_TOTAL = ['total', 'totalCount', 'totalItems', 'count']

function extraerTotal(payload: Record<string, unknown>): number | undefined {
  for (const campo of CAMPOS_TOTAL) {
    const valor = payload[campo]
    if (typeof valor === 'number') return valor
  }
  return undefined
}

async function leerTodasLasPaginas(rutaBase: string): Promise<unknown[]> {
  const limit = 100
  let page = 1
  let total: number | undefined
  const acumulado: unknown[] = []

  // Salvaguarda: nunca más de 50 páginas (5000 registros), suficiente para el
  // tamaño de un sandbox de hackathon y evita un bucle infinito si la API no
  // trae ninguna señal de fin de paginación.
  for (let i = 0; i < 50; i++) {
    const separador = rutaBase.includes('?') ? '&' : '?'
    const cuerpo = await peticionJson(`${rutaBase}${separador}page=${page}&limit=${limit}`)
    const lista = extraerLista(cuerpo)
    acumulado.push(...lista)
    total = extraerTotal(cuerpo) ?? total

    if (lista.length < limit) break
    if (total !== undefined && acumulado.length >= total) break
    page += 1
  }

  return acumulado
}

export function leerEquipos(): Promise<RespuestaConector<unknown[]>> {
  return conCache('prisma:equipos', async () => {
    const lista = await leerTodasLasPaginas('/api/maquinaria/equipos')
    return envolver(lista, PLATAFORMA, '/api/maquinaria/equipos')
  })
}

export function leerEquipo(id: string): Promise<RespuestaConector<unknown>> {
  const endpoint = `/api/maquinaria/equipos/${id}`
  return conCache(`prisma:equipo:${id}`, async () => {
    const cuerpo = await peticionJson(endpoint)
    return envolver(cuerpo, PLATAFORMA, endpoint)
  })
}

export function leerSolicitudes(): Promise<RespuestaConector<unknown[]>> {
  const endpoint = '/api/maquinaria/requests'
  return conCache('prisma:solicitudes', async () => {
    const cuerpo = await peticionJson(endpoint)
    return envolver(extraerLista(cuerpo), PLATAFORMA, endpoint)
  })
}

export function leerFallas(): Promise<RespuestaConector<unknown[]>> {
  const endpoint = '/api/maquinaria/fallas'
  return conCache('prisma:fallas', async () => {
    const cuerpo = await peticionJson(endpoint)
    return envolver(extraerLista(cuerpo), PLATAFORMA, endpoint)
  })
}

export function leerProyectos(): Promise<RespuestaConector<unknown[]>> {
  const endpoint = '/api/projects'
  return conCache('prisma:proyectos', async () => {
    const cuerpo = await peticionJson(endpoint)
    return envolver(extraerLista(cuerpo), PLATAFORMA, endpoint)
  })
}

export function leerOperadores(): Promise<RespuestaConector<unknown[]>> {
  const endpoint = '/api/maquinaria/operadores'
  return conCache('prisma:operadores', async () => {
    const cuerpo = await peticionJson(endpoint)
    return envolver(extraerLista(cuerpo), PLATAFORMA, endpoint)
  })
}

// ── Mantenimiento preventivo (S-A11 Paso 3) ─────────────────────────────────

function numeroONulo(valor: unknown): number | null {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor
  if (typeof valor === 'string' && valor.trim() !== '' && Number.isFinite(Number(valor))) return Number(valor)
  return null
}

function textoONulo(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null
  const texto = String(valor).trim()
  return texto === '' ? null : texto
}

function booleanoONulo(valor: unknown): boolean | null {
  if (typeof valor === 'boolean') return valor
  if (valor === 1 || valor === '1' || valor === 'true') return true
  if (valor === 0 || valor === '0' || valor === 'false') return false
  return null
}

/** Nombres candidatos del campo que enlaza el reporte con el equipo, en
 * orden. ⚠ Ninguno pudo observarse: el sandbox tenía 0 reportes el 13 de
 * septiembre de 2026 y la parte visible del esquema de la UI de Prisma
 * empieza en `descripcion`. Nunca se une por `maquinaria_nombre` ni `clave`. */
const CAMPOS_ENLACE_REPORTE = ['maquinaria_id', 'equipo_id', 'machinery_id'] as const

export type LecturaReportesFalla = {
  reportes: ReporteFallaPrisma[]
  /** "el reporte no expone el id del equipo; no se une", cuando aplica. */
  advertencias: string[]
}

/**
 * Reportes de falla proyectados. Envuelve `leerFallas()` (mismo caché).
 * `operator_name`, `approver_name`, `descripcion`, `observaciones` y
 * `approver_comment` **no salen del conector**: nombres y texto libre de
 * personal de ECON (AGENTS.md §1.2).
 */
export async function leerReportesFalla(): Promise<RespuestaConector<LecturaReportesFalla>> {
  const respuesta = await leerFallas()
  const reportes: ReporteFallaPrisma[] = []
  const advertencias: string[] = []

  for (const crudo of respuesta.datos) {
    if (typeof crudo !== 'object' || crudo === null) continue
    const fila = crudo as Record<string, unknown>
    const id = textoONulo(fila.id)
    if (id === null) continue

    const campoEnlace = CAMPOS_ENLACE_REPORTE.find((campo) => fila[campo] !== undefined && fila[campo] !== null)
    const maquinariaId = campoEnlace ? textoONulo(fila[campoEnlace]) : null
    if (maquinariaId === null && advertencias.length === 0) {
      advertencias.push(
        `el reporte no expone el id del equipo (se probaron ${CAMPOS_ENLACE_REPORTE.join(', ')}); no se une`,
      )
    }

    reportes.push({
      id,
      maquinariaId,
      estado: textoONulo(fila.estado),
      esParo: booleanoONulo(fila.is_paro),
      horometroHumano: numeroONulo(fila.hour_meter),
      categoria: textoONulo(fila.categoria_falla),
      creadoEn: textoONulo(fila.created_at),
      actualizadoEn: textoONulo(fila.updated_at),
      linaje: {
        plataforma: PLATAFORMA,
        endpoint: respuesta.linaje.endpoint,
        campo: 'hour_meter',
        valorCrudo: fila.hour_meter ?? null,
        leidoEn: respuesta.linaje.leidoEn,
      },
    })
  }

  return { datos: { reportes, advertencias }, linaje: respuesta.linaje }
}

/** Ventana de mantenimiento programado del equipo, desde `leerEquipo(id)`
 * (ya cacheado por S-A7). Vacía en 17/17 hasta que P4 la escriba. */
export async function leerMantenimientoEquipo(id: string): Promise<RespuestaConector<MantenimientoEquipoPrisma>> {
  const respuesta = await leerEquipo(id)
  const detalle = (respuesta.datos ?? {}) as Partial<DetalleEquipoPrismaCrudo>
  return {
    datos: {
      fechaInicio: textoONulo(detalle.mantenimiento_fecha_inicio),
      fechaFin: textoONulo(detalle.mantenimiento_fecha_fin),
      notas: textoONulo(detalle.mantenimiento_notas),
      linaje: {
        plataforma: PLATAFORMA,
        endpoint: respuesta.linaje.endpoint,
        campo: 'mantenimiento_fecha_fin',
        valorCrudo: detalle.mantenimiento_fecha_fin ?? null,
        leidoEn: respuesta.linaje.leidoEn,
      },
    },
    linaje: respuesta.linaje,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Escritura — Propagación P4 (S-A11 Paso 3c). Primera escritura de este
// conector. Mismas reglas que `crearTarea` en startrack.ts: sin reintento
// salvo 401 explícito, sin caché, verificación por GET después del PATCH, y
// `ErrorEscritura` con el detalle de la plataforma tal cual.
// ─────────────────────────────────────────────────────────────────────────────

/** Límite del formulario de Prisma para `mantenimiento_notas`. */
export const MAX_NOTAS_MANTENIMIENTO = 500

export type OrdenMantenimientoPrisma = {
  fechaInicio: string // AAAA-MM-DD
  fechaFin: string // AAAA-MM-DD
  notas: string
}

export type RastroMantenimientoPrisma = {
  endpoint: string
  metodo: 'PATCH'
  campos: string[]
  hora: string
  verificado: MantenimientoEquipoPrisma
}

/**
 * `PATCH /api/maquinaria/equipos/{id}` con las tres fechas/notas de
 * mantenimiento, y `GET` de verificación: los tres campos persistieron. Si el
 * PATCH responde 2xx pero el GET no refleja las fechas, se lanza
 * `ErrorEscritura` — **no** se intenta `…/estado` ni otro cuerpo por cuenta
 * propia: se reporta y el usuario decide.
 */
export async function programarMantenimiento(
  id: string,
  orden: OrdenMantenimientoPrisma,
): Promise<RastroMantenimientoPrisma> {
  const { baseUrl } = config()
  const endpoint = `/api/maquinaria/equipos/${id}`
  if (!cookieSesion) await iniciarSesion()

  const cuerpo = {
    mantenimiento_fecha_inicio: orden.fechaInicio,
    mantenimiento_fecha_fin: orden.fechaFin,
    mantenimiento_notas: orden.notas.slice(0, MAX_NOTAS_MANTENIMIENTO),
  }

  const intentar = async (): Promise<Response> =>
    fetch(`${baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: { Cookie: cookieSesion!, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(cuerpo),
    })

  let respuesta = await intentar()
  if (respuesta.status === 401) {
    await iniciarSesion()
    respuesta = await intentar()
  }

  let json: unknown = null
  try {
    json = await respuesta.json()
  } catch {
    // Sin cuerpo: el GET de verificación decide.
  }
  const comoObjeto = (json ?? {}) as Record<string, unknown>
  if (!respuesta.ok) {
    throw new ErrorEscritura(
      PLATAFORMA,
      endpoint,
      `status ${respuesta.status}: ${String(comoObjeto.error ?? comoObjeto.message ?? 'sin detalle')}`,
    )
  }

  // El detalle está cacheado por S-A7: se invalida antes de verificar para
  // leer lo que Prisma tiene ahora, no lo que tenía hace 45 s.
  invalidarCache(`prisma:equipo:${id}`)
  invalidarCache('prisma:equipos')
  const verificado = await leerMantenimientoEquipo(id)
  const persistio =
    verificado.datos.fechaInicio === cuerpo.mantenimiento_fecha_inicio &&
    verificado.datos.fechaFin === cuerpo.mantenimiento_fecha_fin &&
    (verificado.datos.notas ?? '') === cuerpo.mantenimiento_notas
  if (!persistio) {
    throw new ErrorEscritura(PLATAFORMA, endpoint, 'el PATCH no persistió las fechas de mantenimiento')
  }

  return {
    endpoint,
    metodo: 'PATCH',
    campos: Object.keys(cuerpo),
    hora: new Date().toISOString(),
    verificado: verificado.datos,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Escritura — estado del equipo (coherencia R2, centro de comando; P2 de 01 D.6).
// `PATCH /api/maquinaria/equipos/{id}/estado`: OPTIONS anuncia PATCH
// (verificado el 13-sep-2026). El cuerpo `{ estado }` espeja el nombre del
// campo que devuelve la lista; si Prisma no lo acepta, el error vuelve tal cual
// y **no** se prueba otro cuerpo por cuenta propia. Verificación por la lista,
// que es donde `estado` está confirmado.
// ─────────────────────────────────────────────────────────────────────────────

export type EstadoEquipoEscribible = 'DISPONIBLE'

export type RastroEstadoEquipo = {
  antes: string | null
  despues: string | null
  endpoint: string
  metodo: 'PATCH'
  hora: string
}

async function estadoEnLista(id: string): Promise<string | null> {
  const lista = (await leerEquipos()).datos as { id?: unknown; estado?: unknown }[]
  const equipo = lista.find((e) => String(e.id) === id)
  return equipo?.estado == null ? null : String(equipo.estado)
}

export async function actualizarEstadoEquipo(id: string, estado: EstadoEquipoEscribible): Promise<RastroEstadoEquipo> {
  const { baseUrl } = config()
  const endpoint = `/api/maquinaria/equipos/${id}/estado`
  if (!cookieSesion) await iniciarSesion()

  invalidarCache('prisma:equipos')
  const antes = await estadoEnLista(id)

  const intentar = async (): Promise<Response> =>
    fetch(`${baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: { Cookie: cookieSesion!, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ estado }),
    })

  let respuesta = await intentar()
  if (respuesta.status === 401) {
    await iniciarSesion()
    respuesta = await intentar()
  }

  let json: unknown = null
  try {
    json = await respuesta.json()
  } catch {
    // Sin cuerpo: la lectura de verificación decide.
  }
  const comoObjeto = (json ?? {}) as Record<string, unknown>
  if (!respuesta.ok) {
    throw new ErrorEscritura(
      PLATAFORMA,
      endpoint,
      `status ${respuesta.status}: ${String(comoObjeto.error ?? comoObjeto.message ?? 'sin detalle')}`,
    )
  }

  invalidarCache(`prisma:equipo:${id}`)
  invalidarCache('prisma:equipos')
  const despues = await estadoEnLista(id)
  if (despues !== estado) {
    throw new ErrorEscritura(
      PLATAFORMA,
      endpoint,
      `el PATCH respondió sin error pero estado sigue en ${despues ?? 'null'} (se pidió ${estado})`,
    )
  }

  return { antes, despues, endpoint, metodo: 'PATCH', hora: new Date().toISOString() }
}
