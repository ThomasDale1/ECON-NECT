// Prueba obligatoria #4 de 02-ROADMAP §2 / AGENTS.md §9.4: **el servidor**
// rechaza propagar sobre un recurso ajeno. No alcanza con esconder el botón.
//
// Los identificadores de esta prueba son sintéticos a propósito. No son los del
// sandbox y no pretenden serlo: escribir acá el código de activo real sería
// meter un registro del sandbox al repositorio (AGENTS.md §1.2), y lo que se
// prueba es la lógica de la guarda, que no depende de qué valor concreto nos
// hayan asignado.

import { describe, expect, it } from 'vitest'
import { verificarRecursoPropio, type RecursoAEscribir } from './restriccion'

const PROPIOS = { equipo: 'EQ-PROPIO-1', proyecto: 'PROY-001' }

function recurso(parcial: Partial<RecursoAEscribir> = {}): RecursoAEscribir {
  return {
    codigoActivo: 'EQ-PROPIO-1',
    equipoId: '10',
    vehiculoId: '200',
    codigoProyecto: 'PROY-001',
    proyectoId: '5',
    ...parcial,
  }
}

describe('verificarRecursoPropio', () => {
  it('permite escribir sobre el equipo y el proyecto declarados', () => {
    const resultado = verificarRecursoPropio(recurso(), PROPIOS)
    expect(resultado.permitido).toBe(true)
  })

  it('rechaza el equipo de otro participante del hackathon', () => {
    const resultado = verificarRecursoPropio(
      recurso({ codigoActivo: 'EQ-DE-OTRO-EQUIPO', equipoId: '99', vehiculoId: '999' }),
      PROPIOS,
    )
    expect(resultado.permitido).toBe(false)
    expect(resultado.motivo).toContain('no está entre los recursos asignados')
  })

  it('rechaza un proyecto ajeno aunque el equipo sea propio', () => {
    const resultado = verificarRecursoPropio(
      recurso({ codigoProyecto: 'PROY-777', proyectoId: '777' }),
      PROPIOS,
    )
    expect(resultado.permitido).toBe(false)
    expect(resultado.motivo).toContain('proyectos asignados')
  })

  it('falla cerrada: sin recursos declarados no se escribe nada', () => {
    expect(verificarRecursoPropio(recurso(), { equipo: undefined, proyecto: undefined }).permitido).toBe(
      false,
    )
    expect(verificarRecursoPropio(recurso(), { equipo: '', proyecto: 'PROY-001' }).permitido).toBe(false)
    expect(verificarRecursoPropio(recurso(), { equipo: 'EQ-PROPIO-1', proyecto: '   ' }).permitido).toBe(
      false,
    )
  })

  it('falla cerrada también cuando el recurso no trae ningún identificador', () => {
    const resultado = verificarRecursoPropio(
      {
        codigoActivo: null,
        equipoId: null,
        vehiculoId: null,
        codigoProyecto: null,
        proyectoId: null,
      },
      PROPIOS,
    )
    expect(resultado.permitido).toBe(false)
  })

  it('acepta el id de Prisma o el de Startrack cuando es lo declarado', () => {
    expect(
      verificarRecursoPropio(recurso({ codigoActivo: null }), { equipo: '10', proyecto: '5' }).permitido,
    ).toBe(true)
    expect(
      verificarRecursoPropio(recurso({ codigoActivo: null, equipoId: null }), {
        equipo: '200',
        proyecto: 'PROY-001',
      }).permitido,
    ).toBe(true)
  })

  it('ignora espacios y mayúsculas, pero no acepta coincidencias parciales', () => {
    expect(
      verificarRecursoPropio(recurso(), { equipo: '  eq-propio-1 , otro ', proyecto: 'proy-001' })
        .permitido,
    ).toBe(true)
    // "EQ-PROPIO-10" no es "EQ-PROPIO-1": la comparación es exacta, no por prefijo.
    expect(
      verificarRecursoPropio(recurso({ codigoActivo: 'EQ-PROPIO-10', equipoId: null, vehiculoId: null }), PROPIOS)
        .permitido,
    ).toBe(false)
  })

  it('permite declarar más de un recurso propio, separados por coma', () => {
    const resultado = verificarRecursoPropio(recurso({ codigoActivo: 'EQ-PROPIO-2' }), {
      equipo: 'EQ-PROPIO-1,EQ-PROPIO-2',
      proyecto: 'PROY-001,PROY-002',
    })
    expect(resultado.permitido).toBe(true)
  })
})
