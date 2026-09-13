// Resolución de identidad entre Prisma y Startrack (S-A2 §lib/canonico/identidad.ts).
// No conoce HTTP: recibe listas ya leídas por los conectores.

import { tareaFinalizada } from './catalogos'
import type {
  EquipoPrismaCrudo,
  GeocercaStartrackCruda,
  SolicitudPrismaCruda,
  TareaStartrackCruda,
  VehiculoStartrackCrudo,
} from './tipos-crudos'

/** Nivel de la cascada de respaldo que resolvió la identidad de un equipo
 * (1 = remote_id de tarea, 2 = no_activo × description, 3 = clave). */
export type NivelResolucionIdentidad = 1 | 2 | 3

export type VinculoEquipo = {
  equipo: EquipoPrismaCrudo
  vehiculo: VehiculoStartrackCrudo | null
  identidadResuelta: boolean
  nivelResolucion: NivelResolucionIdentidad | null
}

/** Toma el código de activo de un texto crudo: el prefijo antes de " - " si
 * existe, si no el patrón `^[A-Z]{2,4}-?\d{1,4}`, si no el texto normalizado
 * completo. Verificado contra el sandbox: coincide en 14 de los 15 equipos
 * observados (01 Parte E.4). */
export function normalizarCodigoActivo(valorCrudo: string): string {
  const normalizado = valorCrudo.trim().toUpperCase()
  const [prefijo] = normalizado.split(' - ')
  if (prefijo && prefijo !== normalizado) return prefijo.trim()
  const match = normalizado.match(/^[A-Z]{2,4}-?\d{1,4}/)
  return match ? match[0] : normalizado
}

function idsIguales(a: number | string | null | undefined, b: number | string | null | undefined): boolean {
  if (a == null || b == null) return false
  return String(a).trim() === String(b).trim()
}

/** Cadena de respaldo documentada (S-A2): (1) remote_id de una tarea que
 * apunte al id de Prisma de este equipo; (2) no_activo × description; (3)
 * clave del equipo, si estuviera poblada. Cada nivel deja constancia de cuál
 * resolvió. El registro que no une por ningún nivel es un huérfano real: se
 * marca `identidadResuelta: false`, nunca se fuerza (AGENTS.md §1.1). */
function resolverIdentidadEquipo(
  equipo: EquipoPrismaCrudo,
  vehiculos: VehiculoStartrackCrudo[],
  tareas: TareaStartrackCruda[],
): VinculoEquipo {
  const tareaConRemoteId = tareas.find((t) => idsIguales(t.remote_id, equipo.id))
  if (tareaConRemoteId?.assigned_vehicle_id != null) {
    const vehiculo = vehiculos.find((v) => idsIguales(v.id, tareaConRemoteId.assigned_vehicle_id))
    if (vehiculo) return { equipo, vehiculo, identidadResuelta: true, nivelResolucion: 1 }
  }

  if (equipo.no_activo) {
    const codigoEquipo = normalizarCodigoActivo(equipo.no_activo)
    const vehiculo = vehiculos.find(
      (v) => v.description && normalizarCodigoActivo(v.description) === codigoEquipo,
    )
    if (vehiculo) return { equipo, vehiculo, identidadResuelta: true, nivelResolucion: 2 }
  }

  if (equipo.clave) {
    const codigoClave = normalizarCodigoActivo(equipo.clave)
    const vehiculo = vehiculos.find(
      (v) => v.description && normalizarCodigoActivo(v.description) === codigoClave,
    )
    if (vehiculo) return { equipo, vehiculo, identidadResuelta: true, nivelResolucion: 3 }
  }

  return { equipo, vehiculo: null, identidadResuelta: false, nivelResolucion: null }
}

export function resolverIdentidades(
  equipos: EquipoPrismaCrudo[],
  vehiculos: VehiculoStartrackCrudo[],
  tareas: TareaStartrackCruda[],
): VinculoEquipo[] {
  return equipos.map((equipo) => resolverIdentidadEquipo(equipo, vehiculos, tareas))
}

/** solicitud → equipo: `solicitud.maquinaria_id === equipo.id` (verificado
 * 5/5). No se filtra además por `maquinaria_no_activo === no_activo`: esa
 * coincidencia es la corroboración que ya reportamos como evidencia, no una
 * condición adicional para el enlace. */
export function solicitudesDeEquipo(
  equipo: EquipoPrismaCrudo,
  solicitudes: SolicitudPrismaCruda[],
): SolicitudPrismaCruda[] {
  return solicitudes.filter((s) => idsIguales(s.maquinaria_id, equipo.id))
}

const PRIORIDAD_ESTADO_SOLICITUD: Record<string, number> = {
  APROBADA: 3,
  PENDIENTE: 2,
  RECHAZADA: 1,
}

/** La ficha unificada solo puede mostrar "la" solicitud de un equipo (el
 * contrato la tipa singular): se prioriza APROBADA > PENDIENTE > RECHAZADA y,
 * empatando, la más reciente por `created_at`. Heurística de presentación,
 * documentada acá porque no está en el prompt de forma literal. */
