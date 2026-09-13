// Propagación P1 — Prisma → Startrack: la solicitud aprobada se convierte en
// una tarea de traslado real, con el id de la solicitud en `remote_id`
// (S-A4, 01 D.6 y E.5). server-only.
//
// El orden no es negociable, y cada paso puede abortar con su motivo:
//
//   leer en vivo → encontrar la solicitud → ¿está aprobada? → ¿ya existe su
//   tarea? → resolver vehículo, geocerca y tipo de tarea → **restricción de
//   recurso propio** → escribir → devolver el rastro
//
// Tres cosas que este módulo no hace, a propósito:
//
// - **No decide solo.** La ruta exige `confirmado: true`; sin eso no llega acá
//   (01 C.3: el humano decide, el sistema propaga y deja rastro).
// - **No destruye nada.** Escribe un hecho nuevo en Startrack; el estado de
//   Prisma queda intacto. Startrack no permite borrar tareas: la limpieza es por
//   cancelación.
// - **No rellena un hueco.** Si no se resuelve el vehículo, la geocerca de
//   destino o el tipo "Traslado", aborta diciendo qué faltó. Nunca manda un
//   valor inventado para que el POST pase (AGENTS.md §1.1).

import 'server-only'
import { geocercaPorCodigoProyecto, extraerCodigoProyecto, resolverIdentidades } from '@/lib/canonico/identidad'
import type { SolicitudPrismaCruda, TareaStartrackCruda } from '@/lib/canonico/tipos-crudos'
import { crearTarea } from '@/lib/conectores/startrack'
import { leerFlota } from '@/lib/lectura/flota'
import type { RolSesion } from '@/lib/acceso/verificar'
import { recursosPropiosDelEntorno, verificarRecursoPropio } from './restriccion'

export type MotivoRechazo =
  | 'solicitud_no_encontrada'
  | 'solicitud_no_aprobada'
  | 'tarea_ya_existe'
  | 'sin_vehiculo'
  | 'sin_geocerca_destino'
  | 'sin_tipo_traslado'
  | 'recurso_ajeno'
  | 'fuente_no_disponible'

export class PropagacionRechazada extends Error {
  constructor(
    public readonly motivo: MotivoRechazo,
    mensaje: string,
    public readonly detalle: Record<string, unknown> = {},
  ) {
    super(mensaje)
    this.name = 'PropagacionRechazada'
  }
}

/** El rastro de la escritura (01 D.6, restricción 4): qué se escribió, contra
 * qué endpoint, a qué hora y con qué rol. */
export type RastroPropagacion = {
  propagacion: 'P1'
  plataformaDestino: 'startrack'
  endpoint: string
  escritoEn: string
  rol: RolSesion
  solicitudId: string
  equipoId: string
  codigoActivo: string | null
  tareaCreadaId: string | null
  camposEscritos: Record<string, unknown>
  respuestaCruda: Record<string, unknown>
}

/**
 * El formato de fecha que espera Startrack se **observa**, no se supone: se
 * mira cómo viene `start_date` en las tareas que la propia plataforma devuelve
 * y se escribe igual. Si no hay ninguna tarea de la cual aprender, se manda el
 * valor de Prisma tal cual y, si la plataforma lo rechaza, el error lo dice.
 */
export function formatearFechaComoStartrack(
  fechaPrisma: string | null,
  ejemploObservado: string | null,
): string | null {
  if (!fechaPrisma) return null

  const fecha = new Date(fechaPrisma)
  if (Number.isNaN(fecha.getTime())) return fechaPrisma

  const iso = fecha.toISOString()
  if (!ejemploObservado) return fechaPrisma

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(ejemploObservado)) {
    return `${iso.slice(0, 10)} ${iso.slice(11, 19)}`
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(ejemploObservado)) return iso
  if (/^\d{4}-\d{2}-\d{2}$/.test(ejemploObservado)) return iso.slice(0, 10)

  return fechaPrisma
}

function primerEjemploDeFecha(tareas: TareaStartrackCruda[]): string | null {
  return tareas.find((tarea) => Boolean(tarea.start_date))?.start_date ?? null
}

function tareaEnlazada(
  tareas: TareaStartrackCruda[],
  solicitud: SolicitudPrismaCruda,
): TareaStartrackCruda | null {
  const id = String(solicitud.id).trim()
  return tareas.find((tarea) => tarea.remote_id && String(tarea.remote_id).trim() === id) ?? null
}

export type PeticionP1 = {
  solicitudId: string
  rol: RolSesion
}

