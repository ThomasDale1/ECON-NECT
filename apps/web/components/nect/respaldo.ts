import type { EquipoUnificado } from '@/lib/tipos/canonico'

/**
 * El respaldo no es un semáforo. Dice si el motor pudo concluir, no si
 * la operación está bien. EN_RIESGO con todos los campos es una
 * conclusión respaldada, no una contradicción.
 */
export function lecturaRespaldo(equipo: EquipoUnificado) {
  const faltantes = [...new Set(equipo.reglas.flatMap((r) => r.camposFaltantes))]
  const puedeConcluir = faltantes.length === 0 && equipo.veredicto !== 'SIN_EVIDENCIA'

  const etiqueta = puedeConcluir
    ? equipo.veredicto === 'COHERENTE'
      ? 'Estados alineados'
      : 'Conclusión respaldada'
    : faltantes.length > 0
      ? `Faltan ${faltantes.length} datos`
      : 'No se puede concluir'

  return { faltantes, puedeConcluir, etiqueta }
}
