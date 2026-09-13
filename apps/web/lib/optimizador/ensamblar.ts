// Ensamblado de la respuesta (S-A7 Paso 4g). Puro: no conoce HTTP. Recibe la
// entrada adaptada (ya verificada por verificar.ts) y el clima ya resuelto
// (lib/optimizador/planear.ts es quien hizo esas llamadas — Paso 4h/4i), y
// arma `RespuestaOptimizarSinKpis`.

import type { OperadorPrismaCrudo } from '@/lib/canonico/tipos-crudos'
import type { Dato } from '@/lib/tipos/canonico'
import { clavePar, type ResultadoAdaptador } from './adaptador'
import type {
  AlertaClima,
  AsignacionManual,
  AsignacionPropuesta,
  NivelLexicografico,
  ObjetivosAsignacion,
  PeticionOptimizar,
  RespuestaOptimizarSinKpis,
  SalidaSolver,
  SolicitudSinAsignacion,
} from './tipos'

const UNIDAD_POR_NIVEL: Record<string, string> = {
  cobertura: 'solicitudes',
  distancia: 'km',
  tarifa: 'USD/h',
  holgura: 'días',
  continuidadOperador: 'asignaciones',
}

function convertirValorNivel(objetivo: string, valorCrudo: number): number {
  if (objetivo === 'distancia') return valorCrudo / 1000 // metros → km
  if (objetivo === 'tarifa') return valorCrudo / 100 // centavos → USD/h
  return valorCrudo
}

function codTrabajadorDato(
  operadorId: string,
  operadoresPorId: Map<string, OperadorPrismaCrudo>,
  procedencia: ResultadoAdaptador['procedenciaOperadores'],
): Dato<string> {
  const op = operadoresPorId.get(operadorId)
  const valor = op?.cod_trabajador ?? null
  return {
    valor,
    linaje: { plataforma: procedencia.plataforma, endpoint: procedencia.endpoint, campo: 'cod_trabajador', valorCrudo: valor, leidoEn: procedencia.leidoEn },
  }
}

function continuidadOperador(
  maquinaId: string,
  operadorId: string,
  operadoresAsociadosPorMaquinaId: Map<string, Set<string>>,
): ObjetivosAsignacion['continuidadOperador'] {
  const asociados = operadoresAsociadosPorMaquinaId.get(maquinaId)
  const valor = asociados?.has(operadorId) ? 1 : 0
  return { valor, peorCasoAplicado: false, motivo: null, unidad: 'sí/no', linaje: [] }
}

function completarManual(
  resultado: ResultadoAdaptador,
  solicitudId: string,
): AsignacionManual | null {
  const info = resultado.manualPorSolicitudId.get(solicitudId)
  if (!info) return null
  return {
    maquina: info.maquina,
    objetivos: {
      ...info.objetivosParciales,
      continuidadOperador: {
        valor: null,
        peorCasoAplicado: false,
        motivo: 'la solicitud no registra operador',
        unidad: 'sí/no',
        linaje: [],
      },
    },
  }
}

export type EntradaEnsamblar = {
  peticion: PeticionOptimizar
  generadoEn: string
  hoy: string
  resultado: ResultadoAdaptador
  salida: SalidaSolver
  /** Ya resuelto por `planear.ts` (Paso 4h) para cada solicitud asignada
   * cuya máquina es de una clase marcada como sensible a lluvia. */
  climaPorSolicitudId: Map<string, AlertaClima>
  /** Avisos ya generados fuera de este módulo (clima no disponible, etc.) —
   * se combinan con los que produjo `adaptar()` (peor caso, sin datos). */
  avisosAdicionales: string[]
}

export function ensamblar(entrada: EntradaEnsamblar): RespuestaOptimizarSinKpis {
  const { peticion, generadoEn, hoy, resultado, salida, climaPorSolicitudId, avisosAdicionales } = entrada

  const idsAsignados = new Set(salida.asignaciones.map((a) => a.solicitudId))

  const asignaciones: AsignacionPropuesta[] = salida.asignaciones.map((a) => {
    const solicitud = resultado.solicitudesEvaluables.get(a.solicitudId)!
    const maquina = resultado.filasMaquina.find((m) => m.id === a.maquinaId)!
    const objetivosParciales = resultado.objetivosParPorClave.get(clavePar(a.solicitudId, a.maquinaId))!

    const objetivos: ObjetivosAsignacion = {
      ...objetivosParciales,
      continuidadOperador: continuidadOperador(a.maquinaId, a.operadorId, resultado.operadoresAsociadosPorMaquinaId),
    }

    return {
      solicitud,
      maquina: { id: maquina.id, codigoActivo: maquina.codigoActivo, clase: maquina.clase },
      operador: {
        id: a.operadorId,
        codTrabajador: codTrabajadorDato(a.operadorId, resultado.operadoresPorId, resultado.procedenciaOperadores),
      },
      objetivos,
      manual: completarManual(resultado, a.solicitudId),
      clima: climaPorSolicitudId.get(a.solicitudId) ?? { estado: 'no_aplica', motivo: 'clase no marcada como sensible' },
    }
  })

  const sinAsignacion: SolicitudSinAsignacion[] = []
  for (const [id, solicitud] of resultado.solicitudesEvaluables) {
    if (idsAsignados.has(id)) continue
    const candidatas = resultado.candidatasPorSolicitudId.get(id)!
    const motivoPrecomputado = resultado.motivoSinCandidatasPorSolicitudId.get(id)
    const motivo =
      motivoPrecomputado ??
      `hay ${candidatas.libresEnVentana} máquina(s) compatible(s), libre(s) y con operador disponible, pero el plan las asignó a otras solicitudes que se encima en fechas`
    sinAsignacion.push({ solicitud, motivo, candidatas, manual: completarManual(resultado, id) })
  }

  const niveles: NivelLexicografico[] = salida.niveles.map((n) => ({
    objetivo: n.objetivo,
    valor: convertirValorNivel(n.objetivo, n.valor),
    unidad: UNIDAD_POR_NIVEL[n.objetivo],
    probadoOptimo: n.probadoOptimo,
  }))

  const totalEvaluables = resultado.solicitudesEvaluables.size
  let estado: RespuestaOptimizarSinKpis['estado']
  let motivoInfactible: string | null = null
  if (totalEvaluables === 0) {
    estado = 'infactible'
    motivoInfactible = 'no hay solicitudes evaluables (PENDIENTE/APROBADA con fechas vigentes) en el sandbox'
  } else if (asignaciones.length === 0) {
    estado = 'infactible'
    const candidatas = [...resultado.candidatasPorSolicitudId.values()]
    const todasSinOperador = candidatas.length > 0 && candidatas.every((c) => c.conOperadorLibre === 0)
    motivoInfactible = todasSinOperador
      ? `ninguna de las ${totalEvaluables} solicitudes evaluables tiene un operador activo y libre disponible`
      : `ninguna de las ${totalEvaluables} solicitudes evaluables pudo asignarse`
  } else if (niveles.every((n) => n.probadoOptimo)) {
    estado = 'optimo'
  } else {
    estado = 'factible'
  }

  return {
    generadoEn,
    hoy,
    horizonte: resultado.horizonte,
    estado,
    motivoInfactible,
    pila: peticion.pila,
    clasesSensiblesLluvia: peticion.clasesSensiblesLluvia,
    niveles,
    maquinas: resultado.filasMaquina,
    asignaciones,
    sinAsignacion,
    excluidas: resultado.excluidas,
    avisos: [...resultado.avisos, ...avisosAdicionales],
  }
}
