import type { EquipoUnificado, ResultadoRegla } from '@/lib/tipos/canonico'
import type { Regla } from './tipos'

/** R5 — el huérfano real de 01 Parte E.4: el equipo que no une con ningún
 * vehículo de Startrack. Nunca se fuerza (AGENTS.md §1.1); se declara. */
export const r5IdentidadNoResuelta: Regla = {
  id: 'R5',
  nombre: 'Identidad no resuelta o campo crítico ausente',
  descripcion:
    'No se encontró un vehículo en Startrack con código de activo, remote_id de tarea o clave compatible, o falta un campo crítico para calcular el veredicto con confianza.',
  severidad: 'media',
  rolResponsable: 'LOGISTICA',
  camposEntrada: ['identidadResuelta', 'codigoActivo', 'equipo.estado'],
  evaluar(eq: EquipoUnificado): ResultadoRegla | null {
    const camposFaltantes: string[] = []
    if (!eq.identidadResuelta) camposFaltantes.push('vehiculo')
    if (!eq.codigoActivo.valor) camposFaltantes.push('codigoActivo')
    if (!eq.equipo) camposFaltantes.push('equipo.estado')
    if (camposFaltantes.length === 0) return null

    return {
      regla: 'R5',
      nombre: 'Identidad no resuelta o campo crítico ausente',
      veredicto: 'SIN_EVIDENCIA',
      severidad: 'media',
      confianza: 40,
      porque: eq.identidadResuelta
        ? ['Falta al menos un campo crítico para calcular el veredicto con confianza.']
        : ['No se encontró un vehículo en Startrack con código de activo, remote_id o clave compatible.'],
      accionSugerida: 'Verificar manualmente si el equipo tiene contraparte en Startrack y completar el campo faltante.',
      rolResponsable: 'LOGISTICA',
      camposFaltantes,
    }
  },
}
