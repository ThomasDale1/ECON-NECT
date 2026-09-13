// Pruebas EN VIVO de los KPIs del optimizador (S-C4 §Pruebas). Nunca corren
// en `npm run test` (vitest.config.ts las excluye) — requieren el sandbox
// real y el solver local levantado. Corren con `npm run test:vivo`.
//
// Regla de esta suite (AGENTS.md §1.2/§9.6): sin datos inventados. Cada caso
// se recuenta a mano sobre una respuesta real de `planear()` — nunca
// fixtures ni `toMatchSnapshot`. Si el sandbox o el solver no responden, la
// prueba falla con un mensaje etiquetado — nunca `skip` en silencio.

import { beforeAll, describe, expect, it } from 'vitest'
import { CATALOGO_CLASE_EQUIPO } from '@/lib/canonico/catalogos'
import { asegurarEntornoCargado } from '@/lib/conectores/entorno'
import { leerInsumosOptimizador } from '@/lib/optimizador/insumos'
import { planear } from '@/lib/optimizador/planear'
import { SOFT_CONSTRAINTS } from '@/lib/optimizador/tipos'
import { calcularKpisOptimizador } from './optimizador'

asegurarEntornoCargado()

beforeAll(async () => {
  try {
    await leerInsumosOptimizador()
  } catch (error) {
    throw new Error(
      `PRECONDICIÓN FALLIDA: el sandbox no respondió (PRISMA_BASE_URL/STARTRACK_BASE_URL en .env.local): ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }

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
}, 60_000)

describe('calcularKpisOptimizador — pruebas en vivo (S-C4)', () => {
  it('1. cobertura recontada a mano: asignadas / (asignadas + sinAsignacion), excluidas fuera', async () => {
    const respuesta = await planear({ pila: [...SOFT_CONSTRAINTS], clasesSensiblesLluvia: [] })
    const kpis = calcularKpisOptimizador(respuesta)

    const evaluadasEsperadas = respuesta.asignaciones.length + respuesta.sinAsignacion.length
    expect(kpis.coberturaPlan.asignadas).toBe(respuesta.asignaciones.length)
    expect(kpis.coberturaPlan.evaluadas).toBe(evaluadasEsperadas)
    expect(kpis.coberturaPlan.excluidas).toBe(respuesta.excluidas.length)

    if (evaluadasEsperadas === 0) {
      expect(kpis.coberturaPlan.valor).toBeNull()
      expect(kpis.coberturaPlan.datoFaltante).not.toBeNull()
    } else {
      expect(kpis.coberturaPlan.valor).toBeCloseTo(respuesta.asignaciones.length / evaluadasEsperadas)
      expect(kpis.coberturaPlan.datoFaltante).toBeNull()
    }
  })

  it('2. lluvia: pila vacía de clases → datoFaltante; con todas las clases del catálogo, conteo coincide con recuento manual por clima.estado', async () => {
    const respuestaVacia = await planear({ pila: [...SOFT_CONSTRAINTS], clasesSensiblesLluvia: [] })
    const kpisVacia = calcularKpisOptimizador(respuestaVacia)
    expect(kpisVacia.lluviaClasesSensibles.asignacionesConLluvia).toBeNull()
    expect(kpisVacia.lluviaClasesSensibles.datoFaltante).not.toBeNull()

    const respuestaTodas = await planear({
      pila: [...SOFT_CONSTRAINTS],
      clasesSensiblesLluvia: [...CATALOGO_CLASE_EQUIPO],
    })
    const kpisTodas = calcularKpisOptimizador(respuestaTodas)

    const sensibles = respuestaTodas.asignaciones.filter((a) => a.clima.estado !== 'no_aplica')
    const sinPronostico = sensibles.filter((a) => a.clima.estado === 'sin_pronostico').length
    const conLluvia = sensibles.filter((a) => a.clima.estado === 'evaluado' && a.clima.diasConLluvia >= 1).length

    expect(kpisTodas.lluviaClasesSensibles.asignacionesSensibles).toBe(sensibles.length)
    expect(kpisTodas.lluviaClasesSensibles.sinPronostico).toBe(sinPronostico)

    if (sensibles.length > 0 && sinPronostico === sensibles.length) {
      expect(kpisTodas.lluviaClasesSensibles.asignacionesConLluvia).toBeNull()
      expect(kpisTodas.lluviaClasesSensibles.datoFaltante).not.toBeNull()
    } else {
      expect(kpisTodas.lluviaClasesSensibles.asignacionesConLluvia).toBe(conLluvia)
      expect(kpisTodas.lluviaClasesSensibles.datoFaltante).toBeNull()
    }
  })

  it('3. ahorro: comparables nunca cuenta null ni peorCasoAplicado; mejoraTotal coincide con suma manual con el sentido de cada objetivo', async () => {
    const respuesta = await planear({ pila: [...SOFT_CONSTRAINTS], clasesSensiblesLluvia: [] })
    const kpis = calcularKpisOptimizador(respuesta)

    expect(kpis.ahorroPorObjetivo.map((k) => k.objetivo)).toEqual(respuesta.pila)

    const conManual = respuesta.asignaciones.filter((a) => a.manual !== null)
    const totalAprobadasEsperado = conManual.length + respuesta.sinAsignacion.filter((s) => s.manual !== null).length

    for (const kpi of kpis.ahorroPorObjetivo) {
      const objetivo = kpi.objetivo
      const comparablesEsperadas = conManual.filter((a) => {
        const propuesta = a.objetivos[objetivo]
        const manual = a.manual!.objetivos[objetivo]
        return (
          propuesta.valor !== null && manual.valor !== null && !propuesta.peorCasoAplicado && !manual.peorCasoAplicado
        )
      })

      expect(kpi.comparables).toBe(comparablesEsperadas.length)
      expect(kpi.totalAprobadas).toBe(totalAprobadasEsperado)

      if (comparablesEsperadas.length === 0) {
        expect(kpi.mejoraTotal).toBeNull()
        expect(kpi.datoFaltante).not.toBeNull()
      } else {
        const minimiza = objetivo === 'distancia' || objetivo === 'tarifa'
        const sumaManual = comparablesEsperadas.reduce((suma, a) => {
          const valorPropuesto = a.objetivos[objetivo].valor!
          const valorManual = a.manual!.objetivos[objetivo].valor!
          return suma + (minimiza ? valorManual - valorPropuesto : valorPropuesto - valorManual)
        }, 0)
        expect(kpi.mejoraTotal).toBeCloseTo(sumaManual)
        expect(kpi.datoFaltante).toBeNull()
      }
    }
  })
})
