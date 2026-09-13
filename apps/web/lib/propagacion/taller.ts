// Propagación P4 + P3 — la orden de taller preventiva (S-A11 Paso 9).
// server-only. Mismo esqueleto que `p1.ts`.
//
//   P4: `PATCH /api/maquinaria/equipos/{id}` en Prisma con
//       `mantenimiento_fecha_inicio`, `mantenimiento_fecha_fin`,
//       `mantenimiento_notas`.
//   P3: `PUT api/vehicle/{id}` en Startrack con `status = "1"` (Mantenimiento),
//       reversible con `status = "0"` al cerrar.
//
// El orden no es negociable, y cada paso puede abortar con su motivo:
//
//   leer en vivo → encontrar el equipo y su vehículo → ¿puede operar? →
//   ¿ya hay orden abierta? → fechas válidas → **restricción de recurso
//   propio** → P4 → P3 → devolver el rastro
//
// Lo que este módulo no hace, a propósito:
//
// - **No decide solo.** La ruta exige `confirmado: true` y rol de
//   Mantenimiento (o admin); sin eso no llega acá (01 C.3).
// - **No destruye nada.** P4 escribe una ventana de mantenimiento en campos
//   vacíos; P3 cambia un `status` y lo devuelve al cerrar. Ningún estado de
//   origen se sobreescribe.
// - **No revierte P4 si P3 falla.** Una fecha de mantenimiento programada en
//   Prisma sin el estado en Startrack sigue siendo un hecho verdadero: se
//   devuelve `parcial: true` con ambos pasos y su resultado.

import 'server-only'
import type { RolSesion } from '@/lib/acceso/verificar'
import { resolverIdentidades, extraerCodigoProyecto } from '@/lib/canonico/identidad'
import { ErrorEscritura } from '@/lib/conectores/errores'
import { MAX_NOTAS_MANTENIMIENTO, programarMantenimiento } from '@/lib/conectores/prisma'
import { actualizarEstadoVehiculo, leerVehiculo } from '@/lib/conectores/startrack'
import { leerFlota } from '@/lib/lectura/flota'
import { leerPronostico } from '@/lib/lectura/mantenimiento'
import { esFechaIso } from '@/lib/mantenimiento/fechas'
import type { ParametrosMantenimiento, PronosticoMantenimiento, TipoAncla } from '@/lib/mantenimiento/tipos'
import { PARAMETROS_VACIOS } from '@/lib/mantenimiento/parametros'
import type { Plataforma } from '@/lib/tipos/canonico'
import { recursosPropiosDelEntorno, verificarRecursoPropio } from './restriccion'

export type MotivoRechazoTaller =
  | 'equipo_no_encontrado'
  | 'sin_vehiculo'
  | 'equipo_obsoleto'
  | 'orden_ya_abierta'
  | 'orden_no_abierta'
  | 'fechas_invalidas'
  | 'recurso_ajeno'
  | 'fuente_no_disponible'

export class PropagacionRechazada extends Error {
  constructor(
    public readonly motivo: MotivoRechazoTaller,
    mensaje: string,
    public readonly detalle: Record<string, unknown> = {},
  ) {
    super(mensaje)
    this.name = 'PropagacionRechazada'
  }
}

/** Un paso del rastro (01 D.6, restricción 4): qué se escribió, contra qué
 * endpoint, a qué hora, con qué rol y cómo salió. Solo nombres de campo —
 * nunca `engine_num`, `license_plate`, `vin` ni `driver_id`. */
export type PasoRastro = {
  plataforma: Plataforma
  endpoint: string
  metodo: 'PATCH' | 'PUT'
  campos: string[]
  hora: string
  rol: RolSesion
  resultado: 'ok' | 'error'
  mensaje?: string
}

export type RastroTaller = {
  accion: 'abrir' | 'cerrar'
  equipoId: string
  codigoActivo: string | null
  vehiculoId: string
  pasos: PasoRastro[]
  /** `true` si P4 escribió y P3 falló (o al revés no aplica: P4 va primero). */
  parcial: boolean
  leidoEn: string
}

/** Estado de Startrack que significa Mantenimiento (`GET api/vehicles/status`,
 * catálogo de 10 valores: `0` Normal, `1` Mantenimiento, …). */
export const STATUS_MANTENIMIENTO = '1'
export const STATUS_NORMAL = '0'

/** Campos de `api/vehicle/{id}` que el servidor cambia solo al escribir. Se
 * llena con lo observado en el PUT de no-op del Paso 9 — vacío hasta
 * entonces, y así cualquier diferencia fuera de `status` revierte. */
export const CAMPOS_QUE_STARTRACK_ACTUALIZA_SOLO: string[] = []

type EquipoResuelto = {
  equipoId: string
  codigoActivo: string | null
  vehiculoId: string
  estado: string | null
  codigoProyecto: string | null
  proyectoId: string | null
}

