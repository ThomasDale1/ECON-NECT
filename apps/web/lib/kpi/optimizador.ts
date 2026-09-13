// KPIs del optimizador — ECON NECT (S-C4, carril C).
//
// Cálculo puro sobre la respuesta ya ensamblada del optimizador (S-A7). Sin
// HTTP, sin recálculo de reconciliación: solo suma y cuenta lo que ya vino
// con su honestidad declarada (valor null + motivo, peorCasoAplicado). Mismo
// principio que lib/kpi/calculo.ts — ningún número sin poder señalar de
// dónde salió; si no es comparable, se documenta el motivo real, nunca uno
// inventado (AGENTS.md §1.1).

import type {
  AsignacionPropuesta,
  IdSoftConstraint,
  KpiAhorroObjetivo,
  KpisOptimizador,
  RespuestaOptimizarSinKpis,
  SolicitudSinAsignacion,
  ValorObjetivo,
} from '@/lib/optimizador/tipos'

const UNIDAD_POR_OBJETIVO: Record<IdSoftConstraint, ValorObjetivo['unidad']> = {
  distancia: 'km',
  tarifa: 'USD/h',
  continuidadOperador: 'sí/no',
  holgura: 'días',
}

/** distancia y tarifa se minimizan (mejora = manual − propuesta); holgura y
 * continuidad se maximizan (mejora = propuesta − manual). */
function seMinimiza(objetivo: IdSoftConstraint): boolean {
  return objetivo === 'distancia' || objetivo === 'tarifa'
}

function esComparable(a: AsignacionPropuesta, objetivo: IdSoftConstraint): boolean {
  const propuesta = a.objetivos[objetivo]
  const manual = a.manual!.objetivos[objetivo]
  return propuesta.valor !== null && manual.valor !== null && !propuesta.peorCasoAplicado && !manual.peorCasoAplicado
}

/** Motivos reales de por qué ningún caso fue comparable — sin repetir. Una
 * razón por línea (separadas por "\n"): cuando propuesta y manual citan el
 * mismo motivo textual para el mismo caso, se funden en una sola línea en
 * vez de mostrar la misma frase dos veces con prefijos distintos. */
function motivosNoComparables(
  objetivo: IdSoftConstraint,
  conPropuesta: AsignacionPropuesta[],
  sinPropuestaConManual: SolicitudSinAsignacion[],
): string {
  const motivos = new Set<string>()

  for (const a of conPropuesta) {
    const propuesta = a.objetivos[objetivo]
    const manual = a.manual!.objetivos[objetivo]
    const propuestaSinDato = (propuesta.valor === null || propuesta.peorCasoAplicado) && propuesta.motivo
    const manualSinDato = (manual.valor === null || manual.peorCasoAplicado) && manual.motivo

    if (propuestaSinDato && manualSinDato && propuesta.motivo === manual.motivo) {
      motivos.add(`Sin dato en propuesta y manual: ${propuesta.motivo}`)
      continue
    }
    if (propuestaSinDato) motivos.add(`Asignación propuesta sin dato: ${propuesta.motivo}`)
    if (manualSinDato) motivos.add(`Asignación manual sin dato: ${manual.motivo}`)
  }

  for (const s of sinPropuestaConManual) {
    motivos.add(`Sin asignación propuesta por el optimizador: ${s.motivo}`)
  }

  if (motivos.size === 0) {
    motivos.add('No hay solicitudes APROBADA con asignación manual disponible para comparar.')
  }

  return [...motivos].join('\n')
}

function calcularAhorroPorObjetivo(
  objetivo: IdSoftConstraint,
  respuesta: RespuestaOptimizarSinKpis,
): KpiAhorroObjetivo {
  const conPropuesta = respuesta.asignaciones.filter((a) => a.manual !== null)
  const sinPropuestaConManual = respuesta.sinAsignacion.filter((s) => s.manual !== null)
  const totalAprobadas = conPropuesta.length + sinPropuestaConManual.length
  const unidad = UNIDAD_POR_OBJETIVO[objetivo]

  const comparables = conPropuesta.filter((a) => esComparable(a, objetivo))

  if (comparables.length === 0) {
    return {
      objetivo,
      mejoraTotal: null,
      unidad,
      comparables: 0,
      totalAprobadas,
      datoFaltante: motivosNoComparables(objetivo, conPropuesta, sinPropuestaConManual),
    }
  }

  const minimiza = seMinimiza(objetivo)
  let mejoraTotal = 0
  for (const a of comparables) {
    const valorPropuesto = a.objetivos[objetivo].valor!
    const valorManual = a.manual!.objetivos[objetivo].valor!
    mejoraTotal += minimiza ? valorManual - valorPropuesto : valorPropuesto - valorManual
  }

  return { objetivo, mejoraTotal, unidad, comparables: comparables.length, totalAprobadas, datoFaltante: null }
}

function calcularLluviaClasesSensibles(respuesta: RespuestaOptimizarSinKpis): KpisOptimizador['lluviaClasesSensibles'] {
  if (respuesta.clasesSensiblesLluvia.length === 0) {
    return {
      asignacionesConLluvia: null,
      asignacionesSensibles: 0,
      sinPronostico: 0,
      datoFaltante: 'Ninguna clase marcada como sensible a la lluvia.',
    }
  }

  const sensibles = respuesta.asignaciones.filter((a) => a.clima.estado !== 'no_aplica')
  const asignacionesSensibles = sensibles.length
  const sinPronosticoAsignaciones = sensibles.filter((a) => a.clima.estado === 'sin_pronostico')
  const sinPronostico = sinPronosticoAsignaciones.length
  const evaluadas = sensibles.filter((a) => a.clima.estado === 'evaluado')
  const asignacionesConLluvia = evaluadas.filter((a) => a.clima.estado === 'evaluado' && a.clima.diasConLluvia >= 1).length

  if (asignacionesSensibles > 0 && sinPronostico === asignacionesSensibles) {
    const motivos = new Set<string>()
    for (const a of sinPronosticoAsignaciones) {
      if (a.clima.estado === 'sin_pronostico') motivos.add(a.clima.motivo)
    }
    return {
      asignacionesConLluvia: null,
      asignacionesSensibles,
      sinPronostico,
      datoFaltante: [...motivos].join('; ') || 'Todas las asignaciones sensibles quedaron sin pronóstico.',
    }
  }

  return { asignacionesConLluvia, asignacionesSensibles, sinPronostico, datoFaltante: null }
}

function calcularCoberturaPlan(respuesta: RespuestaOptimizarSinKpis): KpisOptimizador['coberturaPlan'] {
  const asignadas = respuesta.asignaciones.length
  const evaluadas = asignadas + respuesta.sinAsignacion.length
  const excluidas = respuesta.excluidas.length

  if (evaluadas === 0) {
    return {
      valor: null,
      asignadas,
      evaluadas,
      excluidas,
      datoFaltante: 'No hay solicitudes con período vigente para evaluar.',
    }
  }

  return { valor: asignadas / evaluadas, asignadas, evaluadas, excluidas, datoFaltante: null }
}

export function calcularKpisOptimizador(respuesta: RespuestaOptimizarSinKpis): KpisOptimizador {
  return {
    ahorroPorObjetivo: respuesta.pila.map((objetivo) => calcularAhorroPorObjetivo(objetivo, respuesta)),
    lluviaClasesSensibles: calcularLluviaClasesSensibles(respuesta),
    coberturaPlan: calcularCoberturaPlan(respuesta),
  }
}
