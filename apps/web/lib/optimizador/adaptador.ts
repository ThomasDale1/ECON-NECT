// El adaptador del optimizador (S-A7 Paso 4d, reescrito en S-A10 Paso 5b).
// Puro: sin HTTP, sin `Date.now()` implícito — recibe `hoy` como parámetro
// para poder probarlo. Traduce los insumos leídos en vivo a `EntradaSolver`
// (hard constraints ya prefiltradas, solo ids y enteros) y deja, para que
// `ensamblar.ts` los use, los objetivos de cada par candidato y de cada
// operador candidato, y la peor opción válida de cada solicitud.
//
// Las hard constraints que dependen de datos (H1 clase, H2 disponibilidad
// real de la máquina, H3 disponibilidad del operador) se evalúan acá, nunca
// en Python.

import { CATALOGO_CLASE_EQUIPO } from '@/lib/canonico/catalogos'
import { crearLinaje, puedeOperar } from '@/lib/canonico/estados'
import {
  extraerCodigoProyecto,
  geocercaPorCodigoProyecto,
  idsIguales,
  resolverConductoresDeOperadores,
} from '@/lib/canonico/identidad'
import { reconciliar } from '@/lib/canonico/reconciliacion'
import type {
  EquipoPrismaCrudo,
  OperadorPrismaCrudo,
  ProcedenciaFuente,
  SolicitudPrismaCruda,
} from '@/lib/canonico/tipos-crudos'
import type { Dato, Linaje, Ubicacion } from '@/lib/tipos/canonico'
import type { DetalleEquipoConProcedencia, InsumosOptimizador } from './insumos'
import {
  DIAS_VENTANA_HORAS,
  type CoberturaOperadores,
  type ConfirmadaRota,
  type ConteoCandidatas,
  type DestinoGeografico,
  type EntradaSolver,
  type FilaMaquina,
  type IdSoftConstraint,
  type ObjetivosAsignacion,
  type PeorOpcionValida,
  type PeticionOptimizar,
  type SolicitudExcluida,
  type SolicitudPlan,
  type ValorObjetivo,
} from './tipos'

function esClaseDeCatalogo(clase: string | null): boolean {
  return clase != null && (CATALOGO_CLASE_EQUIPO as readonly string[]).includes(clase)
}

const TIEMPO_LIMITE_POR_NIVEL_S = 5

// ── Utilidades de fecha (AAAA-MM-DD, sin hora — granularidad día) ─────────

function parsearFechaUTC(fecha: string): number {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return Date.UTC(anio, mes - 1, dia)
}

function diffDias(desde: string, hasta: string): number {
  return Math.round((parsearFechaUTC(hasta) - parsearFechaUTC(desde)) / 86_400_000)
}

function maxFecha(a: string, b: string): string {
  return parsearFechaUTC(a) >= parsearFechaUTC(b) ? a : b
}