export function solicitudPrincipal(solicitudes: SolicitudPrismaCruda[]): SolicitudPrismaCruda | null {
  if (solicitudes.length === 0) return null
  return [...solicitudes].sort((a, b) => {
    const prioridadA = PRIORIDAD_ESTADO_SOLICITUD[(a.status ?? '').toUpperCase()] ?? 0
    const prioridadB = PRIORIDAD_ESTADO_SOLICITUD[(b.status ?? '').toUpperCase()] ?? 0
    if (prioridadA !== prioridadB) return prioridadB - prioridadA
    return (b.created_at ?? '').localeCompare(a.created_at ?? '')
  })[0]
}

/** Todas las tareas asignadas al vehículo resuelto para un equipo. */
export function tareasDeVehiculo(
  vehiculo: VehiculoStartrackCrudo | null,
  tareas: TareaStartrackCruda[],
): TareaStartrackCruda[] {
  if (!vehiculo) return []
  return tareas.filter((t) => idsIguales(t.assigned_vehicle_id, vehiculo.id))
}

/** tarea → solicitud, nivel determinístico: `tarea.remote_id === solicitud.id`
 * (hoy enlaza 1 de 5, verificado). */
function tareaEnlazadaPorRemoteId(
  solicitud: SolicitudPrismaCruda | null,
  tareas: TareaStartrackCruda[],
): TareaStartrackCruda | null {
  if (!solicitud) return null
  return tareas.find((t) => idsIguales(t.remote_id, solicitud.id)) ?? null
}

export type ResolucionTarea = {
  tarea: TareaStartrackCruda
  nivelConfianza: 'remote_id' | 'heuristica'
}

/** tarea → equipo: primero el enlace determinístico por remote_id de la
 * solicitud principal; si no hay, la heurística documentada de menor
 * confianza (`assigned_vehicle_id → vehiculo.description → no_activo`, ya
 * resuelta en `vinculo.vehiculo`). Entre varias tareas del mismo vehículo se
 * prioriza una que siga viva sobre una ya finalizada, y la más reciente por
 * `start_date`. */
export function resolverTareaPrincipal(
  vinculo: VinculoEquipo,
  solicitudPrincipalDelEquipo: SolicitudPrismaCruda | null,
  tareas: TareaStartrackCruda[],
): ResolucionTarea | null {
  const porRemoteId = tareaEnlazadaPorRemoteId(solicitudPrincipalDelEquipo, tareas)
  if (porRemoteId) return { tarea: porRemoteId, nivelConfianza: 'remote_id' }

  const candidatas = tareasDeVehiculo(vinculo.vehiculo, tareas)
  if (candidatas.length === 0) return null

  const principal = [...candidatas].sort((a, b) => {
    const vivaA = !tareaFinalizada(a.status_name ?? a.status)
    const vivaB = !tareaFinalizada(b.status_name ?? b.status)
    if (vivaA !== vivaB) return vivaA ? -1 : 1
    return (b.start_date ?? '').localeCompare(a.start_date ?? '')
  })[0]

  return { tarea: principal, nivelConfianza: 'heuristica' }
}

/** tarea → geocerca destino: `tarea.poi_id`/`poi_name` → geocerca (nivel 2 de
 * la cascada de ubicación, 01 E.10). */
export function geocercaDeTarea(
  tarea: TareaStartrackCruda | null,
  geocercas: GeocercaStartrackCruda[],
): GeocercaStartrackCruda | null {
  if (!tarea) return null
  if (tarea.poi_id != null) {
    const porId = geocercas.find((g) => idsIguales(g.id, tarea.poi_id))
    if (porId) return porId
  }
  if (tarea.poi_name) {
    const porNombre = geocercas.find((g) => g.name === tarea.poi_name)
    if (porNombre) return porNombre
  }
  return null
}

const PATRON_CODIGO_PROYECTO = /PROY-\d+/i

/** Geocerca del proyecto asignado al equipo (nivel 3 de la cascada de
 * ubicación): el nombre de geocerca trae el código `PROY-###` (01 E.4/E.10);
 * se une por ese código, nunca por el nombre completo (frágil, 01 E.4). */
export function geocercaDeProyecto(
  equipo: EquipoPrismaCrudo,
  geocercas: GeocercaStartrackCruda[],
): GeocercaStartrackCruda | null {
  if (!equipo.project_name) return null
  const codigo = equipo.project_name.match(PATRON_CODIGO_PROYECTO)?.[0]?.toUpperCase()
  if (!codigo) return null
  return geocercas.find((g) => g.name?.toUpperCase().includes(codigo)) ?? null
}

/**
 * Distancia en metros entre dos puntos (fórmula del semiverseno).
 *
 * `ajax/namedPlaces.php` publica el centro de la geocerca pero **no su radio**,
 * verificado campo por campo. Sin radio no se puede afirmar "dentro" ni "fuera":
 * esta distancia es lo único afirmable sobre la relación entre el equipo y su
 * geocerca, y así se presenta en pantalla.
 */
export function distanciaEnMetros(
  latA: number,
  lonA: number,
  latB: number,
  lonB: number,
): number {
  const R = 6_371_000
  const rad = (g: number) => (g * Math.PI) / 180
  const dLat = rad(latB - latA)
  const dLon = rad(lonB - lonA)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(latA)) * Math.cos(rad(latB)) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}