async function resolverEquipo(equipoId: string): Promise<EquipoResuelto> {
  const lectura = await leerFlota({ incluirPosicionEnVivo: false })
  if (lectura.degradacion.degradado) {
    throw new PropagacionRechazada(
      'fuente_no_disponible',
      `No se escribe con una fuente caída: ${lectura.degradacion.razones.join(' ')}`,
      { salud: lectura.salud },
    )
  }
  const { datos } = lectura
  const equipo = datos.equipos.datos.find((e) => String(e.id) === equipoId.trim())
  if (!equipo) {
    throw new PropagacionRechazada(
      'equipo_no_encontrado',
      `No existe el equipo ${equipoId} en ${datos.equipos.endpoint}.`,
    )
  }
  const vinculo = resolverIdentidades([equipo], datos.vehiculos.datos, datos.tareas.datos)[0]
  if (!vinculo?.vehiculo) {
    throw new PropagacionRechazada(
      'sin_vehiculo',
      `El equipo ${equipo.no_activo ?? equipo.id} no resuelve un vehículo en Startrack: no hay a quién ponerle el estado de Mantenimiento. Es un huérfano declarado, no se fuerza la unión.`,
    )
  }
  return {
    equipoId: String(equipo.id),
    codigoActivo: equipo.no_activo,
    vehiculoId: String(vinculo.vehiculo.id),
    estado: equipo.estado,
    codigoProyecto: extraerCodigoProyecto(equipo.project_name),
    proyectoId: equipo.project_id == null ? null : String(equipo.project_id),
  }
}

/** La restricción que nos descalifica si falla (AGENTS.md §1.3). Falla
 * cerrada: sin `NECT_EQUIPO_PROPIO` no se escribe. */
function exigirRecursoPropio(equipo: EquipoResuelto): void {
  const restriccion = verificarRecursoPropio(
    {
      codigoActivo: equipo.codigoActivo,
      equipoId: equipo.equipoId,
      vehiculoId: equipo.vehiculoId,
      codigoProyecto: equipo.codigoProyecto,
      proyectoId: equipo.proyectoId,
    },
    recursosPropiosDelEntorno(),
  )
  if (!restriccion.permitido) throw new PropagacionRechazada('recurso_ajeno', restriccion.motivo)
}

export type PeticionAbrirTaller = {
  equipoId: string
  fechaInicio: string
  fechaFin: string
  notas: string
  rol: RolSesion
  /** Parámetros del navegador, para que las cifras de la nota sean las que la
   * persona vio en pantalla. */
  parametros?: ParametrosMantenimiento
}

/** Texto que va a `mantenimiento_notas`. Las cifras vienen de Startrack:
 * escribir un dato del sandbox dentro del sandbox no viola §1.2. */
export function redactarNotas(pronostico: PronosticoMantenimiento | null, notasUsuario: string): string {
  const partes: string[] = ['[ECON NECT] Orden de taller preventiva.']
  if (pronostico) {
    const horas = pronostico.horasDesdeAncla === null ? 'sin dato' : `${pronostico.horasDesdeAncla} h`
    const desde = pronostico.ancla
      ? `desde ${ANCLA_EN_LLANO[pronostico.ancla.tipo]} (${pronostico.ancla.fecha})`
      : 'sin ancla'
    const intervalo =
      pronostico.intervalo.horas === null
        ? 'intervalo sin dato'
        : `intervalo ${pronostico.intervalo.horas} h, ${pronostico.intervalo.origen}`
    const avance = pronostico.avance === null ? 'avance sin dato' : `avance ${Math.round(pronostico.avance * 100)} %`
    partes.push(`Horómetro GPS: ${horas} ${desde} · ${intervalo} · ${avance}.`)
  }
  if (notasUsuario.trim() !== '') partes.push(notasUsuario.trim())
  return partes.join(' ').slice(0, MAX_NOTAS_MANTENIMIENTO)
}

const ANCLA_EN_LLANO: Record<TipoAncla, string> = {
  mantenimiento_fecha_fin: 'la última salida de taller en Prisma',
  reporte_finalizado: 'el último reporte FINALIZADO',
  inicio_serie_gps: 'el primer día con datos del GPS',
}

