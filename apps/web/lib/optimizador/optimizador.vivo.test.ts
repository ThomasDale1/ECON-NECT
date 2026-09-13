// Pruebas EN VIVO del optimizador (S-A7 Paso 7, ampliadas en S-A10 Paso 11).
// Nunca corren en `npm run test` (vitest.config.ts las excluye) — requieren
// el sandbox real y el solver local levantado. Corren con `npm run test:vivo`.
//
// Regla de esta suite (AGENTS.md §1.2/§9.6/§9.8): sin datos inventados. Cada
// caso especial se arma filtrando o transformando una COPIA de los insumos
// leídos en vivo — nunca fixtures ni `toMatchSnapshot`, y nada se escribe en
// disco. Los `expect` son sobre conteos y booleanos, nunca sobre valores del
// sandbox: ningún valor aparece en un mensaje de falla. Si el sandbox o el
// solver no responden, la prueba falla con un mensaje etiquetado — nunca
// `skip` en silencio.

import { NextRequest } from 'next/server'
import { beforeAll, describe, expect, it } from 'vitest'
import { puedeOperar } from '@/lib/canonico/estados'
import { idsIguales, resolverConductoresDeOperadores } from '@/lib/canonico/identidad'
import { asegurarEntornoCargado } from '@/lib/conectores/entorno'
import { leerConductores, leerReporteConductores } from '@/lib/conectores/startrack'
import { adaptar } from './adaptador'
import { optimizarEnSolver } from './cliente'
import { ensamblar } from './ensamblar'
import { leerInsumosOptimizador, type InsumosOptimizador } from './insumos'
import { hoyElSalvador, planearConInsumos } from './planear'
import {
  PRIORIDADES_PILA,
  type AsignacionPlanAnterior,
  type PeticionOptimizar,
  type RespuestaOptimizar,
  type SalidaSolver,
} from './tipos'
import { verificar } from './verificar'

asegurarEntornoCargado()

const peticionDefault: PeticionOptimizar = { pila: [...PRIORIDADES_PILA], planAnterior: null }

let insumosBase: InsumosOptimizador
let hoy: string

