// Datos fabricados para la prueba — no provienen del sandbox (AGENTS.md §1.2).

import { describe, expect, it } from 'vitest'
import {
  geocercaDeProyecto,
  geocercaDeTarea,
  normalizarCodigoActivo,
  resolverIdentidades,
  resolverTareaPrincipal,
  solicitudesDeEquipo,
  solicitudPrincipal,
} from './identidad'
import type {
  EquipoPrismaCrudo,
  GeocercaStartrackCruda,
  SolicitudPrismaCruda,
  TareaStartrackCruda,
  VehiculoStartrackCrudo,
} from './tipos-crudos'

function equipo(parcial: Partial<EquipoPrismaCrudo> & { id: number | string }): EquipoPrismaCrudo {
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
    fecha_inicio_uso: null,
    fecha_fin_uso: null,
    ...parcial,
  }
}

function vehiculo(parcial: Partial<VehiculoStartrackCrudo> & { id: number | string }): VehiculoStartrackCrudo {
  return {
    description: null,
    veh_type: null,
    make: null,
    model: null,
    status: null,
    tags: null,
    unit_id: null,
    driver_id: null,
    license_plate: null,
    ...parcial,
  }
}

function tarea(parcial: Partial<TareaStartrackCruda> & { id: number | string }): TareaStartrackCruda {
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

describe('normalizarCodigoActivo', () => {
  it('toma el prefijo antes de " - "', () => {
    expect(normalizarCodigoActivo('CF-03 - Cargador frontal 03')).toBe('CF-03')
  })

  it('cae al patrón de código si no hay " - "', () => {
    expect(normalizarCodigoActivo('cf-03')).toBe('CF-03')
  })
})

describe('resolverIdentidades', () => {
  // Prueba obligatoria #1 (S-A2 §"Pruebas obligatorias"): une los equipos que
  // sí tienen contraparte y reporta el huérfano como identidadResuelta:false,
  // sin forzarlo.
  it('une por no_activo × description y reporta el huérfano sin forzarlo', () => {
    const equipos = [
      equipo({ id: 1, no_activo: 'CF-03 - Cargador frontal 03' }),
      equipo({ id: 2, no_activo: 'EX-07 - Excavadora 07' }),
      equipo({ id: 3, no_activo: 'MC-99 - Minicargador 99' }), // sin contraparte
    ]
    const vehiculos = [vehiculo({ id: 101, description: 'CF-03' }), vehiculo({ id: 102, description: 'EX-07' })]

    const vinculos = resolverIdentidades(equipos, vehiculos, [])

    expect(vinculos[0]).toMatchObject({ identidadResuelta: true, nivelResolucion: 2 })
    expect(vinculos[0].vehiculo?.id).toBe(101)
    expect(vinculos[1]).toMatchObject({ identidadResuelta: true, nivelResolucion: 2 })
    expect(vinculos[1].vehiculo?.id).toBe(102)

    expect(vinculos[2].identidadResuelta).toBe(false)
    expect(vinculos[2].vehiculo).toBeNull()
    expect(vinculos[2].nivelResolucion).toBeNull()
  })

  it('prioriza el nivel 1 (remote_id de tarea) sobre no_activo × description', () => {
    const equipos = [equipo({ id: 1, no_activo: 'CF-03 - Cargador frontal 03' })]
    // Dos vehículos: uno cuya description coincidiría por nivel 2, y otro
    // enlazado por remote_id — debe ganar el segundo (nivel 1).
    const vehiculos = [vehiculo({ id: 101, description: 'CF-03' }), vehiculo({ id: 202, description: 'OTRO' })]
    const tareas = [tarea({ id: 900, remote_id: '1', assigned_vehicle_id: 202 })]

    const [vinculo] = resolverIdentidades(equipos, vehiculos, tareas)

    expect(vinculo.nivelResolucion).toBe(1)
    expect(vinculo.vehiculo?.id).toBe(202)
  })

  it('cae al nivel 3 (clave) cuando no_activo no coincide con ningún vehículo', () => {
    const equipos = [equipo({ id: 1, no_activo: 'SIN-MATCH', clave: 'CF-03' })]
    const vehiculos = [vehiculo({ id: 101, description: 'CF-03' })]

    const [vinculo] = resolverIdentidades(equipos, vehiculos, [])

    expect(vinculo.identidadResuelta).toBe(true)
    expect(vinculo.nivelResolucion).toBe(3)
  })
})

describe('solicitudesDeEquipo / solicitudPrincipal', () => {
  function solicitud(parcial: Partial<SolicitudPrismaCruda> & { id: number | string }): SolicitudPrismaCruda {
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
      project_name: null,
      ...parcial,
    }
  }

  it('enlaza por maquinaria_id === equipo.id (verificado 5/5) y prioriza APROBADA', () => {
    const eq = equipo({ id: 7 })
    const solicitudes = [
      solicitud({ id: 1, maquinaria_id: 7, status: 'RECHAZADA', created_at: '2026-09-10' }),
      solicitud({ id: 2, maquinaria_id: 7, status: 'APROBADA', created_at: '2026-09-11' }),
      solicitud({ id: 3, maquinaria_id: 99, status: 'APROBADA' }), // de otro equipo
    ]

    const deEquipo = solicitudesDeEquipo(eq, solicitudes)
    expect(deEquipo).toHaveLength(2)

    const principal = solicitudPrincipal(deEquipo)
    expect(principal?.id).toBe(2)
  })
})

