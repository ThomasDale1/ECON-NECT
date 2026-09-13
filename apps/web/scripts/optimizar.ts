// `npm run optimizar` — criterio de terminado de S-A7. Corre `planear()` en
// vivo contra el sandbox y el solver local, con la pila en el orden de
// `SOFT_CONSTRAINTS` y sin clases sensibles a lluvia.
//
// ⚠ Nunca imprime ids, códigos, fechas, coordenadas ni nombres — solo
// estado, conteos y niveles (AGENTS.md §1.2, mismo criterio que scripts/leer.ts).

import { asegurarEntornoCargado } from '../lib/conectores/entorno'

asegurarEntornoCargado()

import { planear } from '../lib/optimizador/planear'
import { SOFT_CONSTRAINTS } from '../lib/optimizador/tipos'

async function main() {
  console.log('ECON NECT — optimizador en vivo\n')

  const respuesta = await planear({ pila: [...SOFT_CONSTRAINTS], clasesSensiblesLluvia: [] })

  console.log(`estado: ${respuesta.estado}`)
  if (respuesta.motivoInfactible) console.log(`motivo: ${respuesta.motivoInfactible}`)
  console.log(
    `conteos: ${respuesta.asignaciones.length} asignadas · ${respuesta.sinAsignacion.length} sin asignación · ${respuesta.excluidas.length} excluidas`,
  )
  console.log('niveles:')
  for (const nivel of respuesta.niveles) {
    console.log(`  ${nivel.objetivo}: ${nivel.valor} ${nivel.unidad} (óptimo probado: ${nivel.probadoOptimo})`)
  }
  console.log(`avisos: ${respuesta.avisos.length}`)

  process.exitCode = 0
}

main().catch((error) => {
  console.error('Error optimizando:', error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
