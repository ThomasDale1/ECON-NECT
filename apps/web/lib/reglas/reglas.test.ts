// Datos fabricados para la prueba — no provienen del sandbox (AGENTS.md §1.2).
// Prueba obligatoria #2 (S-A2 §"Pruebas obligatorias"): cada regla R1–R8, un
// caso que dispara y uno que no.

import { describe, expect, it } from 'vitest'
import { CATALOGO_CLASE_EQUIPO, CATALOGO_TIPO_TAREA } from '@/lib/canonico/catalogos'
import type { EquipoPrismaCrudo, SolicitudPrismaCruda, TareaStartrackCruda } from '@/lib/canonico/tipos-crudos'
import type { EquipoUnificado, EstadoOrigen } from '@/lib/tipos/canonico'
import { r1EstadosCompatibles } from './r1-estados-compatibles'
import { r2TrasladoSobreEquipoQueNoPuedeOperar } from './r2-traslado-sobre-equipo-que-no-puede-operar'
import { r3SolicitudAprobadaSinTraslado } from './r3-solicitud-aprobada-sin-traslado'
import { r4FallaTrasladoStdSinTarea } from './r4-falla-traslado-std-sin-tarea'
import { r5IdentidadNoResuelta } from './r5-identidad-no-resuelta'
import { r6OcupadoSinProyecto } from './r6-ocupado-sin-proyecto'
import { r7ProyectoEnEstadoIncompatible } from './r7-proyecto-en-estado-incompatible'
import { r8ValorFueraDeCatalogo } from './r8-valor-fuera-de-catalogo'
import type { ContextoReglas } from './tipos'

const LEIDO_EN = '2026-09-12T21:45:00.000Z'

function linaje(campo: string, valorCrudo: unknown) {
  return { plataforma: 'prisma' as const, endpoint: '/fabricado', campo, valorCrudo, leidoEn: LEIDO_EN }
}

function estadoOrigen(valor: string, objeto: EstadoOrigen['objeto']): EstadoOrigen {
  return { valor, objeto, linaje: linaje('estado', valor) }
}

function equipoUnificado(parcial: Partial<EquipoUnificado> = {}): EquipoUnificado {
  return {
    id: '1',
    codigoActivo: { valor: 'EQ-01', linaje: linaje('no_activo', 'EQ-01') },
    nombre: { valor: 'Equipo de prueba', linaje: linaje('nombre', 'Equipo de prueba') },
    identidadResuelta: true,
    equipo: null,
    solicitud: null,
    falla: null,
    vehiculo: null,
    tarea: null,
    ubicacion: null,
    veredicto: 'SIN_EVIDENCIA',
    confianza: 0,
    reglas: [],
    leidoEn: LEIDO_EN,
    ...parcial,
  }
}

function contexto(parcial: Partial<ContextoReglas> = {}): ContextoReglas {
  return {
    crudoPorEquipoId: {},
    puedeOperarPorEquipoId: {},
    tareasPorEquipoId: {},
    solicitudesPorEquipoId: {},
    nombreTipoTareaPorId: {},
    catalogoClasesEquipo: CATALOGO_CLASE_EQUIPO,
    catalogoTiposTarea: CATALOGO_TIPO_TAREA,
    ...parcial,
  }
}

function equipoCrudo(parcial: Partial<EquipoPrismaCrudo> & { id: number | string }): EquipoPrismaCrudo {
  return {
    empresa: null,
    clave: null,
    no_activo: null,
    nombre: null,
    clase_equipo: null,
    marca: null,
    modelo: null,
    anio: null,
    precio_x_hora: null,
    minimum_usage_hours: null,
    estado: 'DISPONIBLE',
    project_id: null,
    project_name: null,
    active_failure_id: null,
    active_failure_status: null,
    active_failure_is_paro: null,
    fallas_count: null,
    ...parcial,
  }
}

