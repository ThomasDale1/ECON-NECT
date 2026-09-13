// Ensamblado de `EquipoUnificado` (S-A2 §lib/canonico/modelo.ts). No conoce
// HTTP. `reconciliacion.ts` es quien completa `veredicto`, `confianza` y
// `reglas` después de correr las reglas — por eso este módulo produce
// `EquipoSinVeredicto`, no el tipo completo del contrato.

import type { EquipoUnificado, NivelDeCascada, Ubicacion } from '@/lib/tipos/canonico'
import { crearLinaje, estadoDesdeEquipo, estadoDesdeFalla, estadoDesdeSolicitud, estadoDesdeTarea, estadoDesdeVehiculo } from './estados'
import { geocercaDeProyecto, geocercaDeTarea, type ResolucionTarea, type VinculoEquipo } from './identidad'
import type { GeocercaStartrackCruda, ProcedenciaFuente, SolicitudPrismaCruda } from './tipos-crudos'

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
}

/** Ubicación en cascada (01 E.10): nivel 2 = geocerca de destino de la tarea
 * de traslado; nivel 3 = geocerca del proyecto asignado. El nivel 1
 * (telemetría en vivo) no se implementa — ninguna parte de la demo depende de
 * él, y no hay una fuente REST verificada para leerlo (01 E.10). `x`/`y` de
 * geocercas ya vienen en grados decimales (forma observada); se asume la
 * convención cartesiana estándar x=longitud, y=latitud — no verificada
 * explícitamente contra el sandbox, ver desviaciones del plan. */
function resolverUbicacion(
  tarea: EntradaModelo['resolucionTarea'],
  equipo: VinculoEquipo['equipo'],
  geocercas: GeocercaStartrackCruda[],
  procedenciaGeocercas: ProcedenciaFuente,
): Ubicacion | null {
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
  } = entrada
  const { equipo, vehiculo, identidadResuelta, nivelResolucion } = vinculo
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
    // Cascada de respaldo documentada en identidad.ts — heurística, no certeza.
    nivelResolucionIdentidad: nivelResolucion,
    equipo: estadoDesdeEquipo(equipo, procedenciaEquipos),
    solicitud: estadoDesdeSolicitud(solicitud, procedenciaSolicitudes),
    falla: estadoDesdeFalla(equipo, procedenciaEquipos),
    vehiculo: estadoDesdeVehiculo(vehiculo, procedenciaVehiculos),
    tarea: estadoDesdeTarea(tarea, procedenciaTareas),
    ubicacion: resolverUbicacion(resolucionTarea, equipo, geocercas, procedenciaGeocercas),
    // Lo completa `reconciliar` con fechas crudas reales (nunca inventadas).
    interpretacionDesfase: null,
    leidoEn: procedenciaEquipos.leidoEn,
  }
}
