import type { EquipoUnificado, ResultadoRegla } from '@/lib/tipos/canonico'
import { tareaFinalizada } from './ayudas'
import type { ContextoReglas, Regla } from './tipos'

/** R1 — el caso vivo hoy es "la mayoría" de la flota: el recurso y su tarea
 * (si tiene una) describen objetos distintos y ninguno contradice al otro. */
export const r1EstadosCompatibles: Regla = {
  id: 'R1',
  nombre: 'Estados compatibles entre plataformas',
  descripcion:
    'El estado del recurso en Prisma y el estado de su tarea en Startrack describen objetos distintos y no se contradicen entre sí (p. ej. OCUPADA sin tarea viva, o con una tarea ya completada).',
  severidad: 'baja',
  rolResponsable: 'LOGISTICA',
  camposEntrada: ['equipo.estado', 'tarea.status_name'],
  evaluar(eq: EquipoUnificado, ctx: ContextoReglas): ResultadoRegla | null {
    if (!eq.equipo) return null

    const puedeOperar = ctx.puedeOperarPorEquipoId[eq.id] ?? true
    const tareaViva = eq.tarea != null && !tareaFinalizada(eq.tarea.valor)
    // Contradicción real (recurso que no puede operar con una tarea viva
    // encima): eso lo cubre R2, que sí sabe nombrar el riesgo. R1 no dispara
    // ahí — "aplica y concluye" en R1 solo cuando de verdad son compatibles.
    if (tareaViva && !puedeOperar) return null

    const porque = eq.tarea
      ? [
          `Prisma reporta el recurso en estado ${eq.equipo.valor}.`,
          `Startrack reporta la tarea en estado "${eq.tarea.valor}", y ninguno de los dos contradice al otro.`,
        ]
      : [
          `Prisma reporta el recurso en estado ${eq.equipo.valor}.`,
          'No hay una tarea viva en Startrack que lo contradiga.',
        ]

    return {
      regla: 'R1',
      nombre: 'Estados compatibles entre plataformas',
      veredicto: 'COHERENTE',
      severidad: 'baja',
      confianza: 90,
      porque,
      accionSugerida: 'Ninguna acción requerida: los estados son coherentes entre sí.',
      rolResponsable: 'LOGISTICA',
      camposFaltantes: [],
    }
  },
}