function tareaCruda(parcial: Partial<TareaStartrackCruda> & { id: number | string }): TareaStartrackCruda {
  return {
    status: null,
    status_name: null,
    job_type_id: null,
    start_date: null,
    end_datetime: null,
    creation_date: null,
    poi_id: null,
    poi_name: null,
    origin_poi_id: null,
    origin_poi_name: null,
    assigned_vehicle_id: null,
    assigned_user_ids: null,
    remote_id: null,
    x: null,
    y: null,
    address: null,
    ...parcial,
  }
}

function solicitudCruda(parcial: Partial<SolicitudPrismaCruda> & { id: number | string }): SolicitudPrismaCruda {
  return {
    project_id: null,
    tipo: null,
    status: null,
    approved_at: null,
    approved_by_name: null,
    maquinaria_id: null,
    maquinaria_no_activo: null,
    maquinaria_nombre: null,
    maquinaria_clave: null,
    fecha_inicio: null,
    fecha_fin: null,
    created_at: null,
    ...parcial,
  }
}

describe('R1 — estados compatibles entre plataformas', () => {
  it('dispara COHERENTE cuando el recurso no tiene tarea que lo contradiga', () => {
    const eq = equipoUnificado({ equipo: estadoOrigen('OCUPADA', 'recurso') })
    const ctx = contexto({ puedeOperarPorEquipoId: { '1': true } })
    expect(r1EstadosCompatibles.evaluar(eq, ctx)?.veredicto).toBe('COHERENTE')
  })

  it('no dispara (null) cuando hay una tarea viva sobre un equipo que no puede operar', () => {
    const eq = equipoUnificado({
      equipo: estadoOrigen('OBSOLETA', 'recurso'),
      tarea: estadoOrigen('Pendiente', 'tarea'),
    })
    const ctx = contexto({ puedeOperarPorEquipoId: { '1': false } })
    expect(r1EstadosCompatibles.evaluar(eq, ctx)).toBeNull()
  })
})

describe('R2 — traslado sobre equipo que no puede operar', () => {
  it('dispara EN_RIESGO cuando hay un traslado vivo sobre un equipo que no puede operar', () => {
    const eq = equipoUnificado({ equipo: estadoOrigen('OBSOLETA', 'recurso') })
    const ctx = contexto({
      puedeOperarPorEquipoId: { '1': false },
      tareasPorEquipoId: { '1': [tareaCruda({ id: 900, job_type_id: 1, status_name: 'Pendiente' })] },
      nombreTipoTareaPorId: { '1': 'Traslado' },
    })
    expect(r2TrasladoSobreEquipoQueNoPuedeOperar.evaluar(eq, ctx)?.veredicto).toBe('EN_RIESGO')
  })

  it('no dispara cuando el equipo sí puede operar', () => {
    const eq = equipoUnificado({ equipo: estadoOrigen('OCUPADA', 'recurso') })
    const ctx = contexto({
      puedeOperarPorEquipoId: { '1': true },
      tareasPorEquipoId: { '1': [tareaCruda({ id: 900, job_type_id: 1, status_name: 'Pendiente' })] },
      nombreTipoTareaPorId: { '1': 'Traslado' },
    })
    expect(r2TrasladoSobreEquipoQueNoPuedeOperar.evaluar(eq, ctx)).toBeNull()
  })
})

describe('R3 — solicitud aprobada sin tarea de traslado', () => {
  it('dispara ATENCION cuando hay una solicitud aprobada sin tarea de traslado enlazada', () => {
    const ctx = contexto({
      solicitudesPorEquipoId: { '1': [solicitudCruda({ id: 5, status: 'APROBADA' })] },
      tareasPorEquipoId: { '1': [] },
    })
    expect(r3SolicitudAprobadaSinTraslado.evaluar(equipoUnificado(), ctx)?.veredicto).toBe('ATENCION')
  })

  it('no dispara cuando la solicitud ya tiene su tarea enlazada por remote_id', () => {
    const ctx = contexto({
      solicitudesPorEquipoId: { '1': [solicitudCruda({ id: 5, status: 'APROBADA' })] },
      tareasPorEquipoId: { '1': [tareaCruda({ id: 900, remote_id: '5' })] },
    })
    expect(r3SolicitudAprobadaSinTraslado.evaluar(equipoUnificado(), ctx)).toBeNull()
  })
})

