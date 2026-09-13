// El adaptador del optimizador (S-A7 Paso 4d). Puro: sin HTTP, sin `Date.now()`
// implícito — recibe `hoy` como parámetro para poder probarlo. Traduce los
// insumos leídos en vivo a `EntradaSolver` (hard constraints ya prefiltradas,
// solo ids y enteros) y deja, para que `ensamblar.ts` los use, los objetivos
// de cada par candidato y de cada asignación manual observada.
//
// Las hard constraints que dependen de datos (H1 clase, H2 disponibilidad
// real de la máquina, H3 disponibilidad del operador) se evalúan acá, nunca
// en Python (Paso 2).

import { CATALOGO_CLASE_EQUIPO } from '@/lib/canonico/catalogos'
import { crearLinaje, puedeOperar } from '@/lib/canonico/estados'
import { extraerCodigoProyecto, geocercaPorCodigoProyecto, idsIguales } from '@/lib/canonico/identidad'
import { reconciliar } from '@/lib/canonico/reconciliacion'
import type {
  EquipoPrismaCrudo,
  OperadorPrismaCrudo,
  ProcedenciaFuente,
  SolicitudPrismaCruda,
} from '@/lib/canonico/tipos-crudos'
import type { Dato, Linaje, Ubicacion } from '@/lib/tipos/canonico'
import type { DetalleEquipoConProcedencia, InsumosOptimizador } from './insumos'
import type {
  ConteoCandidatas,
  EntradaSolver,
  FilaMaquina,
  ObjetivosAsignacion,
  PeticionOptimizar,
  SolicitudExcluida,
  SolicitudPlan,
  ValorObjetivo,
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

// ── Tipos de salida propios de este módulo ─────────────────────────────────

/** `distancia`/`tarifa`/`holgura` de un par (solicitud, máquina) o de una
 * asignación manual — todavía sin `continuidadOperador`, porque ese objetivo
 * depende del operador elegido y solo se conoce después de resolver
 * (`ensamblar.ts`, Paso 4g, lo completa). */
export type ObjetivosParcialesPar = Pick<ObjetivosAsignacion, 'distancia' | 'tarifa' | 'holgura'>

export type InfoManual = {
  maquina: { id: string; codigoActivo: Dato<string> }
  objetivosParciales: ObjetivosParcialesPar
}

export type ResultadoAdaptador = {
  entradaSolver: EntradaSolver
  /** Todas las filas de máquina, incluidas las no operables y las de clase
   * fuera de catálogo (Paso 4g las necesita completas). */
  filasMaquina: FilaMaquina[]
  /** Solo las solicitudes evaluables (no excluidas), por id. */
  solicitudesEvaluables: Map<string, SolicitudPlan>
  candidatasPorSolicitudId: Map<string, ConteoCandidatas>
  /** Presente solo cuando algún conteo de `candidatasPorSolicitudId` dio 0. */
  motivoSinCandidatasPorSolicitudId: Map<string, string>
  /** Objetivos de cada par candidato (H1 ∧ H2), clave `${solicitudId}::${maquinaId}`. */
  objetivosParPorClave: Map<string, ObjetivosParcialesPar>
  /** La asignación manual observada de cada solicitud APROBADA cuyo
   * `maquinaria_id` resuelve a un equipo conocido. */
  manualPorSolicitudId: Map<string, InfoManual>
  excluidas: SolicitudExcluida[]
  avisos: string[]
  horizonte: { desde: string; hasta: string }
  /** Para `continuidadOperador` en `ensamblar.ts` (Paso 4g): qué operadores
   * están asociados a cada máquina, según el detalle de equipo. */
  operadoresAsociadosPorMaquinaId: Map<string, Set<string>>
  /** Para construir `operador.codTrabajador` en `ensamblar.ts` sin releer
   * los insumos. */
  operadoresPorId: Map<string, OperadorPrismaCrudo>
  procedenciaOperadores: ProcedenciaFuente
}

export function clavePar(solicitudId: string, maquinaId: string): string {
  return `${solicitudId}::${maquinaId}`
}

export function adaptar(insumos: InsumosOptimizador, peticion: PeticionOptimizar, hoy: string): ResultadoAdaptador {
  const { datos, operadores, detallesPorEquipoId } = insumos
  const procEquipos: ProcedenciaFuente = datos.equipos
  const procSolicitudes: ProcedenciaFuente = datos.solicitudes
  const procGeocercas: ProcedenciaFuente = datos.geocercas

  // 1. Ubicación en cascada (con linaje), vía el motor de reconciliación —
  // no se reimplementa (Paso 4d.1).
  const equiposUnificados = reconciliar(datos)
  const ubicacionPorEquipoId = new Map<string, Ubicacion | null>()
  for (const eq of equiposUnificados) ubicacionPorEquipoId.set(eq.id, eq.ubicacion)

  const equipoPorId = new Map<string, EquipoPrismaCrudo>()
  for (const equipo of datos.equipos.datos) equipoPorId.set(String(equipo.id), equipo)

  const detallePorEquipoId = new Map<string, DetalleEquipoConProcedencia>()
  for (const [id, detalle] of Object.entries(detallesPorEquipoId)) detallePorEquipoId.set(id, detalle)

  // Dueño de la ocupación real de cada equipo: la solicitud APROBADA cuyo
  // maquinaria_id/project_id apuntan a él (Paso 4d.3).
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
  const solicitudCrudaPorId = new Map<string, SolicitudPrismaCruda>()

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
    }
  }

  for (const s of datos.solicitudes.datos) {
    const id = String(s.id)
    solicitudCrudaPorId.set(id, s)
    const status = (s.status ?? '').toUpperCase()

    // Decisión revisada el 13 de septiembre de 2026 (feedback directo sobre
    // el calendario): una solicitud APROBADA es una decisión humana ya
    // tomada — el optimizador deja de tocarla por completo, ni la propone ni
    // la reevalúa ("si se toman decisiones manuales, el optimizador ya no
    // puede hacer nada"). No entra a `excluidas` porque no es un hueco: su
    // máquina ya se ve ocupada en el Gantt vía `FilaMaquina.ocupacionReal`
    // (sale de `fecha_inicio_uso`/`fecha_fin_uso` del propio equipo,
    // independiente de este bucle). Efecto secundario aceptado a propósito:
    // `manualPorSolicitudId` (más abajo) deja de tener con qué comparar el
    // KPI de ahorro proyectado de S-C4 para estas solicitudes — el indicador
    // queda parcial en vez de mostrar una hipótesis que ya no es accionable.
    if (status === 'APROBADA') continue

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

  // ── Máquinas: FilaMaquina completa (Paso 4g la necesita para TODAS) ───────
  function motivoNoOperar(equipo: EquipoPrismaCrudo): string | null {
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
            },
          ]
        : [],
    })
  }

  // ── 4d.4-7: H1/H2/H3 y conteo de candidatas por solicitud ─────────────────
  const candidatasPorSolicitudId = new Map<string, ConteoCandidatas>()
  const motivoSinCandidatasPorSolicitudId = new Map<string, string>()
  const paresPorSolicitud = new Map<string, EquipoPrismaCrudo[]>()
  const operadoresLibresPorSolicitud = new Map<string, OperadorPrismaCrudo[]>()

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

  // ── 4d.8-9: objetivos por par, con sustitución de peor caso ───────────────
  type ObjetivoCrudo = { valor: number | null; motivo: string | null; linaje: Linaje[] }

  function calcularDistancia(s: SolicitudPlan, equipo: EquipoPrismaCrudo, esManualPropio: boolean): ObjetivoCrudo {
    if (esManualPropio) {
      return {
        valor: null,
        motivo:
          'la máquina ya está en el proyecto por la asignación manual observada; su ubicación previa no se conoce',
        linaje: [],
      }
    }
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

  function calcularHolguraPar(s: SolicitudPlan, equipo: EquipoPrismaCrudo): number {
    const noPropiaTermina =
      tieneOcupacionReal(equipo) && !esPropiaDe(equipo, s.id) && equipo.fecha_fin_uso! <= s.inicioEfectivo
    if (noPropiaTermina) return diffDias(equipo.fecha_fin_uso!, s.inicioEfectivo)
    return diffDias(hoy, s.inicioEfectivo)
  }

  // Se computan primero los valores crudos (posiblemente null) de distancia y
  // tarifa para cada par candidato Y para cada asignación manual — la
  // sustitución de peor caso corre sobre el conjunto completo de esta corrida
  // (Paso 4d.9), no por solicitud.
  const distanciaCrudaPorClave = new Map<string, ObjetivoCrudo>()
  const tarifaCrudaPorClave = new Map<string, ObjetivoCrudo>()
  const holguraPorClave = new Map<string, number>()

  const manualEquipoPorSolicitudId = new Map<string, EquipoPrismaCrudo>()
  const distanciaCrudaManualPorSolicitudId = new Map<string, ObjetivoCrudo>()
  const tarifaCrudaManualPorSolicitudId = new Map<string, ObjetivoCrudo>()

  for (const [solicitudId, candidatas] of paresPorSolicitud) {
    const s = solicitudesEvaluables.get(solicitudId)!
    for (const equipo of candidatas) {
      const clave = clavePar(solicitudId, String(equipo.id))
      const esPropia = esPropiaDe(equipo, solicitudId)
      distanciaCrudaPorClave.set(clave, calcularDistancia(s, equipo, esPropia))
      tarifaCrudaPorClave.set(clave, calcularTarifa(equipo))
      holguraPorClave.set(clave, calcularHolguraPar(s, equipo))
    }
  }

  for (const s of solicitudesEvaluables.values()) {
    const solicitudCruda = solicitudCrudaPorId.get(s.id)!
    if ((solicitudCruda.status ?? '').toUpperCase() !== 'APROBADA') continue
    if (solicitudCruda.maquinaria_id == null) continue
    const equipoManual = equipoPorId.get(String(solicitudCruda.maquinaria_id))
    if (!equipoManual) continue
    manualEquipoPorSolicitudId.set(s.id, equipoManual)
    distanciaCrudaManualPorSolicitudId.set(s.id, calcularDistancia(s, equipoManual, true))
    tarifaCrudaManualPorSolicitudId.set(s.id, calcularTarifa(equipoManual))
  }

  // La sustitución de peor caso corre SOLO sobre los pares candidatos que
  // compiten por una asignación (los que ve el solver) — nunca sobre el
  // objeto `manual` (una comparación observacional, no un candidato de esta
  // corrida). Por eso `manual.objetivos.distancia` de una APROBADA se queda
  // en `null` con su motivo cuando la fórmula del Paso 4d.8 lo da null: es
  // justamente el caso "el origen previo de esta máquina no se conoce"
  // (Paso 4d.9 dice lo mismo de `holgura` para `manual`, explícitamente).
  function sustituirPeorCaso(
    crudosPares: Map<string, ObjetivoCrudo>,
    unidad: ValorObjetivo['unidad'],
    nombreObjetivo: string,
    avisos: string[],
  ): Map<string, ValorObjetivo> {
    const maxNoNulo = [...crudosPares.values()].reduce<number | null>((max, o) => {
      if (o.valor == null) return max
      return max == null ? o.valor : Math.max(max, o.valor)
    }, null)

    const ningunoConDato = maxNoNulo == null
    if (ningunoConDato && crudosPares.size > 0) {
      avisos.push(`objetivo ${nombreObjetivo} sin datos en ningún candidato: no discrimina`)
    }
    const peorCaso = ningunoConDato ? 0 : maxNoNulo

    const resultado = new Map<string, ValorObjetivo>()
    for (const [clave, crudo] of crudosPares) {
      resultado.set(
        clave,
        crudo.valor != null
          ? { valor: crudo.valor, peorCasoAplicado: false, motivo: null, unidad, linaje: crudo.linaje }
          : { valor: peorCaso, peorCasoAplicado: true, motivo: crudo.motivo, unidad, linaje: crudo.linaje },
      )
    }
    return resultado
  }

  function sinSustitucion(crudo: ObjetivoCrudo, unidad: ValorObjetivo['unidad']): ValorObjetivo {
    return { valor: crudo.valor, peorCasoAplicado: false, motivo: crudo.motivo, unidad, linaje: crudo.linaje }
  }

  const avisos: string[] = []
  const distanciaPares = sustituirPeorCaso(distanciaCrudaPorClave, 'km', 'distancia', avisos)
  const tarifaPares = sustituirPeorCaso(tarifaCrudaPorClave, 'USD/h', 'tarifa', avisos)

  const objetivosParPorClave = new Map<string, ObjetivosParcialesPar>()
  for (const clave of distanciaPares.keys()) {
    objetivosParPorClave.set(clave, {
      distancia: distanciaPares.get(clave)!,
      tarifa: tarifaPares.get(clave)!,
      holgura: {
        valor: holguraPorClave.get(clave)!,
        peorCasoAplicado: false,
        motivo: null,
        unidad: 'días',
        linaje: [],
      },
    })
  }

  const manualPorSolicitudId = new Map<string, InfoManual>()
  for (const [solicitudId, equipoManual] of manualEquipoPorSolicitudId) {
    manualPorSolicitudId.set(solicitudId, {
      maquina: { id: String(equipoManual.id), codigoActivo: dato(equipoManual.no_activo, procEquipos, 'no_activo') },
      objetivosParciales: {
        distancia: sinSustitucion(distanciaCrudaManualPorSolicitudId.get(solicitudId)!, 'km'),
        tarifa: sinSustitucion(tarifaCrudaManualPorSolicitudId.get(solicitudId)!, 'USD/h'),
        holgura: {
          valor: null,
          peorCasoAplicado: false,
          motivo: 'la ocupación previa de la máquina es desconocida (la ventana actual es la de esta misma asignación)',
          unidad: 'días',
          linaje: [],
        },
      },
    })
  }

  // ── 4d.10-11: EntradaSolver — solo ids y enteros ──────────────────────────
  const solicitudesSolver = [...solicitudesEvaluables.values()].map((s) => ({
    id: s.id,
    inicioDia: diffDias(hoy, s.inicioEfectivo),
    finDia: diffDias(hoy, s.fin.valor!),
  }))

  const paresSolver: EntradaSolver['pares'] = []
  for (const [solicitudId, candidatas] of paresPorSolicitud) {
    for (const equipo of candidatas) {
      const clave = clavePar(solicitudId, String(equipo.id))
      const objetivos = objetivosParPorClave.get(clave)!
      paresSolver.push({
        solicitudId,
        maquinaId: String(equipo.id),
        distanciaM: Math.round(objetivos.distancia.valor! * 1000),
        tarifaCentavos: Math.round(objetivos.tarifa.valor! * 100),
        holguraDias: objetivos.holgura.valor!,
      })
    }
  }

  const maquinaIdsUsadas = new Set(paresSolver.map((p) => p.maquinaId))

  const operadoresPorSolicitudSolver: EntradaSolver['operadoresPorSolicitud'] = [
    ...operadoresLibresPorSolicitud.entries(),
  ].map(([solicitudId, ops]) => ({ solicitudId, operadorIds: ops.map((o) => String(o.id)) }))

  const operadorIdsUsados = new Set(operadoresPorSolicitudSolver.flatMap((o) => o.operadorIds))

  const continuidad: EntradaSolver['continuidad'] = []
  const vistos = new Set<string>()
  for (const equipo of datos.equipos.datos) {
    const maquinaId = String(equipo.id)
    if (!maquinaIdsUsadas.has(maquinaId)) continue
    const detalle = detallePorEquipoId.get(maquinaId)
    for (const asociado of detalle?.datos.associated_operators ?? []) {
      const operadorId = String(asociado.id)
      if (!operadorIdsUsados.has(operadorId)) continue
      const clave = `${maquinaId}::${operadorId}`
      if (vistos.has(clave)) continue
      vistos.add(clave)
      continuidad.push({ maquinaId, operadorId })
    }
  }

  const entradaSolver: EntradaSolver = {
    solicitudes: solicitudesSolver,
    pares: paresSolver,
    operadoresPorSolicitud: operadoresPorSolicitudSolver,
    continuidad,
    pila: peticion.pila,
    tiempoLimitePorNivelS: TIEMPO_LIMITE_POR_NIVEL_S,
  }

  // ── Horizonte: desde hoy hasta la mayor fecha_fin evaluada u ocupación vigente ──
  let hasta = hoy
  for (const s of solicitudesEvaluables.values()) hasta = maxFecha(hasta, s.fin.valor!)
  for (const equipo of datos.equipos.datos) {
    if (equipo.fecha_fin_uso) hasta = maxFecha(hasta, equipo.fecha_fin_uso)
  }

  const operadoresAsociadosPorMaquinaId = new Map<string, Set<string>>()
  for (const equipo of datos.equipos.datos) {
    const detalle = detallePorEquipoId.get(String(equipo.id))
    const ids = new Set((detalle?.datos.associated_operators ?? []).map((a) => String(a.id)))
    operadoresAsociadosPorMaquinaId.set(String(equipo.id), ids)
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
    manualPorSolicitudId,
    excluidas,
    avisos,
    horizonte: { desde: hoy, hasta },
    operadoresAsociadosPorMaquinaId,
    operadoresPorId,
    procedenciaOperadores: operadores,
  }
}
