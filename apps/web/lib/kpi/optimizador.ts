// KPIs del optimizador — ECON NECT (S-C4, reescrito en S-A10 Paso 9b, carril C).
//
// Cálculo puro sobre la respuesta ya ensamblada del optimizador. Sin HTTP,
// sin recálculo de reconciliación: solo suma y cuenta lo que ya vino con su
// honestidad declarada (valor null + motivo, peorCasoAplicado). Mismo
// principio que lib/kpi/calculo.ts — ningún número sin poder señalar de
// dónde salió; si no es comparable, se documenta el motivo real, nunca uno
// inventado (AGENTS.md §1.1).
//
// La referencia es la peor opción válida de cada solicitud, por objetivo y
// por separado — nunca la asignación manual (salió el 13 de septiembre de 2026).

import {
  SOFT_CONSTRAINTS,
  type AsignacionPropuesta,
  type IdSoftConstraint,
  type KpiAhorroObjetivo,
  type KpisOptimizador,
  type RespuestaOptimizarSinKpis,
  type ValorObjetivo,
} from '@/lib/optimizador/tipos'

const UNIDAD_POR_OBJETIVO: Record<IdSoftConstraint, ValorObjetivo['unidad']> = {
  distancia: 'km',
  tarifa: 'USD/h',
  ratingOperador: 'pts',
  horasOperador: 'h',
}

/** El rating se maximiza (mejora = elegido − peor); tarifa, distancia y horas
 * se minimizan (mejora = peor − elegido). */
export function seMaximiza(objetivo: IdSoftConstraint): boolean {
  return objetivo === 'ratingOperador'
}

/** Comparable = valor elegido real (no nulo y sin peor caso) y peor opción
 * válida con dato real. */
export function esComparable(asignacion: AsignacionPropuesta, objetivo: IdSoftConstraint): boolean {
  const elegido = asignacion.objetivos[objetivo]
  return elegido.valor !== null && !elegido.peorCasoAplicado && asignacion.peorOpcionValida[objetivo].valor !== null
}

/** La mejora de una asignación frente a su peor opción válida, con el sentido
 * de la fórmula del catálogo. `null` si no es comparable. La exporta este
 * módulo para que el detalle de la UI muestre la misma cifra sin recalcularla
 * por su cuenta. */
export function mejoraDeAsignacion(asignacion: AsignacionPropuesta, objetivo: IdSoftConstraint): number | null {
  if (!esComparable(asignacion, objetivo)) return null
  const elegido = asignacion.objetivos[objetivo].valor as number
  const peor = asignacion.peorOpcionValida[objetivo].valor as number
  return seMaximiza(objetivo) ? elegido - peor : peor - elegido
}

/** Motivos reales de por qué ninguna asignación fue comparable — sin repetir,
 * uno por línea (separados por "\n"). */
function motivosNoComparables(objetivo: IdSoftConstraint, asignaciones: AsignacionPropuesta[]): string {
  if (asignaciones.length === 0) return 'El plan no cubre ninguna solicitud.'

  const motivos = new Set<string>()
  for (const a of asignaciones) {
    const elegido = a.objetivos[objetivo]
    if (elegido.valor === null || elegido.peorCasoAplicado) {
      if (elegido.motivo) motivos.add(elegido.motivo)
      continue
    }
    const peor = a.peorOpcionValida[objetivo]
    if (peor.valor === null) {
      motivos.add(
        `Ninguna opción válida con dato real (${peor.candidatasConDato} de ${peor.candidatasValidas} candidatas con dato).`,
      )
    }
  }
  return [...motivos].join('\n')
}

function calcularAhorroPorObjetivo(
  objetivo: IdSoftConstraint,
  respuesta: RespuestaOptimizarSinKpis,
): KpiAhorroObjetivo {
  const { asignaciones } = respuesta
  const comparables = asignaciones.filter((a) => esComparable(a, objetivo))
  const base = {
    objetivo,
    enPila: respuesta.pila.includes(objetivo),
    unidad: UNIDAD_POR_OBJETIVO[objetivo],
    comparables: comparables.length,
    asignaciones: asignaciones.length,
  }

  if (comparables.length === 0) {
    return {
      ...base,
      mejoraTotal: null,
      mejoraPromedio: null,
      datoFaltante: motivosNoComparables(objetivo, asignaciones),
    }
  }

  const mejoraTotal = comparables.reduce((suma, a) => suma + (mejoraDeAsignacion(a, objetivo) as number), 0)
  return { ...base, mejoraTotal, mejoraPromedio: mejoraTotal / comparables.length, datoFaltante: null }
}

/** Marca de llegada para ordenar: `created_at` interpretable, o al final. */
function marcaDeLlegada(creadaEn: string | null): number {
  const marca = creadaEn ? Date.parse(creadaEn) : Number.NaN
  return Number.isNaN(marca) ? Number.POSITIVE_INFINITY : marca
}

function calcularSolicitudesCubiertas(respuesta: RespuestaOptimizarSinKpis): KpisOptimizador['solicitudesCubiertas'] {
  const cubiertas = respuesta.asignaciones.length
  const evaluadas = cubiertas + respuesta.sinAsignacion.length

  return {
    cubiertas,
    evaluadas,
    excluidas: respuesta.excluidas.length,
    // En orden de llegada: la primera en pedir encabeza la lista de faltantes.
    noCubiertas: respuesta.sinAsignacion
      .map((s) => ({
        solicitudId: s.solicitud.id,
        codigoProyecto: s.solicitud.codigoProyecto,
        clase: s.solicitud.clase.valor,
        creadaEn: s.solicitud.creadaEn.valor,
        motivo: s.motivo,
      }))
      .sort((x, y) => {
        const marcaX = marcaDeLlegada(x.creadaEn)
        const marcaY = marcaDeLlegada(y.creadaEn)
        return marcaX === marcaY ? 0 : marcaX < marcaY ? -1 : 1
      }),
    datoFaltante: evaluadas === 0 ? 'No hay solicitudes con período vigente para evaluar.' : null,
  }
}

export function calcularKpisOptimizador(respuesta: RespuestaOptimizarSinKpis): KpisOptimizador {
  return {
    ahorroPorObjetivo: SOFT_CONSTRAINTS.map((objetivo) => calcularAhorroPorObjetivo(objetivo, respuesta)),
    solicitudesCubiertas: calcularSolicitudesCubiertas(respuesta),
  }
}
