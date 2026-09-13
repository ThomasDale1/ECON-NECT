// Pares solicitud aprobada (Prisma) ↔ tarea (Startrack) por remote_id.
// Quien llama ya leyó las dos listas. Aquí no hay HTTP.

import type { ParLatencia } from './calculo'

export type SolicitudParaLatencia = {
  id: number | string
  status: string | null
  approved_at: string | null
}

export type TareaParaLatencia = {
  remote_id: string | null
  creation_date: string | null
}

export function paresDesdeCrudos(
  solicitudes: SolicitudParaLatencia[],
  tareas: TareaParaLatencia[],
): { pares: ParLatencia[]; aprobadas: number } {
  const aprobadas = solicitudes.filter((s) => (s.status ?? '').toUpperCase() === 'APROBADA')
  const porId = new Map(
    aprobadas
      .filter((s) => typeof s.approved_at === 'string' && s.approved_at.trim() !== '')
      .map((s) => [String(s.id).trim(), s] as const),
  )

  const pares: ParLatencia[] = []
  for (const tarea of tareas) {
    const remoteId = tarea.remote_id?.trim()
    if (!remoteId || !tarea.creation_date) continue
    const solicitud = porId.get(remoteId)
    if (!solicitud?.approved_at) continue
    pares.push({ approvedAt: solicitud.approved_at, taskCreatedAt: tarea.creation_date })
  }

  return { pares, aprobadas: aprobadas.length }
}
