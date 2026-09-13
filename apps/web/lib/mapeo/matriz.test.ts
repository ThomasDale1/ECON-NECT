import { describe, expect, it } from 'vitest'
import { ALCANCE_MATRIZ_MAPEO, MATRIZ_MAPEO, matrizACsv } from './matriz'

describe('MATRIZ_MAPEO', () => {
  it('declara su alcance sin presentarse como copia exhaustiva del diccionario', () => {
    expect(ALCANCE_MATRIZ_MAPEO.estado).toMatch(/completa para el alcance/i)
    expect(ALCANCE_MATRIZ_MAPEO.limite).toMatch(/no equivale/i)
  })

  it('documenta nombre, tipo, ejemplo y cardinalidad para cada fila', () => {
    for (const fila of MATRIZ_MAPEO) {
      expect(fila.campoPrisma || fila.campoStartrack).toBeTruthy()
      expect(fila.prisma.tipoDato).not.toBe('')
      expect(fila.prisma.ejemplo).not.toBe('')
      expect(fila.startrack.tipoDato).not.toBe('')
      expect(fila.startrack.ejemplo).not.toBe('')
      expect(fila.cardinalidad).not.toBe('')
    }
  })

  it('hace visibles los mapeos no uno-a-uno y las ausencias de equivalencia', () => {
    expect(MATRIZ_MAPEO.some((fila) => fila.cardinalidad === '1:N')).toBe(true)
    expect(MATRIZ_MAPEO.some((fila) => fila.cardinalidad === 'sin equivalencia')).toBe(true)
    expect(MATRIZ_MAPEO.some((fila) => fila.tipoRelacion === 'mismo nombre, distinto significado')).toBe(true)
  })

  it('incluye los nuevos metadatos en la exportación CSV', () => {
    const encabezado = matrizACsv(MATRIZ_MAPEO).split('\n')[0]
    expect(encabezado).toContain('tipoDatoPrisma')
    expect(encabezado).toContain('ejemploStartrack')
    expect(encabezado).toContain('cardinalidad')
  })
})