describe('R4 — falla en traslado a taller sin tarea de traslado', () => {
  it('dispara EN_RIESGO cuando la falla está en TRASLADO_STD y no hay tarea de traslado', () => {
    const eq = equipoUnificado({ falla: estadoOrigen('TRASLADO_STD', 'falla') })
    const ctx = contexto({ tareasPorEquipoId: { '1': [] } })
    expect(r4FallaTrasladoStdSinTarea.evaluar(eq, ctx)?.veredicto).toBe('EN_RIESGO')
  })

  it('no dispara (no aplica) cuando no hay falla activa', () => {
    const eq = equipoUnificado({ falla: null })
    expect(r4FallaTrasladoStdSinTarea.evaluar(eq, contexto())).toBeNull()
  })
})

describe('R5 — identidad no resuelta o campo crítico ausente', () => {
  it('dispara SIN_EVIDENCIA cuando la identidad no se resolvió', () => {
    const eq = equipoUnificado({ identidadResuelta: false })
    expect(r5IdentidadNoResuelta.evaluar(eq, contexto())?.veredicto).toBe('SIN_EVIDENCIA')
  })

  it('no dispara cuando la identidad está resuelta y no faltan campos críticos', () => {
    const eq = equipoUnificado({ identidadResuelta: true, equipo: estadoOrigen('DISPONIBLE', 'recurso') })
    expect(r5IdentidadNoResuelta.evaluar(eq, contexto())).toBeNull()
  })
})

describe('R6 — equipo ocupado sin proyecto asignado', () => {
  it('dispara ATENCION cuando está OCUPADA sin project_id', () => {
    const ctx = contexto({ crudoPorEquipoId: { '1': equipoCrudo({ id: 1, estado: 'OCUPADA', project_id: null }) } })
    expect(r6OcupadoSinProyecto.evaluar(equipoUnificado(), ctx)?.veredicto).toBe('ATENCION')
  })

  it('no dispara cuando OCUPADA tiene project_id', () => {
    const ctx = contexto({ crudoPorEquipoId: { '1': equipoCrudo({ id: 1, estado: 'OCUPADA', project_id: 9 }) } })
    expect(r6OcupadoSinProyecto.evaluar(equipoUnificado(), ctx)).toBeNull()
  })
})

describe('R7 — asignado a proyecto en estado incompatible', () => {
  it('dispara EN_RIESGO cuando OBSOLETA tiene un proyecto asignado', () => {
    const ctx = contexto({ crudoPorEquipoId: { '1': equipoCrudo({ id: 1, estado: 'OBSOLETA', project_id: 9 }) } })
    expect(r7ProyectoEnEstadoIncompatible.evaluar(equipoUnificado(), ctx)?.veredicto).toBe('EN_RIESGO')
  })

  it('no dispara cuando OCUPADA tiene un proyecto asignado (caso normal)', () => {
    const ctx = contexto({ crudoPorEquipoId: { '1': equipoCrudo({ id: 1, estado: 'OCUPADA', project_id: 9 }) } })
    expect(r7ProyectoEnEstadoIncompatible.evaluar(equipoUnificado(), ctx)).toBeNull()
  })
})

describe('R8 — valor fuera del catálogo declarado', () => {
  it('dispara ATENCION cuando clase_equipo no está en el catálogo verificado', () => {
    const ctx = contexto({
      crudoPorEquipoId: { '1': equipoCrudo({ id: 1, clase_equipo: 'Retroexcavadoras' }) },
    })
    expect(r8ValorFueraDeCatalogo.evaluar(equipoUnificado(), ctx)?.veredicto).toBe('ATENCION')
  })

  it('no dispara cuando clase_equipo está en el catálogo verificado', () => {
    const ctx = contexto({
      crudoPorEquipoId: { '1': equipoCrudo({ id: 1, clase_equipo: 'Excavadora' }) },
    })
    expect(r8ValorFueraDeCatalogo.evaluar(equipoUnificado(), ctx)).toBeNull()
  })
})
