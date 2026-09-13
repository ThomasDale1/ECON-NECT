// Prueba pura del catálogo OEM (S-A11 Paso 4). No usa registros de ECON: son
// las filas del catálogo, parámetros nuestros con fuente externa.

import { describe, expect, it } from 'vitest'
import { CATALOGO_OEM, buscarIntervaloOem, claveOem } from './intervalos-oem'

describe('CATALOGO_OEM — cada fila lleva fuente y confianza', () => {
  it('tiene 11 filas', () => {
    expect(CATALOGO_OEM).toHaveLength(11)
  })

  it.each(CATALOGO_OEM.map((fila) => [`${fila.marca} ${fila.modelo}`, fila] as const))(
    '%s: fuente es una URL, confianza declarada, horas > 0',
    (_nombre, fila) => {
      expect(fila.fuente).toMatch(/^https?:\/\//)
      expect(['alta', 'media', 'media-alta']).toContain(fila.confianza)
      expect(fila.estandarHoras).toBeGreaterThan(0)
      expect(fila.severoHoras).toBeGreaterThan(0)
      expect(fila.severoHoras).toBeLessThanOrEqual(fila.estandarHoras)
    },
  )

  it('las 11 claves marca+modelo son únicas', () => {
    const claves = CATALOGO_OEM.map((fila) => claveOem(fila.marca, fila.modelo))
    expect(new Set(claves).size).toBe(11)
  })

  it('donde severo no lo declara el fabricante, es estándar ÷ 2 (regla rotulada)', () => {
    for (const fila of CATALOGO_OEM.filter((f) => !f.severoDeclaradoPorFabricante)) {
      expect(fila.severoHoras).toBe(fila.estandarHoras / 2)
    }
  })
})

describe('claveOem — normalización', () => {
  it('"John Deere" + "770 G" → johndeere770g', () => {
    expect(claveOem('John Deere', '770 G')).toBe('johndeere770g')
  })
  it('"Case" + "CX350 B" → casecx350b', () => {
    expect(claveOem('Case', 'CX350 B')).toBe('casecx350b')
  })
  it('"Volvo" + "60F" → volvo60f', () => {
    expect(claveOem('Volvo', '60F')).toBe('volvo60f')
  })
})

describe('buscarIntervaloOem — marca+modelo, marca+alias, solo modelo', () => {
  it('resuelve por marca + modelo exacto', () => {
    expect(buscarIntervaloOem({ marca: 'Caterpillar', modelo: '262D3' })?.modelo).toBe('262D3')
  })
  it('resuelve por marca + alias con espacios', () => {
    expect(buscarIntervaloOem({ marca: 'John Deere', modelo: '770 G' })?.modelo).toBe('770G')
    expect(buscarIntervaloOem({ marca: 'Volvo', modelo: 'L60F' })?.modelo).toBe('60F')
    expect(buscarIntervaloOem({ marca: 'CASE', modelo: 'cx350 b' })?.modelo).toBe('CX350B')
  })
  it('resuelve por solo modelo cuando la marca viene mal escrita y el modelo trae la marca', () => {
    expect(buscarIntervaloOem({ marca: 'jbc', modelo: 'JCB 3CX' })?.modelo).toBe('3CX')
  })
  it('devuelve null sin marca ni modelo, o con un modelo que no está en el catálogo', () => {
    expect(buscarIntervaloOem({ marca: null, modelo: null })).toBeNull()
    expect(buscarIntervaloOem({ marca: 'Caterpillar', modelo: '320D' })).toBeNull()
  })
})
