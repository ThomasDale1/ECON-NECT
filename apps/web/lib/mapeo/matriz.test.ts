import { describe, expect, it } from 'vitest'
import { ALCANCE_MATRIZ_MAPEO, MATRIZ_MAPEO, matrizACsv, metadatosCampo } from './matriz'

describe('MATRIZ_MAPEO', () => {
  it('declara su alcance sin presentarse como copia exhaustiva del diccionario', () => {
    expect(ALCANCE_MATRIZ_MAPEO.estado).toMatch(/completa para el alcance/i)
    expect(ALCANCE_MATRIZ_MAPEO.limite).toMatch(/no equivale/i)
  })

  it('documenta nombre, tipo, ejemplo y cardinalidad para cada fila', () => {
    for (const fila of MATRIZ_MAPEO) {
      expect(fila.campoPrisma || fila.campoStartrack).toBeTruthy()
      expect(fila.prisma.tipoDato).not.toBe('')
      expect(fila.prisma.ejemplo).not.toBe('')
      expect(fila.startrack.tipoDato).not.toBe('')
      expect(fila.startrack.ejemplo).not.toBe('')
      expect(fila.cardinalidad).not.toBe('')
    }
  })

  // El marcador "no confirmado" no puede aparecer porque alguien olvidó una
  // entrada del catálogo: declarar que falta evidencia es una afirmación, y
  // afirmarla por accidente sobre un campo ya verificado es justo el error que
  // AGENTS.md §1.1 castiga. `metadatosCampo` devuelve null cuando la entrada
  // falta, y eso es un defecto, no un hueco de evidencia.
  it('no deja ningún campo sin entrada en el catálogo de metadatos', () => {
    const sinEntrada: string[] = []
    for (const fila of MATRIZ_MAPEO) {
      if (fila.campoPrisma && metadatosCampo('Prisma', fila.campoPrisma) === null) {
        sinEntrada.push(`Prisma: ${fila.campoPrisma}`)
      }
      if (fila.campoStartrack && metadatosCampo('Startrack', fila.campoStartrack) === null) {
        sinEntrada.push(`Startrack: ${fila.campoStartrack}`)
      }
    }
    expect(sinEntrada).toEqual([])
  })

  it('solo declara "no confirmado" donde el nombre de columna es el que falta', () => {
    const noConfirmados = MATRIZ_MAPEO.filter(
      (fila) =>
        fila.prisma.tipoDato.startsWith('No confirmado') ||
        fila.startrack.tipoDato.startsWith('No confirmado'),
    )
    // Solo marca, modelo y año: Prisma no confirmó el nombre exacto de columna.
    expect(noConfirmados).toHaveLength(3)
    for (const fila of noConfirmados) {
      expect(fila.campoPrisma).toMatch(/nombre exacto de columna no confirmado/)
    }
  })

  // AGENTS.md §1.2: los valores del diccionario que ECON entregó bajo
  // confidencialidad no se transcriben. Un ejemplo describe la forma del dato,
  // nunca un registro concreto.
  it('describe la forma del valor sin transcribir el diccionario', () => {
    for (const fila of MATRIZ_MAPEO) {
      for (const ejemplo of [fila.prisma.ejemplo, fila.startrack.ejemplo]) {
        expect(ejemplo).not.toMatch(/del diccionario/i)
        expect(ejemplo).not.toMatch(/sintétic/i)
      }
    }
  })

  // La misma regla vale para la evidencia y la transformación, no solo para el
  // ejemplo: ahí el argumento se sostiene describiendo la FORMA del valor
  // («código - nombre»), nunca copiando un registro. Estos son los códigos de
  // activo y nombres de proyecto que el diccionario trae; si alguno vuelve a
  // aparecer en cualquier campo de texto de la matriz, es una regresión.
  it('no transcribe registros del diccionario en ningún campo de la matriz', () => {
    const registros = [
      'The Hub',
      'CF-03',
      'PROY-014',
      'Proyecto Xi',
      'Cargador frontal 03',
      'Equipo 14',
      'Vehículos-Hackathon',
    ]
    for (const fila of MATRIZ_MAPEO) {
      const texto = [
        fila.campoPrisma,
        fila.campoStartrack,
        fila.transformacion,
        fila.evidencia,
        fila.prisma.ejemplo,
        fila.startrack.ejemplo,
      ]
        .filter(Boolean)
        .join(' | ')
      for (const registro of registros) {
        expect(texto).not.toContain(registro)
      }
    }
  })

  it('hace visibles los mapeos no uno-a-uno y las ausencias de equivalencia', () => {
    expect(MATRIZ_MAPEO.some((fila) => fila.cardinalidad === '1:N')).toBe(true)
    expect(MATRIZ_MAPEO.some((fila) => fila.cardinalidad === 'sin equivalencia')).toBe(true)
    expect(MATRIZ_MAPEO.some((fila) => fila.tipoRelacion === 'mismo nombre, distinto significado')).toBe(true)
  })

  it('incluye los nuevos metadatos en la exportación CSV', () => {
    const encabezado = matrizACsv(MATRIZ_MAPEO).split('\n')[0]
    expect(encabezado).toContain('tipoDatoPrisma')
    expect(encabezado).toContain('ejemploStartrack')
    expect(encabezado).toContain('cardinalidad')
  })
})
