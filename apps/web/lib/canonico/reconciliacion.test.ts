// Datos fabricados para la prueba — no provienen del sandbox (AGENTS.md §1.2).

import { describe, expect, it } from 'vitest'
import type { ResultadoRegla } from '@/lib/tipos/canonico'
import { agregarVeredicto, reconciliar } from './reconciliacion'
import type { DatosCrudos } from './tipos-crudos'

function regla(parcial: Partial<ResultadoRegla> & Pick<ResultadoRegla, 'regla' | 'veredicto'>): ResultadoRegla {
  return {
    nombre: parcial.regla,
    severidad: 'media',
    confianza: 80,
    porque: ['fabricado para la prueba'],
    accionSugerida: 'ninguna',
    rolResponsable: 'LOGISTICA',
    camposFaltantes: [],
    ...parcial,
  }
}

describe('agregarVeredicto', () => {
  // Prueba obligatoria #5 (S-A2 §"Pruebas obligatorias"), caso 1: dos reglas
  // concluidas (EN_RIESGO + ATENCION) resuelven a EN_RIESGO (máxima precedencia).
  it('un equipo con EN_RIESGO + ATENCION resuelve a EN_RIESGO', () => {
    const resultado = agregarVeredicto(true, [
      regla({ regla: 'R2', veredicto: 'EN_RIESGO' }),
      regla({ regla: 'R6', veredicto: 'ATENCION' }),
    ])
    expect(resultado.veredicto).toBe('EN_RIESGO')
  })

  // Caso 2: ninguna regla concluyó -> SIN_EVIDENCIA, incluso con confianza alta.
  it('sin ninguna regla concluida resuelve a SIN_EVIDENCIA', () => {
    const resultado = agregarVeredicto(true, [])
    expect(resultado.veredicto).toBe('SIN_EVIDENCIA')
  })

  it('cada regla que aplica y no concluye resta 20 de confianza', () => {
    const resultado = agregarVeredicto(true, [regla({ regla: 'R5', veredicto: 'SIN_EVIDENCIA' })])
    expect(resultado.confianza).toBe(80)
  })

  it('identidad no resuelta resta 60 de confianza', () => {
    const resultado = agregarVeredicto(false, [regla({ regla: 'R1', veredicto: 'COHERENTE' })])
    expect(resultado.confianza).toBe(40)
  })

  // Caso 3: la puerta de confianza <45 degrada a SIN_EVIDENCIA aunque una
  // regla haya concluido EN_RIESGO.
  it('confianza por debajo de 45 degrada el veredicto a SIN_EVIDENCIA aunque haya una regla concluida', () => {
    const resultado = agregarVeredicto(false, [
      regla({ regla: 'R2', veredicto: 'EN_RIESGO' }),
      regla({ regla: 'R5', veredicto: 'SIN_EVIDENCIA' }),
    ])
    expect(resultado.confianza).toBeLessThan(45)
    expect(resultado.veredicto).toBe('SIN_EVIDENCIA')
  })
})

describe('reconciliar — no sobrescritura', () => {
  // Prueba obligatoria #3: reconciliar jamás modifica un EstadoOrigen (ni
  // ningún dato crudo) de entrada.
  it('nunca modifica los datos crudos de entrada', () => {
    const ahora = new Date().toISOString()
    const fuente = <T,>(datos: T[], endpoint: string, plataforma: 'prisma' | 'startrack') => ({
      datos,
      plataforma,
      endpoint,
      leidoEn: ahora,
    })

    const datos: DatosCrudos = {
      equipos: fuente(
        [
          {
            id: 1,
            empresa: null,
            clave: null,
            no_activo: 'CF-03 - Cargador frontal 03',
            nombre: 'Cargador frontal 03',
            clase_equipo: 'Cargador frontal',
            marca: null,
            modelo: null,
            anio: null,
            precio_x_hora: null,
            minimum_usage_hours: null,
            estado: 'DISPONIBLE',
            project_id: null,
            project_name: null,
            active_failure_id: null,
            active_failure_status: null,
            active_failure_is_paro: null,
            fallas_count: null,
            fecha_inicio_uso: null,
            fecha_fin_uso: null,
          },
        ],
        '/api/maquinaria/equipos',
        'prisma',
      ),
      solicitudes: fuente([], '/api/maquinaria/requests', 'prisma'),
      vehiculos: fuente(
        [
          {
            id: 101,
            description: 'CF-03',
            veh_type: 11,
            make: null,
            model: null,
            status: 'ACTIVO',
            tags: null,
            unit_id: null,
            driver_id: null,
            license_plate: null,
          },
        ],
        'ajax/vehicles.php?cmd=list',
        'startrack',
      ),
      geocercas: fuente([], 'ajax/namedPlaces.php?cmd=list', 'startrack'),
      tareas: fuente([], 'api/job', 'startrack'),
      tiposTarea: fuente([], 'api/job/type?include_readonly=1', 'startrack'),
    }

    const antes = structuredClone(datos)

    reconciliar(datos)

    expect(datos).toEqual(antes)
  })
})
