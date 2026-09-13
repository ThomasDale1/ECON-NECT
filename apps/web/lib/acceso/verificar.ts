import type { NextRequest } from 'next/server'
import type { Rol } from '@/lib/tipos/canonico'

/** Cookie httpOnly que fija el rol tras el login por clave (S-C3). */
export const COOKIE_ROL = 'nect_rol'

export const ROLES_VALIDOS: readonly Rol[] = [
  'PROYECTOS',
  'LOGISTICA',
  'MANTENIMIENTO',
  'COSTOS',
  'DIRECCION',
] as const

const CLAVE_POR_ROL: Record<Rol, string> = {
  PROYECTOS: 'NECT_CLAVE_PROYECTOS',
  LOGISTICA: 'NECT_CLAVE_LOGISTICA',
  MANTENIMIENTO: 'NECT_CLAVE_MANTENIMIENTO',
  COSTOS: 'NECT_CLAVE_COSTOS',
  DIRECCION: 'NECT_CLAVE_DIRECCION',
}

/** True si al menos una NECT_CLAVE_* está definida y no vacía. */
export function hayClavesConfiguradas(): boolean {
  return ROLES_VALIDOS.some((rol) => {
    const v = process.env[CLAVE_POR_ROL[rol]]
    return typeof v === 'string' && v.length > 0
  })
}

export function esRolValido(valor: string | undefined | null): valor is Rol {
  return valor != null && (ROLES_VALIDOS as readonly string[]).includes(valor)
}

/**
 * Compara la clave enviada con NECT_CLAVE_*. Devuelve el rol si coincide.
 * Comparación en tiempo constante cuando las longitudes coinciden.
 */
export function rolParaClave(clave: string): Rol | null {
  if (!clave) return null
  const encoder = new TextEncoder()
  const enviada = encoder.encode(clave)

  for (const rol of ROLES_VALIDOS) {
    const esperada = process.env[CLAVE_POR_ROL[rol]]
    if (!esperada) continue
    const buf = encoder.encode(esperada)
    if (buf.length !== enviada.length) continue
    let diff = 0
    for (let i = 0; i < buf.length; i++) diff |= buf[i]! ^ enviada[i]!
    if (diff === 0) return rol
  }
  return null
}

/**
 * Control de acceso (S-C3). Permite `/entrar` y rutas internas de Next.
 * En cualquier otra ruta exige la cookie `nect_rol` con un rol válido.
 * Si ninguna NECT_CLAVE_* está configurada, deniega (no deja la puerta abierta).
 */
export function verificarAcceso(request: NextRequest): boolean {
  const path = request.nextUrl.pathname

  if (path === '/entrar' || path.startsWith('/entrar/')) return true
  if (path.startsWith('/_next')) return true

  if (!hayClavesConfiguradas()) return false

  const rol = request.cookies.get(COOKIE_ROL)?.value
  return esRolValido(rol)
}
