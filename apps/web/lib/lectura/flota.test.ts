// Degradación por fuente caída (S-A3, "manejo de errores").
//
// Lo que se protege acá es la regla 1.1 de AGENTS.md: cuando Startrack no
// responde, sus listas llegan vacías, y una lista vacía es indistinguible de
// "no hay tarea de traslado". Dejar correr R1–R5 contra eso produciría
// incoherencias inventadas — el defecto más caro que este producto puede tener,
// porque se ve exactamente igual que un hallazgo real.
//
// Los equipos de esta prueba son fixtures sintéticos, igual que en
// `reglas.test.ts`: ningún registro del sandbox entra al repositorio (§1.2).

import { describe, expect, it } from 'vitest'
import type { EquipoUnificado, ResultadoRegla } from '@/lib/tipos/canonico'
import { degradarPorFuentesCaidas, plataformasQueNecesitaLaRegla } from './flota'

function resultado(regla: string, parcial: Partial<ResultadoRegla> = {}): ResultadoRegla {
  return {
    regla,
    nombre: `Regla ${regla}`,
    veredicto: 'ATENCION',
    severidad: 'media',
    confianza: 75,
    porque: [],
    accionSugerida: 'acción',
    rolResponsable: 'LOGISTICA',
    camposFaltantes: [],
    ...parcial,
  }
}

function equipo(reglas: ResultadoRegla[], identidadResuelta = true): EquipoUnificado {
  return {
    id: '1',
    codigoActivo: {
      valor: 'EQ-1',
      linaje: {
        plataforma: 'prisma',
        endpoint: '/api/maquinaria/equipos',
        campo: 'no_activo',
        valorCrudo: 'EQ-1',
        leidoEn: '2026-09-13T00:00:00.000Z',
      },
    },
    nombre: {
      valor: null,
      linaje: {
        plataforma: 'prisma',
        endpoint: '/api/maquinaria/equipos',
        campo: 'nombre',
        valorCrudo: null,
        leidoEn: '2026-09-13T00:00:00.000Z',
      },
    },
    identidadResuelta,
    nivelResolucionIdentidad: identidadResuelta ? 1 : null,
    interpretacionDesfase: null,
    equipo: null,
    solicitud: null,
    falla: null,
    vehiculo: null,
    tarea: null,
    ubicacion: null,
    veredicto: 'ATENCION',
    confianza: 75,
    reglas,
    leidoEn: '2026-09-13T00:00:00.000Z',
  }
}

describe('plataformasQueNecesitaLaRegla', () => {
  it('reconoce los campos de Startrack por su prefijo', () => {
    expect(plataformasQueNecesitaLaRegla(['tarea.remote_id'])).toEqual(['startrack'])
    expect(plataformasQueNecesitaLaRegla(['vehiculo.status'])).toEqual(['startrack'])
  })

  it('trata todo lo demás como Prisma', () => {
    expect(plataformasQueNecesitaLaRegla(['equipo.estado', 'project_id'])).toEqual(['prisma'])
  })

  it('la identidad depende de las dos: es el cruce mismo', () => {
    expect(plataformasQueNecesitaLaRegla(['identidadResuelta', 'codigoActivo'])).toEqual([
      'prisma',
      'startrack',
    ])
  })

  it('una regla mixta necesita las dos', () => {
    expect(plataformasQueNecesitaLaRegla(['solicitud.status', 'tarea.job_type_id'])).toEqual([
      'prisma',
      'startrack',
    ])
  })
})

describe('degradarPorFuentesCaidas', () => {
  it('sin fuentes caídas no toca nada', () => {
    const entrada = [equipo([resultado('R3')])]
    expect(degradarPorFuentesCaidas(entrada, [])).toBe(entrada)
  })

  it('descarta la regla que depende de la plataforma caída', () => {
    // R3 ("solicitud aprobada sin tarea de traslado") concluye leyendo tareas
    // de Startrack: con Startrack caída, esa conclusión sería un invento.
    const [resultadoDegradado] = degradarPorFuentesCaidas([equipo([resultado('R3')])], ['startrack'])
    expect(resultadoDegradado.reglas).toHaveLength(0)
    expect(resultadoDegradado.veredicto).toBe('SIN_EVIDENCIA')
  })

  it('conserva las reglas que solo dependen de la plataforma que sí respondió', () => {
    // R6 y R7 leen únicamente campos de Prisma.
    const [resultadoDegradado] = degradarPorFuentesCaidas(
      [equipo([resultado('R3'), resultado('R6'), resultado('R7')])],
      ['startrack'],
    )
    expect(resultadoDegradado.reglas.map((r) => r.regla)).toEqual(['R6', 'R7'])
  })

  it('degrada el veredicto a SIN_EVIDENCIA porque la identidad deja de ser confiable', () => {
    // Con una plataforma caída no se puede afirmar que la identidad cruzó, y la
    // agregación ya castiga eso hasta por debajo del umbral de 45.
    const [resultadoDegradado] = degradarPorFuentesCaidas(
      [equipo([resultado('R6', { veredicto: 'EN_RIESGO', severidad: 'alta' })])],
      ['startrack'],
    )
    expect(resultadoDegradado.veredicto).toBe('SIN_EVIDENCIA')
    expect(resultadoDegradado.confianza).toBeLessThan(45)
  })

  it('con Prisma caída también descarta lo que dependía de Prisma', () => {
    const [resultadoDegradado] = degradarPorFuentesCaidas(
      [equipo([resultado('R6'), resultado('R7'), resultado('R8')])],
      ['prisma'],
    )
    expect(resultadoDegradado.reglas).toHaveLength(0)
    expect(resultadoDegradado.veredicto).toBe('SIN_EVIDENCIA')
  })
})
