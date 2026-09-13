// Prueba obligatoria (S-C2 §Pruebas): cada `datoFaltante` refleja la realidad
// verificada el 12 de septiembre — tiempo muerto no calculable, latencia
// calculable pero parcial (con su cobertura documentada en `referencia`).

import { describe, expect, it } from 'vitest'
import { CATALOGO_KPI } from './catalogo'

function kpi(id: string) {
  const encontrado = CATALOGO_KPI.find((k) => k.id === id)
  if (!encontrado) throw new Error(`KPI no encontrado: ${id}`)
  return encontrado
}

describe('CATALOGO_KPI — honestidad de datoFaltante (AGENTS.md §1.1)', () => {
  it('tiempo-muerto-quetzales declara su hueco: no hay horas reales de uso', () => {
    expect(kpi('tiempo-muerto-quetzales').datoFaltante).not.toBeNull()
    expect(kpi('tiempo-muerto-quetzales').datoFaltante).toMatch(/horas reales de uso/i)
  })

  it('latencia-solicitud-traslado es calculable: datoFaltante null, cobertura documentada en referencia', () => {
    expect(kpi('latencia-solicitud-traslado').datoFaltante).toBeNull()
    expect(kpi('latencia-solicitud-traslado').referencia).toMatch(/1 de 5/)
  })

  it('tasa-coherencia y cobertura-interpretacion citan identidadResuelta y veredicto', () => {
    expect(kpi('tasa-coherencia').formula).toMatch(/identidadResuelta/)
    expect(kpi('tasa-coherencia').formula).toMatch(/veredicto|COHERENTE/)
    expect(kpi('cobertura-interpretacion').formula).toMatch(/identidadResuelta/)
  })
})
