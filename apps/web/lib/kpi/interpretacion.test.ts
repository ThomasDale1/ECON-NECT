import { describe, expect, it } from 'vitest'
import { EQUIPOS_EJEMPLO } from '@/lib/tipos/ejemplo'
import { interpretarFlota, interpretarKpis } from './interpretacion'

describe('interpretarKpis', () => {
  it('usa identidad resuelta como denominador de coherencia, no la flota total', () => {
    const lecturas = interpretarKpis(EQUIPOS_EJEMPLO, [], 0)
    const tasa = lecturas.find((l) => l.id === 'tasa-coherencia')
    expect(tasa?.valor).toBe('50 %')
    expect(tasa?.veredicto).toBe('EN_RIESGO')
    expect(tasa?.cobertura).toMatch(/1 coherentes \/ 2 cruzados/)
  })

  it('reporta cobertura 2 de 3 contra EQUIPOS_EJEMPLO', () => {
    const lecturas = interpretarKpis(EQUIPOS_EJEMPLO, [], 0)
    const cobertura = lecturas.find((l) => l.id === 'cobertura-interpretacion')
    expect(cobertura?.valor).toBe('67 %')
    expect(cobertura?.veredicto).toBe('EN_RIESGO')
  })

  it('latencia sin pares y con aprobadas es hueco de remote_id, no un número', () => {
    const lecturas = interpretarKpis(EQUIPOS_EJEMPLO, [], 5)
    const latencia = lecturas.find((l) => l.id === 'latencia-solicitud-traslado')
    expect(latencia?.valor).toBe('No disponible')
    expect(latencia?.veredicto).toBe('SIN_EVIDENCIA')
    expect(latencia?.cobertura).toBe('0 de 5 aprobadas enlazadas')
  })

  it('latencia con un par reporta horas y no inventa umbral de lentitud', () => {
    const lecturas = interpretarKpis(
      EQUIPOS_EJEMPLO,
      [{ approvedAt: '2026-09-10T08:00:00.000Z', taskCreatedAt: '2026-09-10T12:00:00.000Z' }],
      5,
    )
    const latencia = lecturas.find((l) => l.id === 'latencia-solicitud-traslado')
    expect(latencia?.valor).toBe('4 h')
    expect(latencia?.veredicto).toBe('ATENCION')
    expect(latencia?.lectura).toMatch(/remote_id/)
    expect(latencia?.lectura).not.toMatch(/lento|lenta/i)
  })

  it('tiempo muerto y serie de 30 días nunca inventan cifra', () => {
    const lecturas = interpretarKpis(EQUIPOS_EJEMPLO, [], 0)
    for (const id of ['tiempo-muerto-quetzales', 'estado-flota-30d']) {
      const item = lecturas.find((l) => l.id === id)
      expect(item?.valor).toBe('No disponible')
      expect(item?.veredicto).toBe('SIN_EVIDENCIA')
      expect(item?.faltante).toBeTruthy()
    }
  })
})

describe('interpretarFlota', () => {
  it('resume huecos y excepciones sin rellenar', () => {
    const lecturas = interpretarKpis(EQUIPOS_EJEMPLO, [], 5)
    const flota = interpretarFlota(lecturas, EQUIPOS_EJEMPLO)
    expect(flota.valor).toMatch(/2 de 5 KPIs con cifra/)
    expect(flota.faltante).toMatch(/Tiempo muerto|Estado operativo/)
    expect(flota.lectura).toMatch(/no se rellenan/)
  })
})
