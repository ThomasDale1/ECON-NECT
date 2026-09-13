// Vocabulario de negocio compartido entre los componentes del calendario para
// los ids de `IdSoftConstraint` (+ 'cobertura', que no es un soft constraint
// pero aparece en `NivelLexicografico`). Un solo lugar para no repetir los
// rótulos con distinta redacción en pila, resumen de niveles y detalle.

import type { IdSoftConstraint } from '@/lib/optimizador/tipos'

export const ETIQUETA_PILA: Record<IdSoftConstraint, string> = {
  distancia: 'Distancia al proyecto (km, en línea recta)',
  tarifa: 'Tarifa efectiva (USD/h, moneda inferida)',
  continuidadOperador: 'Operador que ya conoce la máquina',
  holgura: 'Holgura antes del inicio (días)',
}

export const NOMBRE_OBJETIVO: Record<'cobertura' | IdSoftConstraint, string> = {
  cobertura: 'Cobertura de solicitudes',
  distancia: 'Distancia al proyecto',
  tarifa: 'Tarifa efectiva',
  continuidadOperador: 'Continuidad de operador',
  holgura: 'Holgura antes del inicio',
}
