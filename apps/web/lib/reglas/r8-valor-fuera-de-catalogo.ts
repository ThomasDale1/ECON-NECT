import type { EquipoUnificado, ResultadoRegla } from '@/lib/tipos/canonico'
import type { ContextoReglas, Regla } from './tipos'

/** R8 — el hallazgo 01 E.4: un registro trae `clase_equipo` en plural
 * ("Retroexcavadoras") cuando el resto de la flota lo tiene en singular.
 * No se "corrige": se declara como valor fuera de catálogo. */
export const r8ValorFueraDeCatalogo: Regla = {
  id: 'R8',
  nombre: 'Valor fuera del catálogo declarado',
  descripcion: 'Un valor de catálogo del equipo no está en el catálogo verificado contra la API real.',
  severidad: 'baja',
  rolResponsable: 'LOGISTICA',
  camposEntrada: ['clase_equipo'],
  evaluar(eq: EquipoUnificado, ctx: ContextoReglas): ResultadoRegla | null {
    const crudo = ctx.crudoPorEquipoId[eq.id]
    if (!crudo?.clase_equipo) return null

    const enCatalogo = ctx.catalogoClasesEquipo.some((valor) => valor === crudo.clase_equipo)
    if (enCatalogo) return null

    return {
      regla: 'R8',
      nombre: 'Valor fuera del catálogo declarado',
      veredicto: 'ATENCION',
      severidad: 'baja',
      confianza: 70,
      porque: [`El valor "${crudo.clase_equipo}" de clase de equipo no está en el catálogo verificado.`],
      accionSugerida: 'Corregir el valor de catálogo en Prisma o confirmar que es un valor nuevo válido.',
      rolResponsable: 'LOGISTICA',
      camposFaltantes: [],
    }
  },
}