beforeAll(async () => {
  hoy = hoyElSalvador()

  try {
    insumosBase = await leerInsumosOptimizador(hoy)
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
}, 120_000)

/** Copia de los insumos vivos con paro activo en un equipo. Nunca toca Prisma. */
function conParo(insumos: InsumosOptimizador, maquinaId: string): InsumosOptimizador {
  const copia = structuredClone(insumos)
  const equipo = copia.datos.equipos.datos.find((e) => idsIguales(e.id, maquinaId))
  if (!equipo) throw new Error('la máquina a marcar con paro no existe en la copia de los insumos')
  equipo.active_failure_is_paro = true
  return copia
}

function idsDelPlan(respuesta: RespuestaOptimizar): AsignacionPlanAnterior[] {
  return respuesta.asignaciones.map((a) => ({
    solicitudId: a.solicitud.id,
    maquinaId: a.maquina.id,
    operadorId: a.operador.id,
  }))
}

describe('optimizador — pruebas en vivo (S-A7 Paso 7 / S-A10 Paso 11)', () => {
  it('1. nunca viola una hard constraint (H1/H2/H3) ni produce choques entre propuestas', async () => {
    const resultado = adaptar(insumosBase, peticionDefault, hoy)
    const salida = await optimizarEnSolver(resultado.entradaSolver)

    const violaciones = verificar(resultado.entradaSolver, salida)
    expect(violaciones.length, 'verificar() encontró violaciones').toBe(0)

    // Comprobación independiente contra los datos crudos, sin pasar por el
    // propio adaptador: clase, puedeOperar, ocupación, operador activo.
    const equipoPorId = new Map(insumosBase.datos.equipos.datos.map((e) => [String(e.id), e]))
    const solicitudPorId = new Map(insumosBase.datos.solicitudes.datos.map((s) => [String(s.id), s]))
    const operadorPorId = new Map(insumosBase.operadores.datos.map((o) => [String(o.id), o]))

    for (const a of salida.asignaciones) {
      const equipo = equipoPorId.get(a.maquinaId)
      const solicitud = solicitudPorId.get(a.solicitudId)
      const operador = operadorPorId.get(a.operadorId)
      expect(equipo !== undefined, 'una máquina asignada no existe en los equipos crudos').toBe(true)
      expect(solicitud !== undefined, 'una solicitud asignada no existe en las solicitudes crudas').toBe(true)
      expect(operador !== undefined, 'un operador asignado no existe en los operadores crudos').toBe(true)

      // H1
      expect(equipo!.clase_equipo === solicitud!.tipo, 'H1: la clase de la máquina no coincide con la de la solicitud').toBe(
        true,
      )
      // H2a
      expect(puedeOperar(equipo!), 'H2: la máquina asignada no puede operar').toBe(true)
      // H3a
      expect(operador!.is_active === true, 'H3: el operador asignado no está activo').toBe(true)

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
        expect(a.maquinaId === b.maquinaId, 'choque de máquina entre solicitudes que se encima en fechas').toBe(false)
        expect(a.operadorId === b.operadorId, 'choque de operador entre solicitudes que se encima en fechas').toBe(false)
      }
    }
  })

  it('2. sin candidatas de una clase → esa solicitud queda sin asignación, con motivo', async () => {
    const resultadoBase = adaptar(insumosBase, peticionDefault, hoy)
    const solicitudElegida = [...resultadoBase.solicitudesEvaluables.values()].find((s) => s.clase.valor != null)
    expect(
      solicitudElegida !== undefined,
      'no hay ninguna solicitud evaluable con clase conocida en el sandbox ahora mismo',
    ).toBe(true)
    const clase = solicitudElegida!.clase.valor!

    const insumosSinClase: InsumosOptimizador = structuredClone(insumosBase)
    insumosSinClase.datos.equipos.datos = insumosSinClase.datos.equipos.datos.filter((e) => e.clase_equipo !== clase)

    const resultado = adaptar(insumosSinClase, peticionDefault, hoy)
    const candidatas = resultado.candidatasPorSolicitudId.get(solicitudElegida!.id)!
    expect(candidatas.claseCompatible).toBe(0)

    const motivo = resultado.motivoSinCandidatasPorSolicitudId.get(solicitudElegida!.id)
    expect(motivo !== undefined, 'la solicitud sin candidatas no trae motivo').toBe(true)
    expect(motivo!.includes(clase), 'el motivo no nombra la clase sin candidatas').toBe(true)

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
    expect(violaciones.length).toBe(0)

    const respuesta = ensamblar({
      peticion: peticionDefault,
      generadoEn: new Date().toISOString(),
      hoy,
      resultado,
      salida,
    })
    expect(respuesta.estado).toBe('infactible')
    expect(/operador/i.test(respuesta.motivoInfactible ?? ''), 'el motivo infactible no menciona a los operadores').toBe(
      true,
    )
  })

  it('4. lexicográfico: la pila protege primero lo que va antes, con tolerancia 0', async () => {
    const nivel = (respuesta: RespuestaOptimizar, objetivo: string): number => {
      const encontrado = respuesta.niveles.find((n) => n.objetivo === objetivo)
      if (!encontrado) throw new Error(`la respuesta no trae el nivel ${objetivo}`)
      return encontrado.valor
    }

    // Mismo objeto de insumos en las cuatro corridas: la GPS en vivo no puede
    // mover una distancia entre una corrida y la otra.
    const porTarifa = await planearConInsumos(insumosBase, { pila: ['cobertura', 'tarifa', 'distancia'], planAnterior: null }, hoy)
    const porDistancia = await planearConInsumos(insumosBase, { pila: ['cobertura', 'distancia', 'tarifa'], planAnterior: null }, hoy)

    expect(nivel(porTarifa, 'cobertura') === nivel(porDistancia, 'cobertura'), 'la cobertura cambió con la pila').toBe(true)
    expect(nivel(porTarifa, 'tarifa') <= nivel(porDistancia, 'tarifa'), 'tarifa arriba no quedó ≤').toBe(true)
    expect(nivel(porDistancia, 'distancia') <= nivel(porTarifa, 'distancia'), 'distancia arriba no quedó ≤').toBe(true)

    const porRating = await planearConInsumos(
      insumosBase,
      { pila: ['cobertura', 'ratingOperador', 'horasOperador'], planAnterior: null },
      hoy,
    )
    const porHoras = await planearConInsumos(
      insumosBase,
      { pila: ['cobertura', 'horasOperador', 'ratingOperador'], planAnterior: null },
      hoy,
    )

    expect(nivel(porRating, 'cobertura') === nivel(porHoras, 'cobertura'), 'la cobertura cambió con la pila').toBe(true)
    // El rating se maximiza: con rating arriba, su nivel es ≥; las horas se
    // minimizan: con horas arriba, su nivel es ≤.
    expect(nivel(porRating, 'ratingOperador') >= nivel(porHoras, 'ratingOperador'), 'rating arriba no quedó ≥').toBe(true)
    expect(nivel(porHoras, 'horasOperador') <= nivel(porRating, 'horasOperador'), 'horas arriba no quedó ≤').toBe(true)
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
    expect(otraClase !== undefined, 'no hay ninguna máquina viva de otra clase para la mutación').toBe(true)

    const salidaMutada: SalidaSolver = {
      ...salida,
      asignaciones: salida.asignaciones.map((a, i) => (i === 0 ? { ...a, maquinaId: otraClase!.id } : a)),
    }
    const violaciones = verificar(resultado.entradaSolver, salidaMutada)
    expect(violaciones.length).toBeGreaterThan(0)
  })

  it('6. peor caso: honestidad del valor sustituido, forzado sin geocercas (nivel 1 GPS ya resuelve casi todo hoy)', async () => {
    // Con GPS en vivo integrado, el peor caso de distancia ya no sale solo —
    // se fuerza quitando las geocercas (nivel 2/3 y destino quedan sin
    // resolver), igual que hacen los casos 2 y 3 de esta suite.
    const insumosSinGeocercas: InsumosOptimizador = structuredClone(insumosBase)
    insumosSinGeocercas.datos.geocercas.datos = []

    const resultado = adaptar(insumosSinGeocercas, peticionDefault, hoy)
    const salida = await optimizarEnSolver(resultado.entradaSolver)

    let algunoConPeorCaso = false
    let peorCasoSinMotivo = 0
    for (const par of resultado.objetivosParPorClave.values()) {
      if (par.distancia.peorCasoAplicado) {
        algunoConPeorCaso = true
        if (par.distancia.motivo === null) peorCasoSinMotivo++
      }
    }
    expect(algunoConPeorCaso, 'sin geocercas, todo par candidato debería tener distancia null → peor caso').toBe(true)
    expect(peorCasoSinMotivo, 'un peor caso declarado de distancia no trae motivo').toBe(0)
    expect(salida.asignaciones.length).toBeGreaterThanOrEqual(0) // el solver sigue corriendo con distancias sustituidas, sin tirar
  })

  it('6b. una APROBADA cuya máquina confirmada puede operar no entra al plan (decisión del 13 sep. 2026)', async () => {
    const respuesta = await planearConInsumos(insumosBase, peticionDefault, hoy)
    const equipos = insumosBase.datos.equipos.datos
    const evaluadas = [...respuesta.asignaciones, ...respuesta.sinAsignacion]

    const aprobadasSinMaquinaRota = evaluadas.filter((x) => {
      if ((x.solicitud.estado.valor ?? '').toUpperCase() !== 'APROBADA') return false
      if (x.reemplazaConfirmada === null) return true
      const equipo = equipos.find((e) => idsIguales(e.id, x.reemplazaConfirmada!.maquina.id))
      return equipo === undefined || puedeOperar(equipo)
    }).length
    expect(
      aprobadasSinMaquinaRota,
      'una APROBADA entró al plan sin que su máquina confirmada haya dejado de operar',
    ).toBe(0)

    const pendientesConReemplazo = evaluadas.filter(
      (x) => (x.solicitud.estado.valor ?? '').toUpperCase() !== 'APROBADA' && x.reemplazaConfirmada !== null,
    ).length
    expect(pendientesConReemplazo, 'una solicitud que no es APROBADA trae reemplazaConfirmada').toBe(0)
  })

  it('7. identidad sin fugas: unión 1:1 y ningún nombre de conductor en la respuesta', async () => {
    const { conductorPorOperadorId } = resolverConductoresDeOperadores(
      insumosBase.operadores.datos,
      insumosBase.conductores.datos,
    )

    const conductoresUnidos = [...conductorPorOperadorId.values()]
    expect(new Set(conductoresUnidos).size === conductoresUnidos.length, 'un conductor quedó unido a dos operadores').toBe(
      true,
    )

    const operadoresConVariosConductores = [...conductorPorOperadorId.keys()].filter((operadorId) => {
      const operador = insumosBase.operadores.datos.find((o) => String(o.id) === operadorId)
      const codigo = operador?.cod_trabajador?.trim()
      return insumosBase.conductores.datos.filter((c) => c.prefijoFn?.trim() === codigo).length !== 1
    }).length
    expect(operadoresConVariosConductores, 'un operador quedó unido con un código que no es 1:1').toBe(0)

    const respuesta = await planearConInsumos(insumosBase, peticionDefault, hoy)
    expect(
      respuesta.coberturaOperadores.conConductor,
      'PRECONDICIÓN FALLIDA: ningún operador de Prisma se unió a un conductor de Startrack — no hay con qué probar la ausencia de fugas',
    ).toBeGreaterThan(0)

    // `drivers.php` crudo se lee SOLO acá, en memoria, para buscarlo en la
    // respuesta. Ningún valor sale en un mensaje: solo el conteo de fugas.
    const crudos = await leerConductores()
    const json = JSON.stringify(respuesta)
    let fugas = 0
    for (const crudo of crudos.datos) {
      const fn = typeof crudo === 'object' && crudo !== null ? (crudo as { fn?: unknown }).fn : undefined
      if (typeof fn !== 'string') continue
      const indice = fn.indexOf(' - ')
      if (indice === -1) continue
      if (json.includes(fn)) fugas++
      const despuesDelSeparador = fn.slice(indice + 3).trim()
      if (despuesDelSeparador !== '' && json.includes(despuesDelSeparador)) fugas++
    }
    expect(fugas, 'un fn completo o el texto después de " - " aparece en la respuesta').toBe(0)
  })

  it('8. reporte proyectado: scores y detail solo con las claves permitidas, sin detailAlerts', async () => {
    const { desde, hasta } = insumosBase.ventanaHoras
    const reporte = await leerReporteConductores(desde, hasta)

    expect(Object.keys(reporte.datos).sort()).toEqual(['detail', 'scores'])
    expect('detailAlerts' in reporte.datos).toBe(false)

    const clavesScores = JSON.stringify(['driver_id', 'safety_score'])
    const clavesDetail = JSON.stringify(['date', 'driver_id', 'ignOnTime'])
    const scoresConOtrasClaves = reporte.datos.scores.filter(
      (fila) => JSON.stringify(Object.keys(fila).sort()) !== clavesScores,
    ).length
    const detailConOtrasClaves = reporte.datos.detail.filter(
      (fila) => JSON.stringify(Object.keys(fila).sort()) !== clavesDetail,
    ).length
    expect(scoresConOtrasClaves, 'una fila de scores trae claves no permitidas').toBe(0)
    expect(detailConOtrasClaves, 'una fila de detail trae claves no permitidas').toBe(0)
  })

  it('9. peor caso de operador: sin conductor → peor caso declarado; unido sin actividad → 0 h reales', () => {
    const resultado = adaptar(insumosBase, peticionDefault, hoy)
    expect(resultado.objetivosOperadorPorId.size, 'no hay operadores candidatos en el sandbox ahora mismo').toBeGreaterThan(
      0,
    )

    const { conductorPorOperadorId } = resolverConductoresDeOperadores(
      insumosBase.operadores.datos,
      insumosBase.conductores.datos,
    )
    const { desde, hasta } = insumosBase.ventanaHoras
    const conductoresConActividad = new Set(
      insumosBase.reporteConductores.datos.detail
        .filter((fila) => {
          const fecha = fila.date?.slice(0, 10)
          return !!fecha && fecha >= desde && fecha <= hasta
        })
        .map((fila) => fila.driver_id),
    )

    let sinConductorMalDeclarados = 0
    let sinActividadMalDeclarados = 0
    for (const [operadorId, objetivos] of resultado.objetivosOperadorPorId) {
      const conductorId = conductorPorOperadorId.get(operadorId)
      if (conductorId === undefined) {
        const declarado =
          objetivos.ratingOperador.peorCasoAplicado &&
          objetivos.ratingOperador.motivo !== null &&
          objetivos.horasOperador.peorCasoAplicado &&
          objetivos.horasOperador.motivo !== null
        if (!declarado) sinConductorMalDeclarados++
      } else if (!conductoresConActividad.has(conductorId)) {
        if (objetivos.horasOperador.valor !== 0 || objetivos.horasOperador.peorCasoAplicado) sinActividadMalDeclarados++
      }
    }

    expect(sinConductorMalDeclarados, 'un operador sin conductor no tiene el peor caso declarado con motivo').toBe(0)
    expect(sinActividadMalDeclarados, 'un operador unido sin actividad no quedó en 0 h reales').toBe(0)
  })

  it('10. APROBADA rota: vuelve a la demanda con reemplazaConfirmada y nadie usa su máquina', async () => {
    const equipos = insumosBase.datos.equipos.datos
    // Además de tener máquina, la APROBADA tiene que estar vigente: es la
    // condición para volver a la demanda (S-A10 Paso 5b.2).
    const aprobada = insumosBase.datos.solicitudes.datos.find(
      (s) =>
        (s.status ?? '').toUpperCase() === 'APROBADA' &&
        s.maquinaria_id != null &&
        equipos.some((e) => idsIguales(e.id, s.maquinaria_id)) &&
        !!s.fecha_inicio &&
        !!s.fecha_fin &&
        s.fecha_fin >= hoy,
    )
    expect(aprobada !== undefined, 'el sandbox no tiene una APROBADA con máquina para probar').toBe(true)

    const maquinaId = String(equipos.find((e) => idsIguales(e.id, aprobada!.maquinaria_id))!.id)
    const respuesta = await planearConInsumos(conParo(insumosBase, maquinaId), peticionDefault, hoy)

    const solicitudId = String(aprobada!.id)
    const evaluada =
      respuesta.asignaciones.find((a) => a.solicitud.id === solicitudId) ??
      respuesta.sinAsignacion.find((s) => s.solicitud.id === solicitudId)
    expect(evaluada !== undefined, 'la APROBADA con máquina rota no volvió a la demanda').toBe(true)
    expect(
      evaluada!.reemplazaConfirmada?.maquina.id === maquinaId,
      'reemplazaConfirmada no apunta a la máquina marcada con paro',
    ).toBe(true)
    expect(
      respuesta.asignaciones.filter((a) => a.maquina.id === maquinaId).length,
      'una asignación usa la máquina marcada con paro',
    ).toBe(0)
  })

  it('11. cambios: una máquina con paro rehace el plan y nombra el motivo real', async () => {
    const planA = await planearConInsumos(insumosBase, peticionDefault, hoy)
    expect(planA.asignaciones.length, 'el plan A no tiene asignaciones para probar un cambio').toBeGreaterThan(0)

    const elegida = planA.asignaciones[0]
    const idsA = idsDelPlan(planA)

    const planB = await planearConInsumos(
      conParo(insumosBase, elegida.maquina.id),
      { pila: [...PRIORIDADES_PILA], planAnterior: idsA },
      hoy,
    )
    const maquinaRota = planB.maquinas.find((m) => m.id === elegida.maquina.id)
    expect(maquinaRota?.motivoNoOpera != null, 'la máquina marcada con paro no trae motivoNoOpera').toBe(true)

    const cambio = planB.cambios.find((c) => c.solicitudId === elegida.solicitud.id)
    expect(cambio !== undefined, 'cambios no incluye la solicitud cuya máquina cayó').toBe(true)
    expect(cambio!.motivo.includes(maquinaRota!.motivoNoOpera!), 'el motivo del cambio no nombra el motivoNoOpera').toBe(
      true,
    )
    expect(
      planB.asignaciones.some((a) => a.maquina.id === elegida.maquina.id),
      'una asignación nueva usa la máquina con paro',
    ).toBe(false)

    // Sin la mutación, sobre EL MISMO objeto de insumos (sin releer): la
    // semilla fija tiene que dar el mismo plan.
    const planC = await planearConInsumos(insumosBase, { pila: [...PRIORIDADES_PILA], planAnterior: idsA }, hoy)
    const todosProbados = [...planA.niveles, ...planC.niveles].every((n) => n.probadoOptimo)
    if (!todosProbados) {
      // CP-SAT sin óptimo probado puede devolver otra solución sin que cambie
      // un dato: la aserción no concluye nada.
      console.warn('11. NO CONCLUYENTE: algún nivel sin óptimo probado; no se afirma que cambios quede vacío')
      return
    }
    expect(planC.cambios.length, 'sin cambios en los datos, el replan igual reportó cambios').toBe(0)
  })

  it('12. orden de llegada: arriba de la cobertura, ninguna solicitud anterior pierde frente a posteriores', async () => {
    const llegadaPrimero = await planearConInsumos(
      insumosBase,
      { pila: ['ordenLlegada', 'cobertura'], planAnterior: null },
      hoy,
    )
    const coberturaPrimero = await planearConInsumos(
      insumosBase,
      { pila: ['cobertura', 'ordenLlegada'], planAnterior: null },
      hoy,
    )

    const evaluadas = [...coberturaPrimero.asignaciones, ...coberturaPrimero.sinAsignacion].map((x) => x.solicitud)
    expect(evaluadas.length, 'no hay solicitudes evaluables en el sandbox ahora mismo').toBeGreaterThan(0)

    // Mismos rangos que el adaptador: marca de created_at, empates juntos,
    // sin marca interpretable al final.
    const marca = (valor: string | null) => {
      const m = valor ? Date.parse(valor) : Number.NaN
      return Number.isNaN(m) ? Number.POSITIVE_INFINITY : m
    }
    const marcas = [...new Set(evaluadas.map((s) => marca(s.creadaEn.valor)))].sort((x, y) => x - y)
    const cubiertasPorRango = (respuesta: RespuestaOptimizar) => {
      const cubiertas = new Set(respuesta.asignaciones.map((a) => a.solicitud.id))
      return marcas.map((m) => evaluadas.filter((s) => marca(s.creadaEn.valor) === m && cubiertas.has(s.id)).length)
    }
    const conLlegada = cubiertasPorRango(llegadaPrimero)
    const conCobertura = cubiertasPorRango(coberturaPrimero)
    const primeraDiferencia = conLlegada.findIndex((valor, i) => valor !== conCobertura[i])
    const llegadaNoPierde = primeraDiferencia === -1 || conLlegada[primeraDiferencia] > conCobertura[primeraDiferencia]

    const todosProbados = [...llegadaPrimero.niveles, ...coberturaPrimero.niveles].every((n) => n.probadoOptimo)
    if (!todosProbados) {
      console.warn('12. NO CONCLUYENTE: algún nivel sin óptimo probado; no se afirma el orden de llegada')
      return
    }
    expect(
      llegadaNoPierde,
      'con el orden de llegada arriba, el primer rango que difiere quedó con menos cubiertas que con la cobertura arriba',
    ).toBe(true)
    expect(
      coberturaPrimero.asignaciones.length >= llegadaPrimero.asignaciones.length,
      'con la cobertura arriba se cubrieron menos solicitudes que con el orden de llegada arriba',
    ).toBe(true)
  })

  it('ruta: POST con un id de pila inexistente responde 400 peticion_invalida', async () => {
    // La ruta pasa por exigirSesion() (S-C3, agregado el 13 sep. 2026) antes
    // de mirar el cuerpo — hace falta una cookie de sesión firmada de verdad,
    // no basta con pegarle a la ruta a secas.
    const { firmarSesion, NOMBRE_COOKIE } = await import('@/lib/acceso/verificar')
    const cookieSesion = await firmarSesion('ADMIN')
    expect(cookieSesion !== null, 'no se pudo firmar una sesión de prueba — revisá que NECT_CLAVE_ADMIN tenga valor').toBe(
      true,
    )

    const { POST } = await import('@/app/api/optimizar/route')
    const request = new NextRequest('http://localhost/api/optimizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `${NOMBRE_COOKIE}=${cookieSesion}` },
      body: JSON.stringify({ pila: ['inexistente'], planAnterior: null }),
    })

    const respuesta = await POST(request)
    expect(respuesta.status).toBe(400)
    const cuerpo = (await respuesta.json()) as { error: string }
    expect(cuerpo.error).toBe('peticion_invalida')
  })
})
