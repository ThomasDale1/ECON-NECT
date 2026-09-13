// DATOS FABRICADOS — no provienen del sandbox de ECON.
//
// Códigos, nombres, proyectos y coordenadas son inventados y evidentemente
// ficticios (AGENTS.md §1.2). Sirven para que el carril B construya la UI
// contra datos con la forma real del contrato de `canonico.ts`, no como
// referencia de ningún registro real de Prisma o Startrack.

import type { EquipoUnificado } from './canonico'

const LEIDO_EN = '2026-09-12T21:45:00.000Z'

export const EQUIPOS_EJEMPLO: EquipoUnificado[] = [
  // 1. COHERENTE — identidad resuelta, confianza alta, solo dispara R1.
  {
    id: 'demo-eq-001',
    codigoActivo: {
      valor: 'EQ-DEMO-001',
      linaje: {
        plataforma: 'prisma',
        endpoint: '/api/maquinaria/demo-eq-001',
        campo: 'codigo',
        valorCrudo: 'EQ-DEMO-001',
        leidoEn: LEIDO_EN,
      },
    },
    nombre: {
      valor: 'Excavadora de ejemplo 001',
      linaje: {
        plataforma: 'prisma',
        endpoint: '/api/maquinaria/demo-eq-001',
        campo: 'nombre',
        valorCrudo: 'Excavadora de ejemplo 001',
        leidoEn: LEIDO_EN,
      },
    },
    identidadResuelta: true,
    equipo: {
      valor: 'DISPONIBLE',
      objeto: 'recurso',
      linaje: {
        plataforma: 'prisma',
        endpoint: '/api/maquinaria/demo-eq-001',
        campo: 'estado',
        valorCrudo: 'DISPONIBLE',
        leidoEn: LEIDO_EN,
      },
    },
    solicitud: null,
    falla: null,
    vehiculo: {
      valor: 'ACTIVO',
      objeto: 'recurso',
      linaje: {
        plataforma: 'startrack',
        endpoint: '/api/vehiculos/demo-eq-001',
        campo: 'estado',
        valorCrudo: 'ACTIVO',
        leidoEn: LEIDO_EN,
      },
    },
    tarea: null,
    ubicacion: {
      nivel: 1,
      descripcion: {
        valor: 'Bodega central de ejemplo',
        linaje: {
          plataforma: 'startrack',
          endpoint: '/api/vehiculos/demo-eq-001/posicion',
          campo: 'descripcion',
          valorCrudo: 'Bodega central de ejemplo',
          leidoEn: LEIDO_EN,
        },
      },
      lat: {
        valor: 14.63,
        linaje: {
          plataforma: 'startrack',
          endpoint: '/api/vehiculos/demo-eq-001/posicion',
          campo: 'lat',
          valorCrudo: 14.63,
          leidoEn: LEIDO_EN,
        },
      },
      lon: {
        valor: -90.51,
        linaje: {
          plataforma: 'startrack',
          endpoint: '/api/vehiculos/demo-eq-001/posicion',
          campo: 'lon',
          valorCrudo: -90.51,
          leidoEn: LEIDO_EN,
        },
      },
    },
    veredicto: 'COHERENTE',
    confianza: 96,
    reglas: [
      {
        regla: 'R1',
        nombre: 'Estados compatibles entre plataformas',
        veredicto: 'COHERENTE',
        severidad: 'baja',
        confianza: 96,
        porque: [
          'Prisma reporta el recurso disponible.',
          'Startrack reporta el vehículo activo y sin tarea asignada.',
        ],
        accionSugerida: 'Ninguna acción requerida: los estados son coherentes.',
        rolResponsable: 'LOGISTICA',
        camposFaltantes: [],
      },
    ],
    leidoEn: LEIDO_EN,
  },

  // 2. EN_RIESGO — falla activa con tarea de traslado viva (R2).
  {
    id: 'demo-eq-002',
    codigoActivo: {
      valor: 'EQ-DEMO-002',
      linaje: {
        plataforma: 'prisma',
        endpoint: '/api/maquinaria/demo-eq-002',
        campo: 'codigo',
        valorCrudo: 'EQ-DEMO-002',
        leidoEn: LEIDO_EN,
      },
    },
    nombre: {
      valor: 'Camión de ejemplo 002',
      linaje: {
        plataforma: 'prisma',
        endpoint: '/api/maquinaria/demo-eq-002',
        campo: 'nombre',
        valorCrudo: 'Camión de ejemplo 002',
        leidoEn: LEIDO_EN,
      },
    },
    identidadResuelta: true,
    equipo: {
      valor: 'ASIGNADO',
      objeto: 'recurso',
      linaje: {
        plataforma: 'prisma',
        endpoint: '/api/maquinaria/demo-eq-002',
        campo: 'estado',
        valorCrudo: 'ASIGNADO',
        leidoEn: LEIDO_EN,
      },
    },
    solicitud: {
      valor: 'APROBADA',
      objeto: 'recurso',
      linaje: {
        plataforma: 'prisma',
        endpoint: '/api/solicitudes/demo-sol-002',
        campo: 'estado',
        valorCrudo: 'APROBADA',
        leidoEn: LEIDO_EN,
      },
    },
    falla: {
      valor: 'CORRECTIVO_EN_PROCESO',
      objeto: 'falla',
      linaje: {
        plataforma: 'prisma',
        endpoint: '/api/fallas/demo-falla-002',
        campo: 'estado',
        valorCrudo: 'CORRECTIVO_EN_PROCESO',
        leidoEn: LEIDO_EN,
      },
    },
    vehiculo: {
      valor: 'ACTIVO',
      objeto: 'recurso',
      linaje: {
        plataforma: 'startrack',
        endpoint: '/api/vehiculos/demo-eq-002',
        campo: 'estado',
        valorCrudo: 'ACTIVO',
        leidoEn: LEIDO_EN,
      },
    },
    tarea: {
      valor: 'EN_RUTA',
      objeto: 'tarea',
      linaje: {
        plataforma: 'startrack',
        endpoint: '/api/tareas/demo-tarea-002',
        campo: 'estado',
        valorCrudo: 'EN_RUTA',
        leidoEn: LEIDO_EN,
      },
    },
    ubicacion: {
      nivel: 2,
      descripcion: {
        valor: 'Ruta hacia Proyecto de ejemplo',
        linaje: {
          plataforma: 'startrack',
          endpoint: '/api/vehiculos/demo-eq-002/posicion',
          campo: 'descripcion',
          valorCrudo: 'Ruta hacia Proyecto de ejemplo',
          leidoEn: LEIDO_EN,
        },
      },
      lat: {
        valor: 14.63,
        linaje: {
          plataforma: 'startrack',
          endpoint: '/api/vehiculos/demo-eq-002/posicion',
          campo: 'lat',
          valorCrudo: 14.63,
          leidoEn: LEIDO_EN,
        },
      },
      lon: {
        valor: -90.51,
        linaje: {
          plataforma: 'startrack',
          endpoint: '/api/vehiculos/demo-eq-002/posicion',
          campo: 'lon',
          valorCrudo: -90.51,
          leidoEn: LEIDO_EN,
        },
      },
    },
    veredicto: 'EN_RIESGO',
    confianza: 78,
    reglas: [
      {
        regla: 'R2',
        nombre: 'Falla activa con traslado en curso',
        veredicto: 'EN_RIESGO',
        severidad: 'alta',
        confianza: 78,
        porque: [
          'El equipo tiene una falla correctiva en proceso en Prisma.',
          'Startrack reporta una tarea de traslado en ruta para el mismo equipo.',
        ],
        accionSugerida: 'Validar disponibilidad antes de movilizarlo.',
        rolResponsable: 'LOGISTICA',
        camposFaltantes: [],
      },
    ],
    leidoEn: LEIDO_EN,
  },

  // 3. SIN_EVIDENCIA — el huérfano: identidad no resuelta, sin contraparte
  // en Startrack, confianza por debajo del umbral de 45.
  {
    id: 'demo-eq-003',
    codigoActivo: {
      valor: 'EQ-DEMO-003',
      linaje: {
        plataforma: 'prisma',
        endpoint: '/api/maquinaria/demo-eq-003',
        campo: 'codigo',
        valorCrudo: 'EQ-DEMO-003',
        leidoEn: LEIDO_EN,
      },
    },
    nombre: {
      valor: 'Compactadora de ejemplo 003',
      linaje: {
        plataforma: 'prisma',
        endpoint: '/api/maquinaria/demo-eq-003',
        campo: 'nombre',
        valorCrudo: 'Compactadora de ejemplo 003',
        leidoEn: LEIDO_EN,
      },
    },
    identidadResuelta: false,
    equipo: {
      valor: 'INACTIVO',
      objeto: 'recurso',
      linaje: {
        plataforma: 'prisma',
        endpoint: '/api/maquinaria/demo-eq-003',
        campo: 'estado',
        valorCrudo: 'INACTIVO',
        leidoEn: LEIDO_EN,
      },
    },
    solicitud: null,
    falla: null,
    vehiculo: null,
    tarea: null,
    ubicacion: null,
    veredicto: 'SIN_EVIDENCIA',
    confianza: 18,
    reglas: [
      {
        regla: 'R5',
        nombre: 'Identidad no resuelta entre plataformas',
        veredicto: 'SIN_EVIDENCIA',
        severidad: 'media',
        confianza: 18,
        porque: [
          'No se encontró un vehículo ni una tarea en Startrack con código de activo o remote_id compatible.',
        ],
        accionSugerida: 'Verificar manualmente si el equipo tiene contraparte en Startrack.',
        rolResponsable: 'LOGISTICA',
        camposFaltantes: ['vehiculo', 'tarea', 'ubicacion'],
      },
    ],
    leidoEn: LEIDO_EN,
  },
]
