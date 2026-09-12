import { describe, expect, it } from 'vitest'
import { EQUIPOS_DE_EJEMPLO } from './ejemplo'
import type { Veredicto } from './canonico'

/**
 * El contrato se prueba a sí mismo: si alguien cambia un tipo y los ejemplos
 * dejan de cumplirlo, esto falla antes de que el carril B lo descubra en
 * pantalla.
 */
describe('contrato canónico', () => {
  it('cubre los tres veredictos que la interfaz necesita dibujar', () => {
    const veredictos = EQUIPOS_DE_EJEMPLO.map((e) => e.veredicto)
    expect(veredictos).toEqual<Veredicto[]>(['COHERENTE', 'EN_RIESGO', 'SIN_EVIDENCIA'])
  })

  it('todo estado de origen conserva su valor crudo y qué objeto describe', () => {
    for (const equipo of EQUIPOS_DE_EJEMPLO) {
      const estados = [
        equipo.prisma.estadoEquipo,
        equipo.prisma.estadoSolicitud,
        equipo.prisma.estadoFalla,
        equipo.startrack.estadoVehiculo,
        equipo.startrack.estadoTarea,
      ].filter((e) => e !== null)

      for (const estado of estados) {
        expect(estado.objeto).toBeTruthy()
        expect(estado.linaje.valorCrudo).toBeDefined()
        expect(estado.linaje.endpoint).not.toBe('')
        expect(estado.linaje.campo).not.toBe('')
      }
    }
  })

  it('un huérfano no finge tener contraparte', () => {
    const huerfano = EQUIPOS_DE_EJEMPLO.find((e) => !e.identidad.identidadResuelta)
    expect(huerfano).toBeDefined()
    expect(huerfano!.identidad.idStartrack).toBeNull()
    expect(huerfano!.identidad.metodo).toBe('sinContraparte')
    // No hay evidencia, y el sistema lo dice en vez de inventar un riesgo.
    expect(huerfano!.veredicto).toBe('SIN_EVIDENCIA')
    expect(huerfano!.resultados[0].camposFaltantes.length).toBeGreaterThan(0)
  })

  it('la ubicación siempre declara con qué nivel de cascada responde', () => {
    for (const equipo of EQUIPOS_DE_EJEMPLO) {
      if (equipo.ubicacion === null) continue
      expect([1, 2, 3]).toContain(equipo.ubicacion.nivelDeCascada)
    }
  })
})
