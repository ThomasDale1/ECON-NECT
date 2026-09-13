// Ayudas compartidas entre reglas (R2, R3, R4) que necesitan reconocer una
// tarea de tipo Traslado. No es una regla en sí — vive acá porque usa
// `ContextoReglas`, que lib/canonico no conoce (AGENTS.md §4.3: canonico no
// conoce reglas; reglas sí puede conocer canonico).

import { tareaFinalizada } from '@/lib/canonico/catalogos'
import type { TareaStartrackCruda } from '@/lib/canonico/tipos-crudos'
import type { ContextoReglas } from './tipos'

/** ¿Esta tarea es de tipo "Traslado"? Se resuelve por `job_type_id` contra el
 * catálogo `GET /api/job/type` (leerTiposTarea), no por texto libre. */
export function esTareaDeTraslado(tarea: TareaStartrackCruda, ctx: ContextoReglas): boolean {
  if (tarea.job_type_id == null) return false
  const nombre = ctx.nombreTipoTareaPorId[String(tarea.job_type_id)]
  return typeof nombre === 'string' && nombre.trim().toLowerCase() === 'traslado'
}

export function tareaTrasladoViva(tarea: TareaStartrackCruda, ctx: ContextoReglas): boolean {
  return esTareaDeTraslado(tarea, ctx) && !tareaFinalizada(tarea.status_name ?? tarea.status)
}

export { tareaFinalizada }
