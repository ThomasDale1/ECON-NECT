import type { EquipoUnificado, ResultadoRegla } from '@/lib/tipos/canonico'
import { tareaTrasladoViva } from './ayudas'
import type { ContextoReglas, Regla } from './tipos'

/** R3 — la línea punteada 1 del TO-BE de ECON (01 Parte B): "solicitud
 * aprobada / viaja como tarea". Dispara en 4 de 5 solicitudes aprobadas hoy
 * (verificado): la única que no dispara ya tiene su tarea enlazada por
 * remote_id. */
export const r3SolicitudAprobadaSinTraslado: Regla = {
  id: 'R3',
  nombre: 'Solicitud aprobada sin tarea de traslado',
  descripcion:
    'Hay una solicitud aprobada en Prisma y no se encontró una tarea de traslado enlazada en Startrack (ni por remote_id ni por el vehículo asignado).',
  severidad: 'media',
  rolResponsable: 'LOGISTICA',
  camposEntrada: ['solicitud.status', 'tarea.remote_id', 'tarea.job_type_id'],
  evaluar(eq: EquipoUnificado, ctx: ContextoReglas): ResultadoRegla | null {
    const solicitudes = ctx.solicitudesPorEquipoId[eq.id] ?? []
    const aprobadas = solicitudes.filter((s) => (s.status ?? '').toUpperCase() === 'APROBADA')
    if (aprobadas.length === 0) return null

    const tareas = ctx.tareasPorEquipoId[eq.id] ?? []
    const idsSolicitudesAprobadas = new Set(aprobadas.map((s) => String(s.id).trim()))

    const enlazadaPorRemoteId = tareas.some(
      (t) => t.remote_id && idsSolicitudesAprobadas.has(String(t.remote_id).trim()),
    )
    const enlazadaPorHeuristica = tareas.some((t) => tareaTrasladoViva(t, ctx))
    if (enlazadaPorRemoteId || enlazadaPorHeuristica) return null

    return {
      regla: 'R3',
      nombre: 'Solicitud aprobada sin tarea de traslado',
      veredicto: 'ATENCION',
      severidad: 'media',
      confianza: 75,
      porque: [
        `Hay ${aprobadas.length} solicitud(es) aprobada(s) para este equipo en Prisma.`,
        'No se encontró una tarea de traslado enlazada en Startrack, ni por remote_id ni por el vehículo asignado.',
      ],
      accionSugerida: 'Generar o verificar la tarea de traslado correspondiente en Startrack.',
      rolResponsable: 'LOGISTICA',
      camposFaltantes: [],
    }
  },
}