function seEncima(inicioA: string, finA: string, inicioB: string, finB: string): boolean {
  return inicioA <= finB && inicioB <= finA
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function dato<T>(valor: T | null, procedencia: ProcedenciaFuente, campo: string): Dato<T> {
  return { valor, linaje: crearLinaje(procedencia, campo, valor) }
}

/** Por qué un equipo no puede operar, con las mismas tres condiciones que
 * `puedeOperar` (01 E.2). `null` si puede operar. */
export function motivoNoOperar(equipo: EquipoPrismaCrudo): string | null {
  if (equipo.estado === 'OBSOLETA') return 'el equipo está en estado OBSOLETA'
  if (equipo.active_failure_is_paro === true) return 'el equipo tiene una bandera de paro activa'
  if (
    equipo.active_failure_status &&
    equipo.active_failure_status !== 'FINALIZADO' &&
    equipo.active_failure_status !== 'RECHAZADO'
  ) {
    return `el equipo tiene una falla activa en estado ${equipo.active_failure_status}`
  }
  return null
}

// ── Peor caso declarado ────────────────────────────────────────────────────

type ObjetivoCrudo = { valor: number | null; motivo: string | null; linaje: Linaje[] }

/** Qué extremo es "peor" para un objetivo: el máximo para lo que se minimiza
 * (distancia, tarifa, horas) y el mínimo para lo que se maximiza (rating). */
type PeorEs = 'maximo' | 'minimo'

/** Sustituye cada `null` por el peor valor observado entre los candidatos de
 * esta corrida, y lo declara (`peorCasoAplicado` + motivo). Si nadie tiene
 * dato, 0 y un aviso: el objetivo no discrimina. El motivo de un valor real se
 * conserva (p. ej. "0 h — sin actividad registrada"). */
function sustituirPeorCaso(
  crudos: Map<string, ObjetivoCrudo>,
  unidad: ValorObjetivo['unidad'],
  nombreObjetivo: IdSoftConstraint,
  peorEs: PeorEs,
  avisos: string[],
): Map<string, ValorObjetivo> {
  let peor: number | null = null
  for (const crudo of crudos.values()) {
    if (crudo.valor == null) continue
    peor = peor == null ? crudo.valor : peorEs === 'maximo' ? Math.max(peor, crudo.valor) : Math.min(peor, crudo.valor)
  }

  if (peor == null && crudos.size > 0) {
    avisos.push(`objetivo ${nombreObjetivo} sin datos en ningún candidato: no discrimina`)
  }
  const valorPeorCaso = peor ?? 0

  const resultado = new Map<string, ValorObjetivo>()
  for (const [clave, crudo] of crudos) {
    resultado.set(
      clave,
      crudo.valor != null
        ? { valor: crudo.valor, peorCasoAplicado: false, motivo: crudo.motivo, unidad, linaje: crudo.linaje }
        : { valor: valorPeorCaso, peorCasoAplicado: true, motivo: crudo.motivo, unidad, linaje: crudo.linaje },
    )
  }
  return resultado
}

/** La peor opción válida entre candidatas, solo con valores reales: nunca un
 * peor caso sustituido (S-A10 Paso 5b.5). */
function peorEntreReales(valores: ValorObjetivo[], peorEs: PeorEs): PeorOpcionValida {
  const reales = valores.filter((v) => !v.peorCasoAplicado && v.valor !== null).map((v) => v.valor as number)
  return {
    valor: reales.length === 0 ? null : peorEs === 'maximo' ? Math.max(...reales) : Math.min(...reales),
    candidatasValidas: valores.length,
    candidatasConDato: reales.length,
  }
}

// ── Tipos de salida propios de este módulo ─────────────────────────────────

/** `distancia`/`tarifa` de un par (solicitud, máquina). */
export type ObjetivosPar = Pick<ObjetivosAsignacion, 'distancia' | 'tarifa'>

/** `ratingOperador`/`horasOperador` de un operador candidato. */
export type ObjetivosOperador = Pick<ObjetivosAsignacion, 'ratingOperador' | 'horasOperador'>

export type ResultadoAdaptador = {
  entradaSolver: EntradaSolver
  /** Todas las filas de máquina, incluidas las no operables y las de clase
   * fuera de catálogo. */
  filasMaquina: FilaMaquina[]
  /** Solo las solicitudes evaluables (no excluidas), por id. */
  solicitudesEvaluables: Map<string, SolicitudPlan>
  candidatasPorSolicitudId: Map<string, ConteoCandidatas>
  /** Presente solo cuando algún conteo de `candidatasPorSolicitudId` dio 0. */
  motivoSinCandidatasPorSolicitudId: Map<string, string>
  /** Objetivos de cada par candidato (H1 ∧ H2), clave `${solicitudId}::${maquinaId}`. */
  objetivosParPorClave: Map<string, ObjetivosPar>
  /** Rating y horas de cada operador candidato (la unión de
   * `operadoresPorSolicitud`), con el peor caso ya declarado. */
  objetivosOperadorPorId: Map<string, ObjetivosOperador>
  /** La peor opción válida de cada solicitud evaluable, por objetivo. */
  peorOpcionPorSolicitudId: Map<string, Record<IdSoftConstraint, PeorOpcionValida>>
  /** Las APROBADA que volvieron a la demanda porque su máquina confirmada ya
   * no puede operar. */
  confirmadaRotaPorSolicitudId: Map<string, ConfirmadaRota>
  /** Código PROY-### de TODAS las solicitudes leídas, para nombrar un cambio
   * aunque la solicitud ya no sea evaluable. */
  codigoProyectoPorSolicitudId: Map<string, string | null>
  excluidas: SolicitudExcluida[]
  avisos: string[]
  horizonte: { desde: string; hasta: string }
  /** Todos los operadores de Prisma, para `operador.codTrabajador` y para
   * los cambios, sin releer los insumos. */
  operadoresPorId: Map<string, OperadorPrismaCrudo>
  procedenciaOperadores: ProcedenciaFuente
  coberturaOperadores: CoberturaOperadores
}

export function clavePar(solicitudId: string, maquinaId: string): string {
  return `${solicitudId}::${maquinaId}`
}

export function adaptar(insumos: InsumosOptimizador, peticion: PeticionOptimizar, hoy: string): ResultadoAdaptador {
  const { datos, operadores, detallesPorEquipoId, conductores, reporteConductores, ventanaHoras } = insumos
  const procEquipos: ProcedenciaFuente = datos.equipos
  const procSolicitudes: ProcedenciaFuente = datos.solicitudes
  const procGeocercas: ProcedenciaFuente = datos.geocercas

  // 1. Ubicación en cascada (con linaje), vía el motor de reconciliación —
  // no se reimplementa.
  const equiposUnificados = reconciliar(datos)
  const ubicacionPorEquipoId = new Map<string, Ubicacion | null>()
  for (const eq of equiposUnificados) ubicacionPorEquipoId.set(eq.id, eq.ubicacion)

  const equipoPorId = new Map<string, EquipoPrismaCrudo>()
  for (const equipo of datos.equipos.datos) equipoPorId.set(String(equipo.id), equipo)

  const detallePorEquipoId = new Map<string, DetalleEquipoConProcedencia>()
  for (const [id, detalle] of Object.entries(detallesPorEquipoId)) detallePorEquipoId.set(id, detalle)

  // Dueño de la ocupación real de cada equipo: la solicitud APROBADA cuyo
  // maquinaria_id/project_id apuntan a él.
  const duenoOcupacionPorEquipoId = new Map<string, string>()
  for (const s of datos.solicitudes.datos) {
    if ((s.status ?? '').toUpperCase() !== 'APROBADA') continue
    if (s.maquinaria_id == null) continue
    const equipo = [...equipoPorId.values()].find(
      (e) => idsIguales(e.id, s.maquinaria_id) && idsIguales(e.project_id, s.project_id),
    )
    if (equipo) duenoOcupacionPorEquipoId.set(String(equipo.id), String(s.id))
  }

  function tieneOcupacionReal(equipo: EquipoPrismaCrudo): boolean {
    return equipo.fecha_inicio_uso != null && equipo.fecha_fin_uso != null
  }

  function esPropiaDe(equipo: EquipoPrismaCrudo, solicitudId: string): boolean {
    return duenoOcupacionPorEquipoId.get(String(equipo.id)) === solicitudId
  }

  // ── 2. Solicitudes: exclusión y SolicitudPlan ─────────────────────────────
  const excluidas: SolicitudExcluida[] = []
  const solicitudesEvaluables = new Map<string, SolicitudPlan>()
  const confirmadaRotaPorSolicitudId = new Map<string, ConfirmadaRota>()
  const codigoProyectoPorSolicitudId = new Map<string, string | null>()

  function resolverDestino(nombreProyecto: string | null): DestinoGeografico | null {
    const geocerca = geocercaPorCodigoProyecto(nombreProyecto, datos.geocercas.datos)
    if (!geocerca || geocerca.y == null || geocerca.x == null) return null
    return {
      lat: dato(geocerca.y, procGeocercas, 'y'),
      lon: dato(geocerca.x, procGeocercas, 'x'),
    }
  }

  function construirSolicitudPlan(s: SolicitudPrismaCruda, inicioEfectivo: string): SolicitudPlan {
    return {
      id: String(s.id),
      estado: dato(s.status, procSolicitudes, 'status'),
      clase: dato(s.tipo, procSolicitudes, 'tipo'),
      proyecto: dato(s.project_name, procSolicitudes, 'project_name'),
      codigoProyecto: extraerCodigoProyecto(s.project_name),
      inicio: dato(s.fecha_inicio, procSolicitudes, 'fecha_inicio'),
      fin: dato(s.fecha_fin, procSolicitudes, 'fecha_fin'),
      inicioEfectivo,
      creadaEn: dato(s.created_at, procSolicitudes, 'created_at'),
      destino: resolverDestino(s.project_name),
    }
  }

  for (const s of datos.solicitudes.datos) {
    const id = String(s.id)
    codigoProyectoPorSolicitudId.set(id, extraerCodigoProyecto(s.project_name))
    const status = (s.status ?? '').toUpperCase()

    if (status === 'APROBADA') {
      // Decisión del 13 de septiembre de 2026: una APROBADA es una decisión
      // humana y el optimizador no la toca. Excepción acotada (S-A10 Paso
      // 5b.2): vuelve a la demanda SOLO si su máquina confirmada ya no puede
      // operar, para proponer un reemplazo. La asignación en Prisma no se
      // modifica. Si no se cumplen todas las condiciones, no entra a
      // `excluidas`: no es un hueco, su ocupación ya se ve en el Gantt.
      if (s.maquinaria_id == null) continue
      const equipoConfirmado = datos.equipos.datos.find((e) => idsIguales(e.id, s.maquinaria_id))
      if (!equipoConfirmado) continue
      if (puedeOperar(equipoConfirmado)) continue
      if (!s.fecha_inicio || !s.fecha_fin) continue
      if (s.fecha_fin < hoy) continue

      solicitudesEvaluables.set(id, construirSolicitudPlan(s, maxFecha(hoy, s.fecha_inicio)))
      confirmadaRotaPorSolicitudId.set(id, {
        maquina: {
          id: String(equipoConfirmado.id),
          codigoActivo: dato(equipoConfirmado.no_activo, procEquipos, 'no_activo'),
        },
        motivo: motivoNoOperar(equipoConfirmado) ?? 'la máquina confirmada no puede operar',
      })
      continue
    }

    if (status !== 'PENDIENTE') {
      excluidas.push({
        solicitud: construirSolicitudPlan(s, s.fecha_inicio ?? hoy),
        motivo: `estado ${s.status ?? '(sin estado)'} no es PENDIENTE`,
      })
      continue
    }
    if (!s.fecha_inicio || !s.fecha_fin) {
      excluidas.push({
        solicitud: construirSolicitudPlan(s, s.fecha_inicio ?? hoy),
        motivo: 'falta fecha_inicio o fecha_fin',
      })
      continue
    }
    if (s.fecha_fin < hoy) {
      excluidas.push({
        solicitud: construirSolicitudPlan(s, s.fecha_inicio),
        motivo: 'el período ya terminó',
      })
      continue
    }

    const inicioEfectivo = maxFecha(hoy, s.fecha_inicio)
    solicitudesEvaluables.set(id, construirSolicitudPlan(s, inicioEfectivo))
  }

  // ── Máquinas: FilaMaquina completa ────────────────────────────────────────
  const filasMaquina: FilaMaquina[] = []
  for (const equipo of datos.equipos.datos) {
    const id = String(equipo.id)
    filasMaquina.push({
      id,
      codigoActivo: dato(equipo.no_activo, procEquipos, 'no_activo'),
      clase: dato(equipo.clase_equipo, procEquipos, 'clase_equipo'),
      claseEnCatalogo: esClaseDeCatalogo(equipo.clase_equipo),
      estado: dato(equipo.estado, procEquipos, 'estado'),
      puedeOperar: puedeOperar(equipo),
      motivoNoOpera: motivoNoOperar(equipo),
      ocupacionReal: tieneOcupacionReal(equipo)
        ? [
            {
              inicio: dato(equipo.fecha_inicio_uso, procEquipos, 'fecha_inicio_uso'),
              fin: dato(equipo.fecha_fin_uso, procEquipos, 'fecha_fin_uso'),
              esDeSolicitudId: duenoOcupacionPorEquipoId.get(id) ?? null,
              proyecto: dato(equipo.project_name, procEquipos, 'project_name'),
              codigoProyecto: extraerCodigoProyecto(equipo.project_name),
            },
          ]
        : [],
    })
  }

  // ── H1/H2/H3 y conteo de candidatas por solicitud ─────────────────────────
  const candidatasPorSolicitudId = new Map<string, ConteoCandidatas>()
  const motivoSinCandidatasPorSolicitudId = new Map<string, string>()
  const paresPorSolicitud = new Map<string, EquipoPrismaCrudo[]>()
  const operadoresLibresPorSolicitud = new Map<string, OperadorPrismaCrudo[]>()

  // `associated_operators` del detalle de equipo sigue sirviendo para H3: un
  // operador asociado a una máquina ocupada no está libre en esa ventana.
  function operadoresLibresPara(s: SolicitudPlan): OperadorPrismaCrudo[] {
    return operadores.datos.filter((op) => {
      if (op.is_active !== true) return false
      for (const equipo of equipoPorId.values()) {
        if (!tieneOcupacionReal(equipo)) continue
        if (esPropiaDe(equipo, s.id)) continue
        const detalle = detallePorEquipoId.get(String(equipo.id))
        const asociados = detalle?.datos.associated_operators ?? []
        const estaAsociado = asociados.some((a) => idsIguales(a.id, op.id))
        if (!estaAsociado) continue
        if (seEncima(equipo.fecha_inicio_uso!, equipo.fecha_fin_uso!, s.inicioEfectivo, s.fin.valor!)) {
          return false
        }
      }
      return true
    })
  }

  for (const s of solicitudesEvaluables.values()) {
    let claseCompatible = 0
    let operables = 0
    let libresEnVentana = 0
    const candidatasLibres: EquipoPrismaCrudo[] = []

    for (const equipo of datos.equipos.datos) {
      const h1 = esClaseDeCatalogo(equipo.clase_equipo) && equipo.clase_equipo === s.clase.valor
      if (!h1) continue
      claseCompatible++

      // Una APROBADA rota queda fuera de su propia máquina acá, por H2, sin
      // código especial.
      const opera = puedeOperar(equipo)
      if (!opera) continue
      operables++

      const libreEnVentana =
        !tieneOcupacionReal(equipo) ||
        esPropiaDe(equipo, s.id) ||
        !seEncima(equipo.fecha_inicio_uso!, equipo.fecha_fin_uso!, s.inicioEfectivo, s.fin.valor!)
      if (!libreEnVentana) continue
      libresEnVentana++
      candidatasLibres.push(equipo)
    }

    const operadoresLibres = operadoresLibresPara(s)
    operadoresLibresPorSolicitud.set(s.id, operadoresLibres)
    const conOperadorLibre = operadoresLibres.length > 0 ? libresEnVentana : 0

    const candidatas: ConteoCandidatas = { claseCompatible, operables, libresEnVentana, conOperadorLibre }
    candidatasPorSolicitudId.set(s.id, candidatas)
    paresPorSolicitud.set(s.id, candidatasLibres)

    const clase = s.clase.valor ?? '(sin clase)'
    if (claseCompatible === 0) {
      motivoSinCandidatasPorSolicitudId.set(s.id, `0 máquinas de clase ${clase} en la flota`)
    } else if (operables === 0) {
      motivoSinCandidatasPorSolicitudId.set(
        s.id,
        `0 máquinas de clase ${clase} operables (las ${claseCompatible} compatibles están OBSOLETA, con paro o con falla activa)`,
      )
    } else if (libresEnVentana === 0) {
      motivoSinCandidatasPorSolicitudId.set(
        s.id,
        `0 máquinas de clase ${clase} operables y libres entre ${s.inicioEfectivo} y ${s.fin.valor}`,
      )
    } else if (conOperadorLibre === 0) {
      motivoSinCandidatasPorSolicitudId.set(
        s.id,
        `0 operadores activos y libres entre ${s.inicioEfectivo} y ${s.fin.valor} para las ${libresEnVentana} máquinas de clase ${clase} disponibles`,
      )
    }
  }

  // ── Objetivos por par (distancia, tarifa) ─────────────────────────────────
  function calcularDistancia(s: SolicitudPlan, equipo: EquipoPrismaCrudo): ObjetivoCrudo {
    const ubicacion = ubicacionPorEquipoId.get(String(equipo.id)) ?? null
    const origenOk = ubicacion != null && ubicacion.lat.valor != null && ubicacion.lon.valor != null
    const destino = geocercaPorCodigoProyecto(s.proyecto.valor, datos.geocercas.datos)
    const destinoOk = destino != null && destino.y != null && destino.x != null

    if (!origenOk && !destinoOk) {
      return {
        valor: null,
        motivo: 'sin origen (el equipo no resolvió ubicación) y sin destino (la solicitud no resuelve geocerca de proyecto)',
        linaje: [],
      }
    }
    if (!origenOk) {
      return {
        valor: null,
        motivo: 'sin origen: el equipo no resolvió ubicación en ningún nivel de la cascada',
        linaje: destinoOk ? [crearLinaje(procGeocercas, 'y', destino!.y), crearLinaje(procGeocercas, 'x', destino!.x)] : [],
      }
    }
    if (!destinoOk) {
      return {
        valor: null,
        motivo: `sin destino: la solicitud no resuelve geocerca de proyecto (origen resuelto en nivel ${ubicacion!.nivel})`,
        linaje: [ubicacion!.lat.linaje, ubicacion!.lon.linaje],
      }
    }
    const km = haversineKm(ubicacion!.lat.valor!, ubicacion!.lon.valor!, destino!.y!, destino!.x!)
    return {
      valor: km,
      motivo: null,
      linaje: [
        ubicacion!.lat.linaje,
        ubicacion!.lon.linaje,
        crearLinaje(procGeocercas, 'y', destino!.y),
        crearLinaje(procGeocercas, 'x', destino!.x),
      ],
    }
  }

  function calcularTarifa(equipo: EquipoPrismaCrudo): ObjetivoCrudo {
    const detalle = detallePorEquipoId.get(String(equipo.id))
    if (!detalle || detalle.datos.effective_precio_x_hora == null) {
      return { valor: null, motivo: 'el detalle del equipo no expone effective_precio_x_hora', linaje: [] }
    }
    return {
      valor: detalle.datos.effective_precio_x_hora,
      motivo: null,
      linaje: [crearLinaje(detalle.procedencia, 'effective_precio_x_hora', detalle.datos.effective_precio_x_hora)],
    }
  }

  // La sustitución de peor caso corre sobre el conjunto completo de pares
  // candidatos de esta corrida, no por solicitud.
  const distanciaCrudaPorClave = new Map<string, ObjetivoCrudo>()
  const tarifaCrudaPorClave = new Map<string, ObjetivoCrudo>()
  for (const [solicitudId, candidatas] of paresPorSolicitud) {
    const s = solicitudesEvaluables.get(solicitudId)!
    for (const equipo of candidatas) {
      const clave = clavePar(solicitudId, String(equipo.id))
      distanciaCrudaPorClave.set(clave, calcularDistancia(s, equipo))
      tarifaCrudaPorClave.set(clave, calcularTarifa(equipo))
    }
  }

  const avisos: string[] = []
  const distanciaPares = sustituirPeorCaso(distanciaCrudaPorClave, 'km', 'distancia', 'maximo', avisos)
  const tarifaPares = sustituirPeorCaso(tarifaCrudaPorClave, 'USD/h', 'tarifa', 'maximo', avisos)

  const objetivosParPorClave = new Map<string, ObjetivosPar>()
  for (const clave of distanciaPares.keys()) {
    objetivosParPorClave.set(clave, { distancia: distanciaPares.get(clave)!, tarifa: tarifaPares.get(clave)! })
  }

  // ── Rating y horas por operador (S-A10 Paso 5b.3) ─────────────────────────
  // Unión operador ↔ conductor por código exacto y 1:1 (Paso 3). Ningún
  // nombre entra acá: el conector ya solo entrega `{ id, prefijoFn }`.
  const { conductorPorOperadorId, conflictos } = resolverConductoresDeOperadores(operadores.datos, conductores.datos)
  const prefijoPorConductorId = new Map(conductores.datos.map((c) => [c.id, c.prefijoFn]))
  const codigosDeConductores = new Set(
    conductores.datos.map((c) => c.prefijoFn?.trim()).filter((codigo): codigo is string => !!codigo),
  )
  const procReporte = reporteConductores.procedencia
  const CAMPO_UNION = 'fn (código antes de " - ")'

  const calificacionesPorConductorId = new Map<string, (number | null)[]>()
  for (const fila of reporteConductores.datos.scores) {
    const lista = calificacionesPorConductorId.get(fila.driver_id) ?? []
    lista.push(fila.safety_score)
    calificacionesPorConductorId.set(fila.driver_id, lista)
  }

  const minutosPorConductorId = new Map<string, (number | null)[]>()
  for (const fila of reporteConductores.datos.detail) {
    const fecha = fila.date?.slice(0, 10)
    if (!fecha || fecha < ventanaHoras.desde || fecha > ventanaHoras.hasta) continue
    const lista = minutosPorConductorId.get(fila.driver_id) ?? []
    lista.push(fila.ignOnTime)
    minutosPorConductorId.set(fila.driver_id, lista)
  }

  function codigoCoincideConAlgunConductor(op: OperadorPrismaCrudo): boolean {
    const codigo = op.cod_trabajador?.trim()
    return !!codigo && codigosDeConductores.has(codigo)
  }

  function motivoSinConductor(op: OperadorPrismaCrudo): string {
    // El código existe del lado de Startrack pero no se unió: fue ambiguo.
    if (codigoCoincideConAlgunConductor(op)) {
      return 'el código del operador coincide con más de un conductor de Startrack o de un operador de Prisma: no se unió'
    }
    return 'el operador no tiene un conductor de Startrack con el mismo código'
  }

  function linajeUnion(conductorId: string): Linaje {
    // valorCrudo = solo el código: nunca `fn` entero (trae el nombre).
    return crearLinaje(conductores, CAMPO_UNION, prefijoPorConductorId.get(conductorId) ?? null)
  }

  function calcularRating(op: OperadorPrismaCrudo): ObjetivoCrudo {
    const conductorId = conductorPorOperadorId.get(String(op.id))
    if (conductorId === undefined) return { valor: null, motivo: motivoSinConductor(op), linaje: [] }

    const union = linajeUnion(conductorId)
    const calificaciones = calificacionesPorConductorId.get(conductorId) ?? []
    if (calificaciones.length === 0) {
      return {
        valor: null,
        motivo: 'el conductor unido por código no tiene calificación en el reporte de conductores de Startrack',
        linaje: [union],
      }
    }
    if (calificaciones.length > 1) {
      // No se promedia: dos calificaciones para un mismo conductor no dicen
      // cuál vale.
      return {
        valor: null,
        motivo: 'más de una calificación para el conductor',
        linaje: [crearLinaje(procReporte, 'scores[].safety_score', calificaciones), union],
      }
    }
    const [calificacion] = calificaciones
    const linaje = [crearLinaje(procReporte, 'scores[].safety_score', calificacion), union]
    if (calificacion === null) {
      return { valor: null, motivo: 'la calificación del conductor viene sin safety_score', linaje }
    }
    return { valor: calificacion, motivo: null, linaje }
  }

  let filasSinIgnOnTime = 0

  function calcularHoras(op: OperadorPrismaCrudo): ObjetivoCrudo {
    const conductorId = conductorPorOperadorId.get(String(op.id))
    if (conductorId === undefined) return { valor: null, motivo: motivoSinConductor(op), linaje: [] }

    const minutos = minutosPorConductorId.get(conductorId) ?? []
    const linaje = [crearLinaje(procReporte, 'detail[].ignOnTime', minutos), linajeUnion(conductorId)]
    if (minutos.length === 0) {
      // Unido y sin filas en la ventana: 0 h reales, no peor caso.
      return {
        valor: 0,
        motivo: `sin actividad registrada en Startrack en los últimos ${DIAS_VENTANA_HORAS} días`,
        linaje,
      }
    }

    const conDato = minutos.filter((m): m is number => m !== null)
    filasSinIgnOnTime += minutos.length - conDato.length
    if (conDato.length === 0) {
      // Tiene actividad, pero ninguna fila trae ignOnTime: un null no se
      // convierte en 0.
      return { valor: null, motivo: 'las filas de actividad del conductor en la ventana vienen sin ignOnTime', linaje }
    }
    // ignOnTime en minutos (unidad inferida: todos los valores observados ≤ 1440).
    return { valor: conDato.reduce((suma, m) => suma + m, 0) / 60, motivo: null, linaje }
  }

  const ratingCrudoPorOperadorId = new Map<string, ObjetivoCrudo>()
  const horasCrudasPorOperadorId = new Map<string, ObjetivoCrudo>()
  for (const op of operadores.datos) {
    ratingCrudoPorOperadorId.set(String(op.id), calcularRating(op))
    horasCrudasPorOperadorId.set(String(op.id), calcularHoras(op))
  }

  // Peor caso sobre los operadores candidatos de esta corrida: la unión de
  // `operadoresPorSolicitud`.
  const operadorIdsCandidatos = new Set<string>()
  for (const ops of operadoresLibresPorSolicitud.values()) {
    for (const op of ops) operadorIdsCandidatos.add(String(op.id))
  }
  const soloCandidatos = (crudos: Map<string, ObjetivoCrudo>) =>
    new Map([...operadorIdsCandidatos].map((id) => [id, crudos.get(id)!]))

  const ratingOperadores = sustituirPeorCaso(
    soloCandidatos(ratingCrudoPorOperadorId),
    'pts',
    'ratingOperador',
    'minimo',
    avisos,
  )
  const horasOperadores = sustituirPeorCaso(
    soloCandidatos(horasCrudasPorOperadorId),
    'h',
    'horasOperador',
    'maximo',
    avisos,
  )

  const objetivosOperadorPorId = new Map<string, ObjetivosOperador>()
  for (const id of operadorIdsCandidatos) {
    objetivosOperadorPorId.set(id, { ratingOperador: ratingOperadores.get(id)!, horasOperador: horasOperadores.get(id)! })
  }

  for (const [nombre, valores] of [
    ['ratingOperador', ratingOperadores],
    ['horasOperador', horasOperadores],
  ] as const) {
    const conPeorCaso = [...valores.values()].filter((v) => v.peorCasoAplicado).length
    if (conPeorCaso > 0) {
      avisos.push(`${nombre}: peor caso declarado en ${conPeorCaso} de ${valores.size} operadores candidatos`)
    }
  }

  // ── Peor opción válida por solicitud (S-A10 Paso 5b.5) ────────────────────
  const peorOpcionPorSolicitudId = new Map<string, Record<IdSoftConstraint, PeorOpcionValida>>()
  for (const s of solicitudesEvaluables.values()) {
    const pares = (paresPorSolicitud.get(s.id) ?? []).map(
      (equipo) => objetivosParPorClave.get(clavePar(s.id, String(equipo.id)))!,
    )
    const ops = (operadoresLibresPorSolicitud.get(s.id) ?? []).map((op) => objetivosOperadorPorId.get(String(op.id))!)
    peorOpcionPorSolicitudId.set(s.id, {
      distancia: peorEntreReales(
        pares.map((p) => p.distancia),
        'maximo',
      ),
      tarifa: peorEntreReales(
        pares.map((p) => p.tarifa),
        'maximo',
      ),
      ratingOperador: peorEntreReales(
        ops.map((o) => o.ratingOperador),
        'minimo',
      ),
      horasOperador: peorEntreReales(
        ops.map((o) => o.horasOperador),
        'maximo',
      ),
    })
  }

  // ── EntradaSolver — solo ids y enteros: sin nombres, coordenadas ni textos ──
  // Orden de llegada: rango por `created_at` (trae hora). 0 = la primera en
  // llegar; marcas iguales comparten rango; una solicitud sin `created_at`
  // interpretable va después de todas y se avisa — nunca se inventa una fecha.
  const marcaPorSolicitudId = new Map<string, number | null>()
  for (const s of solicitudesEvaluables.values()) {
    const marca = s.creadaEn.valor ? Date.parse(s.creadaEn.valor) : Number.NaN
    marcaPorSolicitudId.set(s.id, Number.isNaN(marca) ? null : marca)
  }
  const marcasDistintas = [
    ...new Set([...marcaPorSolicitudId.values()].filter((marca): marca is number => marca !== null)),
  ].sort((x, y) => x - y)
  const rangoPorMarca = new Map(marcasDistintas.map((marca, indice) => [marca, indice]))
  const sinCreadaEn = [...marcaPorSolicitudId.values()].filter((marca) => marca === null).length
  if (sinCreadaEn > 0) {
    avisos.push(`${sinCreadaEn} solicitudes sin created_at interpretable: van al final del orden de llegada`)
  }

  const solicitudesSolver = [...solicitudesEvaluables.values()].map((s) => {
    const marca = marcaPorSolicitudId.get(s.id) ?? null
    return {
      id: s.id,
      inicioDia: diffDias(hoy, s.inicioEfectivo),
      finDia: diffDias(hoy, s.fin.valor!),
      rangoLlegada: marca === null ? marcasDistintas.length : rangoPorMarca.get(marca)!,
    }
  })

  const paresSolver: EntradaSolver['pares'] = []
  for (const [solicitudId, candidatas] of paresPorSolicitud) {
    for (const equipo of candidatas) {
      const objetivos = objetivosParPorClave.get(clavePar(solicitudId, String(equipo.id)))!
      paresSolver.push({
        solicitudId,
        maquinaId: String(equipo.id),
        distanciaM: Math.round(objetivos.distancia.valor! * 1000),
        tarifaCentavos: Math.round(objetivos.tarifa.valor! * 100),
      })
    }
  }

  const operadoresPorSolicitudSolver: EntradaSolver['operadoresPorSolicitud'] = [
    ...operadoresLibresPorSolicitud.entries(),
  ].map(([solicitudId, ops]) => ({ solicitudId, operadorIds: ops.map((o) => String(o.id)) }))

  const operadoresSolver: EntradaSolver['operadores'] = [...operadorIdsCandidatos].map((operadorId) => {
    const objetivos = objetivosOperadorPorId.get(operadorId)!
    return {
      operadorId,
      ratingDecimas: Math.round(objetivos.ratingOperador.valor! * 10),
      minutosMotor: Math.round(objetivos.horasOperador.valor! * 60),
    }
  })

  const entradaSolver: EntradaSolver = {
    solicitudes: solicitudesSolver,
    pares: paresSolver,
    operadoresPorSolicitud: operadoresPorSolicitudSolver,
    operadores: operadoresSolver,
    pila: peticion.pila,
    tiempoLimitePorNivelS: TIEMPO_LIMITE_POR_NIVEL_S,
  }

  // ── Cobertura de operadores, sobre TODOS los operadores de Prisma ─────────
  const coberturaOperadores: CoberturaOperadores = {
    total: operadores.datos.length,
    conConductor: conductorPorOperadorId.size,
    conRating: [...ratingCrudoPorOperadorId.values()].filter((o) => o.valor !== null).length,
    conHoras: [...horasCrudasPorOperadorId.values()].filter((o) => o.valor !== null).length,
    ventanaHoras: { desde: ventanaHoras.desde, hasta: ventanaHoras.hasta },
    conflictosIdentidad: conflictos,
  }

  const sinConductorMismoCodigo = operadores.datos.filter(
    (op) => !conductorPorOperadorId.has(String(op.id)) && !codigoCoincideConAlgunConductor(op),
  ).length
  if (sinConductorMismoCodigo > 0) {
    avisos.push(`${sinConductorMismoCodigo} operadores sin conductor de Startrack con el mismo código`)
  }
  if (conflictos > 0) {
    avisos.push(`${conflictos} conflictos de identidad operador↔conductor: no se unieron`)
  }
  if (filasSinIgnOnTime > 0) {
    avisos.push(`${filasSinIgnOnTime} filas de actividad sin ignOnTime`)
  }

  // ── Horizonte: desde hoy hasta la mayor fecha_fin evaluada u ocupación vigente ──
  let hasta = hoy
  for (const s of solicitudesEvaluables.values()) hasta = maxFecha(hasta, s.fin.valor!)
  for (const equipo of datos.equipos.datos) {
    if (equipo.fecha_fin_uso) hasta = maxFecha(hasta, equipo.fecha_fin_uso)
  }

  const operadoresPorId = new Map<string, OperadorPrismaCrudo>()
  for (const op of operadores.datos) operadoresPorId.set(String(op.id), op)

  return {
    entradaSolver,
    filasMaquina,
    solicitudesEvaluables,
    candidatasPorSolicitudId,
    motivoSinCandidatasPorSolicitudId,
    objetivosParPorClave,
    objetivosOperadorPorId,
    peorOpcionPorSolicitudId,
    confirmadaRotaPorSolicitudId,
    codigoProyectoPorSolicitudId,
    excluidas,
    avisos,
    horizonte: { desde: hoy, hasta },
    operadoresPorId,
    procedenciaOperadores: operadores,
    coberturaOperadores,
  }
}
