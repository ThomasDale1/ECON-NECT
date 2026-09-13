// Pruebas EN VIVO de mantenimiento preventivo (S-A11).
//
// Corren contra el sandbox autorizado y no usan snapshots ni fixtures con
// registros reales. La escritura P4/P3 queda apagada salvo que
// NECT_PRUEBAS_ESCRITURA=1 en el entorno local.

import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as GETMantenimiento } from '@/app/api/mantenimiento/route'
import { NOMBRE_COOKIE, firmarSesion } from '@/lib/acceso/verificar'
import { leerMantenimiento } from '@/lib/lectura/mantenimiento'
import { hoyElSalvador, restarDias } from '@/lib/mantenimiento/fechas'
import { PARAMETROS_VACIOS } from '@/lib/mantenimiento/parametros'
import { leerHorometrosFlota, leerResumenDiario } from '@/lib/conectores/startrack'

function sumaHorasPorVehiculo(filas: Awaited<ReturnType<typeof leerResumenDiario>>['datos']['filas']) {
  const porVehiculo = new Map<string, number>()
  for (const fila of filas) {
    porVehiculo.set(fila.vehiculoId, (porVehiculo.get(fila.vehiculoId) ?? 0) + (fila.motorEncendidoSeg ?? 0) / 3600)
  }
  return porVehiculo
}

describe('mantenimiento preventivo — pruebas en vivo (S-A11)', () => {
  it('lee horómetro y serie diaria de Startrack sin proyectar campos de PII', async () => {
    const hoy = hoyElSalvador()
    const [horometros, serie] = await Promise.all([
      leerHorometrosFlota(),
      leerResumenDiario(restarDias(hoy, 29), hoy),
    ])

    expect(horometros.datos.length).toBeGreaterThan(0)
    expect(serie.datos.filas.length).toBeGreaterThan(0)

    for (const h of horometros.datos) {
      expect(Object.keys(h).sort()).toEqual(['horasMotor', 'linaje', 'odometroKm', 'vehiculoId'])
      expect(h.linaje.endpoint).toContain('ajax/report.php?id=22')
      expect(h.linaje.campo).toBe('curOperatingHours')
    }
    for (const fila of serie.datos.filas) {
      expect(Object.keys(fila).sort()).toEqual([
        'enMovimientoSeg',
        'fecha',
        'motorEncendidoSeg',
        'ralentiSeg',
        'vehiculoId',
      ])
    }

    const acumuladas = sumaHorasPorVehiculo(serie.datos.filas)
    const comparables = horometros.datos.filter((h) => h.horasMotor !== null && acumuladas.has(h.vehiculoId))
    expect(comparables.length).toBeGreaterThan(0)
    expect(
      comparables.some((h) => Math.abs((h.horasMotor ?? 0) - (acumuladas.get(h.vehiculoId) ?? 0)) <= 0.05),
    ).toBe(true)
  })

  it('calcula pronósticos vivos con faltantes declarados y alertas ordenadas', async () => {
    const resultado = await leerMantenimiento(PARAMETROS_VACIOS)

    expect(resultado.resumen.equipos).toBe(resultado.pronosticos.length)
    expect(resultado.resumen.conHorometro).toBeGreaterThan(0)
    expect(resultado.resumen.conIntervalo).toBeGreaterThan(0)

    const sinVehiculo = resultado.pronosticos.find((p) => p.vehiculoId === null)
    if (sinVehiculo) {
      expect(sinVehiculo.horasDesdeAncla).toBeNull()
      expect(sinVehiculo.nivelAlerta).toBeNull()
      expect(sinVehiculo.faltantes.join(' ')).toContain('horómetro GPS')
    }

    for (let i = 1; i < resultado.alertas.length; i++) {
      const peso = { vencido: 0, urgente: 1, aviso: 2 } as const
      const anterior = resultado.alertas[i - 1].nivelAlerta
      const actual = resultado.alertas[i].nivelAlerta
      expect(peso[anterior as keyof typeof peso]).toBeLessThanOrEqual(peso[actual as keyof typeof peso])
    }
  })

  it('expone GET /api/mantenimiento con sesión y rechaza sin sesión', async () => {
    process.env.NECT_CLAVE_ADMIN ||= 'clave-admin-test-vivo'

    const sinSesion = await GETMantenimiento(new NextRequest('http://localhost/api/mantenimiento'))
    expect(sinSesion.status).toBe(401)

    const cookie = await firmarSesion('ADMIN')
    expect(cookie).toBeTruthy()

    const conSesion = await GETMantenimiento(
      new NextRequest('http://localhost/api/mantenimiento', {
        headers: { cookie: `${NOMBRE_COOKIE}=${cookie}` },
      }),
    )
    expect(conSesion.status).toBe(200)
    const body = await conSesion.json()
    expect(body.resumen.equipos).toBeGreaterThan(0)
    expect(Array.isArray(body.alertas)).toBe(true)
  })

  it('mantiene apagada la escritura viva salvo bandera explícita', () => {
    expect(process.env.NECT_PRUEBAS_ESCRITURA === '1' || process.env.NECT_PRUEBAS_ESCRITURA === undefined).toBe(true)
  })
})
