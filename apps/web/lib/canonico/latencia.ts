// Pares (solicitud aprobada ↔ tarea de traslado) para el KPI de latencia
// (S-A3, `GET /api/indicadores`). Función pura: no conoce HTTP.
//
// El enlace es **solo determinístico, por `remote_id`** — el id de la solicitud
// de Prisma escrito en la tarea de Startrack (01 E.5). No se cae a la heurística
// por vehículo asignado a propósito: una tarea enlazada por parecido no prueba
// que nació DE esa aprobación, y el KPI mide precisamente esa causalidad. La
// cobertura baja que resulta no es un defecto del cálculo: es el argumento del
// producto, y por eso se devuelve a la vista junto al valor.

import type { ParLatencia } from '@/lib/kpi/calculo'
import type { DatosCrudos } from './tipos-crudos'

export type CoberturaLatencia = {
  pares: ParLatencia[]
  /** Solicitudes APROBADAS con `approved_at` legible: el universo posible. */
  aprobadasConFecha: number
  /** De ese universo, cuántas tienen una tarea enlazada por `remote_id` con
   * `creation_date` legible. */
  enlazadas: number
  /** Solicitudes APROBADAS observadas, tengan o no `approved_at`. */
  aprobadasObservadas: number
}

export function paresLatenciaAprobacionTraslado(datos: DatosCrudos): CoberturaLatencia {
  const aprobadas = datos.solicitudes.datos.filter(
    (solicitud) => (solicitud.status ?? '').toUpperCase() === 'APROBADA',
  )
  const conFecha = aprobadas.filter((solicitud) => Boolean(solicitud.approved_at))

  const tareaPorRemoteId = new Map<string, (typeof datos.tareas.datos)[number]>()
  for (const tarea of datos.tareas.datos) {
    if (tarea.remote_id) tareaPorRemoteId.set(String(tarea.remote_id).trim(), tarea)
  }

  const pares: ParLatencia[] = []
  for (const solicitud of conFecha) {
    const tarea = tareaPorRemoteId.get(String(solicitud.id).trim())
    if (!tarea?.creation_date) continue
    pares.push({ approvedAt: solicitud.approved_at!, taskCreatedAt: tarea.creation_date })
  }

  return {
    pares,
    aprobadasConFecha: conFecha.length,
    enlazadas: pares.length,
    aprobadasObservadas: aprobadas.length,
  }
}
