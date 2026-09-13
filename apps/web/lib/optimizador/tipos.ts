// El contrato del optimizador (S-A7 Paso 1). Destraba a B (S-B4) y a C (S-C4).
// Mismo régimen que lib/tipos/canonico.ts: cambiarlo exige avisar a B y C en
// voz alta (AGENTS.md §4.2).

import { z } from 'zod'
import { CATALOGO_CLASE_EQUIPO, type ClaseEquipoCatalogo } from '@/lib/canonico/catalogos'
import type { Dato, Linaje } from '@/lib/tipos/canonico'

/** Soft constraints disponibles: solo las que salen de campos reales. */
export const SOFT_CONSTRAINTS = ['distancia', 'tarifa', 'continuidadOperador', 'holgura'] as const
export type IdSoftConstraint = (typeof SOFT_CONSTRAINTS)[number]

// ── Navegador → /api/optimizar ─────────────────────────────────────────────
export type PeticionOptimizar = {
  /** Índice 0 = se protege primero. Sin repetidos. Vacía = solo se maximiza la cobertura. */
  pila: IdSoftConstraint[]
  /** Criterio del planificador, no dato de ECON. */
  clasesSensiblesLluvia: ClaseEquipoCatalogo[]
}

function sinRepetidos<T>(valores: T[]): boolean {
  return new Set(valores).size === valores.length
}

export const PeticionOptimizarSchema = z.object({
  pila: z.array(z.enum(SOFT_CONSTRAINTS)).refine(sinRepetidos, {
    message: 'pila no puede tener ids repetidos',
  }),
  clasesSensiblesLluvia: z.array(z.enum(CATALOGO_CLASE_EQUIPO as unknown as [ClaseEquipoCatalogo, ...ClaseEquipoCatalogo[]])).refine(sinRepetidos, {
    message: 'clasesSensiblesLluvia no puede tener clases repetidas',
  }),
})

// ── Honestidad de cada valor ────────────────────────────────────────────────
export type ValorObjetivo = {
  valor: number | null // valor real; null si no es calculable
  peorCasoAplicado: boolean // true si el solver usó el peor caso porque valor es null
  motivo: string | null // por qué es null / por qué peor caso; null si hay valor real
  unidad: 'km' | 'USD/h' | 'días' | 'sí/no'
  linaje: Linaje[] // campos de origen que produjeron el valor
}
export type ObjetivosAsignacion = Record<IdSoftConstraint, ValorObjetivo>

export type AlertaClima =
  | { estado: 'no_aplica'; motivo: string }
  | { estado: 'sin_pronostico'; motivo: string }
  | {
      estado: 'evaluado'
      diasConLluvia: number
      diasEvaluados: number
      diasSinPronostico: number
      umbralProbabilidadPct: 50
      fuente: { proveedor: 'open-meteo'; endpoint: string; leidoEn: string; decimalesCoordenada: 1 }
    }

// ── Respuesta de /api/optimizar ────────────────────────────────────────────
export type SolicitudPlan = {
  id: string
  estado: Dato<string> // status
  clase: Dato<string> // tipo
  proyecto: Dato<string> // project_name
  codigoProyecto: string | null // PROY-### extraído de project_name
  inicio: Dato<string> // fecha_inicio (AAAA-MM-DD)
  fin: Dato<string> // fecha_fin
  inicioEfectivo: string // max(hoy, fecha_inicio)
}

export type AsignacionManual = {
  maquina: { id: string; codigoActivo: Dato<string> }
  objetivos: ObjetivosAsignacion // mismas reglas que la propuesta (Paso 4d)
}

export type AsignacionPropuesta = {
  solicitud: SolicitudPlan
  maquina: { id: string; codigoActivo: Dato<string>; clase: Dato<string> }
  operador: { id: string; codTrabajador: Dato<string> }
  objetivos: ObjetivosAsignacion
  manual: AsignacionManual | null // solo en APROBADA
  clima: AlertaClima
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
  manual: AsignacionManual | null
}

export type SolicitudExcluida = { solicitud: SolicitudPlan; motivo: string }

export type OcupacionReal = {
  inicio: Dato<string> // fecha_inicio_uso
  fin: Dato<string> // fecha_fin_uso
  esDeSolicitudId: string | null // si es la ocupación propia de una APROBADA
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
  objetivo: 'cobertura' | IdSoftConstraint
  valor: number
  unidad: string
  probadoOptimo: boolean // false = se agotó el tiempo; el valor igual se fijó
}

export type KpiAhorroObjetivo = {
  objetivo: IdSoftConstraint
  mejoraTotal: number | null // positivo = la propuesta es mejor
  unidad: string
  comparables: number
  totalAprobadas: number
  datoFaltante: string | null
}

export type KpisOptimizador = {
  ahorroPorObjetivo: KpiAhorroObjetivo[]
  lluviaClasesSensibles: {
    asignacionesConLluvia: number | null
    asignacionesSensibles: number
    sinPronostico: number
    datoFaltante: string | null
  }
  coberturaPlan: {
    valor: number | null
    asignadas: number
    evaluadas: number
    excluidas: number
    datoFaltante: string | null
  }
}

export type RespuestaOptimizar = {
  generadoEn: string
  hoy: string
  horizonte: { desde: string; hasta: string }
  estado: 'optimo' | 'factible' | 'infactible'
  motivoInfactible: string | null
  pila: IdSoftConstraint[]
  clasesSensiblesLluvia: string[]
  niveles: NivelLexicografico[]
  maquinas: FilaMaquina[]
  asignaciones: AsignacionPropuesta[]
  sinAsignacion: SolicitudSinAsignacion[]
  excluidas: SolicitudExcluida[]
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
  solicitudes: { id: string; inicioDia: number; finDia: number }[] // días desde hoy, inclusive
  pares: { solicitudId: string; maquinaId: string; distanciaM: number; tarifaCentavos: number; holguraDias: number }[]
  operadoresPorSolicitud: { solicitudId: string; operadorIds: string[] }[]
  continuidad: { maquinaId: string; operadorId: string }[]
  pila: IdSoftConstraint[]
  tiempoLimitePorNivelS: number // 5
}
export type SalidaSolver = {
  estado: 'ok' | 'sin_asignaciones'
  asignaciones: { solicitudId: string; maquinaId: string; operadorId: string }[]
  niveles: { objetivo: 'cobertura' | IdSoftConstraint; valor: number; probadoOptimo: boolean }[]
}
