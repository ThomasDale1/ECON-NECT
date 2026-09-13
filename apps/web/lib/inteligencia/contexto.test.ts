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
