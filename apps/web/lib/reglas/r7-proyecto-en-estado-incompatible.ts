import type { EquipoUnificado, ResultadoRegla } from '@/lib/tipos/canonico'
import type { ContextoReglas, Regla } from './tipos'

/** R7 — dispara en 2 equipos hoy (verificado): OBSOLETA con proyecto
 * asignado. OCUPADA + proyecto es el caso normal y no dispara. */
export const r7ProyectoEnEstadoIncompatible: Regla = {
  id: 'R7',
  nombre: 'Asignado a proyecto en estado incompatible',
  descripcion:
    'El equipo tiene un proyecto asignado en Prisma pero su estado de recurso es incompatible con seguir asignado (OBSOLETA) o inusual (DISPONIBLE en vez de OCUPADA).',
  severidad: 'alta',
  rolResponsable: 'LOGISTICA',
  camposEntrada: ['project_id', 'equipo.estado'],
  evaluar(eq: EquipoUnificado, ctx: ContextoReglas): ResultadoRegla | null {
    const crudo = ctx.crudoPorEquipoId[eq.id]
    if (!crudo || crudo.project_id == null) return null

    if (crudo.estado === 'OBSOLETA') {
      return {
        regla: 'R7',
        nombre: 'Asignado a proyecto en estado incompatible',
        veredicto: 'EN_RIESGO',
        severidad: 'alta',
        confianza: 85,
        porque: ['El equipo tiene un proyecto asignado en Prisma pero su estado es OBSOLETA.'],
        accionSugerida: 'Reasignar el proyecto a otro equipo: este ya no está en servicio.',
        rolResponsable: 'LOGISTICA',
        camposFaltantes: [],
      }
    }

    if (crudo.estado === 'DISPONIBLE') {
      return {
        regla: 'R7',
        nombre: 'Asignado a proyecto en estado incompatible',
        veredicto: 'ATENCION',
        severidad: 'media',
        confianza: 70,
        porque: ['El equipo tiene un proyecto asignado en Prisma pero su estado es DISPONIBLE, no OCUPADA.'],
        accionSugerida: 'Verificar si la asignación de proyecto sigue vigente.',
        rolResponsable: 'LOGISTICA',
        camposFaltantes: [],
      }
    }

    // OCUPADA + proyecto es el caso normal: no dispara.
    return null
  },
}
