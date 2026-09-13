// Pruebas EN VIVO del optimizador (S-A7 Paso 7). Nunca corren en
// `npm run test` (vitest.config.ts las excluye) — requieren el sandbox real
// y el solver local levantado. Corren con `npm run test:vivo`.
//
// Regla de esta suite (AGENTS.md §1.2/§9.6): sin datos inventados. Cada caso
// especial se arma filtrando o transformando los insumos leídos en vivo —
// nunca fixtures ni `toMatchSnapshot`. Los `expect` son sobre conteos y
// propiedades, nunca sobre valores impresos. Si el sandbox o el solver no
// responden, la prueba falla con un mensaje etiquetado — nunca `skip` en
// silencio.

import { NextRequest } from 'next/server'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { puedeOperar } from '@/lib/canonico/estados'
import { idsIguales } from '@/lib/canonico/identidad'
import { ErrorClima, leerPronosticoLluvia } from '@/lib/conectores/clima'
import { asegurarEntornoCargado } from '@/lib/conectores/entorno'
import { adaptar } from './adaptador'
import { optimizarEnSolver } from './cliente'
import { ensamblar } from './ensamblar'
import { leerInsumosOptimizador, type InsumosOptimizador } from './insumos'
import { hoyElSalvador, planear } from './planear'
import { SOFT_CONSTRAINTS, type PeticionOptimizar, type SalidaSolver } from './tipos'
import { verificar } from './verificar'

asegurarEntornoCargado()

const peticionDefault: PeticionOptimizar = { pila: [...SOFT_CONSTRAINTS], clasesSensiblesLluvia: [] }

let insumosBase: InsumosOptimizador
let hoy: string

