// Conector de Prisma. server-only.
//
// Login: `POST /api/auth/login` (verificado, S-A1 §2 / AGENTS.md §7). Fija
// una cookie `Secure; HttpOnly; SameSite=strict` — hay que guardarla y
// reenviarla en cada llamada siguiente. No es un bearer token.

import 'server-only'
import { asegurarEntornoCargado } from './entorno'
import { ErrorConector } from './errores'
import { conCache } from './cache'
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
