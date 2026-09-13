import { restarDias, soloFecha } from '@/lib/mantenimiento/fechas'
import { umbralesDe } from '@/lib/mantenimiento/parametros'
import type { ParametrosMantenimiento, PronosticoMantenimiento, ReporteFallaPrisma } from '@/lib/mantenimiento/tipos'
import type { EquipoUnificado, EstadoOrigen } from '@/lib/tipos/canonico'
import type { ContextoOdin } from './tipos'


function convertirEstado(estado: EstadoOrigen | null) {
  if (!estado) return null

  return {
    source: estado.linaje.plataforma,
    object_type: estado.objeto,
    value: estado.valor,
    evidence: {
      platform: estado.linaje.plataforma,
      endpoint: estado.linaje.endpoint,
      field: estado.linaje.campo,
      as_of: estado.linaje.leidoEn,
    },
  } as const
}

/** Ventana de "fallas recientes" para el índice de riesgo. */
const DIAS_FALLAS_RECIENTES = 30

export type SenalesMantenimientoEntrada = {
  pronostico: PronosticoMantenimiento
  /** Reportes del equipo (proyectados, sin nombres). `null` si Prisma no
   * respondió: entonces `recent_failures` queda `null`, no 0. */
  reportes: ReporteFallaPrisma[] | null
  parametros: ParametrosMantenimiento
  hoy: string
  /** Σ horas de motor de los últimos 7 días (la misma serie del pronóstico). */
  horasUltimos7d: number | null
}

/**
 * `maintenance_signals` a partir del pronóstico real (S-A11 Paso 8). Cada
 * señal que el sandbox no expone va en `null` y el índice de Python la
 * declara faltante — nunca se inventa un sensor:
 *
 * - `abnormal_temperature_events` es `null` **siempre**: `sensor_readings`
 *   vino vacío en 14/14 vehículos (no hay sensor de temperatura).
 * - `utilization_last_7d` = Σ horas de 7 días ÷ (7 × 24): fracción del
 *   tiempo calendario, no de una jornada laboral (el sandbox no la expone).
 */
export function senalesMantenimiento(entrada: SenalesMantenimientoEntrada): NonNullable<ContextoOdin['maintenance_signals']> {
  const { pronostico, reportes, parametros, hoy, horasUltimos7d } = entrada
  const umbrales = umbralesDe(parametros)
  const desde = restarDias(hoy, DIAS_FALLAS_RECIENTES)

  const recientes =
    reportes === null
      ? null
      : reportes.filter((r) => {
          const fecha = soloFecha(r.creadoEn)
          return fecha !== null && fecha >= desde && fecha <= hoy
        }).length

  return {
    asset_id: pronostico.equipoId,
    as_of: pronostico.leidoEn,
    maintenance_overdue: pronostico.avance === null ? null : pronostico.avance >= umbrales.vencido / 100,
    operating_hours_since_maintenance: pronostico.horasDesdeAncla,
    maintenance_interval_hours: pronostico.intervalo.horas,
    recent_failures: recientes,
    abnormal_temperature_events: null,
    utilization_last_7d: horasUltimos7d === null ? null : Math.min(1, Math.max(0, horasUltimos7d / (7 * 24))),
  }
}

/**
 * Minimiza el contrato antes de enviarlo al proceso local: excluye valorCrudo,
 * coordenadas y cualquier campo que O.D.I.N. no necesite para sus tres tools.
 * `maintenance_signals` deja de ser `null` cuando hay pronóstico (S-A11).
 */
export function crearContextoOdin(
  equipo: EquipoUnificado,
  senales: NonNullable<ContextoOdin['maintenance_signals']> | null = null,
): ContextoOdin {
  const sourceStates = [
    convertirEstado(equipo.equipo),
    convertirEstado(equipo.solicitud),
    convertirEstado(equipo.falla),
    convertirEstado(equipo.vehiculo),
    convertirEstado(equipo.tarea),
  ].filter((estado): estado is NonNullable<typeof estado> => estado !== null)

  return {
    snapshot: {
      asset_id: equipo.id,
      asset_code: equipo.codigoActivo.valor,
      asset_name: equipo.nombre.valor,
      identity_resolved: equipo.identidadResuelta,
      verdict: equipo.veredicto,
      confidence: equipo.confianza,
      source_states: sourceStates,
      rules: equipo.reglas.map((regla) => ({
        rule: regla.regla,
        name: regla.nombre,
        verdict: regla.veredicto,
        confidence: regla.confianza,
        reasons: regla.porque,
        suggested_action: regla.accionSugerida,
        responsible_role: regla.rolResponsable,
        missing_fields: regla.camposFaltantes,
      })),
      as_of: equipo.leidoEn,
      location_description: equipo.ubicacion?.descripcion.valor ?? null,
      lag_interpretation: equipo.interpretacionDesfase,
    },
    // Sin pronóstico (o sin parámetros de mantenimiento en la petición) O.D.I.N.
    // responde UNKNOWN en vez de inventar señales.
    maintenance_signals: senales,
  }
}