export async function abrirOrdenTaller(peticion: PeticionAbrirTaller): Promise<RastroTaller> {
  // 1. equipo, vehículo y pronóstico actual (para las notas)
  const equipo = await resolverEquipo(peticion.equipoId)
  const pronostico = await leerPronostico(equipo.equipoId, peticion.parametros ?? PARAMETROS_VACIOS).catch(() => null)

  // 2. ¿puede recibir una orden?
  if ((equipo.estado ?? '').toUpperCase() === 'OBSOLETA') {
    throw new PropagacionRechazada('equipo_obsoleto', `El equipo ${equipo.codigoActivo ?? equipo.equipoId} está OBSOLETA en Prisma: no se programa taller.`)
  }
  if (pronostico?.estadoTaller === 'en_taller') {
    throw new PropagacionRechazada(
      'orden_ya_abierta',
      `El equipo ya tiene una ventana de mantenimiento vigente en Prisma. No se abre una segunda.`,
    )
  }

  // 3. fechas
  if (!esFechaIso(peticion.fechaInicio) || !esFechaIso(peticion.fechaFin) || peticion.fechaInicio > peticion.fechaFin) {
    throw new PropagacionRechazada(
      'fechas_invalidas',
      'Las fechas deben ser AAAA-MM-DD y fechaInicio ≤ fechaFin.',
    )
  }

  // 4. restricción de recurso propio — de servidor, no de botón
  exigirRecursoPropio(equipo)

  // 5. notas
  const notas = redactarNotas(pronostico, peticion.notas)

  const pasos: PasoRastro[] = []

  // 6. P4 — Prisma
  const p4 = await programarMantenimiento(equipo.equipoId, {
    fechaInicio: peticion.fechaInicio,
    fechaFin: peticion.fechaFin,
    notas,
  })
  pasos.push({
    plataforma: 'prisma',
    endpoint: p4.endpoint,
    metodo: 'PATCH',
    campos: p4.campos,
    hora: p4.hora,
    rol: peticion.rol,
    resultado: 'ok',
  })

  // 7. P3 — Startrack. Si falla, P4 se queda: parcial.
  try {
    const p3 = await actualizarEstadoVehiculo(equipo.vehiculoId, STATUS_MANTENIMIENTO, CAMPOS_QUE_STARTRACK_ACTUALIZA_SOLO)
    pasos.push({
      plataforma: 'startrack',
      endpoint: p3.endpoint,
      metodo: 'PUT',
      campos: ['status'],
      hora: p3.hora,
      rol: peticion.rol,
      resultado: 'ok',
      mensaje: `status ${p3.antes ?? 'null'} → ${p3.despues ?? 'null'}`,
    })
  } catch (error) {
    if (!(error instanceof ErrorEscritura)) throw error
    pasos.push({
      plataforma: 'startrack',
      endpoint: error.endpoint,
      metodo: 'PUT',
      campos: ['status'],
      hora: new Date().toISOString(),
      rol: peticion.rol,
      resultado: 'error',
      mensaje: error.detalle,
    })
    return {
      accion: 'abrir',
      equipoId: equipo.equipoId,
      codigoActivo: equipo.codigoActivo,
      vehiculoId: equipo.vehiculoId,
      pasos,
      parcial: true,
      leidoEn: new Date().toISOString(),
    }
  }

  return {
    accion: 'abrir',
    equipoId: equipo.equipoId,
    codigoActivo: equipo.codigoActivo,
    vehiculoId: equipo.vehiculoId,
    pasos,
    parcial: false,
    leidoEn: new Date().toISOString(),
  }
}

export type PeticionCerrarTaller = { equipoId: string; rol: RolSesion }

/** Solo P3 inverso. Prisma no se toca: `mantenimiento_fecha_fin` ya quedó
 * escrita y es el ancla del contador cuando la fecha pase. */
export async function cerrarOrdenTaller(peticion: PeticionCerrarTaller): Promise<RastroTaller> {
  const equipo = await resolverEquipo(peticion.equipoId)
  exigirRecursoPropio(equipo)

  const actual = await leerVehiculo(equipo.vehiculoId)
  if (actual.datos.status !== STATUS_MANTENIMIENTO) {
    throw new PropagacionRechazada(
      'orden_no_abierta',
      `El vehículo no está en Mantenimiento en Startrack (status ${actual.datos.status ?? 'null'}); no hay orden que cerrar.`,
    )
  }

  const p3 = await actualizarEstadoVehiculo(equipo.vehiculoId, STATUS_NORMAL, CAMPOS_QUE_STARTRACK_ACTUALIZA_SOLO)
  return {
    accion: 'cerrar',
    equipoId: equipo.equipoId,
    codigoActivo: equipo.codigoActivo,
    vehiculoId: equipo.vehiculoId,
    pasos: [
      {
        plataforma: 'startrack',
        endpoint: p3.endpoint,
        metodo: 'PUT',
        campos: ['status'],
        hora: p3.hora,
        rol: peticion.rol,
        resultado: 'ok',
        mensaje: `status ${p3.antes ?? 'null'} → ${p3.despues ?? 'null'}`,
      },
    ],
    parcial: false,
    leidoEn: new Date().toISOString(),
  }
}

/** Para la ficha: ¿hay una orden abierta en Startrack para este vehículo?
 * Lee `status` sin caché. `null` si no hay vehículo o Startrack no responde. */
export async function estadoOrdenTaller(vehiculoId: string | null): Promise<{ enMantenimiento: boolean; status: string | null } | null> {
  if (!vehiculoId) return null
  try {
    const actual = await leerVehiculo(vehiculoId)
    return { enMantenimiento: actual.datos.status === STATUS_MANTENIMIENTO, status: actual.datos.status }
  } catch {
    return null
  }
}
