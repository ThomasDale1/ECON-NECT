// Lectura en vivo de los insumos del optimizador (S-A7 Paso 4c). server-only:
// es la única puerta de este módulo al mundo exterior (AGENTS.md §4.3) — todo
// lo que sigue (adaptador.ts, ensamblar.ts, planear.ts) recibe estos datos ya
// leídos y no conoce HTTP.

import 'server-only'
import { comoFuente } from '@/lib/canonico/fuentes'
import type {
  DatosCrudos,
  DetalleEquipoPrismaCrudo,
  EquipoPrismaCrudo,
  EstadoVehiculoConProcedencia,
  EstadoVehiculoStartrackCrudo,
  FuenteCruda,
  GeocercaStartrackCruda,
  OperadorPrismaCrudo,
  ProcedenciaFuente,
  SolicitudPrismaCruda,
  TareaStartrackCruda,
  TipoTareaStartrackCrudo,
  VehiculoStartrackCrudo,
} from '@/lib/canonico/tipos-crudos'
import * as prisma from '@/lib/conectores/prisma'
import * as startrack from '@/lib/conectores/startrack'

export type DetalleEquipoConProcedencia = {
  datos: DetalleEquipoPrismaCrudo
  procedencia: ProcedenciaFuente
}

export type InsumosOptimizador = {
  datos: DatosCrudos
  operadores: FuenteCruda<OperadorPrismaCrudo>
  /** El detalle de cada equipo (`/api/maquinaria/equipos/{id}`), por id de
   * equipo. Cada uno lleva su propia procedencia porque cada lectura es su
   * propia llamada — a diferencia de una lista, no comparten un único
   * `leidoEn`. */
  detallesPorEquipoId: Record<string, DetalleEquipoConProcedencia>
}

/** Lee en paralelo todo lo que necesita el adaptador del optimizador:
 * equipos, solicitudes, vehículos, geocercas, tareas, tipos de tarea,
 * operadores, y el detalle de cada equipo (Paso 4c). */
export async function leerInsumosOptimizador(): Promise<InsumosOptimizador> {
  const [equipos, solicitudes, vehiculos, geocercas, tareas, tiposTarea, operadores] = await Promise.all([
    prisma.leerEquipos(),
    prisma.leerSolicitudes(),
    startrack.leerVehiculos(),
    startrack.leerGeocercas(),
    startrack.leerTareas(),
    startrack.leerTiposTarea(),
    prisma.leerOperadores(),
  ])

  const listaEquipos = equipos.datos as EquipoPrismaCrudo[]
  const detallesPorEquipoId: Record<string, DetalleEquipoConProcedencia> = {}
  await Promise.all(
    listaEquipos.map(async (equipo) => {
      const id = String(equipo.id)
      const respuesta = await prisma.leerEquipo(id)
      detallesPorEquipoId[id] = {
        datos: respuesta.datos as DetalleEquipoPrismaCrudo,
        procedencia: {
          plataforma: respuesta.linaje.plataforma,
          endpoint: respuesta.linaje.endpoint,
          leidoEn: respuesta.linaje.leidoEn,
        },
      }
    }),
  )

  // Nivel 1 de ubicación (01 E.10, corregido el 13 de septiembre de 2026):
  // una lectura por vehículo. Se degrada por vehículo, no por corrida — si
  // uno falla, ese equipo cae a nivel 2/3 en vez de tumbar toda la petición
  // (endpoint recién descubierto, sin historial de estabilidad todavía).
  const listaVehiculos = vehiculos.datos as VehiculoStartrackCrudo[]
  const estadosVehiculoPorVehiculoId: Record<string, EstadoVehiculoConProcedencia> = {}
  await Promise.all(
    listaVehiculos.map(async (vehiculo) => {
      const id = String(vehiculo.id)
      try {
        const respuesta = await startrack.leerEstadoVehiculo(id)
        estadosVehiculoPorVehiculoId[id] = {
          datos: respuesta.datos as EstadoVehiculoStartrackCrudo,
          procedencia: {
            plataforma: respuesta.linaje.plataforma,
            endpoint: respuesta.linaje.endpoint,
            leidoEn: respuesta.linaje.leidoEn,
          },
        }
      } catch {
        // Sin posición en vivo para este vehículo: resolverUbicacion() cae a
        // nivel 2/3 automáticamente (EntradaModelo.estadosVehiculoPorVehiculoId
        // es opcional por vehículo).
      }
    }),
  )

  return {
    datos: {
      equipos: comoFuente<EquipoPrismaCrudo>(equipos),
      solicitudes: comoFuente<SolicitudPrismaCruda>(solicitudes),
      vehiculos: comoFuente<VehiculoStartrackCrudo>(vehiculos),
      geocercas: comoFuente<GeocercaStartrackCruda>(geocercas),
      tareas: comoFuente<TareaStartrackCruda>(tareas),
      tiposTarea: comoFuente<TipoTareaStartrackCrudo>(tiposTarea),
      estadosVehiculoPorVehiculoId,
    },
    operadores: comoFuente<OperadorPrismaCrudo>(operadores),
    detallesPorEquipoId,
  }
}
