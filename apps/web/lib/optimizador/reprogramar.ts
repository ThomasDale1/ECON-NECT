// Vista previa de reprogramación (pedido directo del usuario, 13 de septiembre
// de 2026). server-only: llama al solver. No escribe nada en Prisma ni en
// Startrack y no persiste nada — trabaja sobre una copia en memoria de los
// insumos ya leídos y se descarta al responder.
//
// Para cada solicitud sin asignación posible, en orden de llegada, busca la
// ventana más temprana con la MISMA cantidad de días que se pidieron, a partir
// del día siguiente a su inicio efectivo, en la que se le pueda proponer
// máquina y operador. Reglas acordadas:
// - Las solicitudes que el plan ya cubre quedan fijas: misma máquina, mismo
//   operador, mismas fechas. Un día solo se acepta si ninguna de ellas pierde
//   su asignación.
// - Las restricciones duras son las del plan normal: se vuelve a correr
//   `adaptar` (H1 clase, H2 puede operar, H3 operador) sobre las fechas nuevas,
//   el solver elige máquina y operador con la misma pila y `verificar` revisa
//   la salida. No hay una segunda implementación de las reglas.
// - Búsqueda acotada sin inventar un límite: pasado el último día con
//   ocupación real o con una propuesta fija, no queda nada con qué chocar. Si
//   la ventana que empieza el día siguiente tampoco sirve, ninguna posterior
//   va a servir.
// - Sin máquinas de la clase, o con todas sin poder operar, no se busca:
//   Prisma no registra cuándo se cierra una falla o un paro, y proponer una
//   fecha sería inventarla (AGENTS.md §1.1).

import 'server-only'
import { calcularKpisOptimizador } from '@/lib/kpi/optimizador'
import { adaptar } from './adaptador'
import { ErrorSolver, optimizarEnSolver } from './cliente'
import { ensamblar } from './ensamblar'
import { leerInsumosOptimizador, type InsumosOptimizador } from './insumos'
import { ErrorVerificacion, hoyElSalvador, planearConInsumos } from './planear'
import type {
  AsignacionPropuesta,
  EntradaSolver,
  PeticionReprogramar,
  RespuestaOptimizar,
  RespuestaReprogramacion,
  SalidaSolver,
  SolicitudNoReprogramable,
  SolicitudReprogramada,
  SolicitudSinAsignacion,
} from './tipos'
import { verificar } from './verificar'

const MS_POR_DIA = 86_400_000

function aUtc(fecha: string): number {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return Date.UTC(anio, mes - 1, dia)
}

function sumarDias(fecha: string, dias: number): string {
  return new Date(aUtc(fecha) + dias * MS_POR_DIA).toISOString().slice(0, 10)
}

function diffDias(desde: string, hasta: string): number {
  return Math.round((aUtc(hasta) - aUtc(desde)) / MS_POR_DIA)
}

function seEncima(a: { inicio: string; fin: string }, b: { inicio: string; fin: string }): boolean {
  return a.inicio <= b.fin && b.inicio <= a.fin
}

/** Una solicitud cuya asignación ya no se toca: las que el plan cubre y las
 * que esta vista previa ya reprogramó. */
type Fija = { maquinaId: string; operadorId: string; inicio: string; fin: string }

function marcaLlegada(s: SolicitudSinAsignacion): number {
  const marca = s.solicitud.creadaEn.valor ? Date.parse(s.solicitud.creadaEn.valor) : Number.NaN
  return Number.isNaN(marca) ? Number.POSITIVE_INFINITY : marca
}

async function resolverYVerificar(entrada: EntradaSolver): Promise<SalidaSolver> {
  let salida: SalidaSolver
  try {
    salida = await optimizarEnSolver(entrada)
  } catch (error) {
    if (error instanceof ErrorSolver) throw error
    throw new ErrorSolver('/optimizar', error instanceof Error ? error.message : String(error))
  }
  const violaciones = verificar(entrada, salida)
  if (violaciones.length > 0) throw new ErrorVerificacion(violaciones)
  return salida
}

/**
 * Deja en la entrada del solver solo lo que decide este intento: las fijas,
 * cada una con su única máquina y su único operador, y la solicitud que se
 * prueba, sin las máquinas ni los operadores que una fija usa en fechas que se
 * enciman. Las demás sin asignación salen del intento (se prueban en su
 * turno). `null` si a la solicitud no le queda ninguna máquina o ningún
 * operador: no hace falta llamar al solver.
 */
