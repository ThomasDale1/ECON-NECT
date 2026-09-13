import { r1EstadosCompatibles } from './r1-estados-compatibles'
import { r2TrasladoSobreEquipoQueNoPuedeOperar } from './r2-traslado-sobre-equipo-que-no-puede-operar'
import { r3SolicitudAprobadaSinTraslado } from './r3-solicitud-aprobada-sin-traslado'
import { r4FallaTrasladoStdSinTarea } from './r4-falla-traslado-std-sin-tarea'
import { r5IdentidadNoResuelta } from './r5-identidad-no-resuelta'
import { r6OcupadoSinProyecto } from './r6-ocupado-sin-proyecto'
import { r7ProyectoEnEstadoIncompatible } from './r7-proyecto-en-estado-incompatible'
import { r8ValorFueraDeCatalogo } from './r8-valor-fuera-de-catalogo'
import type { Regla } from './tipos'

export type { Regla, ContextoReglas } from './tipos'

/** Las 8 reglas de coherencia (S-A2 §lib/reglas/), en el orden de la tabla
 * del prompt. El rol responsable de cada una es el enlace a la RACI de C
 * (no se duplica acá). */
export const REGLAS: Regla[] = [
  r1EstadosCompatibles,
  r2TrasladoSobreEquipoQueNoPuedeOperar,
  r3SolicitudAprobadaSinTraslado,
  r4FallaTrasladoStdSinTarea,
  r5IdentidadNoResuelta,
  r6OcupadoSinProyecto,
  r7ProyectoEnEstadoIncompatible,
  r8ValorFueraDeCatalogo,
]
