// El contrato del optimizador (S-A7 Paso 1, reescrito en S-A10 Paso 1 el 13 de
// septiembre de 2026). Destraba a B (calendario) y a C (KPIs). Mismo régimen
// que lib/tipos/canonico.ts: cambiarlo exige avisar a B y C en voz alta
// (AGENTS.md §4.2).
//
// S-A10 dejó cuatro objetivos por asignación que salen de campos reales y
// retiró la comparación contra la asignación manual. Entraron el rating y las
// horas del operador (reporte de conductores de Startrack), la peor opción
// válida por solicitud y los cambios respecto del plan anterior. El mismo día,
// a pedido directo del usuario, la cobertura pasó a la pila junto con el orden
// de llegada (primero en pedir, primero en ser atendido).

import { z } from 'zod'
import type { Dato, Linaje } from '@/lib/tipos/canonico'

/** Objetivos con un valor por asignación, que salen de campos reales: los que
 * tienen "peor opción válida" y KPI de ahorro. */
export const SOFT_CONSTRAINTS = ['distancia', 'tarifa', 'ratingOperador', 'horasOperador'] as const
export type IdSoftConstraint = (typeof SOFT_CONSTRAINTS)[number]

/** Todo lo que se ordena en la pila: la cobertura, los cuatro objetivos por
 * asignación y el orden de llegada (`created_at` de Prisma). Orden por
 * defecto: cobertura primero, orden de llegada último. */
export const PRIORIDADES_PILA = ['cobertura', ...SOFT_CONSTRAINTS, 'ordenLlegada'] as const
export type IdPrioridad = (typeof PRIORIDADES_PILA)[number]

/** Ventana de lectura del reporte de conductores: 30 días que terminan hoy
 * (inclusive), America/El_Salvador. ⚠ El `ignOnTime` que devuelve es el
 * contador acumulado de horas de motor del vehículo, no horas del día
 * (verificado el 13 de septiembre de 2026): la ventana decide qué filas se
 * leen, no qué se suma. */
export const DIAS_VENTANA_HORAS = 30

/** La cobertura tiene que estar en la pila y antes que distancia, tarifa,
 * rating y horas: puestos arriba, esos objetivos preferirían cubrir menos
 * solicitudes (una asignación menos es menos distancia, menos tarifa, menos
 * horas). Solo el orden de llegada puede ir antes que la cobertura. */
export function coberturaAntesDeLosObjetivos(pila: readonly IdPrioridad[]): boolean {
  const indiceCobertura = pila.indexOf('cobertura')
  if (indiceCobertura === -1) return false
  return pila.every(
    (id, indice) => !(SOFT_CONSTRAINTS as readonly string[]).includes(id) || indice > indiceCobertura,
  )
}

// ── Navegador → /api/optimizar ─────────────────────────────────────────────
export type AsignacionPlanAnterior = { solicitudId: string; maquinaId: string; operadorId: string }

export type PeticionOptimizar = {
  /** Índice 0 = se protege primero. Sin repetidos. Incluye siempre
   * 'cobertura', antes que los cuatro objetivos por asignación. */
  pila: IdPrioridad[]
  /** Solo ids del plan que el navegador tenía en pantalla. `null` = no calcular
   * cambios (carga inicial y "Re-optimizar" manual). NO influye en la
   * optimización: siempre se rehace todo. */
  planAnterior: AsignacionPlanAnterior[] | null
}

function sinRepetidos<T>(valores: T[]): boolean {
  return new Set(valores).size === valores.length
}

const IdPlanSchema = z.string().min(1).max(100)

export const PeticionOptimizarSchema = z.object({
  pila: z
    .array(z.enum(PRIORIDADES_PILA))
    .refine(sinRepetidos, { message: 'pila no puede tener ids repetidos' })
    .refine(coberturaAntesDeLosObjetivos, {
      message: 'pila debe incluir cobertura, antes que distancia, tarifa, ratingOperador y horasOperador',
    }),
  planAnterior: z
    .array(
      z.object({
        solicitudId: IdPlanSchema,
        maquinaId: IdPlanSchema,
        operadorId: IdPlanSchema,
      }),
    )
    .max(500)
    .nullable(),
})

// ── Honestidad de cada valor ────────────────────────────────────────────────
export type ValorObjetivo = {
  valor: number | null // valor real; null si no es calculable
  peorCasoAplicado: boolean // true si el solver usó el peor caso porque valor es null
  motivo: string | null // por qué es null / por qué peor caso / por qué 0 h
  unidad: 'km' | 'USD/h' | 'pts' | 'h'
  linaje: Linaje[] // campos de origen que produjeron el valor
}
export type ObjetivosAsignacion = Record<IdSoftConstraint, ValorObjetivo>

