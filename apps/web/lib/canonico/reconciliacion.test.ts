// Datos fabricados para la prueba — no provienen del sandbox (AGENTS.md §1.2).

import { describe, expect, it } from 'vitest'
import type { ResultadoRegla } from '@/lib/tipos/canonico'
import {
  agregarVeredicto,
  interpretarDesfase,
  interpretarDesfases,
  reconciliar,
} from './reconciliacion'
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
    ], 1)
    expect(resultado.veredicto).toBe('EN_RIESGO')
  })

  // Caso 2: ninguna regla concluyó -> SIN_EVIDENCIA, incluso con confianza alta.
  it('sin ninguna regla concluida resuelve a SIN_EVIDENCIA', () => {
    const resultado = agregarVeredicto(true, [], 1)
    expect(resultado.veredicto).toBe('SIN_EVIDENCIA')
  })

  it('cada regla que aplica y no concluye resta 20 de confianza', () => {
    const resultado = agregarVeredicto(true, [regla({ regla: 'R5', veredicto: 'SIN_EVIDENCIA' })], 1)
    expect(resultado.confianza).toBe(80)
  })

  it('identidad no resuelta resta 60 de confianza', () => {
    const resultado = agregarVeredicto(false, [regla({ regla: 'R1', veredicto: 'COHERENTE' })], null)
    expect(resultado.confianza).toBe(40)
  })

  // Nivel 1 = remote_id: sin penalización extra (heurística, no certeza).
  it('nivel de identidad 1 no resta confianza extra', () => {
    const resultado = agregarVeredicto(true, [regla({ regla: 'R1', veredicto: 'COHERENTE' })], 1)
    expect(resultado.confianza).toBe(100)
  })

  // Nivel 2 = código de activo: −10. Fabricado: no es una constante medida.
  it('nivel de identidad 2 resta 10 de confianza', () => {
    const resultado = agregarVeredicto(true, [regla({ regla: 'R1', veredicto: 'COHERENTE' })], 2)
    expect(resultado.confianza).toBe(90)
  })

  // Nivel 3 = clave: −25. Fabricado: heurística documentada, no certeza.
  it('nivel de identidad 3 resta 25 de confianza', () => {
    const resultado = agregarVeredicto(true, [regla({ regla: 'R1', veredicto: 'COHERENTE' })], 3)
    expect(resultado.confianza).toBe(75)
  })

  // Caso 3: la puerta de confianza <45 degrada a SIN_EVIDENCIA aunque una
  // regla haya concluido EN_RIESGO.
  it('confianza por debajo de 45 degrada el veredicto a SIN_EVIDENCIA aunque haya una regla concluida', () => {
    const resultado = agregarVeredicto(false, [
      regla({ regla: 'R2', veredicto: 'EN_RIESGO' }),
      regla({ regla: 'R5', veredicto: 'SIN_EVIDENCIA' }),
    ], null)
    expect(resultado.confianza).toBeLessThan(45)
    expect(resultado.veredicto).toBe('SIN_EVIDENCIA')
  })
})

describe('interpretarDesfase — ventana de 5 minutos', () => {
  // Fechas fabricadas para la prueba — no provienen del sandbox.
  const prisma = '2026-09-12T12:00:00.000Z'
  const startrackDentro = '2026-09-12T12:03:00.000Z' // +3 min
  const startrackLimite = '2026-09-12T12:05:00.000Z' // +5 min
  const startrackFuera = '2026-09-12T12:06:00.000Z' // +6 min
  const startrackAntes = '2026-09-12T11:59:00.000Z' // Prisma más reciente

  it('sugiere revisión si Startrack va ≤5 min adelante de Prisma', () => {
    const sug = interpretarDesfase(prisma, startrackDentro)
    expect(sug).toContain('5 minutos')
    expect(sug).toContain('posible')
  })

  it('incluye el límite exacto de 5 minutos', () => {
    expect(interpretarDesfase(prisma, startrackLimite)).not.toBeNull()
  })

  it('no sugiere si el desfase supera 5 minutos', () => {
    expect(interpretarDesfase(prisma, startrackFuera)).toBeNull()
  })

  it('no sugiere si Prisma va adelante o empatado', () => {
    expect(interpretarDesfase(prisma, startrackAntes)).toBeNull()
    expect(interpretarDesfase(prisma, prisma)).toBeNull()
  })

  it('deja null si falta cualquier fecha (nunca inventa timestamps)', () => {
    expect(interpretarDesfase(null, startrackDentro)).toBeNull()
    expect(interpretarDesfase(prisma, null)).toBeNull()
    expect(interpretarDesfase(undefined, undefined)).toBeNull()
  })

  it('interpretarDesfases combina solicitud↔tarea y equipo↔vehículo', () => {
    // Fabricado: solicitud.approved_at vs tarea.start_date (+2 min).
    const sug = interpretarDesfases({
      solicitud: {
        id: 1,
        project_id: null,
        project_name: null,
        tipo: null,
        status: 'APROBADA',
        approved_at: prisma,
        approved_by_name: null,
        maquinaria_id: 1,
        maquinaria_no_activo: null,
        maquinaria_nombre: null,
        maquinaria_clave: null,
        fecha_inicio: null,
        fecha_fin: null,
        created_at: null,
      },
      tarea: {
        id: 9,
        status: 'assigned',
        status_name: null,
        job_type_id: null,
        start_date: startrackDentro,
        end_datetime: null,
        creation_date: null,
        poi_id: null,
        poi_name: null,
        origin_poi_id: null,
        origin_poi_name: null,
        assigned_vehicle_id: null,
        assigned_user_ids: null,
        remote_id: null,
        x: null,
        y: null,
        address: null,
      },
      equipoUpdatedAt: null,
      startrackVehiculoFecha: null,
    })
    expect(sug).not.toBeNull()
  })

  it('interpretarDesfases usa updated_at vs fecha de vehículo cuando no hay solicitud', () => {
    const sug = interpretarDesfases({
      solicitud: null,
      tarea: null,
      equipoUpdatedAt: prisma,
      startrackVehiculoFecha: startrackDentro,
    })
    expect(sug).not.toBeNull()
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
            updated_at: null,
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
            last_contact_date: null,
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
