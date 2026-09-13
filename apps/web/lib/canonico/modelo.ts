// Ensamblado de `EquipoUnificado` (S-A2 §lib/canonico/modelo.ts). No conoce
// HTTP. `reconciliacion.ts` es quien completa `veredicto`, `confianza` y
// `reglas` después de correr las reglas — por eso este módulo produce
// `EquipoSinVeredicto`, no el tipo completo del contrato.

import type { EquipoUnificado, NivelDeCascada, Ubicacion } from '@/lib/tipos/canonico'
import { crearLinaje, estadoDesdeEquipo, estadoDesdeFalla, estadoDesdeSolicitud, estadoDesdeTarea, estadoDesdeVehiculo } from './estados'
import { geocercaDeProyecto, geocercaDeTarea, type ResolucionTarea, type VinculoEquipo } from './identidad'
import type {
  EstadoVehiculoConProcedencia,
  GeocercaStartrackCruda,
  ProcedenciaFuente,
  SolicitudPrismaCruda,
} from './tipos-crudos'

/** `EquipoUnificado` sin los tres campos que dependen de correr las reglas. */
export type EquipoSinVeredicto = Omit<EquipoUnificado, 'veredicto' | 'confianza' | 'reglas'>

export type EntradaModelo = {
  vinculo: VinculoEquipo
  procedenciaEquipos: ProcedenciaFuente
  procedenciaVehiculos: ProcedenciaFuente
  solicitud: SolicitudPrismaCruda | null
  procedenciaSolicitudes: ProcedenciaFuente
  resolucionTarea: ResolucionTarea | null
  procedenciaTareas: ProcedenciaFuente
  geocercas: GeocercaStartrackCruda[]
  procedenciaGeocercas: ProcedenciaFuente
  /** Nivel 1 de la cascada (01 E.10, corregido el 13 de septiembre de 2026):
   * posición en vivo por id de vehículo de Startrack, si el orquestador la
   * trajo. `undefined` degrada limpio a nivel 2/3 — ningún llamador viejo
   * (scripts/reconciliar.ts previo a esta fecha, las pruebas) se rompe. */
  estadosVehiculoPorVehiculoId?: Record<string, EstadoVehiculoConProcedencia>
}

/** Un número válido (no `null`, no `NaN`) desde un campo que Startrack manda
 * como texto en `/api/vehicle/{id}/status` (forma real observada, no un
 * error de tipeo del conector). */
function numeroValido(valor: string | null): number | null {
  if (valor == null) return null
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

/** Nivel 1: posición en vivo (01 E.10, corregido). Verificado en vivo el 13
 * de septiembre de 2026 contra `GET /api/vehicle/{id}/status` — la
 * investigación original de S-A1 buscó telemetría bajo `ajax/*.php` y no la
 * encontró; existe en la superficie REST moderna. Se intenta antes que
 * nivel 2/3; si no hay estado, o sus `x`/`y` no son números válidos, cae a
 * la cascada de siempre. */
function resolverUbicacionNivel1(
  vehiculo: VinculoEquipo['vehiculo'],
  estadosVehiculoPorVehiculoId: EntradaModelo['estadosVehiculoPorVehiculoId'],
): Ubicacion | null {
  if (!vehiculo || !estadosVehiculoPorVehiculoId) return null
  const estado = estadosVehiculoPorVehiculoId[String(vehiculo.id)]
  if (!estado) return null

  const lat = numeroValido(estado.datos.y)
  const lon = numeroValido(estado.datos.x)
  if (lat == null || lon == null) return null

  return {
    nivel: 1,
    descripcion: {
      valor: estado.datos.placename,
      linaje: crearLinaje(estado.procedencia, 'placename', estado.datos.placename),
    },
    lat: { valor: lat, linaje: crearLinaje(estado.procedencia, 'y', estado.datos.y) },
    lon: { valor: lon, linaje: crearLinaje(estado.procedencia, 'x', estado.datos.x) },
  }
}

/** Ubicación en cascada (01 E.10): nivel 1 = posición en vivo del vehículo;
 * nivel 2 = geocerca de destino de la tarea de traslado; nivel 3 = geocerca
 * del proyecto asignado. `x`/`y` de geocercas ya vienen en grados decimales
 * (forma observada); se asume la convención cartesiana estándar
 * x=longitud, y=latitud — no verificada explícitamente contra el sandbox,
 * ver desviaciones del plan. */
function resolverUbicacion(
  tarea: EntradaModelo['resolucionTarea'],
  equipo: VinculoEquipo['equipo'],
  vehiculo: VinculoEquipo['vehiculo'],
  geocercas: GeocercaStartrackCruda[],
  procedenciaGeocercas: ProcedenciaFuente,
  estadosVehiculoPorVehiculoId: EntradaModelo['estadosVehiculoPorVehiculoId'],
): Ubicacion | null {
  const nivel1 = resolverUbicacionNivel1(vehiculo, estadosVehiculoPorVehiculoId)
  if (nivel1) return nivel1

  const geocercaNivel2 = geocercaDeTarea(tarea?.tarea ?? null, geocercas)
  const geocercaResuelta = geocercaNivel2 ?? geocercaDeProyecto(equipo, geocercas)
  if (!geocercaResuelta) return null

  const nivel: NivelDeCascada = geocercaNivel2 ? 2 : 3

  return {
    nivel,
    descripcion: {
      valor: geocercaResuelta.name,
      linaje: crearLinaje(procedenciaGeocercas, 'name', geocercaResuelta.name),
    },
    lat: {
      valor: geocercaResuelta.y,
      linaje: crearLinaje(procedenciaGeocercas, 'y', geocercaResuelta.y),
    },
    lon: {
      valor: geocercaResuelta.x,
      linaje: crearLinaje(procedenciaGeocercas, 'x', geocercaResuelta.x),
    },
  }
}

export function construirEquipoUnificado(entrada: EntradaModelo): EquipoSinVeredicto {
  const {
    vinculo,
    procedenciaEquipos,
    procedenciaVehiculos,
    solicitud,
    procedenciaSolicitudes,
    resolucionTarea,
    procedenciaTareas,
    geocercas,
    procedenciaGeocercas,
    estadosVehiculoPorVehiculoId,
  } = entrada
  const { equipo, vehiculo, identidadResuelta } = vinculo
  const tarea = resolucionTarea?.tarea ?? null

  return {
    id: String(equipo.id),
    codigoActivo: {
      valor: equipo.no_activo,
      linaje: crearLinaje(procedenciaEquipos, 'no_activo', equipo.no_activo),
    },
    nombre: {
      valor: equipo.nombre,
      linaje: crearLinaje(procedenciaEquipos, 'nombre', equipo.nombre),
    },
    identidadResuelta,
    equipo: estadoDesdeEquipo(equipo, procedenciaEquipos),
    solicitud: estadoDesdeSolicitud(solicitud, procedenciaSolicitudes),
    falla: estadoDesdeFalla(equipo, procedenciaEquipos),
    vehiculo: estadoDesdeVehiculo(vehiculo, procedenciaVehiculos),
    tarea: estadoDesdeTarea(tarea, procedenciaTareas),
    ubicacion: resolverUbicacion(
      resolucionTarea,
      equipo,
      vehiculo,
      geocercas,
      procedenciaGeocercas,
      estadosVehiculoPorVehiculoId,
    ),
    leidoEn: procedenciaEquipos.leidoEn,
  }
}
