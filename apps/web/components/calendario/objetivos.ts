// Vocabulario de negocio compartido entre los componentes del calendario para
// los ids de la pila (`IdPrioridad`: la cobertura, los cuatro objetivos por
// asignación y el orden de llegada). Un solo lugar para no repetir los rótulos
// con distinta redacción en pila, resumen de niveles, tiles y detalle.

import type { IdPrioridad, IdSoftConstraint } from '@/lib/optimizador/tipos'

export const ETIQUETA_PILA: Record<IdPrioridad, string> = {
  cobertura: 'Cubrir la mayor cantidad de solicitudes',
  distancia: 'Distancia al proyecto (km, en línea recta)',
  tarifa: 'Tarifa efectiva (USD/h, moneda inferida)',
  ratingOperador: 'Operador con mejor rating (Startrack, 0–100)',
  horasOperador: 'Operador con menos horas trabajadas (motor encendido, 30 días)',
  ordenLlegada: 'Orden de llegada: primero en pedir, primero en ser atendido (created_at de Prisma)',
}

export const NOMBRE_OBJETIVO: Record<IdPrioridad, string> = {
  cobertura: 'Cobertura de solicitudes',
  distancia: 'Distancia',
  tarifa: 'Tarifa',
  ratingOperador: 'Rating de operador',
  horasOperador: 'Horas de operador',
  ordenLlegada: 'Orden de llegada',
}

const FORMATO_POR_OBJETIVO: Record<IdSoftConstraint, Intl.NumberFormat> = {
  distancia: new Intl.NumberFormat('es-SV', { maximumFractionDigits: 1 }),
  tarifa: new Intl.NumberFormat('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  ratingOperador: new Intl.NumberFormat('es-SV', { maximumFractionDigits: 1 }),
  horasOperador: new Intl.NumberFormat('es-SV', { maximumFractionDigits: 1 }),
}

/** Solo formato de presentación: redondea para leer, nunca cambia el dato. */
export function formatearValor(objetivo: IdSoftConstraint, valor: number): string {
  return FORMATO_POR_OBJETIVO[objetivo].format(valor)
}
