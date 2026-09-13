// El orquestador del optimizador (S-A7 Paso 4i, S-A10 Paso 7b). server-only.
// Orden fijo: insumos(hoy) → adaptar → cliente → verificar → ensamblar → KPIs.
// Ninguna lógica de reconciliación/optimización vive acá — solo estitchea los
// módulos puros con la única llamada HTTP que le toca (el solver).

import 'server-only'
import { calcularKpisOptimizador } from '@/lib/kpi/optimizador'
import { adaptar } from './adaptador'
import { ensamblar } from './ensamblar'
import { ErrorSolver, optimizarEnSolver } from './cliente'
import { leerInsumosOptimizador, type InsumosOptimizador } from './insumos'
import type { PeticionOptimizar, RespuestaOptimizar, SalidaSolver } from './tipos'
import { verificar } from './verificar'

export class ErrorVerificacion extends Error {
  constructor(public readonly violaciones: string[]) {
    super(`verificación fallida: ${violaciones.join('; ')}`)
    this.name = 'ErrorVerificacion'
  }
}

/** "Hoy" en America/El_Salvador, AAAA-MM-DD (granularidad día, zona horaria
 * fija de la operación). */
export function hoyElSalvador(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' }).format(new Date())
}

/** Todo lo que sigue a la lectura, sobre insumos ya leídos. Separado de
 * `planear()` para que las pruebas en vivo puedan transformar una copia de
 * los insumos reales (una máquina con paro) y comparar dos corridas sobre el
 * mismo objeto, sin releer el sandbox. */
export async function planearConInsumos(
  insumos: InsumosOptimizador,
  peticion: PeticionOptimizar,
  hoy: string,
  generadoEn: string = new Date().toISOString(),
): Promise<RespuestaOptimizar> {
  const resultado = adaptar(insumos, peticion, hoy)

  let salida: SalidaSolver
  try {
    salida = await optimizarEnSolver(resultado.entradaSolver)
  } catch (error) {
    if (error instanceof ErrorSolver) throw error
    throw new ErrorSolver('/optimizar', error instanceof Error ? error.message : String(error))
  }

  const violaciones = verificar(resultado.entradaSolver, salida)
  if (violaciones.length > 0) {
    throw new ErrorVerificacion(violaciones)
  }

  const respuestaSinKpis = ensamblar({ peticion, generadoEn, hoy, resultado, salida })

  return {
    ...respuestaSinKpis,
    kpis: calcularKpisOptimizador(respuestaSinKpis),
    kpisPendientesMotivo: null,
  }
}

export async function planear(peticion: PeticionOptimizar): Promise<RespuestaOptimizar> {
  const hoy = hoyElSalvador()
  const generadoEn = new Date().toISOString()
  const insumos = await leerInsumosOptimizador(hoy)
  return planearConInsumos(insumos, peticion, hoy, generadoEn)
}
