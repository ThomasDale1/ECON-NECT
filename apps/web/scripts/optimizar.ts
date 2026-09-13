// `npm run optimizar` — corre `planear()` en vivo contra el sandbox y el
// solver local, con la pila en el orden de `PRIORIDADES_PILA` y sin plan
// anterior (S-A7, ampliado en S-A10 Paso 8).
//
// ⚠ Nunca imprime ids, códigos, fechas, coordenadas ni nombres — solo
// estado, conteos y niveles (AGENTS.md §1.2, mismo criterio que scripts/leer.ts).

import { asegurarEntornoCargado } from '../lib/conectores/entorno'

asegurarEntornoCargado()

import { planear } from '../lib/optimizador/planear'
import { PRIORIDADES_PILA } from '../lib/optimizador/tipos'

async function main() {
  console.log('ECON NECT — optimizador en vivo\n')

  const respuesta = await planear({ pila: [...PRIORIDADES_PILA], planAnterior: null })

  console.log(`estado: ${respuesta.estado}`)
  if (respuesta.motivoInfactible) console.log(`motivo: ${respuesta.motivoInfactible}`)
  console.log(
    `conteos: ${respuesta.asignaciones.length} asignadas · ${respuesta.sinAsignacion.length} sin asignación · ${respuesta.excluidas.length} excluidas`,
  )
  console.log('niveles:')
  for (const nivel of respuesta.niveles) {
    console.log(`  ${nivel.objetivo}: ${nivel.valor} ${nivel.unidad} (óptimo probado: ${nivel.probadoOptimo})`)
  }

  const cobertura = respuesta.coberturaOperadores
  console.log('cobertura de operadores:')
  console.log(`  total: ${cobertura.total}`)
  console.log(`  con conductor de Startrack: ${cobertura.conConductor}`)
  console.log(`  con rating: ${cobertura.conRating}`)
  console.log(`  con horas: ${cobertura.conHoras}`)
  console.log(`  conflictos de identidad: ${cobertura.conflictosIdentidad}`)

  const reemplazos = respuesta.asignaciones.filter((a) => a.reemplazaConfirmada !== null).length
  const rotasSinReemplazo = respuesta.sinAsignacion.filter((s) => s.reemplazaConfirmada !== null).length
  console.log(`reemplazos propuestos de confirmadas rotas: ${reemplazos}`)
  console.log(`confirmadas rotas sin reemplazo posible: ${rotasSinReemplazo}`)

  console.log(`avisos: ${respuesta.avisos.length}`)

  process.exitCode = 0
}

main().catch((error) => {
  console.error('Error optimizando:', error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
