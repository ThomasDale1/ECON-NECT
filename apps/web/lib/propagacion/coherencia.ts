// Coherencia de estado — resolver R2 desde "Tomar acción" (centro de comando). server-only.
//
// R2 dispara cuando Prisma dice que el equipo no puede operar (OBSOLETA) y
// Startrack tiene un traslado vivo para él. Los dos pueden ser verdad a la vez
// solo hasta que una persona decide cuál manda. Esta propagación hace eso:
//
//   mantener Prisma    → la tarea de traslado pasa a Cancelada en Startrack
//   mantener Startrack → el equipo pasa a DISPONIBLE en Prisma
//
// Las equivalencias y su porqué están en `equivalencias.ts` (compartido con la
// interfaz). El orden no es negociable y cada paso puede abortar con su motivo:
//
//   leer en vivo → equipo y vehículo → ¿hay R2 de verdad? → ¿el lado elegido
//   resuelve R2? → **restricción de recurso propio** → escribir → rastro
//
// - **No decide sola.** La ruta exige `confirmado: true` y rol de Logística
//   (o admin): R2 es de "Programar y ejecutar el traslado".
// - **No borra nada, pero cancelar es definitivo.** Startrack no permite
//   borrar tareas ni modificar una cancelada (PUT → 403, verificado el
//   13-sep-2026): la interfaz lo advierte antes de confirmar. DISPONIBLE sí se
//   revierte con el mismo PATCH.
// - **No finge que resolvió.** Si el equipo no opera por una falla o un paro,
//   cambiar `estado` no lo vuelve operable: se rechaza en vez de escribir algo
//   que dejaría R2 igual de encendida.

import 'server-only'
import type { RolSesion } from '@/lib/acceso/verificar'
import { tareaFinalizada } from '@/lib/canonico/catalogos'
import { puedeOperar } from '@/lib/canonico/estados'
import { extraerCodigoProyecto, geocercaDeTarea, resolverIdentidades, tareasDeVehiculo } from '@/lib/canonico/identidad'
import type { TareaStartrackCruda } from '@/lib/canonico/tipos-crudos'
import { ErrorEscritura } from '@/lib/conectores/errores'
import { actualizarEstadoEquipo } from '@/lib/conectores/prisma'
import { actualizarEstadoTarea } from '@/lib/conectores/startrack'
import { leerFlota } from '@/lib/lectura/flota'
import type { Plataforma } from '@/lib/tipos/canonico'
import {
  ESTADO_EQUIPO_OPERABLE,
  STATUS_TAREA_CANCELADA,
  equivalenciaPara,
  type Equivalencia,
  type LadoQueSeMantiene,
} from './equivalencias'
import { recursosPropiosDelEntorno, verificarRecursoPropio } from './restriccion'

export type MotivoRechazoCoherencia =
  | 'equipo_no_encontrado'
  | 'sin_vehiculo'
  | 'sin_incoherencia'
  | 'impedimento_de_falla'
  | 'recurso_ajeno'
  | 'fuente_no_disponible'

export class PropagacionRechazada extends Error {
  constructor(
    public readonly motivo: MotivoRechazoCoherencia,
    mensaje: string,
    public readonly detalle: Record<string, unknown> = {},
  ) {
    super(mensaje)
    this.name = 'PropagacionRechazada'
  }
}

export type PasoCoherencia = {
  plataforma: Plataforma
  endpoint: string
  metodo: 'PATCH' | 'PUT'
  campo: 'estado' | 'status'
  antes: string | null
  despues: string | null
  hora: string
  rol: RolSesion
  resultado: 'ok' | 'error'
  mensaje?: string
}

export type RastroCoherencia = {
  equipoId: string
  codigoActivo: string | null
  equivalencia: Equivalencia
  pasos: PasoCoherencia[]
  /** `true` si se canceló al menos una tarea y otra falló. */
  parcial: boolean
  leidoEn: string
}

export type PeticionCoherencia = {
  equipoId: string
  mantener: LadoQueSeMantiene
  rol: RolSesion
}

