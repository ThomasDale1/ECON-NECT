// Interfaz común de una regla de coherencia (S-A2 §lib/reglas/). No conoce
// HTTP ni React: entran datos canónicos, sale un veredicto con su
// justificación (AGENTS.md §4.3).

import type { EquipoUnificado, ResultadoRegla, Rol, Severidad } from '@/lib/tipos/canonico'
import type { ClaseEquipoCatalogo, TipoTareaCatalogo } from '@/lib/canonico/catalogos'
import type { EquipoPrismaCrudo, SolicitudPrismaCruda, TareaStartrackCruda } from '@/lib/canonico/tipos-crudos'

/** Lo que una regla necesita del resto de la flota, más allá de lo que ya
 * trae el `EquipoUnificado` que recibe (el contrato solo tipa "la" solicitud
 * y "la" tarea principales, singulares — varias reglas necesitan mirar TODAS
 * las de un equipo, y algunos campos crudos como `project_id` que el
 * contrato no expone directamente). Se arma una sola vez por corrida de
 * `reconciliar()` y se comparte entre los 15 equipos. */
export type ContextoReglas = {
  crudoPorEquipoId: Record<string, EquipoPrismaCrudo>
  puedeOperarPorEquipoId: Record<string, boolean>
  tareasPorEquipoId: Record<string, TareaStartrackCruda[]>
  solicitudesPorEquipoId: Record<string, SolicitudPrismaCruda[]>
  /** `job_type_id` de Startrack → nombre, desde `leerTiposTarea()`. */
  nombreTipoTareaPorId: Record<string, string>
  catalogoClasesEquipo: readonly ClaseEquipoCatalogo[]
  catalogoTiposTarea: readonly TipoTareaCatalogo[]
}

export type Regla = {
  id: string
  nombre: string
  /** Descripción en lenguaje de negocio (01 Parte D.4: "sin heurísticas
   * implícitas ni números mágicos enterrados en el código"). */
  descripcion: string
  severidad: Severidad
  rolResponsable: Rol
  camposEntrada: string[]
  /** `null` = la regla no aplica a este equipo (no aparece en `reglas[]`,
   * no resta confianza). Un `ResultadoRegla` con `veredicto: 'SIN_EVIDENCIA'`
   * significa que la regla SÍ aplica pero le faltó insumo para concluir. */
  evaluar(eq: EquipoUnificado, ctx: ContextoReglas): ResultadoRegla | null
}
