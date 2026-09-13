'use client'

import { PARAMETROS_VACIOS, parametrosSchema } from '@/lib/mantenimiento/parametros'
import type { ParametrosMantenimiento } from '@/lib/mantenimiento/tipos'

export const CLAVE_PARAMETROS_MANTENIMIENTO = 'nect.mantenimiento.parametros'
export const EVENTO_PARAMETROS_MANTENIMIENTO = 'nect:mantenimiento:parametros'

function clonarVacios(): ParametrosMantenimiento {
  return { version: 1, porEquipo: {} }
}

export function leerParametrosNavegador(): ParametrosMantenimiento {
  if (typeof window === 'undefined') return clonarVacios()
  try {
    const crudo = window.localStorage.getItem(CLAVE_PARAMETROS_MANTENIMIENTO)
    if (!crudo) return clonarVacios()
    const validado = parametrosSchema.safeParse(JSON.parse(crudo))
    return validado.success ? validado.data : clonarVacios()
  } catch {
    return clonarVacios()
  }
}

export function guardarParametrosNavegador(parametros: ParametrosMantenimiento): void {
  if (typeof window === 'undefined') return
  try {
    const validado = parametrosSchema.safeParse(parametros)
    if (!validado.success) return
    window.localStorage.setItem(CLAVE_PARAMETROS_MANTENIMIENTO, JSON.stringify(validado.data))
    window.dispatchEvent(new CustomEvent(EVENTO_PARAMETROS_MANTENIMIENTO, { detail: validado.data }))
  } catch {
    // localStorage puede estar bloqueado; la consulta sigue con parametros vacios.
  }
}

export function serializarParametros(parametros: ParametrosMantenimiento = PARAMETROS_VACIOS): string {
  try {
    return encodeURIComponent(JSON.stringify(parametros))
  } catch {
    return encodeURIComponent(JSON.stringify(PARAMETROS_VACIOS))
  }
}

export function parametrosConEquipo(
  actuales: ParametrosMantenimiento,
  equipoId: string,
  cambios: { intervaloHoras?: number | null; severo?: boolean },
): ParametrosMantenimiento {
  const porEquipo = { ...actuales.porEquipo }
  const previo = porEquipo[equipoId] ?? {}
  const siguiente = { ...previo }

  if ('intervaloHoras' in cambios) {
    if (cambios.intervaloHoras === null || cambios.intervaloHoras === undefined) {
      delete siguiente.intervaloHoras
    } else {
      siguiente.intervaloHoras = cambios.intervaloHoras
    }
  }
  if ('severo' in cambios) siguiente.severo = cambios.severo

  if (Object.keys(siguiente).length === 0) delete porEquipo[equipoId]
  else porEquipo[equipoId] = siguiente

  return { ...actuales, porEquipo }
}

