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

/**
 * Minimiza el contrato antes de enviarlo al proceso local: excluye valorCrudo,
 * coordenadas y cualquier campo que O.D.I.N. no necesite para sus tres tools.
 */
export function crearContextoOdin(equipo: EquipoUnificado): ContextoOdin {
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
    },
    // El contrato canónico actual no contiene señales históricas suficientes.
    // O.D.I.N. debe responder UNKNOWN en vez de inventarlas.
    maintenance_signals: null,
  }
}

