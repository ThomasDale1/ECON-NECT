// `npx tsx scripts/reconciliar.ts` — criterio de terminado de S-A2. Lee ambas
// plataformas EN VIVO, corre el motor de reconciliación puro, e imprime por
// equipo: código de activo, veredicto, confianza y la(s) regla(s) que lo
// produjeron. Nunca coordenadas, placas ni nombres de personas (AGENTS.md §1.2).

import { asegurarEntornoCargado } from '../lib/conectores/entorno'

asegurarEntornoCargado()

import { reconciliar } from '../lib/canonico/reconciliacion'
import type {
  DatosCrudos,
  EquipoPrismaCrudo,
  FuenteCruda,
  GeocercaStartrackCruda,
  SolicitudPrismaCruda,
  TareaStartrackCruda,
  TipoTareaStartrackCrudo,
  VehiculoStartrackCrudo,
} from '../lib/canonico/tipos-crudos'
import * as prisma from '../lib/conectores/prisma'
import * as startrack from '../lib/conectores/startrack'
import type { RespuestaConector } from '../lib/conectores/tipos'

/** Adapta la envoltura de conector (`{ datos, linaje }`) a `FuenteCruda<T>`,
 * la forma que espera `reconciliar()` — lib/canonico no conoce esta capa
 * (AGENTS.md §4.3), así que el ensamblado vive acá, en el orquestador. */
function comoFuente<T>(respuesta: RespuestaConector<unknown[]>): FuenteCruda<T> {
  return {
    datos: respuesta.datos as T[],
    plataforma: respuesta.linaje.plataforma,
    endpoint: respuesta.linaje.endpoint,
    leidoEn: respuesta.linaje.leidoEn,
  }
}

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

  const datos: DatosCrudos = {
    equipos: comoFuente<EquipoPrismaCrudo>(equipos),
    solicitudes: comoFuente<SolicitudPrismaCruda>(solicitudes),
    vehiculos: comoFuente<VehiculoStartrackCrudo>(vehiculos),
    geocercas: comoFuente<GeocercaStartrackCruda>(geocercas),
    tareas: comoFuente<TareaStartrackCruda>(tareas),
    tiposTarea: comoFuente<TipoTareaStartrackCrudo>(tiposTarea),
  }

  const equiposUnificados = reconciliar(datos)

  console.log(`${equiposUnificados.length} equipos reconciliados.\n`)
  console.log(
    'codigoActivo'.padEnd(18),
    'veredicto'.padEnd(16),
    'confianza'.padEnd(10),
    'regla(s)',
  )
  for (const eq of equiposUnificados) {
    const codigo = eq.codigoActivo.valor ?? '(sin código)'
    const reglasDisparadas = eq.reglas.map((r) => r.regla).join(', ') || '(ninguna)'
    console.log(
      codigo.padEnd(18),
      eq.veredicto.padEnd(16),
      String(eq.confianza).padEnd(10),
      reglasDisparadas,
    )
  }

  process.exitCode = 0
}

main().catch((error) => {
  console.error('Error reconciliando:', error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
