// La pila que acepta el servidor (agregado el 13 de septiembre de 2026, cuando
// la cobertura y el orden de llegada entraron a la pila). Sin datos del
// sandbox: solo ids de prioridades del contrato.

import { describe, expect, it } from 'vitest'
import { PRIORIDADES_PILA, PeticionOptimizarSchema } from './tipos'

function esValida(pila: unknown): boolean {
  return PeticionOptimizarSchema.safeParse({ pila, planAnterior: null }).success
}

describe('PeticionOptimizarSchema — la cobertura va antes que los objetivos por asignación', () => {
  it('acepta la pila por defecto (cobertura primero, orden de llegada último)', () => {
    expect(esValida([...PRIORIDADES_PILA])).toBe(true)
  })

  it('acepta el orden de llegada antes que la cobertura', () => {
    expect(esValida(['ordenLlegada', 'cobertura', 'distancia', 'tarifa'])).toBe(true)
  })

  it('rechaza una pila sin cobertura', () => {
    expect(esValida(['distancia', 'tarifa'])).toBe(false)
  })

  it('rechaza un objetivo por asignación antes que la cobertura', () => {
    expect(esValida(['distancia', 'cobertura'])).toBe(false)
    expect(esValida(['ordenLlegada', 'horasOperador', 'cobertura'])).toBe(false)
  })

  it('rechaza ids repetidos', () => {
    expect(esValida(['cobertura', 'cobertura'])).toBe(false)
  })
})
