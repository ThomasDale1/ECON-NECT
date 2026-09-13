// Aritmética de fechas AAAA-MM-DD para el calendario (semana y día). Solo
// presentación: posiciona barras y navega; nunca decide choques ni
// candidatas (eso ya viene resuelto en `RespuestaOptimizar`).

export const DIAS_POR_SEMANA = 7

export function aFechaUtc(fecha: string): number {
  const [y, m, d] = fecha.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function diffDias(desde: string, hasta: string): number {
  return Math.round((aFechaUtc(hasta) - aFechaUtc(desde)) / 86_400_000)
}

export function sumarDias(fecha: string, dias: number): string {
  return new Date(aFechaUtc(fecha) + dias * 86_400_000).toISOString().slice(0, 10)
}

export function clampFecha(fecha: string, min: string, max: string): string {
  if (fecha < min) return min
  if (fecha > max) return max
  return fecha
}

export function seSuperponen(aInicio: string, aFin: string, bInicio: string, bFin: string): boolean {
  return aInicio <= bFin && aFin >= bInicio
}

export function estaEnRango(fecha: string, inicio: string, fin: string): boolean {
  return inicio <= fecha && fecha <= fin
}

/** La semana a la que vuelve la vista Día: la que ya estaba en pantalla si
 * contiene la fecha; si no, la página de 7 días del horizonte que la contiene. */
export function semanaQueContiene(
  fecha: string,
  inicioActual: string,
  horizonte: { desde: string; hasta: string },
): string {
  if (estaEnRango(fecha, inicioActual, sumarDias(inicioActual, DIAS_POR_SEMANA - 1))) return inicioActual
  const desplazamiento = Math.max(0, diffDias(horizonte.desde, fecha))
  return sumarDias(horizonte.desde, Math.floor(desplazamiento / DIAS_POR_SEMANA) * DIAS_POR_SEMANA)
}
