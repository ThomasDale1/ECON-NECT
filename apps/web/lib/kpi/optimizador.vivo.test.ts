// Pruebas EN VIVO de los KPIs del optimizador (S-C4 §Pruebas, reescritas en
// S-A10 Paso 11). Nunca corren en `npm run test` (vitest.config.ts las
// excluye) — requieren el sandbox real y el solver local levantado. Corren
// con `npm run test:vivo`.
//
// Regla de esta suite (AGENTS.md §1.2/§9.6): sin datos inventados. Cada caso
// se recuenta a mano sobre una respuesta real de `planear()` — nunca
// fixtures ni `toMatchSnapshot`. Los `expect` son sobre conteos y booleanos:
// ningún valor aparece en un mensaje de falla. Si el sandbox o el solver no
// responden, la prueba falla con un mensaje etiquetado — nunca `skip` en
// silencio.

import { beforeAll, describe, expect, it } from 'vitest'
import { asegurarEntornoCargado } from '@/lib/conectores/entorno'
import { planear } from '@/lib/optimizador/planear'
import { PRIORIDADES_PILA, SOFT_CONSTRAINTS, type RespuestaOptimizar } from '@/lib/optimizador/tipos'
import { calcularKpisOptimizador } from './optimizador'

asegurarEntornoCargado()

let respuesta: RespuestaOptimizar

beforeAll(async () => {
  const solverBaseUrl = process.env.SOLVER_BASE_URL
  if (!solverBaseUrl) {
    throw new Error('PRECONDICIÓN FALLIDA: falta SOLVER_BASE_URL en .env.local')
  }
  try {
    const salud = await fetch(`${solverBaseUrl.replace(/\/$/, '')}/salud`)
    if (!salud.ok) throw new Error(`status ${salud.status}`)
  } catch (error) {
    throw new Error(
      `PRECONDICIÓN FALLIDA: solver no disponible en ${solverBaseUrl} — levantalo con ` +
        `"uv run uvicorn app.main:app --port 8000" en services/solver/ (${
          error instanceof Error ? error.message : String(error)
        })`,
    )
  }

  try {
    respuesta = await planear({ pila: [...PRIORIDADES_PILA], planAnterior: null })
  } catch (error) {
    throw new Error(
      `PRECONDICIÓN FALLIDA: el sandbox o el solver no respondieron al planear: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}, 120_000)

describe('calcularKpisOptimizador — pruebas en vivo (S-C4 / S-A10)', () => {
  it('1. cubiertas recontadas a mano: cubiertas, evaluadas, no cubiertas y excluidas', () => {
    const kpis = calcularKpisOptimizador(respuesta)
    const cubiertas = kpis.solicitudesCubiertas

    expect(cubiertas.cubiertas).toBe(respuesta.asignaciones.length)
    expect(cubiertas.evaluadas).toBe(cubiertas.cubiertas + respuesta.sinAsignacion.length)
    expect(cubiertas.noCubiertas.length).toBe(respuesta.sinAsignacion.length)
    expect(cubiertas.excluidas).toBe(respuesta.excluidas.length)
    expect(cubiertas.datoFaltante === null).toBe(cubiertas.evaluadas > 0)
  })

  it('2. ahorro: comparables sin nulos ni peor caso, toda mejora ≥ 0 y mejoraTotal igual a la suma manual', () => {
    const kpis = calcularKpisOptimizador(respuesta)

    expect(kpis.ahorroPorObjetivo.map((k) => k.objetivo)).toEqual([...SOFT_CONSTRAINTS])

    for (const kpi of kpis.ahorroPorObjetivo) {
      const objetivo = kpi.objetivo
      const comparablesManual = respuesta.asignaciones.filter(
        (a) =>
          a.objetivos[objetivo].valor !== null &&
          !a.objetivos[objetivo].peorCasoAplicado &&
          a.peorOpcionValida[objetivo].valor !== null,
      )
      const mejoras = comparablesManual.map((a) => {
        const elegido = a.objetivos[objetivo].valor!
        const peor = a.peorOpcionValida[objetivo].valor!
        return objetivo === 'ratingOperador' ? elegido - peor : peor - elegido
      })

      expect(kpi.comparables, `${objetivo}: comparables no coincide con el recuento manual`).toBe(comparablesManual.length)
      expect(kpi.asignaciones).toBe(respuesta.asignaciones.length)
      expect(kpi.enPila).toBe(respuesta.pila.includes(objetivo))
      expect(
        mejoras.filter((m) => m < -1e-9).length,
        `${objetivo}: una mejora por asignación comparable es negativa`,
      ).toBe(0)

      if (comparablesManual.length === 0) {
        expect(kpi.mejoraTotal === null && kpi.mejoraPromedio === null, `${objetivo}: sin comparables la cifra no es null`).toBe(
          true,
        )
        expect(kpi.datoFaltante !== null, `${objetivo}: sin comparables no trae datoFaltante`).toBe(true)
      } else {
        const sumaManual = mejoras.reduce((suma, m) => suma + m, 0)
        expect(
          kpi.mejoraTotal !== null && Math.abs(kpi.mejoraTotal - sumaManual) < 1e-6,
          `${objetivo}: mejoraTotal no coincide con la suma manual`,
        ).toBe(true)
        expect(
          kpi.mejoraPromedio !== null && Math.abs(kpi.mejoraPromedio - sumaManual / comparablesManual.length) < 1e-6,
          `${objetivo}: mejoraPromedio no coincide con la suma manual / comparables`,
        ).toBe(true)
        expect(kpi.datoFaltante).toBeNull()
      }
    }
  })

  it('3. las no cubiertas se listan en orden de llegada (created_at), sin marca al final', () => {
    const kpis = calcularKpisOptimizador(respuesta)
    const marca = (valor: string | null) => {
      const m = valor ? Date.parse(valor) : Number.NaN
      return Number.isNaN(m) ? Number.POSITIVE_INFINITY : m
    }
    const marcas = kpis.solicitudesCubiertas.noCubiertas.map((s) => marca(s.creadaEn))
    const inversiones = marcas.filter((m, i) => i > 0 && m < marcas[i - 1]).length
    expect(inversiones, 'una no cubierta aparece antes que otra que llegó primero').toBe(0)
  })
})