/** La peor opción que TAMBIÉN cumplía las hard constraints de esta solicitud,
 * evaluada por separado para cada objetivo, solo entre valores reales (nunca
 * un peor caso sustituido). Máquinas candidatas para distancia/tarifa;
 * operadores candidatos para rating/horas. */
export type PeorOpcionValida = {
  valor: number | null // null si ninguna candidata tiene dato real
  candidatasValidas: number
  candidatasConDato: number
}

// ── Respuesta de /api/optimizar ────────────────────────────────────────────
/** Coordenadas de la geocerca del proyecto de una solicitud (agregado 13 de
 * septiembre de 2026, feedback directo): la usa el calendario para estimar
 * el "gap" de viaje entre dos asignaciones consecutivas de una misma
 * máquina — nunca para nada dentro del motor de veredicto/reconciliación. */
export type DestinoGeografico = { lat: Dato<number>; lon: Dato<number> }

export type SolicitudPlan = {
  id: string
  estado: Dato<string> // status
  clase: Dato<string> // tipo
  proyecto: Dato<string> // project_name
  codigoProyecto: string | null // PROY-### extraído de project_name
  inicio: Dato<string> // fecha_inicio (AAAA-MM-DD)
  fin: Dato<string> // fecha_fin
  inicioEfectivo: string // max(hoy, fecha_inicio)
  /** `created_at` de Prisma (trae hora): define el orden de llegada. */
  creadaEn: Dato<string>
  /** `null` si la solicitud no resuelve geocerca de proyecto, o si esa
   * geocerca no tiene `x`/`y`. */
  destino: DestinoGeografico | null
}

/** Una APROBADA cuya máquina confirmada en Prisma ya no puede operar. */
export type ConfirmadaRota = {
  maquina: { id: string; codigoActivo: Dato<string> }
  motivo: string // el motivoNoOpera de esa máquina
}

export type AsignacionPropuesta = {
  solicitud: SolicitudPlan
  maquina: { id: string; codigoActivo: Dato<string>; clase: Dato<string> }
  operador: { id: string; codTrabajador: Dato<string> }
  objetivos: ObjetivosAsignacion
  peorOpcionValida: Record<IdSoftConstraint, PeorOpcionValida>
  reemplazaConfirmada: ConfirmadaRota | null
}

export type ConteoCandidatas = {
  claseCompatible: number
  operables: number // además puedeOperar
  libresEnVentana: number // además sin choque con la ocupación real
  conOperadorLibre: number // además hay un operador libre en la ventana
}

export type SolicitudSinAsignacion = {
  solicitud: SolicitudPlan
  motivo: string
  candidatas: ConteoCandidatas
  reemplazaConfirmada: ConfirmadaRota | null
}

export type SolicitudExcluida = { solicitud: SolicitudPlan; motivo: string }

export type OcupacionReal = {
  inicio: Dato<string> // fecha_inicio_uso
  fin: Dato<string> // fecha_fin_uso
  esDeSolicitudId: string | null // si es la ocupación propia de una APROBADA
  /** El proyecto asignado al equipo (`project_name`), agregado el 13 de
   * septiembre de 2026 para que el calendario diga de qué es la ocupación. */
  proyecto: Dato<string>
  codigoProyecto: string | null // PROY-### extraído de project_name
}

export type FilaMaquina = {
  id: string
  codigoActivo: Dato<string>
  clase: Dato<string>
  claseEnCatalogo: boolean
  estado: Dato<string>
  puedeOperar: boolean
  motivoNoOpera: string | null
  ocupacionReal: OcupacionReal[]
}

export type NivelLexicografico = {
  objetivo: IdPrioridad
  valor: number
  unidad: string
  probadoOptimo: boolean // false = se agotó el tiempo; el valor igual se fijó
}

// ── Cambios respecto del plan anterior (replan) ────────────────────────────
export type LadoCambio = {
  maquina: { id: string; codigoActivo: string | null }
  operador: { id: string; codTrabajador: string | null }
}
export type CambioPlan = {
  solicitudId: string
  codigoProyecto: string | null
  antes: LadoCambio | null // null = no estaba asignada en el plan anterior
  ahora: LadoCambio | null // null = quedó sin asignación o dejó de ser evaluable
  motivo: string
}

export type CoberturaOperadores = {
  total: number // operadores de Prisma
  conConductor: number // unidos 1:1 a un conductor de Startrack
  conRating: number
  conHoras: number // incluye los de 0 h por falta de actividad
  ventanaHoras: { desde: string; hasta: string }
  conflictosIdentidad: number // prefijos que no se unieron por ambigüedad
}

// ── KPIs (los calcula C en lib/kpi/optimizador.ts) ─────────────────────────
export type KpiAhorroObjetivo = {
  objetivo: IdSoftConstraint
  enPila: boolean
  mejoraTotal: number | null // Σ por asignación comparable; positivo = el plan es mejor
  mejoraPromedio: number | null // mejoraTotal / comparables
  unidad: 'km' | 'USD/h' | 'pts' | 'h'
  comparables: number
  asignaciones: number
  datoFaltante: string | null
}

