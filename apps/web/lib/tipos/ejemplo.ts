// ═══════════════════════════════════════════════════════════════════════════
// DATOS FABRICADOS — no provienen del sandbox de ECON.
//
// Inventados a mano por el equipo para que el carril B construya contra datos
// reales de forma sin esperar a los conectores. Códigos, nombres y coordenadas
// son ficticios. AGENTS.md §1.2 prohíbe versionar registros del sandbox: si
// alguna vez hace falta actualizar este archivo, se escribe a mano, nunca
// pegando una respuesta de la API.
// ═══════════════════════════════════════════════════════════════════════════

import type { EquipoUnificado, Linaje } from './canonico'

const LEIDO_EN = '2026-09-12T18:00:00.000Z'

function linajePrisma(endpoint: string, campo: string, valorCrudo: unknown): Linaje {
  return { plataforma: 'prisma', endpoint, campo, valorCrudo, leidoEn: LEIDO_EN }
}

function linajeStartrack(endpoint: string, campo: string, valorCrudo: unknown): Linaje {
  return { plataforma: 'startrack', endpoint, campo, valorCrudo, leidoEn: LEIDO_EN }
}

/**
 * Los tres casos que la interfaz necesita poder dibujar. Cubren los tres
 * comportamientos distintos del veredicto, incluido el que nos diferencia:
 * un equipo sobre el que el sistema declara que no puede concluir.
 */