function entradaDelIntento(
  entrada: EntradaSolver,
  fijas: Map<string, Fija>,
  solicitudId: string,
  ventana: { inicio: string; fin: string },
): EntradaSolver | null {
  const maquinasTomadas = new Set<string>()
  const operadoresTomados = new Set<string>()
  for (const fija of fijas.values()) {
    if (!seEncima(fija, ventana)) continue
    maquinasTomadas.add(fija.maquinaId)
    operadoresTomados.add(fija.operadorId)
  }

  const pares = entrada.pares.filter((p) => {
    const fija = fijas.get(p.solicitudId)
    if (fija) return p.maquinaId === fija.maquinaId
    return p.solicitudId === solicitudId && !maquinasTomadas.has(p.maquinaId)
  })

  const operadoresPorSolicitud = entrada.operadoresPorSolicitud.flatMap((o) => {
    const fija = fijas.get(o.solicitudId)
    if (fija) return o.operadorIds.includes(fija.operadorId) ? [{ ...o, operadorIds: [fija.operadorId] }] : []
    if (o.solicitudId !== solicitudId) return []
    return [{ ...o, operadorIds: o.operadorIds.filter((id) => !operadoresTomados.has(id)) }]
  })

  for (const [id, fija] of fijas) {
    const conPar = pares.some((p) => p.solicitudId === id && p.maquinaId === fija.maquinaId)
    const conOperador = operadoresPorSolicitud.some((o) => o.solicitudId === id && o.operadorIds.length > 0)
    if (!conPar || !conOperador) {
      // Las fechas y las reglas de una fija no cambian entre intentos: si su
      // par desaparece, el error es de este módulo, no de los datos.
      throw new Error(`reprogramación: la asignación fija de la solicitud ${id} ya no es válida en la entrada del solver`)
    }
  }

  const tienePar = pares.some((p) => p.solicitudId === solicitudId)
  const tieneOperador = operadoresPorSolicitud.some((o) => o.solicitudId === solicitudId && o.operadorIds.length > 0)
  if (!tienePar || !tieneOperador) return null

  const ids = new Set([...fijas.keys(), solicitudId])
  return {
    ...entrada,
    solicitudes: entrada.solicitudes.filter((s) => ids.has(s.id)),
    pares,
    operadoresPorSolicitud,
  }
}

/** Las fechas propuestas no son un dato de Prisma: el valor es el propuesto,
 * pero el linaje conserva el valor crudo que Prisma devolvió. */
function conLinajeOriginal(
  asignaciones: AsignacionPropuesta[],
  originales: Map<string, { inicio: string; fin: string }>,
): AsignacionPropuesta[] {
  return asignaciones.map((a) => {
    const original = originales.get(a.solicitud.id)
    if (!original) return a
    const { inicio, fin } = a.solicitud
    return {
      ...a,
      solicitud: {
        ...a.solicitud,
        inicio: { ...inicio, linaje: { ...inicio.linaje, valorCrudo: original.inicio } },
        fin: { ...fin, linaje: { ...fin.linaje, valorCrudo: original.fin } },
      },
    }
  })
}

