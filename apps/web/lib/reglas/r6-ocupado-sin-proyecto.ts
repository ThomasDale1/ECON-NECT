import type { EquipoUnificado, ResultadoRegla } from '@/lib/tipos/canonico'
import type { ContextoReglas, Regla } from './tipos'

/** R6 — la propia API expone una bandera para este caso (01 Parte E.2):
 * un equipo puede decir OCUPADA sin proyecto asignado. Hoy 0 en el sandbox
 * (correcto). */
export const r6OcupadoSinProyecto: Regla = {
  id: 'R6',
  nombre: 'Equipo ocupado sin proyecto asignado',
  descripcion: 'El equipo está OCUPADA en Prisma pero no tiene un proyecto asignado.',
  severidad: 'media',
  rolResponsable: 'LOGISTICA',
  camposEntrada: ['equipo.estado', 'project_id', 'occupied_without_project'],
  evaluar(eq: EquipoUnificado, ctx: ContextoReglas): ResultadoRegla | null {
    const crudo = ctx.crudoPorEquipoId[eq.id]
    if (!crudo || crudo.estado !== 'OCUPADA') return null

    const sinProyecto = crudo.project_id == null || crudo.occupied_without_project === true
    if (!sinProyecto) return null

    return {
      regla: 'R6',
      nombre: 'Equipo ocupado sin proyecto asignado',
      veredicto: 'ATENCION',
      severidad: 'media',
      confianza: 80,
      porque: ['El equipo está OCUPADA en Prisma pero no tiene un proyecto asignado.'],
      accionSugerida: 'Confirmar a qué proyecto pertenece esta ocupación o liberar el equipo.',
      rolResponsable: 'LOGISTICA',
      camposFaltantes: [],
    }
  },
}
