// Ensamblado de la respuesta (S-A7 Paso 4g, reescrito en S-A10 Paso 7a).
// Puro: no conoce HTTP. Recibe la entrada adaptada y la salida del solver ya
// verificada por verificar.ts, y arma `RespuestaOptimizarSinKpis` — incluidos
// los `cambios` respecto del plan que el navegador tenía en pantalla. La UI
// solo los muestra: el diff se calcula acá, nunca en el cliente.

import type { OperadorPrismaCrudo } from '@/lib/canonico/tipos-crudos'
import type { Dato } from '@/lib/tipos/canonico'
import { clavePar, type ResultadoAdaptador } from './adaptador'
import {
  DIAS_VENTANA_HORAS,
  type AsignacionPlanAnterior,
  type AsignacionPropuesta,
  type CambioPlan,
  type LadoCambio,
  type NivelLexicografico,
  type PeticionOptimizar,
  type RespuestaOptimizarSinKpis,
  type SalidaSolver,
  type SolicitudSinAsignacion,
} from './tipos'

const UNIDAD_POR_NIVEL: Record<NivelLexicografico['objetivo'], string> = {
  cobertura: 'solicitudes',
  distancia: 'km',
  tarifa: 'USD/h',
  ratingOperador: 'pts (suma)',
  horasOperador: `h (suma, ${DIAS_VENTANA_HORAS} d)`,
  ordenLlegada: 'solicitudes cubiertas (en orden de llegada)',
}