export async function reprogramarConInsumos(
  insumos: InsumosOptimizador,
  peticion: PeticionReprogramar,
  hoy: string,
  generadoEn: string = new Date().toISOString(),
): Promise<RespuestaReprogramacion> {
  const peticionPlan = { pila: peticion.pila, planAnterior: null }
  const base = await planearConInsumos(insumos, peticionPlan, hoy, generadoEn)

  // Copia de trabajo: se le cambian las fechas a las solicitudes que se
  // prueban. Los insumos leídos no se tocan.
  const trabajo: InsumosOptimizador = structuredClone(insumos)
  const crudaPorId = new Map(trabajo.datos.solicitudes.datos.map((s) => [String(s.id), s]))

  const fijas = new Map<string, Fija>()
  for (const a of base.asignaciones) {
    fijas.set(a.solicitud.id, {
      maquinaId: a.maquina.id,
      operadorId: a.operador.id,
      inicio: a.solicitud.inicioEfectivo,
      fin: a.solicitud.fin.valor!,
    })
  }

  const reprogramadas: SolicitudReprogramada[] = []
  const noReprogramables: SolicitudNoReprogramable[] = []
  const originales = new Map<string, { inicio: string; fin: string }>()
  let ultimoAceptado: { resultado: ReturnType<typeof adaptar>; salida: SalidaSolver } | null = null
  let llamadasSolver = 0
  let ultimoDiaOcupado = base.horizonte.hasta

  const pendientes = [...base.sinAsignacion].sort((a, b) => marcaLlegada(a) - marcaLlegada(b))

  for (const s of pendientes) {
    const id = s.solicitud.id
    const clase = s.solicitud.clase.valor ?? '(sin clase)'
    const resumen = {
      solicitudId: id,
      codigoProyecto: s.solicitud.codigoProyecto ?? s.solicitud.proyecto.valor,
      clase: s.solicitud.clase.valor,
      eraAprobada: s.reemplazaConfirmada !== null,
    }

    if (s.candidatas.claseCompatible === 0) {
      noReprogramables.push({
        ...resumen,
        motivo: `no hay máquinas de clase ${clase} en la flota: cambiar las fechas no lo resuelve`,
      })
      continue
    }
    if (s.candidatas.operables === 0) {
      noReprogramables.push({
        ...resumen,
        motivo: `las ${s.candidatas.claseCompatible} máquina(s) de clase ${clase} no pueden operar (OBSOLETA, paro o falla activa) y Prisma no registra cuándo se cierra una falla: no hay una fecha que se pueda proponer`,
      })
      continue
    }

    const cruda = crudaPorId.get(id)
    if (!cruda?.fecha_inicio || !cruda.fecha_fin) {
      noReprogramables.push({ ...resumen, motivo: 'falta fecha_inicio o fecha_fin en Prisma' })
      continue
    }

    const original = { inicio: cruda.fecha_inicio, fin: cruda.fecha_fin }
    const dias = diffDias(original.inicio, original.fin) + 1
    const ultimoInicio = sumarDias(ultimoDiaOcupado, 1)
    let aceptada = false

    for (let inicio = sumarDias(s.solicitud.inicioEfectivo, 1); inicio <= ultimoInicio; inicio = sumarDias(inicio, 1)) {
      const ventana = { inicio, fin: sumarDias(inicio, dias - 1) }
      cruda.fecha_inicio = ventana.inicio
      cruda.fecha_fin = ventana.fin

      const resultado = adaptar(trabajo, peticionPlan, hoy)
      if ((resultado.candidatasPorSolicitudId.get(id)?.conOperadorLibre ?? 0) === 0) continue

      const entrada = entradaDelIntento(resultado.entradaSolver, fijas, id, ventana)
      if (entrada === null) continue

      llamadasSolver++
      const salida = await resolverYVerificar(entrada)
      const asignacion = salida.asignaciones.find((a) => a.solicitudId === id)
      const fijasSiguenCubiertas = [...fijas.keys()].every((fijaId) =>
        salida.asignaciones.some((a) => a.solicitudId === fijaId),
      )
      if (!asignacion || !fijasSiguenCubiertas) continue

      fijas.set(id, { maquinaId: asignacion.maquinaId, operadorId: asignacion.operadorId, ...ventana })
      originales.set(id, original)
      ultimoAceptado = { resultado, salida }
      if (ventana.fin > ultimoDiaOcupado) ultimoDiaOcupado = ventana.fin

      reprogramadas.push({
        ...resumen,
        original,
        propuesta: ventana,
        dias,
        atrasoDias: diffDias(original.inicio, ventana.inicio),
        maquina: {
          id: asignacion.maquinaId,
          codigoActivo: resultado.filasMaquina.find((m) => m.id === asignacion.maquinaId)?.codigoActivo.valor ?? null,
        },
        operador: {
          id: asignacion.operadorId,
          codTrabajador: resultado.operadoresPorId.get(asignacion.operadorId)?.cod_trabajador ?? null,
        },
      })
      aceptada = true
      break
    }

    if (!aceptada) {
      cruda.fecha_inicio = original.inicio
      cruda.fecha_fin = original.fin
      noReprogramables.push({
        ...resumen,
        motivo: `ninguna ventana de ${dias} día(s) entre ${sumarDias(s.solicitud.inicioEfectivo, 1)} y ${ultimoInicio} tiene máquina y operador libres sin quitarle la asignación a una solicitud ya cubierta`,
      })
    }
  }

  let plan: RespuestaOptimizar = base
  if (ultimoAceptado !== null) {
    const sinKpis = ensamblar({
      peticion: peticionPlan,
      generadoEn,
      hoy,
      resultado: ultimoAceptado.resultado,
      salida: ultimoAceptado.salida,
    })
    const conOrigen = { ...sinKpis, asignaciones: conLinajeOriginal(sinKpis.asignaciones, originales) }
    plan = { ...conOrigen, kpis: calcularKpisOptimizador(conOrigen), kpisPendientesMotivo: null }
  }

  return { generadoEn, plan, reprogramadas, noReprogramables, llamadasSolver }
}

export async function reprogramar(peticion: PeticionReprogramar): Promise<RespuestaReprogramacion> {
  const hoy = hoyElSalvador()
  const generadoEn = new Date().toISOString()
  const insumos = await leerInsumosOptimizador(hoy)
  return reprogramarConInsumos(insumos, peticion, hoy, generadoEn)
}