export async function resolverCoherenciaEstado(peticion: PeticionCoherencia): Promise<RastroCoherencia> {
  const lectura = await leerFlota({ incluirPosicionEnVivo: false })
  if (lectura.degradacion.degradado) {
    throw new PropagacionRechazada(
      'fuente_no_disponible',
      `No se escribe con una fuente caída: ${lectura.degradacion.razones.join(' ')}`,
      { salud: lectura.salud },
    )
  }
  const { datos } = lectura

  const equipo = datos.equipos.datos.find((e) => String(e.id) === peticion.equipoId.trim())
  if (!equipo) {
    throw new PropagacionRechazada('equipo_no_encontrado', `No existe el equipo ${peticion.equipoId} en ${datos.equipos.endpoint}.`)
  }
  const codigo = equipo.no_activo ?? String(equipo.id)

  const vinculo = resolverIdentidades([equipo], datos.vehiculos.datos, datos.tareas.datos)[0]
  if (!vinculo?.vehiculo) {
    throw new PropagacionRechazada(
      'sin_vehiculo',
      `El equipo ${codigo} no resuelve un vehículo en Startrack: no hay tarea que poner en coherencia. Es un huérfano declarado, no se fuerza la unión.`,
    )
  }

  const tipoTraslado = new Set(
    datos.tiposTarea.datos
      .filter((tipo) => (tipo.name ?? '').trim().toLowerCase() === 'traslado')
      .map((tipo) => String(tipo.id)),
  )
  const trasladosVivos: TareaStartrackCruda[] = tareasDeVehiculo(vinculo.vehiculo, datos.tareas.datos).filter(
    (t) => t.job_type_id != null && tipoTraslado.has(String(t.job_type_id)) && !tareaFinalizada(t.status_name ?? t.status),
  )

  if (puedeOperar(equipo) || trasladosVivos.length === 0) {
    throw new PropagacionRechazada(
      'sin_incoherencia',
      `En la lectura actual ${codigo} no tiene un traslado vivo sobre un equipo que no puede operar. No hay nada que poner en coherencia.`,
    )
  }

  if (peticion.mantener === 'startrack' && !puedeOperar({ ...equipo, estado: ESTADO_EQUIPO_OPERABLE })) {
    throw new PropagacionRechazada(
      'impedimento_de_falla',
      `${codigo} no opera por una falla activa o un paro, no solo por su estado. Pasarlo a ${ESTADO_EQUIPO_OPERABLE} no lo vuelve operable: esa decisión se cierra en la falla, con Mantenimiento.`,
    )
  }

  // ── La restricción que nos descalifica si falla (AGENTS.md §1.3) ──────────
  const geocerca = geocercaDeTarea(trasladosVivos[0], datos.geocercas.datos)
  const restriccion = verificarRecursoPropio(
    {
      codigoActivo: equipo.no_activo,
      equipoId: String(equipo.id),
      vehiculoId: String(vinculo.vehiculo.id),
      codigoProyecto: extraerCodigoProyecto(equipo.project_name) ?? extraerCodigoProyecto(geocerca?.name ?? null),
      proyectoId: equipo.project_id == null ? null : String(equipo.project_id),
    },
    recursosPropiosDelEntorno(),
  )
  if (!restriccion.permitido) throw new PropagacionRechazada('recurso_ajeno', restriccion.motivo)

  const equivalencia = equivalenciaPara(peticion.mantener, equipo.estado)
  const pasos: PasoCoherencia[] = []

  if (peticion.mantener === 'startrack') {
    const escrito = await actualizarEstadoEquipo(String(equipo.id), ESTADO_EQUIPO_OPERABLE)
    pasos.push({
      plataforma: 'prisma',
      endpoint: escrito.endpoint,
      metodo: 'PATCH',
      campo: 'estado',
      antes: escrito.antes,
      despues: escrito.despues,
      hora: escrito.hora,
      rol: peticion.rol,
      resultado: 'ok',
    })
  } else {
    for (const tarea of trasladosVivos) {
      try {
        const escrito = await actualizarEstadoTarea(String(tarea.id), STATUS_TAREA_CANCELADA)
        pasos.push({
          plataforma: 'startrack',
          endpoint: escrito.endpoint,
          metodo: 'PUT',
          campo: 'status',
          antes: escrito.antes,
          despues: escrito.despues,
          hora: escrito.hora,
          rol: peticion.rol,
          resultado: 'ok',
        })
      } catch (error) {
        // Nada escrito todavía: el error sube entero y la ruta responde 502.
        if (!(error instanceof ErrorEscritura) || pasos.length === 0) throw error
        pasos.push({
          plataforma: 'startrack',
          endpoint: error.endpoint,
          metodo: 'PUT',
          campo: 'status',
          antes: null,
          despues: null,
          hora: new Date().toISOString(),
          rol: peticion.rol,
          resultado: 'error',
          mensaje: error.detalle,
        })
        break
      }
    }
  }

  return {
    equipoId: String(equipo.id),
    codigoActivo: equipo.no_activo,
    equivalencia,
    pasos,
    parcial: pasos.some((paso) => paso.resultado === 'error'),
    leidoEn: new Date().toISOString(),
  }
}
