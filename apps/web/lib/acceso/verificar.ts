// Acceso por rol — S-C3, carril C (01 Parte D.5).
//
// Una clave distinta por gerencia, más una clave de admin superusuario para
// manejar la demo. Varios jueces entran a la vez y cada uno cae en su vista.
// Las claves viven SOLO en variables de entorno de servidor (AGENTS.md §1.4):
// ninguna lleva prefijo público, ninguna se devuelve en una respuesta, y la
// cookie de sesión no contiene la clave — contiene el rol y una firma.
//
// **Dónde se verifica de verdad.** `proxy.ts` corre en el borde del request y
// no tiene garantizado ni el sistema de archivos ni las variables del
// `.env.local` de la raíz del repositorio (Next solo carga el de su Root
// Directory). Por eso acá hay dos niveles, a propósito:
//
// - `verificarAcceso(request)` — barato, sin criptografía: ¿hay una cookie de
//   sesión con forma válida? Es lo que usa `proxy.ts` para redirigir a la
//   pantalla de acceso. **No es la autorización.**
// - `sesionDeRequest(request)` — verifica la firma HMAC. Es lo que usan las
//   rutas de API antes de devolver un solo dato de ECON o de escribir nada.
//
// Verificar en el proxy y confiar en eso sería exactamente el error que la
// propia documentación de Next advierte: la autorización va donde está el dato.
//
// Este archivo no importa `server-only` ni `node:fs` a propósito: `proxy.ts` lo
// importa, y tiene que poder correr en cualquiera de los dos runtimes. Quien
// necesita las variables de la raíz llama antes a `asegurarEntornoCargado()`
// (lib/conectores/entorno.ts), que sí es server-only.

import type { NextRequest } from 'next/server'
import type { Rol } from '@/lib/tipos/canonico'

/** Los cinco roles de gerencia (01 D.5) más el admin superusuario. `ADMIN` no
 * es un `Rol` del contrato a propósito: no describe una gerencia de ECON, es
 * nuestra llave de demo. Por eso no entra en `lib/tipos/canonico.ts` ni cambia
 * el `rolResponsable` de ninguna regla. */
export type RolSesion = Rol | 'ADMIN'

export type Sesion = {
  rol: RolSesion
  emitidaEn: number
}

export const NOMBRE_COOKIE = 'nect_sesion'

/** 14 horas: cubre el hackathon completo desde el arranque hasta el pitch sin
 * que un juez tenga que volver a escribir la clave a media demo. */
export const VIGENCIA_MS = 14 * 60 * 60 * 1000

export const ROLES_SESION: RolSesion[] = [
  'PROYECTOS',
  'LOGISTICA',
  'MANTENIMIENTO',
  'COSTOS',
  'DIRECCION',
  'ADMIN',
]

export const ETIQUETA_ROL: Record<RolSesion, string> = {
  PROYECTOS: 'Gerencia Técnica de Proyectos',
  LOGISTICA: 'Gerencia de Logística y Equipo',
  MANTENIMIENTO: 'Gerencia de Mantenimiento',
  COSTOS: 'Control de Costos',
  DIRECCION: 'Dirección de Operaciones',
  ADMIN: 'Administración (demo)',
}

/** A dónde entra cada rol al autenticarse. Hoy todos caen en el centro de
 * comando porque es la única vista construida; las rutas por rol de D.5
 * (/flota, /equipo, /indicadores) las levanta carril B en S-B1/S-B2, y cuando
 * existan se cambian acá y en ningún otro lado. */
export const VISTA_INICIAL: Record<RolSesion, string> = {
  PROYECTOS: '/command-center',
  LOGISTICA: '/command-center',
  MANTENIMIENTO: '/command-center',
  COSTOS: '/command-center',
  DIRECCION: '/command-center',
  ADMIN: '/command-center',
}

/**
 * Quién puede propagar a la otra plataforma (S-A4).
 *
 * No es una preferencia nuestra: sale de la matriz de responsabilidades del carril C
 * (`lib/gobernanza/responsabilidades.ts`, paso "Programar y ejecutar el traslado"), donde la Gerencia
 * de Logística y Equipos **valida** ese paso. Dirección de
 * Operaciones tiene vista transversal pero no un paso propio en el proceso, así
 * que no escribe. `ADMIN` escribe porque es nuestra llave de demo — y aun así
 * queda sujeto a la restricción de recurso propio de S-A4, que es de servidor.
 */
export function puedePropagar(rol: RolSesion): boolean {
  return rol === 'LOGISTICA' || rol === 'ADMIN'
}

/** Las claves, leídas uno por uno con referencia estática a `process.env` —
 * nunca por índice dinámico, que en el runtime del borde no se sustituye. */
function claveDe(rol: RolSesion): string | undefined {
  switch (rol) {
    case 'PROYECTOS':
      return process.env.NECT_CLAVE_PROYECTOS
    case 'LOGISTICA':
      return process.env.NECT_CLAVE_LOGISTICA
    case 'MANTENIMIENTO':
      return process.env.NECT_CLAVE_MANTENIMIENTO
    case 'COSTOS':
      return process.env.NECT_CLAVE_COSTOS
    case 'DIRECCION':
      return process.env.NECT_CLAVE_DIRECCION
    case 'ADMIN':
      return process.env.NECT_CLAVE_ADMIN
  }
}

