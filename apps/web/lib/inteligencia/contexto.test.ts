import { describe, expect, it } from 'vitest'
import { EQUIPOS_EJEMPLO } from '@/lib/tipos/ejemplo'
import { crearContextoOdin } from './contexto'


describe('crearContextoOdin', () => {
  it('minimiza el snapshot y nunca incluye valorCrudo ni coordenadas', () => {
    const context = crearContextoOdin(EQUIPOS_EJEMPLO[0])
    const serialized = JSON.stringify(context)

    expect(serialized).not.toContain('valorCrudo')
    expect(context.snapshot).not.toHaveProperty('lat')
    expect(context.snapshot).not.toHaveProperty('lon')
    expect(context.snapshot.asset_id).toBe(EQUIPOS_EJEMPLO[0].id)
  })

  it('declara ausentes las señales de mantenimiento no presentes en el contrato', () => {
    const context = crearContextoOdin(EQUIPOS_EJEMPLO[0])

    expect(context.maintenance_signals).toBeNull()
  })
})

// S-A11 Paso 8: las señales salen del pronóstico; lo que el sandbox no
// expone queda en null (nunca un sensor inventado). Solo parámetros nuestros.
import { calcularPronostico } from '@/lib/mantenimiento/calcular'
import { senalesMantenimiento } from './contexto'

describe('senalesMantenimiento', () => {
  const pronostico = calcularPronostico({
    equipo: EQUIPOS_EJEMPLO[0],
    vehiculoId: null,
    clase: null,
    paroActivo: null,
    marcaModelo: [],
    horometro: null,
    serie: [],
    linajeSerie: null,
    reportes: [],
    mantenimiento: null,
    parametros: { version: 1, porEquipo: {} },
    hoy: '2026-09-13',
    leidoEn: '2026-09-13T12:00:00.000Z',
  })

  it('sin horómetro ni intervalo: todo null salvo recent_failures = 0 real con lista vacía', () => {
    const s = senalesMantenimiento({
      pronostico,
      reportes: [],
      parametros: { version: 1, porEquipo: {} },
      hoy: '2026-09-13',
      horasUltimos7d: null,
    })
    expect(s.maintenance_overdue).toBeNull()
    expect(s.operating_hours_since_maintenance).toBeNull()
    expect(s.maintenance_interval_hours).toBeNull()
    expect(s.recent_failures).toBe(0)
    expect(s.abnormal_temperature_events).toBeNull()
    expect(s.utilization_last_7d).toBeNull()
  })

  it('con Prisma caída (reportes null) recent_failures es null, no 0', () => {
    const s = senalesMantenimiento({
      pronostico,
      reportes: null,
      parametros: { version: 1, porEquipo: {} },
      hoy: '2026-09-13',
      horasUltimos7d: 84,
    })
    expect(s.recent_failures).toBeNull()
    expect(s.utilization_last_7d).toBeCloseTo(0.5)
  })

  it('abnormal_temperature_events es null siempre (sensor_readings vacío en 14/14)', () => {
    const s = senalesMantenimiento({
      pronostico,
      reportes: [],
      parametros: { version: 1, porEquipo: {} },
      hoy: '2026-09-13',
      horasUltimos7d: 0,
    })
    expect(s.abnormal_temperature_events).toBeNull()
    expect(crearContextoOdin(EQUIPOS_EJEMPLO[0], s).maintenance_signals?.abnormal_temperature_events).toBeNull()
  })
})