beforeAll(async () => {
  hoy = hoyElSalvador()

  try {
    insumosBase = await leerInsumosOptimizador()
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

describe('optimizador — pruebas en vivo (S-A7 Paso 7)', () => {
  it('1. nunca viola una hard constraint (H1/H2/H3) ni produce choques entre propuestas', async () => {
    const resultado = adaptar(insumosBase, peticionDefault, hoy)
    const salida = await optimizarEnSolver(resultado.entradaSolver)

    const violaciones = verificar(resultado.entradaSolver, salida)
    expect(violaciones, `verificar() encontró violaciones: ${violaciones.join('; ')}`).toEqual([])

    // Comprobación independiente contra los datos crudos, sin pasar por el
    // propio adaptador: clase, puedeOperar, ocupación, operador activo.
    const equipoPorId = new Map(insumosBase.datos.equipos.datos.map((e) => [String(e.id), e]))
    const solicitudPorId = new Map(insumosBase.datos.solicitudes.datos.map((s) => [String(s.id), s]))
    const operadorPorId = new Map(insumosBase.operadores.datos.map((o) => [String(o.id), o]))

    for (const a of salida.asignaciones) {
      const equipo = equipoPorId.get(a.maquinaId)
      const solicitud = solicitudPorId.get(a.solicitudId)
      const operador = operadorPorId.get(a.operadorId)
      expect(equipo, `máquina ${a.maquinaId} no existe en los equipos crudos`).toBeDefined()
      expect(solicitud, `solicitud ${a.solicitudId} no existe en las solicitudes crudas`).toBeDefined()
      expect(operador, `operador ${a.operadorId} no existe en los operadores crudos`).toBeDefined()

      // H1
      expect(equipo!.clase_equipo, 'H1: la clase de la máquina no coincide con la de la solicitud').toBe(
        solicitud!.tipo,
      )
      // H2a
      expect(puedeOperar(equipo!), 'H2: la máquina asignada no puede operar').toBe(true)
      // H3a
      expect(operador!.is_active, 'H3: el operador asignado no está activo').toBe(true)

      // H2b: sin choque con una ocupación real no propia de la máquina.
      if (equipo!.fecha_inicio_uso && equipo!.fecha_fin_uso) {
        const esPropia =
          (solicitud!.status ?? '').toUpperCase() === 'APROBADA' &&
          idsIguales(solicitud!.maquinaria_id, equipo!.id) &&
          idsIguales(solicitud!.project_id, equipo!.project_id)
        if (!esPropia) {
          const inicioEfectivo = solicitud!.fecha_inicio! > hoy ? solicitud!.fecha_inicio! : hoy
          const seEncima = equipo!.fecha_inicio_uso <= solicitud!.fecha_fin! && inicioEfectivo <= equipo!.fecha_fin_uso
          expect(seEncima, 'H2: la máquina asignada choca con una ocupación real no propia').toBe(false)
        }
      }
    }

    const diasPorSolicitud = new Map(resultado.entradaSolver.solicitudes.map((s) => [s.id, s]))
    for (let i = 0; i < salida.asignaciones.length; i++) {
      for (let j = i + 1; j < salida.asignaciones.length; j++) {
        const a = salida.asignaciones[i]
        const b = salida.asignaciones[j]
        if (a.solicitudId === b.solicitudId) continue
        const diasA = diasPorSolicitud.get(a.solicitudId)!
        const diasB = diasPorSolicitud.get(b.solicitudId)!
        const seEncima = diasA.inicioDia <= diasB.finDia && diasB.inicioDia <= diasA.finDia
        if (!seEncima) continue
        expect(a.maquinaId, 'choque de máquina entre solicitudes que se encima en fechas').not.toBe(b.maquinaId)
        expect(a.operadorId, 'choque de operador entre solicitudes que se encima en fechas').not.toBe(b.operadorId)
      }
    }
  })

  it('2. sin candidatas de una clase → esa solicitud queda sin asignación, con motivo', async () => {
    const resultadoBase = adaptar(insumosBase, peticionDefault, hoy)
    const solicitudElegida = [...resultadoBase.solicitudesEvaluables.values()].find((s) => s.clase.valor != null)
    expect(
      solicitudElegida,
      'no hay ninguna solicitud evaluable con clase conocida en el sandbox ahora mismo',
    ).toBeDefined()
    const clase = solicitudElegida!.clase.valor!

    const insumosSinClase: InsumosOptimizador = structuredClone(insumosBase)
    insumosSinClase.datos.equipos.datos = insumosSinClase.datos.equipos.datos.filter((e) => e.clase_equipo !== clase)

    const resultado = adaptar(insumosSinClase, peticionDefault, hoy)
    const candidatas = resultado.candidatasPorSolicitudId.get(solicitudElegida!.id)!
    expect(candidatas.claseCompatible).toBe(0)

    const motivo = resultado.motivoSinCandidatasPorSolicitudId.get(solicitudElegida!.id)
    expect(motivo).toBeDefined()
    expect(motivo).toContain(clase)

    const salida = await optimizarEnSolver(resultado.entradaSolver)
    expect(salida.asignaciones.some((a) => a.solicitudId === solicitudElegida!.id)).toBe(false)
  })

  it('3. sin operadores → infactible global, con un motivo que menciona a los operadores', async () => {
    const insumosSinOperadores: InsumosOptimizador = structuredClone(insumosBase)
    insumosSinOperadores.operadores.datos = []

    const resultado = adaptar(insumosSinOperadores, peticionDefault, hoy)
    expect(
      resultado.solicitudesEvaluables.size,
      'no hay ninguna solicitud evaluable en el sandbox ahora mismo',
    ).toBeGreaterThan(0)

    const salida = await optimizarEnSolver(resultado.entradaSolver)
    expect(salida.estado).toBe('sin_asignaciones')
    expect(salida.asignaciones).toHaveLength(0)

    const violaciones = verificar(resultado.entradaSolver, salida)
    expect(violaciones).toEqual([])

    const respuesta = ensamblar({
      peticion: peticionDefault,
      generadoEn: new Date().toISOString(),
      hoy,
      resultado,
      salida,
      climaPorSolicitudId: new Map(),
      avisosAdicionales: [],
    })
    expect(respuesta.estado).toBe('infactible')
    expect(respuesta.motivoInfactible).toMatch(/operador/i)
  })

  it('4. lexicográfico: la pila protege primero lo que va antes, con tolerancia 0', async () => {
    const [porTarifa, porDistancia] = await Promise.all([
      planear({ pila: ['tarifa', 'distancia'], clasesSensiblesLluvia: [] }),
      planear({ pila: ['distancia', 'tarifa'], clasesSensiblesLluvia: [] }),
    ])

    const nivel = (respuesta: typeof porTarifa, objetivo: string) =>
      respuesta.niveles.find((n) => n.objetivo === objetivo)!.valor

    expect(nivel(porTarifa, 'cobertura')).toBe(nivel(porDistancia, 'cobertura'))
    expect(nivel(porTarifa, 'tarifa')).toBeLessThanOrEqual(nivel(porDistancia, 'tarifa'))
    expect(nivel(porDistancia, 'distancia')).toBeLessThanOrEqual(nivel(porTarifa, 'distancia'))
  })

  it('5. el verificador atrapa un par mutado a una máquina de otra clase', async () => {
    const resultado = adaptar(insumosBase, peticionDefault, hoy)
    const salida = await optimizarEnSolver(resultado.entradaSolver)
    expect(salida.asignaciones.length, 'no hay ninguna asignación viva para mutar').toBeGreaterThan(0)

    const primera = salida.asignaciones[0]
    const maquinaOriginal = resultado.filasMaquina.find((m) => m.id === primera.maquinaId)!
    const otraClase = resultado.filasMaquina.find(
      (m) => m.claseEnCatalogo && m.clase.valor !== maquinaOriginal.clase.valor,
    )
    expect(otraClase, 'no hay ninguna máquina viva de otra clase para la mutación').toBeDefined()

    const salidaMutada: SalidaSolver = {
      ...salida,
      asignaciones: salida.asignaciones.map((a, i) => (i === 0 ? { ...a, maquinaId: otraClase!.id } : a)),
    }
    const violaciones = verificar(resultado.entradaSolver, salidaMutada)
    expect(violaciones.length).toBeGreaterThan(0)
  })

  it('6. peor caso y manual: honestidad de los valores sustituidos y de los no sustituidos', async () => {
    const respuesta = await planear(peticionDefault)

    let algunoConPeorCaso = false
    for (const a of respuesta.asignaciones) {
      if (a.objetivos.distancia.peorCasoAplicado) {
        algunoConPeorCaso = true
        expect(a.objetivos.distancia.motivo).not.toBeNull()
      }
      if (a.objetivos.tarifa.peorCasoAplicado) {
        expect(a.objetivos.tarifa.motivo).not.toBeNull()
      }
    }
    expect(
      algunoConPeorCaso,
      'ningún par tuvo distancia con peor caso aplicado; el sandbox observado (01 E.10) siempre tiene origen desconocido en la mayoría de máquinas disponibles',
    ).toBe(true)

    const conManual = [...respuesta.asignaciones, ...respuesta.sinAsignacion].filter((x) => x.manual !== null)
    expect(
      conManual.length,
      'no hay ninguna solicitud APROBADA con asignación manual resoluble en el sandbox ahora mismo',
    ).toBeGreaterThan(0)
    for (const entrada of conManual) {
      expect(entrada.manual!.objetivos.distancia.valor).toBeNull()
      expect(entrada.manual!.objetivos.distancia.motivo).not.toBeNull()
    }
  })

  it('7. clima: la URL a Open-Meteo redondea lat/lon a 1 decimal', async () => {
    const geocercaConCoords = insumosBase.datos.geocercas.datos.find((g) => g.y != null && g.x != null)
    expect(geocercaConCoords, 'no hay ninguna geocerca con x/y en el sandbox ahora mismo').toBeDefined()

    const fetchOriginal = globalThis.fetch.bind(globalThis)
    const espia = vi.spyOn(globalThis, 'fetch').mockImplementation((...args) => fetchOriginal(...args))
    let primeraLlamada: unknown
    try {
      await leerPronosticoLluvia(geocercaConCoords!.y!, geocercaConCoords!.x!)
    } catch (error) {
      if (!(error instanceof ErrorClima)) throw error
      // Open-Meteo puede fallar por razones de red ajenas a esta prueba; lo
      // que importa acá es la URL que se intentó llamar, ya capturada abajo.
    } finally {
      // Se captura `.mock.calls` ANTES de `mockRestore()`: restaurar el
      // espía también limpia su historial (mockRestore ⊇ mockReset ⊇ mockClear).
      primeraLlamada = espia.mock.calls[0]?.[0]
      espia.mockRestore()
    }

    expect(primeraLlamada, 'fetch nunca se llamó').toBeDefined()
    const urlLlamada = new URL(String(primeraLlamada))
    const decimales = (valor: string | null) => (valor?.split('.')[1] ?? '').length
    expect(decimales(urlLlamada.searchParams.get('latitude'))).toBeLessThanOrEqual(1)
    expect(decimales(urlLlamada.searchParams.get('longitude'))).toBeLessThanOrEqual(1)
  })

  it('8. ruta: POST con un id de pila inexistente responde 400 peticion_invalida', async () => {
    const { POST } = await import('@/app/api/optimizar/route')
    const request = new NextRequest('http://localhost/api/optimizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pila: ['inexistente'], clasesSensiblesLluvia: [] }),
    })

    const respuesta = await POST(request)
    expect(respuesta.status).toBe(400)
    const cuerpo = (await respuesta.json()) as { error: string }
    expect(cuerpo.error).toBe('peticion_invalida')
  })
})
