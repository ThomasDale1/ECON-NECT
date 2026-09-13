// Conversión de estados crudos a `EstadoOrigen` (S-A2 §lib/canonico/estados.ts).
// Conserva los dos catálogos, nunca los fusiona (01 Parte C.3). No conoce HTTP.

import type { EstadoOrigen, Linaje } from '@/lib/tipos/canonico'
import type {
  EquipoPrismaCrudo,
  ProcedenciaFuente,
  SolicitudPrismaCruda,
  TareaStartrackCruda,
  VehiculoStartrackCrudo,
} from './tipos-crudos'

export function crearLinaje(
  procedencia: ProcedenciaFuente,
  campo: string,
  valorCrudo: unknown,
): Linaje {
  return {
    plataforma: procedencia.plataforma,
    endpoint: procedencia.endpoint,
    campo,
    valorCrudo,
    leidoEn: procedencia.leidoEn,
  }
}

function crearEstadoOrigen(
  valor: string,
  objeto: EstadoOrigen['objeto'],
  linaje: Linaje,
): EstadoOrigen {
  return { valor, objeto, linaje }
}

/** El estado del recurso, tal como lo reporta Prisma. Nunca null si el equipo
 * existe: `estado` es un campo obligatorio del catálogo de 3 valores. */
export function estadoDesdeEquipo(equipo: EquipoPrismaCrudo, procedencia: ProcedenciaFuente): EstadoOrigen | null {
  if (!equipo.estado) return null
  return crearEstadoOrigen(equipo.estado, 'recurso', crearLinaje(procedencia, 'estado', equipo.estado))
}

/** El estado del recurso, tal como lo reporta Startrack sobre el vehículo. */
export function estadoDesdeVehiculo(
  vehiculo: VehiculoStartrackCrudo | null,
  procedencia: ProcedenciaFuente,
): EstadoOrigen | null {
  if (!vehiculo?.status) return null
  return crearEstadoOrigen(vehiculo.status, 'recurso', crearLinaje(procedencia, 'status', vehiculo.status))
}

/** La solicitud se etiqueta `objeto: 'recurso'` — decisión del usuario: no se
 * toca el contrato (que no tiene un cuarto valor de `ObjetoDescrito` para
 * "solicitud"); la ficha la rotula por su nombre "Solicitud", no por esta
 * etiqueta. Imprecisión menor y reversible, documentada acá (S-A2
 * §lib/canonico/estados.ts). */
export function estadoDesdeSolicitud(
  solicitud: SolicitudPrismaCruda | null,
  procedencia: ProcedenciaFuente,
): EstadoOrigen | null {
  if (!solicitud?.status) return null
  return crearEstadoOrigen(solicitud.status, 'recurso', crearLinaje(procedencia, 'status', solicitud.status))
}

/** La falla activa del equipo. Prisma no expone un endpoint de fallas con
 * forma documentada en este prompt (ver tipos-crudos.ts): el estado de la
 * falla activa viaja embebido en el propio registro de equipo
 * (`active_failure_status`), que es donde este proyecto lo toma. `null`
 * cuando no hay falla activa — hoy los 15 equipos del sandbox no tienen
 * ninguna, y eso es correcto, no un hueco (01 Parte E.2). */
export function estadoDesdeFalla(
  equipo: EquipoPrismaCrudo,
  procedenciaEquipos: ProcedenciaFuente,
): EstadoOrigen | null {
  if (!equipo.active_failure_status) return null
  return crearEstadoOrigen(
    equipo.active_failure_status,
    'falla',
    crearLinaje(procedenciaEquipos, 'active_failure_status', equipo.active_failure_status),
  )
}

/** El estado de la tarea de traslado asociada, si hay una. Se prioriza
 * `status_name` (texto legible) sobre `status` (posible código) porque el
 * catálogo verificado del diccionario de datos ("Pendiente; Completada;
 * Cancelada; estados personalizados") está en texto, no en código; si
 * `status_name` no vino, cae a `status`. */
export function estadoDesdeTarea(
  tarea: TareaStartrackCruda | null,
  procedencia: ProcedenciaFuente,
): EstadoOrigen | null {
  if (!tarea) return null
  const valor = tarea.status_name ?? tarea.status
  if (!valor) return null
  const campo = tarea.status_name != null ? 'status_name' : 'status'
  return crearEstadoOrigen(valor, 'tarea', crearLinaje(procedencia, campo, valor))
}

/** ⚠ La disponibilidad NO es el campo `estado` (01 E.2). Cruza tres cosas:
 * el equipo no está OBSOLETA, no tiene bandera de paro activa, y no tiene una
 * falla activa que impida operar (aquí: cualquier falla activa distinta de
 * `FINALIZADO`/`RECHAZADO` cuenta como impedimento — esas dos son las únicas
 * del catálogo de 8 valores que significan "la intervención ya no está en
 * curso"). Es un dato derivado para las reglas; no sobrescribe ningún estado
 * de origen. */
export function puedeOperar(equipo: EquipoPrismaCrudo): boolean {
  if (equipo.estado === 'OBSOLETA') return false
  if (equipo.active_failure_is_paro === true) return false
  if (
    equipo.active_failure_status &&
    equipo.active_failure_status !== 'FINALIZADO' &&
    equipo.active_failure_status !== 'RECHAZADO'
  ) {
    return false
  }
  return true
}
