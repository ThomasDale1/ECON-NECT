// Prueba pura de los parámetros del navegador (S-A11 Paso 12). Solo
// parámetros nuestros; ningún registro de ECON.

import { describe, expect, it } from 'vitest'
import { leerParametrosDeQuery, parametrosSchema, parsearParametros, umbralesDe } from './parametros'

describe('parametrosSchema', () => {
  it('acepta el mínimo válido y un equipo con intervalo y régimen', () => {
    expect(parametrosSchema.safeParse({ version: 1, porEquipo: {} }).success).toBe(true)
    expect(
      parametrosSchema.safeParse({ version: 1, porEquipo: { '12': { intervaloHoras: 40, severo: true } } }).success,
    ).toBe(true)
  })

  it.each([0, 20_001, 12.5])('rechaza intervaloHoras = %s', (intervaloHoras) => {
    expect(parametrosSchema.safeParse({ version: 1, porEquipo: { a: { intervaloHoras } } }).success).toBe(false)
  })

  it('rechaza umbrales desordenados o fuera de rango', () => {
    expect(
      parametrosSchema.safeParse({ version: 1, porEquipo: {}, umbrales: { aviso: 90, urgente: 80, vencido: 100 } })
        .success,
    ).toBe(false)
    expect(
      parametrosSchema.safeParse({ version: 1, porEquipo: {}, umbrales: { aviso: 80, urgente: 90, vencido: 501 } })
        .success,
    ).toBe(false)
    expect(
      parametrosSchema.safeParse({ version: 1, porEquipo: {}, umbrales: { aviso: 0, urgente: 90, vencido: 100 } })
        .success,
    ).toBe(false)
  })

  it('rechaza más de 100 equipos', () => {
    const porEquipo = Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`e${i}`, { severo: true }]))
    expect(parametrosSchema.safeParse({ version: 1, porEquipo }).success).toBe(false)
  })

  it('rechaza una versión distinta de 1 y campos desconocidos', () => {
    expect(parametrosSchema.safeParse({ version: 2, porEquipo: {} }).success).toBe(false)
    expect(parametrosSchema.safeParse({ version: 1, porEquipo: {}, extra: true }).success).toBe(false)
  })
})

describe('leerParametrosDeQuery / parsearParametros', () => {
  it('sin ?parametros devuelve los vacíos', () => {
    const r = leerParametrosDeQuery(new URLSearchParams())
    expect(r).toEqual({ ok: true, parametros: { version: 1, porEquipo: {} } })
  })

  it('JSON inválido → mensaje', () => {
    expect(parsearParametros('{no').ok).toBe(false)
  })

  it('JSON > 8 KB → mensaje', () => {
    const grande = JSON.stringify({ version: 1, porEquipo: {}, relleno: 'x'.repeat(9_000) })
    const r = parsearParametros(grande)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.mensaje).toMatch(/8192 bytes/)
  })

  it('umbralesDe devuelve 80/90/100 por defecto', () => {
    expect(umbralesDe({ version: 1, porEquipo: {} })).toEqual({ aviso: 80, urgente: 90, vencido: 100 })
  })
})
