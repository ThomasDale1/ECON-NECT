// Datos fabricados para la prueba — no provienen del sandbox (AGENTS.md §1.2).

import { describe, expect, it } from 'vitest'
import { estadoDesdeFalla, estadoDesdeVehiculo, puedeOperar } from './estados'
import type { EquipoPrismaCrudo, VehiculoStartrackCrudo } from './tipos-crudos'

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
    updated_at: null,
    ...parcial,
  }
}

// ⚠ La disponibilidad NO es el campo `estado` (01 Parte E.2): puedeOperar
// cruza estado + bandera de paro + falla activa.
describe('puedeOperar', () => {
  it('es true para un equipo DISPONIBLE sin falla ni paro (el caso de los 15 equipos hoy)', () => {
    expect(puedeOperar(equipo({ id: 1, estado: 'DISPONIBLE' }))).toBe(true)
  })

  it('es false cuando el equipo está OBSOLETA aunque no tenga falla', () => {
    expect(puedeOperar(equipo({ id: 1, estado: 'OBSOLETA' }))).toBe(false)
  })

  it('es false cuando hay bandera de paro activa, sin importar el estado', () => {
    expect(puedeOperar(equipo({ id: 1, estado: 'OCUPADA', active_failure_is_paro: true }))).toBe(false)
  })

  it('es false cuando hay una falla activa que no está FINALIZADO ni RECHAZADO', () => {
    expect(
      puedeOperar(equipo({ id: 1, estado: 'DISPONIBLE', active_failure_status: 'EN_PROCESO' })),
    ).toBe(false)
  })

  it('es true cuando la falla activa ya está FINALIZADO', () => {
    expect(
      puedeOperar(equipo({ id: 1, estado: 'DISPONIBLE', active_failure_status: 'FINALIZADO' })),
    ).toBe(true)
  })
})

describe('estadoDesdeFalla', () => {
  const procedencia = {
    plataforma: 'prisma' as const,
    endpoint: '/api/maquinaria/equipos',
    leidoEn: '2026-09-12T21:45:00.000Z',
  }

  it('es null cuando no hay falla activa — correcto, no es un hueco (01 E.2)', () => {
    expect(estadoDesdeFalla(equipo({ id: 1, active_failure_status: null }), procedencia)).toBeNull()
  })

  it('se etiqueta objeto:"falla" cuando sí hay una falla activa', () => {
    const estado = estadoDesdeFalla(equipo({ id: 1, active_failure_status: 'TRASLADO_STD' }), procedencia)
    expect(estado).toMatchObject({ valor: 'TRASLADO_STD', objeto: 'falla' })
  })
})



describe('estadoDesdeVehiculo — estado del conductor 0-9', () => {
  const procedencia = {
    plataforma: 'startrack' as const,
    endpoint: 'ajax/vehicles.php?cmd=list',
    leidoEn: '2026-09-13T08:00:00.000Z',
  }

  function vehiculo(status: string | null): VehiculoStartrackCrudo {
    return {
      id: 1,
      description: 'CF-01',
      veh_type: 8,
      make: null,
      model: null,
      status,
      tags: null,
      unit_id: null,
      driver_id: null,
      license_plate: null,
      last_contact_date: null,
    }
  }

  it('traduce 0 y null a Normal, y conserva el código en el linaje', () => {
    const cero = estadoDesdeVehiculo(vehiculo('0'), procedencia)
    expect(cero?.valor).toBe('Normal')
    expect(cero?.linaje.valorCrudo).toBe('0')
    const vacio = estadoDesdeVehiculo(vehiculo(null), procedencia)
    expect(vacio?.valor).toBe('Normal')
    expect(vacio?.linaje.valorCrudo).toBeNull()
  })

  it('traduce 1 y 2 a mantenimiento y fuera de servicio', () => {
    expect(estadoDesdeVehiculo(vehiculo('1'), procedencia)?.valor).toBe('Mantenimiento')
    expect(estadoDesdeVehiculo(vehiculo('2'), procedencia)?.valor).toBe('Fuera de servicio')
  })

  it('es null si no hay vehículo, no un Normal inventado', () => {
    expect(estadoDesdeVehiculo(null, procedencia)).toBeNull()
  })
})
