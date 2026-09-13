// Tipos propios de la capa de conectores. No confundir con lib/tipos/canonico.ts
// (el contrato compartido entre carriles, congelado a las 17:30): esto es
// forma cruda de conector, todavía sin pasar por lib/canonico.

import type { Plataforma } from '@/lib/tipos/canonico'

/** Procedencia de una respuesta completa de conector: qué plataforma, qué
 * endpoint, a qué hora se leyó (S-A1 §4). El linaje por campo individual
 * (con `valorCrudo`) lo arma lib/canonico a partir de esto. */
export type LinajeLectura = {
  plataforma: Plataforma
  endpoint: string
  leidoEn: string
}

/** Una respuesta de conector: los datos crudos tal como los devolvió la
 * plataforma, más su procedencia. Nunca se normaliza ni se fusiona acá. */
export type RespuestaConector<T> = {
  datos: T
  linaje: LinajeLectura
}

export function envolver<T>(datos: T, plataforma: Plataforma, endpoint: string): RespuestaConector<T> {
  return {
    datos,
    linaje: { plataforma, endpoint, leidoEn: new Date().toISOString() },
  }
}