describe('resolverTareaPrincipal', () => {
  it('prioriza el enlace determinístico por remote_id de la solicitud', () => {
    const eq = equipo({ id: 1, no_activo: 'CF-03' })
    const veh = vehiculo({ id: 101, description: 'CF-03' })
    const vinculo = { equipo: eq, vehiculo: veh, identidadResuelta: true, nivelResolucion: 2 as const }
    const solicitud: SolicitudPrismaCruda = {
      id: 55,
      project_id: null,
      tipo: null,
      status: 'APROBADA',
      approved_at: null,
      approved_by_name: null,
      maquinaria_id: 1,
      maquinaria_no_activo: null,
      maquinaria_nombre: null,
      maquinaria_clave: null,
      fecha_inicio: null,
      fecha_fin: null,
      created_at: null,
      project_name: null,
    }
    const tareas = [
      tarea({ id: 900, remote_id: '55', assigned_vehicle_id: 999 }),
      tarea({ id: 901, assigned_vehicle_id: 101 }),
    ]

    const resolucion = resolverTareaPrincipal(vinculo, solicitud, tareas)
    expect(resolucion?.nivelConfianza).toBe('remote_id')
    expect(resolucion?.tarea.id).toBe(900)
  })

  it('cae a la heurística por vehículo asignado cuando no hay remote_id', () => {
    const eq = equipo({ id: 1, no_activo: 'CF-03' })
    const veh = vehiculo({ id: 101, description: 'CF-03' })
    const vinculo = { equipo: eq, vehiculo: veh, identidadResuelta: true, nivelResolucion: 2 as const }
    const tareas = [tarea({ id: 901, assigned_vehicle_id: 101 })]

    const resolucion = resolverTareaPrincipal(vinculo, null, tareas)
    expect(resolucion?.nivelConfianza).toBe('heuristica')
    expect(resolucion?.tarea.id).toBe(901)
  })

  it('devuelve null cuando no hay ninguna tarea enlazable', () => {
    const eq = equipo({ id: 1 })
    const vinculo = { equipo: eq, vehiculo: null, identidadResuelta: false, nivelResolucion: null }
    expect(resolverTareaPrincipal(vinculo, null, [])).toBeNull()
  })
})

describe('geocercaDeTarea / geocercaDeProyecto', () => {
  function geocerca(parcial: Partial<GeocercaStartrackCruda> & { id: number | string }): GeocercaStartrackCruda {
    return { name: null, address: null, x: null, y: null, group_id: null, ...parcial }
  }

  it('resuelve por poi_id (nivel 2 de la cascada de ubicación)', () => {
    const geocercas = [geocerca({ id: 5, name: 'PROY-014 - Proyecto de ejemplo' })]
    const t = tarea({ id: 1, poi_id: 5 })
    expect(geocercaDeTarea(t, geocercas)?.id).toBe(5)
  })

  it('resuelve la geocerca del proyecto por el código PROY-### embebido en el nombre (nivel 3)', () => {
    const geocercas = [geocerca({ id: 5, name: 'PROY-014 - Proyecto de ejemplo' })]
    const eq = equipo({ id: 1, project_name: 'PROY-014 - Proyecto de ejemplo (otro orden)' })
    expect(geocercaDeProyecto(eq, geocercas)?.id).toBe(5)
  })
})