export const EQUIPOS_DE_EJEMPLO: EquipoUnificado[] = [
  // ── 1. COHERENTE: identidad resuelta, lo planificado y lo observado coinciden.
  {
    identidad: {
      id: 'eq-ejemplo-1',
      codigoActivo: 'XX-01',
      nombre: 'Equipo de ejemplo 01',
      clase: 'Retroexcavadora',
      idPrisma: '00000000-0000-4000-8000-000000000001',
      idStartrack: 'sv-0001',
      metodo: 'codigoActivo',
      identidadResuelta: true,
    },
    prisma: {
      estadoEquipo: {
        valor: 'OCUPADA',
        objeto: 'recurso',
        linaje: linajePrisma('/api/maquinaria/equipos', 'estado', 'OCUPADA'),
      },
      estadoSolicitud: {
        valor: 'APROBADA',
        objeto: 'tarea',
        linaje: linajePrisma('/api/maquinaria/requests', 'status', 'APROBADA'),
      },
      estadoFalla: null,
      enParo: {
        valor: false,
        linaje: linajePrisma('/api/maquinaria/equipos', 'active_failure_is_paro', false),
      },
      proyectoAsignado: {
        valor: 'Proyecto de ejemplo Alfa',
        linaje: linajePrisma('/api/maquinaria/equipos', 'project_name', 'Proyecto de ejemplo Alfa'),
      },
      operador: {
        valor: 'OP-001',
        linaje: linajePrisma('/api/maquinaria/operadores', 'cod_trabajador', 'OP-001'),
      },
    },
    startrack: {
      estadoVehiculo: {
        valor: 'Normal',
        objeto: 'recurso',
        linaje: linajeStartrack('ajax/vehicles.php', 'status', 'Normal'),
      },
      estadoTarea: {
        valor: 'Completada',
        objeto: 'tarea',
        linaje: linajeStartrack('ajax/tasks.php', 'status', 'Completada'),
      },
      destinoTarea: {
        valor: 'Geocerca de ejemplo Alfa',
        linaje: linajeStartrack('ajax/tasks.php', 'destination', 'Geocerca de ejemplo Alfa'),
      },
      conductor: {
        valor: 'MOT-001',
        linaje: linajeStartrack('ajax/drivers.php', 'name', 'MOT-001 Conductor de ejemplo'),
      },
      remoteId: {
        valor: null,
        linaje: linajeStartrack('ajax/vehicles.php', 'remote_id', ''),
      },
    },
    ubicacion: {
      nivelDeCascada: 2,
      descripcion: 'Geocerca de ejemplo Alfa',
      latitud: 13.7,
      longitud: -89.2,
      linaje: linajeStartrack('ajax/tasks.php', 'destination', 'Geocerca de ejemplo Alfa'),
    },
    veredicto: 'COHERENTE',
    resultados: [
      {
        regla: 'R-ESTADOS-DE-OBJETOS-DISTINTOS',
        nombre: 'Estados distintos que describen objetos distintos',
        veredicto: 'COHERENTE',
        severidad: 'informativa',
        porque: [
          'El equipo está OCUPADA: eso describe el recurso.',
          'La tarea está Completada: eso describe el traslado, no el recurso.',
          'El destino de la tarea corresponde al proyecto asignado.',
        ],
        accionSugerida: 'Ninguna. La operación es consistente.',
        rolResponsable: 'Logística',
        camposFaltantes: [],
      },
    ],
    leidoEn: LEIDO_EN,
  },

  // ── 2. EN_RIESGO: falla activa con paro y una tarea de traslado viva.
  {
    identidad: {
      id: 'eq-ejemplo-2',
      codigoActivo: 'XX-02',
      nombre: 'Equipo de ejemplo 02',
      clase: 'Cargador frontal',
      idPrisma: '00000000-0000-4000-8000-000000000002',
      idStartrack: 'sv-0002',
      metodo: 'codigoActivo',
      identidadResuelta: true,
    },
    prisma: {
      estadoEquipo: {
        valor: 'OBSOLETA',
        objeto: 'recurso',
        linaje: linajePrisma('/api/maquinaria/equipos', 'estado', 'OBSOLETA'),
      },
      estadoSolicitud: {
        valor: 'APROBADA',
        objeto: 'tarea',
        linaje: linajePrisma('/api/maquinaria/requests', 'status', 'APROBADA'),
      },
      estadoFalla: {
        valor: 'EN_PROCESO',
        objeto: 'falla',
        linaje: linajePrisma('/api/maquinaria/fallas', 'estado', 'EN_PROCESO'),
      },
      enParo: {
        valor: true,
        linaje: linajePrisma('/api/maquinaria/equipos', 'active_failure_is_paro', true),
      },
      proyectoAsignado: {
        valor: 'Proyecto de ejemplo Beta',
        linaje: linajePrisma('/api/maquinaria/equipos', 'project_name', 'Proyecto de ejemplo Beta'),
      },
      operador: {
        valor: null,
        linaje: linajePrisma('/api/maquinaria/equipos', 'assigned_personnel', null),
      },
    },
    startrack: {
      estadoVehiculo: {
        valor: 'Normal',
        objeto: 'recurso',
        linaje: linajeStartrack('ajax/vehicles.php', 'status', 'Normal'),
      },
      estadoTarea: {
        valor: 'Pendiente',
        objeto: 'tarea',
        linaje: linajeStartrack('ajax/tasks.php', 'status', 'Pendiente'),
      },
      destinoTarea: {
        valor: 'Geocerca de ejemplo Beta',
        linaje: linajeStartrack('ajax/tasks.php', 'destination', 'Geocerca de ejemplo Beta'),
      },
      conductor: {
        valor: 'MOT-002',
        linaje: linajeStartrack('ajax/drivers.php', 'name', 'MOT-002 Conductor de ejemplo'),
      },
      remoteId: {
        valor: null,
        linaje: linajeStartrack('ajax/tasks.php', 'remote_id', ''),
      },
    },
    ubicacion: {
      nivelDeCascada: 3,
      descripcion: 'Proyecto de ejemplo Beta',
      latitud: null,
      longitud: null,
      linaje: linajePrisma('/api/maquinaria/equipos', 'project_name', 'Proyecto de ejemplo Beta'),
    },
    veredicto: 'EN_RIESGO',
    resultados: [
      {
        regla: 'R-TRASLADO-CON-FALLA-ACTIVA',
        nombre: 'Traslado programado sobre una unidad en paro',
        veredicto: 'EN_RIESGO',
        severidad: 'alta',
        porque: [
          'La falla activa está EN_PROCESO y la bandera de paro está encendida.',
          'Startrack tiene una tarea de traslado Pendiente para la misma unidad.',
          'Cada dato es correcto por separado; juntos indican que el traslado no se va a ejecutar.',
        ],
        accionSugerida: 'Confirmar la disponibilidad de la unidad o reasignar el traslado a otra.',
        rolResponsable: 'Mantenimiento',
        camposFaltantes: [],
      },
    ],
    leidoEn: LEIDO_EN,
  },

  // ── 3. SIN_EVIDENCIA: el huérfano. Prisma lo tiene, Startrack no.
  {
    identidad: {
      id: 'eq-ejemplo-3',
      codigoActivo: 'XX-03',
      nombre: 'Equipo de ejemplo 03',
      clase: 'Minicargadores',
      idPrisma: '00000000-0000-4000-8000-000000000003',
      idStartrack: null,
      metodo: 'sinContraparte',
      identidadResuelta: false,
    },
    prisma: {
      estadoEquipo: {
        valor: 'DISPONIBLE',
        objeto: 'recurso',
        linaje: linajePrisma('/api/maquinaria/equipos', 'estado', 'DISPONIBLE'),
      },
      estadoSolicitud: null,
      estadoFalla: null,
      enParo: {
        valor: false,
        linaje: linajePrisma('/api/maquinaria/equipos', 'active_failure_is_paro', false),
      },
      proyectoAsignado: {
        valor: null,
        linaje: linajePrisma('/api/maquinaria/equipos', 'project_name', null),
      },
      operador: {
        valor: null,
        linaje: linajePrisma('/api/maquinaria/equipos', 'assigned_personnel', null),
      },
    },
    startrack: {
      estadoVehiculo: null,
      estadoTarea: null,
      destinoTarea: null,
      conductor: null,
      remoteId: null,
    },
    ubicacion: null,
    veredicto: 'SIN_EVIDENCIA',
    resultados: [
      {
        regla: 'R-IDENTIDAD-NO-RESUELTA',
        nombre: 'Sin contraparte en Startrack',
        veredicto: 'SIN_EVIDENCIA',
        severidad: 'media',
        porque: [
          'El código de activo de Prisma no coincide con ninguna descripción de vehículo en Startrack.',
          'La clase viene escrita en plural mientras el resto del catálogo usa singular.',
          'Sin contraparte no hay nada que reconciliar: el sistema no concluye.',
        ],
        accionSugerida:
          'Registrar el código de activo en el campo remote_id del vehículo en Startrack, o corregir la descripción.',
        rolResponsable: 'Maquinaria y Equipo',
        camposFaltantes: ['startrack.estadoVehiculo', 'startrack.estadoTarea', 'ubicacion'],
      },
    ],
    leidoEn: LEIDO_EN,
  },
]
