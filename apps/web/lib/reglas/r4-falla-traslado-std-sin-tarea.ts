import type { EquipoUnificado, ResultadoRegla } from '@/lib/tipos/canonico'
import { tareaTrasladoViva } from './ayudas'
import type { ContextoReglas, Regla } from './tipos'

/** R4 — la línea punteada 3 del TO-BE de ECON (01 Parte E.3): el catálogo de
 * fallas de Prisma nombra un traslado a taller que se ejecuta en Startrack,
 * sin ninguna implementación que los conecte hoy. Hoy 0 fallas en el sandbox
 * → no aplica, que es correcto ("no aplica" ≠ "sin evidencia"). */
export const r4FallaTrasladoStdSinTarea: Regla = {
  id: 'R4',
  nombre: 'Falla en traslado a taller sin tarea de traslado',
  descripcion:
    'La falla activa del equipo está en estado TRASLADO_STD en Prisma y no hay una tarea de traslado viva en Startrack para este equipo.',
  severidad: 'alta',
  rolResponsable: 'MANTENIMIENTO',
  camposEntrada: ['falla.status', 'tarea.job_type_id', 'tarea.status_name'],
  evaluar(eq: EquipoUnificado, ctx: ContextoReglas): ResultadoRegla | null {
    if (!eq.falla || eq.falla.valor !== 'TRASLADO_STD') return null

    const tareas = ctx.tareasPorEquipoId[eq.id] ?? []
    const hayTraslado = tareas.some((t) => tareaTrasladoViva(t, ctx))
    if (hayTraslado) return null

    return {
      regla: 'R4',
      nombre: 'Falla en traslado a taller sin tarea de traslado',
      veredicto: 'EN_RIESGO',
      severidad: 'alta',
      confianza: 85,
      porque: [
        'La falla activa del equipo está en estado TRASLADO_STD en Prisma.',
        'No hay una tarea de traslado viva en Startrack para este equipo.',
      ],
      accionSugerida: 'Generar la tarea de traslado hacia taller en Startrack.',
      rolResponsable: 'MANTENIMIENTO',
      camposFaltantes: [],
    }
  },
}
