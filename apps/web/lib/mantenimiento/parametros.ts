// Parámetros de mantenimiento que viven en el navegador (S-A11 Paso 5). Puro.
//
// El servidor **no guarda nada**: cada consulta trae los parámetros en
// `?parametros=<JSON>`, se validan con Zod, se aplican y la respuesta dice
// cuáles cambiaron el resultado (`parametrosAplicados`). Todo parámetro se
// rotula en pantalla como "fijado a mano en este navegador".

import { z } from 'zod'
import type { ParametrosMantenimiento } from './tipos'

export const UMBRALES_DEFECTO = { aviso: 80, urgente: 90, vencido: 100 } as const

/** Hasta dónde aceptamos un JSON de parámetros en la URL. */
export const MAX_BYTES_PARAMETROS = 8 * 1024

const MAX_EQUIPOS = 100

const parametroEquipoSchema = z
  .object({
    intervaloHoras: z.number().int().min(1).max(20_000).optional(),
    severo: z.boolean().optional(),
  })
  .strict()

export const parametrosSchema = z
  .object({
    version: z.literal(1),
    porEquipo: z
      .record(z.string().trim().min(1).max(64), parametroEquipoSchema)
      .refine((valor) => Object.keys(valor).length <= MAX_EQUIPOS, {
        message: `porEquipo admite hasta ${MAX_EQUIPOS} equipos`,
      }),
    umbrales: z
      .object({
        aviso: z.number().gt(0),
        urgente: z.number().gt(0),
        vencido: z.number().gt(0).max(500),
      })
      .strict()
      .refine((u) => u.aviso < u.urgente && u.urgente < u.vencido, {
        message: 'los umbrales deben cumplir 0 < aviso < urgente < vencido ≤ 500',
      })
      .optional(),
  })
  .strict()

export const PARAMETROS_VACIOS: ParametrosMantenimiento = { version: 1, porEquipo: {} }

export type ResultadoParametros =
  | { ok: true; parametros: ParametrosMantenimiento }
  | { ok: false; mensaje: string }

/** Parsea `?parametros=<JSON>`. Ausente → vacíos; inválido → mensaje de Zod
 * para responder 400. */
export function leerParametrosDeQuery(searchParams: URLSearchParams): ResultadoParametros {
  const crudo = searchParams.get('parametros')
  if (crudo === null || crudo.trim() === '') return { ok: true, parametros: PARAMETROS_VACIOS }
  return parsearParametros(crudo)
}

export function parsearParametros(texto: string): ResultadoParametros {
  if (new TextEncoder().encode(texto).length > MAX_BYTES_PARAMETROS) {
    return { ok: false, mensaje: `parametros supera ${MAX_BYTES_PARAMETROS} bytes` }
  }
  let json: unknown
  try {
    json = JSON.parse(texto)
  } catch {
    return { ok: false, mensaje: 'parametros no es JSON válido' }
  }
  const resultado = parametrosSchema.safeParse(json)
  if (!resultado.success) return { ok: false, mensaje: resultado.error.message }
  return { ok: true, parametros: resultado.data as ParametrosMantenimiento }
}

export function umbralesDe(parametros: ParametrosMantenimiento): { aviso: number; urgente: number; vencido: number } {
  return parametros.umbrales ?? { ...UMBRALES_DEFECTO }
}