/** Del entero del solver a la unidad de negocio. */
function convertirValorNivel(objetivo: NivelLexicografico['objetivo'], valorCrudo: number): number {
  if (objetivo === 'distancia') return valorCrudo / 1000 // metros → km
  if (objetivo === 'tarifa') return valorCrudo / 100 // centavos → USD/h
  if (objetivo === 'ratingOperador') return valorCrudo / 10 // décimas → pts
  if (objetivo === 'horasOperador') return valorCrudo / 60 // minutos → h
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

// ── Cambios respecto del plan anterior (S-A10 Paso 7a) ─────────────────────

/** Los códigos se resuelven contra ESTA lectura; si el id ya no existe, `null`. */
function ladoCambio(maquinaId: string, operadorId: string, resultado: ResultadoAdaptador): LadoCambio {
  const maquina = resultado.filasMaquina.find((m) => m.id === maquinaId)
  const operador = resultado.operadoresPorId.get(operadorId)
  return {
    maquina: { id: maquinaId, codigoActivo: maquina?.codigoActivo.valor ?? null },
    operador: { id: operadorId, codTrabajador: operador?.cod_trabajador ?? null },
  }
}

/** La primera regla que aplique, en este orden. No se inventa un motivo más
 * específico que la regla 8. */
function motivoDelCambio(
  solicitudId: string,
  antes: AsignacionPlanAnterior | null,
  ahora: LadoCambio | null,
  resultado: ResultadoAdaptador,
  sinAsignacionPorId: Map<string, SolicitudSinAsignacion>,
): string {
  if (antes !== null) {
    // 1. La máquina de antes ya no puede operar.
    const maquinaAntes = resultado.filasMaquina.find((m) => m.id === antes.maquinaId)
    if (maquinaAntes && !maquinaAntes.puedeOperar) {
      return `${maquinaAntes.codigoActivo.valor ?? 'la máquina'} ya no puede operar: ${maquinaAntes.motivoNoOpera ?? 'no puede operar'}`
    }
    // 2. El operador de antes ya no existe o no está activo.
    const operadorAntes = resultado.operadoresPorId.get(antes.operadorId)
    if (!operadorAntes || operadorAntes.is_active !== true) {
      return `el operador ${operadorAntes?.cod_trabajador ?? '(código no disponible)'} ya no está activo en Prisma`
    }
  }

  if (ahora === null) {
    // 3. Excluida.
    const excluida = resultado.excluidas.find((e) => e.solicitud.id === solicitudId)
    if (excluida) return excluida.motivo
    // 4. Sin asignación posible.
    const sinAsignacion = sinAsignacionPorId.get(solicitudId)
    if (sinAsignacion) return sinAsignacion.motivo
    // 5. Ya no es evaluable (no aparece, o es APROBADA con máquina operable).
    return 'la solicitud cambió en Prisma'
  }

  if (antes === null) {
    // 6. Entró por su máquina confirmada rota.
    const confirmada = resultado.confirmadaRotaPorSolicitudId.get(solicitudId)
    if (confirmada) return `su máquina confirmada ya no opera: ${confirmada.motivo}`
    // 7. Entró al plan.
    return 'la solicitud entró al plan'
  }

  // 8. Nada de lo anterior.
  return 'el plan se recalculó con los datos vivos del sandbox; ninguna restricción de esta asignación cambió'
}

function calcularCambios(
  planAnterior: AsignacionPlanAnterior[],
  salida: SalidaSolver,
  sinAsignacion: SolicitudSinAsignacion[],
  resultado: ResultadoAdaptador,
): CambioPlan[] {
  const anteriorPorSolicitudId = new Map(planAnterior.map((a) => [a.solicitudId, a]))
  const nuevaPorSolicitudId = new Map(salida.asignaciones.map((a) => [a.solicitudId, a]))
  const sinAsignacionPorId = new Map(sinAsignacion.map((s) => [s.solicitud.id, s]))

  const ids = new Set([...anteriorPorSolicitudId.keys(), ...nuevaPorSolicitudId.keys()])
  const cambios: CambioPlan[] = []

  for (const solicitudId of ids) {
    const anterior = anteriorPorSolicitudId.get(solicitudId) ?? null
    const nueva = nuevaPorSolicitudId.get(solicitudId) ?? null

    if (anterior && nueva && anterior.maquinaId === nueva.maquinaId && anterior.operadorId === nueva.operadorId) {
      continue
    }

    const antes = anterior ? ladoCambio(anterior.maquinaId, anterior.operadorId, resultado) : null
    const ahora = nueva ? ladoCambio(nueva.maquinaId, nueva.operadorId, resultado) : null

    cambios.push({
      solicitudId,
      codigoProyecto: resultado.codigoProyectoPorSolicitudId.get(solicitudId) ?? null,
      antes,
      ahora,
      motivo: motivoDelCambio(solicitudId, anterior, ahora, resultado, sinAsignacionPorId),
    })
  }

  return cambios
}

export type EntradaEnsamblar = {
  peticion: PeticionOptimizar
  generadoEn: string
  hoy: string
  resultado: ResultadoAdaptador
  salida: SalidaSolver
}

export function ensamblar(entrada: EntradaEnsamblar): RespuestaOptimizarSinKpis {
  const { peticion, generadoEn, hoy, resultado, salida } = entrada

  const idsAsignados = new Set(salida.asignaciones.map((a) => a.solicitudId))

  const asignaciones: AsignacionPropuesta[] = salida.asignaciones.map((a) => {
    const solicitud = resultado.solicitudesEvaluables.get(a.solicitudId)!
    const maquina = resultado.filasMaquina.find((m) => m.id === a.maquinaId)!
    const objetivosPar = resultado.objetivosParPorClave.get(clavePar(a.solicitudId, a.maquinaId))!
    const objetivosOperador = resultado.objetivosOperadorPorId.get(a.operadorId)!

    return {
      solicitud,
      maquina: { id: maquina.id, codigoActivo: maquina.codigoActivo, clase: maquina.clase },
      operador: {
        id: a.operadorId,
        codTrabajador: codTrabajadorDato(a.operadorId, resultado.operadoresPorId, resultado.procedenciaOperadores),
      },
      objetivos: { ...objetivosPar, ...objetivosOperador },
      peorOpcionValida: resultado.peorOpcionPorSolicitudId.get(a.solicitudId)!,
      reemplazaConfirmada: resultado.confirmadaRotaPorSolicitudId.get(a.solicitudId) ?? null,
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
    sinAsignacion.push({
      solicitud,
      motivo,
      candidatas,
      reemplazaConfirmada: resultado.confirmadaRotaPorSolicitudId.get(id) ?? null,
    })
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
    motivoInfactible =
      'no hay solicitudes evaluables (PENDIENTE con período vigente, o APROBADA cuya máquina confirmada ya no puede operar) en el sandbox'
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

  const cambios =
    peticion.planAnterior === null ? [] : calcularCambios(peticion.planAnterior, salida, sinAsignacion, resultado)

  return {
    generadoEn,
    hoy,
    horizonte: resultado.horizonte,
    estado,
    motivoInfactible,
    pila: peticion.pila,
    niveles,
    maquinas: resultado.filasMaquina,
    asignaciones,
    sinAsignacion,
    excluidas: resultado.excluidas,
    cambios,
    coberturaOperadores: resultado.coberturaOperadores,
    avisos: resultado.avisos,
  }
}