export type SolicitudNoCubierta = {
  solicitudId: string
  codigoProyecto: string | null
  clase: string | null
  creadaEn: string | null // created_at: define el orden de la lista
  motivo: string
}

export type KpisOptimizador = {
  ahorroPorObjetivo: KpiAhorroObjetivo[] // siempre los 4, en el orden de SOFT_CONSTRAINTS
  solicitudesCubiertas: {
    cubiertas: number
    evaluadas: number
    excluidas: number
    noCubiertas: SolicitudNoCubierta[] // en orden de llegada; sin created_at interpretable, al final
    datoFaltante: string | null
  }
}

export type RespuestaOptimizar = {
  generadoEn: string
  hoy: string
  horizonte: { desde: string; hasta: string }
  estado: 'optimo' | 'factible' | 'infactible'
  motivoInfactible: string | null
  pila: IdPrioridad[]
  niveles: NivelLexicografico[]
  maquinas: FilaMaquina[]
  asignaciones: AsignacionPropuesta[]
  sinAsignacion: SolicitudSinAsignacion[]
  excluidas: SolicitudExcluida[]
  cambios: CambioPlan[] // [] si planAnterior es null o no cambió nada
  coberturaOperadores: CoberturaOperadores
  avisos: string[]
  kpis: KpisOptimizador | null
  kpisPendientesMotivo: string | null
}
export type RespuestaOptimizarSinKpis = Omit<RespuestaOptimizar, 'kpis' | 'kpisPendientesMotivo'>

export type ErrorOptimizar = {
  error: 'peticion_invalida' | 'solver_no_disponible' | 'fuente_no_disponible' | 'verificacion_fallida'
  mensaje: string
  fuente?: { plataforma: string; endpoint: string }
}

// ── Formato de cable con services/solver: anonimizado, solo ids y enteros ──
export type EntradaSolver = {
  /** Días desde hoy, inclusive. `rangoLlegada`: 0 = la primera en llegar por
   * `created_at`; marcas iguales comparten rango; sin marca interpretable,
   * después de todas. */
  solicitudes: { id: string; inicioDia: number; finDia: number; rangoLlegada: number }[]
  pares: { solicitudId: string; maquinaId: string; distanciaM: number; tarifaCentavos: number }[]
  operadoresPorSolicitud: { solicitudId: string; operadorIds: string[] }[]
  /** Enteros con el peor caso ya aplicado. ratingDecimas = round(safety_score × 10). */
  operadores: { operadorId: string; ratingDecimas: number; minutosMotor: number }[]
  pila: IdPrioridad[]
  tiempoLimitePorNivelS: number // 5
}
export type SalidaSolver = {
  estado: 'ok' | 'sin_asignaciones'
  asignaciones: { solicitudId: string; maquinaId: string; operadorId: string }[]
  niveles: { objetivo: IdPrioridad; valor: number; probadoOptimo: boolean }[]
}

// ── Vista previa de reprogramación (pedido directo del usuario, 13 sep. 2026) ──
// Navegador → POST /api/optimizar/reprogramacion. Solo propone: no se escribe
// nada en Prisma ni en Startrack. El cálculo vive en lib/optimizador/reprogramar.ts.

export const PeticionReprogramarSchema = PeticionOptimizarSchema.pick({ pila: true })
export type PeticionReprogramar = { pila: IdPrioridad[] }

type ResumenSolicitudReprogramacion = {
  solicitudId: string
  codigoProyecto: string | null
  clase: string | null
  /** Una APROBADA cuya máquina confirmada ya no puede operar. */
  eraAprobada: boolean
}

export type SolicitudReprogramada = ResumenSolicitudReprogramacion & {
  /** fecha_inicio / fecha_fin tal como las devuelve Prisma. */
  original: { inicio: string; fin: string }
  /** La ventana propuesta: misma cantidad de días que la original. */
  propuesta: { inicio: string; fin: string }
  dias: number
  /** Días entre la fecha_inicio pedida y la propuesta. */
  atrasoDias: number
  maquina: { id: string; codigoActivo: string | null }
  operador: { id: string; codTrabajador: string | null }
}

export type SolicitudNoReprogramable = ResumenSolicitudReprogramacion & { motivo: string }

export type RespuestaReprogramacion = {
  generadoEn: string
  /** El plan como quedaría con las fechas propuestas. Las solicitudes ya
   * cubiertas conservan máquina, operador y fechas. En las reprogramadas,
   * `inicio`/`fin` traen la fecha propuesta como valor, pero el linaje
   * conserva el valor crudo de Prisma. */
  plan: RespuestaOptimizar
  reprogramadas: SolicitudReprogramada[]
  noReprogramables: SolicitudNoReprogramable[]
  llamadasSolver: number
}
