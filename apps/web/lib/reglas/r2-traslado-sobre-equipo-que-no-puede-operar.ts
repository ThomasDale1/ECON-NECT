import type { EquipoUnificado, ResultadoRegla } from '@/lib/tipos/canonico'
import { tareaTrasladoViva } from './ayudas'
import type { ContextoReglas, Regla } from './tipos'

/** R2 — Caso de Uso 03 de ECON (01 Parte F): un equipo que no puede operar
 * (OBSOLETA o con paro) con una tarea de traslado viva encima. */
export const r2TrasladoSobreEquipoQueNoPuedeOperar: Regla = {
  id: 'R2',
  nombre: 'Traslado sobre equipo que no puede operar',
  descripcion:
    'Existe una tarea de tipo Traslado no cancelada para un equipo que no puede operar (OBSOLETA o con paro activo).',
  severidad: 'alta',
  rolResponsable: 'LOGISTICA',
  camposEntrada: ['equipo.estado', 'active_failure_is_paro', 'tarea.job_type_id', 'tarea.status_name'],
  evaluar(eq: EquipoUnificado, ctx: ContextoReglas): ResultadoRegla | null {
    const puedeOperar = ctx.puedeOperarPorEquipoId[eq.id]
    if (puedeOperar === undefined || puedeOperar) return null

    const tareas = ctx.tareasPorEquipoId[eq.id] ?? []
    const trasladoVivo = tareas.some((t) => tareaTrasladoViva(t, ctx))
    if (!trasladoVivo) return null

    return {
      regla: 'R2',
      nombre: 'Traslado sobre equipo que no puede operar',
      veredicto: 'EN_RIESGO',
      severidad: 'alta',
      confianza: 85,
      porque: [
        `El equipo no puede operar (estado ${eq.equipo?.valor ?? 'desconocido'}${
          eq.falla ? `, falla activa ${eq.falla.valor}` : ''
        }).`,
        'Startrack tiene una tarea de traslado viva asignada a este equipo.',
      ],
      accionSugerida: 'Detener o reprogramar el traslado hasta confirmar que el equipo puede operar.',
      rolResponsable: 'LOGISTICA',
      camposFaltantes: [],
    }
  },
}