/** Qué roles tienen clave configurada. Un rol sin clave no existe: no se puede
 * entrar con él, y la pantalla de acceso lo dice en vez de fallar en silencio. */
export function rolesConfigurados(): RolSesion[] {
  return ROLES_SESION.filter((rol) => (claveDe(rol) ?? '').length > 0)
}

export function hayAccesoConfigurado(): boolean {
  return rolesConfigurados().length > 0
}

/** Comparación en tiempo constante. No usa `crypto.timingSafeEqual` porque no
 * existe en el runtime del borde; la diferencia de longitud se acumula en vez
 * de cortar temprano. */
function igualEnTiempoConstante(a: string, b: string): boolean {
  const largo = Math.max(a.length, b.length)
  let diferencia = a.length ^ b.length
  for (let i = 0; i < largo; i++) {
    diferencia |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diferencia === 0
}

/** La clave escrita en la pantalla de acceso → rol, o `null`. Recorre TODOS
 * los roles siempre: no corta en la primera coincidencia, para no filtrar por
 * tiempo cuál rol acertó. */
export function verificarClave(clave: string): RolSesion | null {
  let encontrado: RolSesion | null = null
  for (const rol of ROLES_SESION) {
    const esperada = claveDe(rol)
    if (!esperada) continue
    if (igualEnTiempoConstante(clave, esperada)) encontrado = rol
  }
  return encontrado
}

/** Material de firma derivado de las claves configuradas. No agrega una
 * variable de entorno más: si una clave cambia, las sesiones viejas caducan,
 * que es justo lo que se quiere. */
async function claveHmac(): Promise<CryptoKey | null> {
  const material = ROLES_SESION.map((rol) => claveDe(rol) ?? '').join('|')
  if (material.replaceAll('|', '').length === 0) return null

  const semilla = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`econ-nect:sesion:${material}`),
  )
  return crypto.subtle.importKey('raw', semilla, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
}

function aHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function firmar(carga: string): Promise<string | null> {
  const clave = await claveHmac()
  if (!clave) return null
  return aHex(await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(carga)))
}

/** Valor de la cookie: `rol.emitidaEn.firma`. Sin la clave adentro. */
export async function firmarSesion(rol: RolSesion, emitidaEn = Date.now()): Promise<string | null> {
  const carga = `${rol}.${emitidaEn}`
  const firma = await firmar(carga)
  return firma === null ? null : `${carga}.${firma}`
}

/** Forma válida, sin verificar la firma. Es lo único que puede hacer el proxy. */
function tieneFormaDeSesion(valor: string | undefined): boolean {
  if (!valor) return false
  const partes = valor.split('.')
  if (partes.length !== 3) return false
  const [rol, emitidaEn] = partes
  return ROLES_SESION.includes(rol as RolSesion) && /^\d+$/.test(emitidaEn)
}

/** Verificación completa: firma válida y sesión vigente. */
export async function verificarCookie(valor: string | undefined): Promise<Sesion | null> {
  if (!tieneFormaDeSesion(valor)) return null

  const [rol, emitidaEnTexto, firmaRecibida] = valor!.split('.')
  const firmaEsperada = await firmar(`${rol}.${emitidaEnTexto}`)
  if (firmaEsperada === null) return null
  if (!igualEnTiempoConstante(firmaRecibida, firmaEsperada)) return null

  const emitidaEn = Number(emitidaEnTexto)
  if (!Number.isFinite(emitidaEn)) return null
  if (Date.now() - emitidaEn > VIGENCIA_MS) return null

  // Una clave revocada (borrada del entorno) cierra la sesión en el acto.
  if (!rolesConfigurados().includes(rol as RolSesion)) return null

  return { rol: rol as RolSesion, emitidaEn }
}

export async function sesionDeRequest(request: NextRequest | Request): Promise<Sesion | null> {
  const valor =
    'cookies' in request && typeof (request as NextRequest).cookies?.get === 'function'
      ? (request as NextRequest).cookies.get(NOMBRE_COOKIE)?.value
      : leerCookieDeEncabezado(request.headers.get('cookie'), NOMBRE_COOKIE)
  return verificarCookie(valor)
}

function leerCookieDeEncabezado(encabezado: string | null, nombre: string): string | undefined {
  if (!encabezado) return undefined
  for (const par of encabezado.split(';')) {
    const [clave, ...resto] = par.trim().split('=')
    if (clave === nombre) return resto.join('=')
  }
  return undefined
}

/**
 * Lo que llama `proxy.ts` (de carril A) en cada request.
 *
 * Deliberadamente barato y sin criptografía: solo dice si hay algo con forma de
 * sesión. La autorización real la hace `sesionDeRequest()` dentro de cada ruta,
 * que es donde está el dato. Si esto devolviera `true` por una cookie
 * falsificada, el atacante vería el cascarón de la aplicación y cero datos:
 * toda ruta de API verifica la firma antes de leer nada de ECON.
 */
export function verificarAcceso(request: NextRequest): boolean {
  return tieneFormaDeSesion(request.cookies.get(NOMBRE_COOKIE)?.value)
}
