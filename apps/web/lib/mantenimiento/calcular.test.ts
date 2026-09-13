// Pruebas puras del cálculo (S-A11 Paso 12). **Solo** entradas vacías o de
// parámetros: ningún registro del sandbox. Lo que se prueba con datos de ECON
// corre en vivo (`mantenimiento.vivo.test.ts`).

import { describe, expect, it } from 'vitest'
import { EQUIPOS_EJEMPLO } from '@/lib/tipos/ejemplo'
import { calcularPronostico, nivelPorAvance, ordenarAlertas, type EntradaPronostico } from './calcular'
import { UMBRALES_DEFECTO } from './parametros'

const equipo = EQUIPOS_EJEMPLO[0]

function entradaVacia(extra: Partial<EntradaPronostico> = {}): EntradaPronostico {
  return {
    equipo,
    vehiculoId: null,
    clase: null,
    paroActivo: null,
    marcaModelo: [],
    horometro: null,
    serie: [],
    linajeSerie: null,
    reportes: [],
    mantenimiento: null,
    parametros: { version: 1, porEquipo: {} },
    hoy: '2026-09-13',
    leidoEn: '2026-09-13T12:00:00.000Z',
    ...extra,
  }
}

describe('calcularPronostico — entradas vacías', () => {
  it('sin serie ni horómetro: horasDesdeAncla null, sin alerta, faltantes nombra el horómetro', () => {
    const p = calcularPronostico(entradaVacia())
    expect(p.horasDesdeAncla).toBeNull()
    expect(p.horasMotorTotales).toBeNull()
    expect(p.nivelAlerta).toBeNull()
    expect(p.avance).toBeNull()
    expect(p.ancla).toBeNull()
    expect(p.faltantes.join(' ')).toMatch(/horómetro GPS/)
    expect(p.faltantes.join(' ')).toMatch(/sin vehículo unido en Startrack/)
  })

  it('sin fila OEM ni reportes: intervalo.nivel sin_dato y faltantes lo dice', () => {
    const p = calcularPronostico(entradaVacia({ marcaModelo: [] }))
    expect(p.intervalo.nivel).toBe('sin_dato')
    expect(p.intervalo.horas).toBeNull()
    expect(p.faltantes.join(' ')).toMatch(/intervalo: sin fila OEM/)
  })

  it('parámetro intervaloHoras sin serie: sigue sin alerta (no se inventa avance) y lo nombra en parametrosAplicados', () => {
    const p = calcularPronostico(
      entradaVacia({ parametros: { version: 1, porEquipo: { [equipo.id]: { intervaloHoras: 40 } } } }),
    )
    expect(p.intervalo.nivel).toBe('sobreescrito')
    expect(p.intervalo.horas).toBe(40)
    expect(p.intervalo.origen).toBe('fijado a mano en este navegador')
    expect(p.avance).toBeNull()
    expect(p.nivelAlerta).toBeNull()
    expect(p.parametrosAplicados).toContain('intervalo fijado a mano: 40 h')
  })

  it('régimen severo sin fila OEM no cambia nada y no se declara aplicado', () => {
    const p = calcularPronostico(entradaVacia({ parametros: { version: 1, porEquipo: { [equipo.id]: { severo: true } } } }))
    expect(p.intervalo.nivel).toBe('sin_dato')
    expect(p.parametrosAplicados).toEqual([])
  })

  it('umbrales propios se declaran aplicados', () => {
    const p = calcularPronostico(
      entradaVacia({ parametros: { version: 1, porEquipo: {}, umbrales: { aviso: 70, urgente: 85, vencido: 100 } } }),
    )
    expect(p.parametrosAplicados).toContain('umbrales 70/85/100 %')
  })
})

describe('nivelPorAvance — tres umbrales y borde exacto', () => {
  it('por debajo del aviso: null', () => {
    expect(nivelPorAvance(0.799, UMBRALES_DEFECTO)).toBeNull()
  })
  it('borde exacto del aviso (0.80): aviso', () => {
    expect(nivelPorAvance(0.8, UMBRALES_DEFECTO)).toBe('aviso')
  })
  it('borde exacto del urgente (0.90): urgente', () => {
    expect(nivelPorAvance(0.9, UMBRALES_DEFECTO)).toBe('urgente')
  })
  it('borde exacto del vencido (1.00) y por encima: vencido', () => {
    expect(nivelPorAvance(1, UMBRALES_DEFECTO)).toBe('vencido')
    expect(nivelPorAvance(1.7, UMBRALES_DEFECTO)).toBe('vencido')
  })
  it('sin avance: null', () => {
    expect(nivelPorAvance(null, UMBRALES_DEFECTO)).toBeNull()
  })
  it('respeta umbrales propios', () => {
    expect(nivelPorAvance(0.5, { aviso: 50, urgente: 60, vencido: 70 })).toBe('aviso')
  })
})

describe('ordenarAlertas', () => {
  it('vencido > urgente > aviso, luego avance desc', () => {
    const base = calcularPronostico(entradaVacia())
    const a = { ...base, equipoId: 'a', nivelAlerta: 'aviso' as const, avance: 0.85 }
    const b = { ...base, equipoId: 'b', nivelAlerta: 'vencido' as const, avance: 1.1 }
    const c = { ...base, equipoId: 'c', nivelAlerta: 'vencido' as const, avance: 1.5 }
    const d = { ...base, equipoId: 'd', nivelAlerta: null, avance: 0.1 }
    expect(ordenarAlertas([a, b, c, d]).map((p) => p.equipoId)).toEqual(['c', 'b', 'a'])
  })
})
