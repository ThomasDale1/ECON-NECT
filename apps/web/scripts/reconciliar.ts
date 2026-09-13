// `npx tsx scripts/reconciliar.ts` — criterio de terminado de S-A2. Lee ambas
// plataformas EN VIVO, corre el motor de reconciliación puro, e imprime por
// equipo: código de activo, veredicto, confianza y la(s) regla(s) que lo
// produjeron. Nunca coordenadas, placas ni nombres de personas (AGENTS.md §1.2).

import { asegurarEntornoCargado } from '../lib/conectores/entorno'

asegurarEntornoCargado()

import { comoFuente } from '../lib/canonico/fuentes'
import { reconciliar } from '../lib/canonico/reconciliacion'
import type {
  DatosCrudos,
  EquipoPrismaCrudo,
  EstadoVehiculoConProcedencia,
  EstadoVehiculoStartrackCrudo,
  GeocercaStartrackCruda,
  SolicitudPrismaCruda,
  TareaStartrackCruda,
  TipoTareaStartrackCrudo,
  VehiculoStartrackCrudo,
} from '../lib/canonico/tipos-crudos'
import * as prisma from '../lib/conectores/prisma'
import * as startrack from '../lib/conectores/startrack'

async function main() {
  console.log('ECON NECT — reconciliación en vivo\n')

  const [equipos, solicitudes, vehiculos, geocercas, tareas, tiposTarea] = await Promise.all([
    prisma.leerEquipos(),
    prisma.leerSolicitudes(),
    startrack.leerVehiculos(),
    startrack.leerGeocercas(),
    startrack.leerTareas(),
    startrack.leerTiposTarea(),
  ])

  // Nivel 1 de ubicación (01 E.10, corregido el 13 de septiembre de 2026):
  // se degrada por vehículo, no por corrida completa.
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
        // Sin posición en vivo para este vehículo: cae a nivel 2/3.
      }
    }),
  )

  const datos: DatosCrudos = {
    equipos: comoFuente<EquipoPrismaCrudo>(equipos),
    solicitudes: comoFuente<SolicitudPrismaCruda>(solicitudes),
    vehiculos: comoFuente<VehiculoStartrackCrudo>(vehiculos),
    geocercas: comoFuente<GeocercaStartrackCruda>(geocercas),
    tareas: comoFuente<TareaStartrackCruda>(tareas),
    tiposTarea: comoFuente<TipoTareaStartrackCrudo>(tiposTarea),
    estadosVehiculoPorVehiculoId,
  }

  const equiposUnificados = reconciliar(datos)

  console.log(`${equiposUnificados.length} equipos reconciliados.\n`)
  console.log(
    'codigoActivo'.padEnd(18),
    'veredicto'.padEnd(16),
    'confianza'.padEnd(10),
    'ubicNivel'.padEnd(10),
    'regla(s)',
  )
  for (const eq of equiposUnificados) {
    const codigo = eq.codigoActivo.valor ?? '(sin código)'
    const reglasDisparadas = eq.reglas.map((r) => r.regla).join(', ') || '(ninguna)'
    const ubicNivel = eq.ubicacion ? String(eq.ubicacion.nivel) : '—'
    console.log(
      codigo.padEnd(18),
      eq.veredicto.padEnd(16),
      String(eq.confianza).padEnd(10),
      ubicNivel.padEnd(10),
      reglasDisparadas,
    )
  }

  process.exitCode = 0
}

main().catch((error) => {
  console.error('Error reconciliando:', error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