export async function propagarTrasladoP1(peticion: PeticionP1): Promise<RastroPropagacion> {
  const lectura = await leerFlota({ incluirPosicionEnVivo: false })

  // Escribir con una fuente caída sería escribir a ciegas: los datos que
  // alimentan la decisión (¿ya existe la tarea? ¿cuál es el vehículo?) vienen
  // justamente de ahí.
  if (lectura.degradacion.degradado) {
    throw new PropagacionRechazada(
      'fuente_no_disponible',
      `No se propaga con una fuente caída: ${lectura.degradacion.razones.join(' ')}`,
      { salud: lectura.salud },
    )
  }

  const { datos } = lectura

  const solicitud = datos.solicitudes.datos.find(
    (candidata) => String(candidata.id).trim() === peticion.solicitudId.trim(),
  )
  if (!solicitud) {
    throw new PropagacionRechazada(
      'solicitud_no_encontrada',
      `No existe la solicitud ${peticion.solicitudId} en ${datos.solicitudes.endpoint}.`,
    )
  }

  if ((solicitud.status ?? '').toUpperCase() !== 'APROBADA') {
    throw new PropagacionRechazada(
      'solicitud_no_aprobada',
      `La solicitud ${peticion.solicitudId} está en estado ${solicitud.status ?? '(sin estado)'}. P1 solo materializa solicitudes APROBADAS.`,
    )
  }

  const yaExiste = tareaEnlazada(datos.tareas.datos, solicitud)
  if (yaExiste) {
    throw new PropagacionRechazada(
      'tarea_ya_existe',
      `La solicitud ${peticion.solicitudId} ya tiene la tarea ${yaExiste.id} enlazada por remote_id. No se crea una segunda.`,
      { tareaId: String(yaExiste.id) },
    )
  }

  const equipo = datos.equipos.datos.find(
    (candidato) => String(candidato.id) === String(solicitud.maquinaria_id ?? ''),
  )
  if (!equipo) {
    throw new PropagacionRechazada(
      'sin_vehiculo',
      `La solicitud ${peticion.solicitudId} no resuelve un equipo en Prisma (maquinaria_id ${String(solicitud.maquinaria_id ?? 'vacío')}).`,
    )
  }

  const vinculo = resolverIdentidades([equipo], datos.vehiculos.datos, datos.tareas.datos)[0]
  if (!vinculo?.vehiculo) {
    throw new PropagacionRechazada(
      'sin_vehiculo',
      `El equipo ${equipo.no_activo ?? equipo.id} no resuelve un vehículo en Startrack, así que la tarea no tendría a quién asignarse. Es un huérfano declarado, no se fuerza la unión.`,
    )
  }

  const geocercaDestino = geocercaPorCodigoProyecto(
    solicitud.project_name ?? equipo.project_name,
    datos.geocercas.datos,
  )
  if (!geocercaDestino) {
    throw new PropagacionRechazada(
      'sin_geocerca_destino',
      `No hay geocerca en Startrack cuyo nombre traiga el código de proyecto de "${solicitud.project_name ?? equipo.project_name ?? '(sin proyecto)'}". Sin destino no se crea el traslado.`,
    )
  }

  const tipoTraslado = datos.tiposTarea.datos.find(
    (tipo) => (tipo.name ?? '').trim().toLowerCase() === 'traslado',
  )
  if (!tipoTraslado) {
    throw new PropagacionRechazada(
      'sin_tipo_traslado',
      `El catálogo ${datos.tiposTarea.endpoint} no trae el tipo de tarea "Traslado".`,
    )
  }

  // ── La restricción que nos descalifica si falla (AGENTS.md §1.3) ──────────
  const restriccion = verificarRecursoPropio(
    {
      codigoActivo: equipo.no_activo,
      equipoId: String(equipo.id),
      vehiculoId: String(vinculo.vehiculo.id),
      codigoProyecto: extraerCodigoProyecto(solicitud.project_name ?? equipo.project_name),
      proyectoId: solicitud.project_id == null ? null : String(solicitud.project_id),
    },
    recursosPropiosDelEntorno(),
  )
  if (!restriccion.permitido) {
    throw new PropagacionRechazada('recurso_ajeno', restriccion.motivo)
  }

  const ejemploFecha = primerEjemploDeFecha(datos.tareas.datos)
  const camposEscritos = {
    job_type_id: tipoTraslado.id,
    remote_id: String(solicitud.id),
    assigned_vehicle_id: vinculo.vehiculo.id,
    poi_id: geocercaDestino.id,
    start_date: formatearFechaComoStartrack(solicitud.fecha_inicio, ejemploFecha),
    end_datetime: formatearFechaComoStartrack(solicitud.fecha_fin, ejemploFecha),
  }

  const respuesta = await crearTarea(camposEscritos)

  const idCreado =
    respuesta.datos.id ??
    (respuesta.datos.data as Record<string, unknown> | undefined)?.id ??
    respuesta.datos.job_id ??
    null

  return {
    propagacion: 'P1',
    plataformaDestino: 'startrack',
    endpoint: respuesta.linaje.endpoint,
    escritoEn: respuesta.linaje.leidoEn,
    rol: peticion.rol,
    solicitudId: String(solicitud.id),
    equipoId: String(equipo.id),
    codigoActivo: equipo.no_activo,
    tareaCreadaId: idCreado === null ? null : String(idCreado),
    camposEscritos,
    respuestaCruda: respuesta.datos,
  }
}
