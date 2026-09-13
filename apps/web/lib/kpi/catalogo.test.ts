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

describe('CATALOGO_KPI — moneda corregida a USD (S-C4)', () => {
  it('tiempo-muerto-quetzales ahora se presenta en USD, sin renombrar id ni función', () => {
    const encontrado = kpi('tiempo-muerto-quetzales')
    expect(encontrado.nombre).toBe('Tiempo muerto en USD')
    expect(encontrado.nombre).not.toMatch(/quetzales/i)
    expect(`${encontrado.queMide} ${encontrado.porQueImporta} ${encontrado.formula}`).toMatch(/USD.*moneda inferida/i)
  })
})

describe('CATALOGO_KPI — los dos KPIs del optimizador (S-A10)', () => {
  const idsOptimizador = ['ahorro-por-objetivo-optimizador', 'cobertura-plan-optimizador']

  it('los ids del optimizador son exactamente dos', () => {
    const encontrados = CATALOGO_KPI.filter((k) => k.id.endsWith('-optimizador')).map((k) => k.id)
    expect([...encontrados].sort()).toEqual([...idsOptimizador].sort())
  })

  it.each(idsOptimizador)('%s existe con sus seis campos no vacíos y datoFaltante null (es calculable)', (id) => {
    const encontrado = kpi(id)
    expect(encontrado.queMide.length).toBeGreaterThan(0)
    expect(encontrado.porQueImporta.length).toBeGreaterThan(0)
    expect(encontrado.formula.length).toBeGreaterThan(0)
    expect(encontrado.referencia.length).toBeGreaterThan(0)
    expect(encontrado.accionQueDispara.length).toBeGreaterThan(0)
    expect(encontrado.porQueNingunaPlataformaLoVeSola.length).toBeGreaterThan(0)
    expect(encontrado.datoFaltante).toBeNull()
  })

  it('ya no existe el KPI del pronóstico del tiempo (salió el 13 de septiembre de 2026)', () => {
    expect(
      CATALOGO_KPI.some((k) => /precipitaci[oó]n|pron[oó]stico/i.test(`${k.id} ${k.nombre} ${k.queMide} ${k.formula}`)),
    ).toBe(false)
  })

  it('el ahorro se mide contra la peor opción válida, no contra la asignación manual', () => {
    expect(kpi('ahorro-por-objetivo-optimizador').nombre).toBe('Ahorro del plan frente a la peor opción válida')
  })

  it('el lowboy no entra al catálogo: el sandbox no modela transporte', () => {
    expect(CATALOGO_KPI.some((k) => /lowboy/i.test(k.id) || /lowboy/i.test(k.nombre))).toBe(false)
  })
})
