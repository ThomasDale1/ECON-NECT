// Prueba obligatoria (S-C2 §Pruebas): calcularTasaCoherencia y
// calcularCobertura validadas a mano contra EQUIPOS_EJEMPLO.
//
// EQUIPOS_EJEMPLO trae 3 equipos fabricados (lib/tipos/ejemplo.ts):
//   demo-eq-001 — identidadResuelta true,  veredicto COHERENTE
//   demo-eq-002 — identidadResuelta true,  veredicto EN_RIESGO
//   demo-eq-003 — identidadResuelta false, veredicto SIN_EVIDENCIA
//
// A mano: cobertura = 2 resueltos / 3 total. tasa de coherencia = 1 COHERENTE
// / 2 con identidad resuelta (el no resuelto no cuenta en el denominador).

import { describe, expect, it } from 'vitest'
import { EQUIPOS_EJEMPLO } from '@/lib/tipos/ejemplo'
import { calcularCobertura, calcularLatencia, calcularTasaCoherencia, tiempoMuertoQuetzales } from './calculo'

describe('calcularTasaCoherencia', () => {
  it('divide COHERENTE entre identidad resuelta, contra EQUIPOS_EJEMPLO', () => {
    const resultado = calcularTasaCoherencia(EQUIPOS_EJEMPLO)
    expect(resultado).toEqual({ valor: 0.5, numerador: 1, denominador: 2 })
  })

  it('devuelve valor null si nadie tiene identidad resuelta', () => {
    const sinResolver = EQUIPOS_EJEMPLO.map((eq) => ({ ...eq, identidadResuelta: false }))
    const resultado = calcularTasaCoherencia(sinResolver)
    expect(resultado).toEqual({ valor: null, numerador: 0, denominador: 0 })
  })
})

describe('calcularCobertura', () => {
  it('divide identidad resuelta entre el total, contra EQUIPOS_EJEMPLO', () => {
    const resultado = calcularCobertura(EQUIPOS_EJEMPLO)
    expect(resultado).toEqual({ valor: 2 / 3, resueltos: 2, total: 3 })
  })

  it('devuelve valor null con una flota vacía', () => {
    expect(calcularCobertura([])).toEqual({ valor: null, resueltos: 0, total: 0 })
  })
})

describe('calcularLatencia', () => {
  it('devuelve null si no hay pares enlazados (0 de N aprobadas)', () => {
    expect(calcularLatencia([])).toEqual({ valor: null, cobertura: 0, muestras: 0 })
  })

  it('promedia horas entre aprobación y creación de tarea sobre los pares dados', () => {
    const pares = [
      { approvedAt: '2026-09-10T08:00:00.000Z', taskCreatedAt: '2026-09-10T12:00:00.000Z' }, // 4h
    ]
    const resultado = calcularLatencia(pares)
    expect(resultado).toEqual({ valor: 4, cobertura: 1, muestras: 1 })
  })
})

describe('tiempoMuertoQuetzales', () => {
  it('nunca devuelve un número: declara el dato faltante del catálogo', () => {
    const resultado = tiempoMuertoQuetzales()
    expect(resultado.valor).toBeNull()
    expect(resultado.datoFaltante.length).toBeGreaterThan(0)
  })
})
