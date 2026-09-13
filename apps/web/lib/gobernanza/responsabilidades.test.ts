import { describe, expect, it } from 'vitest'
import {
  GERENCIAS_OBLIGATORIAS,
  MATRIZ_RESPONSABILIDADES,
  responsabilidadesACsv,
} from './responsabilidades'

describe('MATRIZ_RESPONSABILIDADES', () => {
  it('incluye explícitamente las tres gerencias requeridas en cada paso', () => {
    expect(GERENCIAS_OBLIGATORIAS).toEqual([
      'Gerencia de Mantenimiento',
      'Gerencia de Logística y Equipos',
      'Gerencia Técnica de Proyectos',
    ])

    for (const fila of MATRIZ_RESPONSABILIDADES) {
      expect(Object.keys(fila.responsabilidades).sort()).toEqual(
        [...GERENCIAS_OBLIGATORIAS].sort(),
      )
    }
  })

  it('explica cada responsabilidad sin depender de letras RACI', () => {
    for (const fila of MATRIZ_RESPONSABILIDADES) {
      expect(fila.situacionActual.length).toBeGreaterThan(20)
      expect(fila.conPlataformaIntegrada.length).toBeGreaterThan(20)
      for (const gerencia of GERENCIAS_OBLIGATORIAS) {
        expect(fila.responsabilidades[gerencia].detalle.length).toBeGreaterThan(20)
        expect(fila.responsabilidades[gerencia].participacion).not.toMatch(/^[RACI]$/)
      }
    }
  })

  it('exporta AS-IS, TO-BE, las tres gerencias y preguntas pendientes', () => {
    const csv = responsabilidadesACsv(MATRIZ_RESPONSABILIDADES)
    expect(csv).toContain('situacionActual')
    expect(csv).toContain('conPlataformaIntegrada')
    for (const gerencia of GERENCIAS_OBLIGATORIAS) expect(csv).toContain(gerencia)
    expect(csv).toContain('preguntaPendiente')
  })
})
