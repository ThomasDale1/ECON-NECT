// Datos fabricados — no provienen del sandbox (AGENTS.md §1.2).

import { describe, expect, it } from 'vitest'
import {
  conductorDesdeStartrack,
  estadoDelConductor,
  lecturaAsignacion,
  personalDesdePrisma,
} from './asignacion'

const linajePrisma = { plataforma: 'prisma' as const, endpoint: '/api/maquinaria/equipos', leidoEn: '2026-09-13T00:00:00Z' }
const linajeStartrack = { plataforma: 'startrack' as const, endpoint: 'ajax/drivers.php?cmd=list', leidoEn: '2026-09-13T00:00:00Z' }

describe('personalDesdePrisma', () => {
  it('devuelve null si assigned_personnel está vacío', () => {
    expect(personalDesdePrisma(null, linajePrisma)).toBeNull()
    expect(personalDesdePrisma([], linajePrisma)).toBeNull()
  })

  it('lee nombre y código de un objeto fabricado', () => {
    const persona = personalDesdePrisma(
      { nombre: 'Operador EQ-DEMO', cod_trabajador: 'OP-DEMO-1' },
      linajePrisma,
    )
    expect(persona?.etiqueta).toBe('Operador EQ-DEMO')
    expect(persona?.codigo).toBe('OP-DEMO-1')
    expect(persona?.linaje.campo).toBe('assigned_personnel')
  })
})

describe('conductorDesdeStartrack', () => {
  it('devuelve null sin conductor', () => {
    expect(conductorDesdeStartrack(null, linajeStartrack)).toBeNull()
  })

  it('arma el nombre con fn + ln y no usa email ni teléfono', () => {
    const persona = conductorDesdeStartrack(
      { i: 99, fn: 'Conductor', ln: 'EQ-DEMO', cd: 'CD-DEMO', e: 'no-usar@example.test', p: '00000000' },
      linajeStartrack,
    )
    expect(persona?.etiqueta).toBe('Conductor EQ-DEMO')
    expect(persona?.codigo).toBe('CD-DEMO')
    expect(JSON.stringify(persona)).not.toContain('no-usar@example.test')
    expect(JSON.stringify(persona)).not.toContain('00000000')
  })
})

describe('lectura de asignación', () => {
  const prisma = personalDesdePrisma({ nombre: 'Operador EQ-DEMO', cod_trabajador: 'OP-DEMO-1' }, linajePrisma)
  const startrack = conductorDesdeStartrack({ i: 99, fn: 'Conductor', ln: 'EQ-DEMO', cd: 'CD-DEMO' }, linajeStartrack)

  it('nombra al conductor de la maquinaria y trata el operador de Prisma como otro catálogo', () => {
    const texto = lecturaAsignacion({ prisma, startrack })
    expect(texto).toContain('conductor de la maquinaria es Conductor EQ-DEMO')
    expect(texto).toContain('Operador EQ-DEMO')
    expect(texto).toContain('otro catálogo')
  })

  it('usa el conductor de Startrack cuando Prisma no asignó operador', () => {
    expect(lecturaAsignacion({ prisma: null, startrack })).toContain('conductor de la maquinaria es Conductor EQ-DEMO')
    expect(lecturaAsignacion({ prisma: null, startrack })).not.toContain('operador')
  })

  it('declara el hueco si nadie figura', () => {
    expect(lecturaAsignacion(null)).toContain('no trajo el conductor')
  })
})

describe('estadoDelConductor', () => {
  const startrack = conductorDesdeStartrack({ i: 99, fn: 'Conductor', ln: 'EQ-DEMO', cd: 'CD-DEMO' }, linajeStartrack)
  const vehiculo = {
    valor: 'Almorzando',
    objeto: 'recurso' as const,
    linaje: { ...linajeStartrack, campo: 'status', valorCrudo: '4' },
  }

  it('devuelve la palabra del estado, sin explicar de dónde sale', () => {
    const estado = estadoDelConductor({ prisma: null, startrack }, vehiculo)
    expect(estado).toBe('Almorzando')
    expect(estado).not.toMatch(/status|0–9|recurso/i)
  })

  // Sin conductor nombrado, un estado de vehículo no describe a nadie: la
  // interfaz omite la línea en vez de atribuirle un estado a un hueco.
  it('no atribuye estado si Startrack no nombra conductor', () => {
    expect(estadoDelConductor({ prisma: null, startrack: null }, vehiculo)).toBeNull()
    expect(estadoDelConductor(null, vehiculo)).toBeNull()
  })

  it('devuelve null si la lectura no trajo el estado del vehículo', () => {
    expect(estadoDelConductor({ prisma: null, startrack }, null)).toBeNull()
  })
})
