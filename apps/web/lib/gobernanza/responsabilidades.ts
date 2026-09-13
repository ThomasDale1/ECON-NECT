// Matriz de Responsabilidades — ECON NECT (carril C).
//
// Reemplaza la antigua presentación RACI. Las responsabilidades se expresan
// con verbos y contexto operacional, no con letras aisladas. Ninguna fila se
// considera validada hasta que una fuente autorizada de ECON confirme la
// atribución; por eso todas permanecen como `propuesta`.

import type { Rol } from '@/lib/tipos/canonico'

export const GERENCIAS_OBLIGATORIAS = [
  'Gerencia de Mantenimiento',
  'Gerencia de Logística y Equipos',
  'Gerencia Técnica de Proyectos',
] as const

export type Gerencia = (typeof GERENCIAS_OBLIGATORIAS)[number]

export type TipoParticipacion =
  | 'Ejecuta'
  | 'Valida'
  | 'Se consulta'
  | 'Recibe visibilidad'
  | 'Sin intervención definida'

export type Responsabilidad = {
  participacion: TipoParticipacion
  detalle: string
}

export type FilaResponsabilidad = {
  paso: string
  situacionActual: string
  conPlataformaIntegrada: string
  responsabilidades: Record<Gerencia, Responsabilidad>
  otrosActores: string
  estado: 'propuesta' | 'validada'
  fuente: string
  preguntaPendiente?: string
}

const SIN_INTERVENCION: Responsabilidad = {
  participacion: 'Sin intervención definida',
  detalle: 'No se ha documentado una intervención de esta gerencia en este paso.',
}

export const MATRIZ_RESPONSABILIDADES: FilaResponsabilidad[] = [
  {
    paso: 'Originar la solicitud de maquinaria',
    situacionActual:
      'La necesidad se registra en Prisma y la coordinación posterior entre áreas continúa por medios separados.',
    conPlataformaIntegrada:
      'La plataforma muestra la solicitud junto con disponibilidad, ubicación y alertas relacionadas, sin aprobarla automáticamente.',
    responsabilidades: {
      'Gerencia Técnica de Proyectos': {
        participacion: 'Ejecuta',
        detalle: 'Registra la necesidad, el proyecto, el tipo de equipo y el período requerido.',
      },
      'Gerencia de Logística y Equipos': {
        participacion: 'Recibe visibilidad',
        detalle: 'Visualiza la demanda pendiente para iniciar el análisis de asignación.',
      },
      'Gerencia de Mantenimiento': SIN_INTERVENCION,
    },
    otrosActores: 'Licitaciones y Control de Costos pueden ser consultados según el proyecto.',
    estado: 'propuesta',
    fuente:
      '01 Parte D.5 y campo "Solicita" del módulo Solicitudes de maquinaria: la Gerencia Técnica de Proyectos origina la solicitud.',
    preguntaPendiente: '¿Quién aprueba finalmente la solicitud después de ser originada?',
  },
  {
    paso: 'Aprobar o rechazar la solicitud',
    situacionActual:
      'La aprobación existe en Prisma, pero la autoridad final y sus criterios no quedaron confirmados en las fuentes permitidas.',
    conPlataformaIntegrada:
      'La plataforma presenta la evidencia cruzada para decidir y conserva la decisión humana y su trazabilidad.',
    responsabilidades: {
      'Gerencia Técnica de Proyectos': {
        participacion: 'Se consulta',
        detalle: 'Aclara prioridad, fechas y condiciones del proyecto solicitante.',
      },
      'Gerencia de Logística y Equipos': {
        participacion: 'Valida',
        detalle: 'Atribución propuesta como administradora del recurso; requiere confirmación de ECON.',
      },
      'Gerencia de Mantenimiento': {
        participacion: 'Se consulta',
        detalle: 'Confirma restricciones técnicas cuando existe una falla o mantenimiento vigente.',
      },
    },
    otrosActores: 'Control de Costos puede aportar restricciones presupuestarias.',
    estado: 'propuesta',
    fuente: 'Hipótesis del equipo basada en el TO-BE; no validada por un mentor de proceso.',
    preguntaPendiente: '¿Quién tiene la autoridad formal para aprobar o rechazar la solicitud?',
  },
  {
    paso: 'Asignar equipo y operador',
    situacionActual:
      'Logística y Equipos realiza el puente manual entre la solicitud de Prisma y la operación de Startrack.',
    conPlataformaIntegrada:
      'La plataforma reúne compatibilidad, disponibilidad, operador, ubicación y conflictos antes de mostrar una recomendación.',
    responsabilidades: {
      'Gerencia Técnica de Proyectos': {
        participacion: 'Recibe visibilidad',
        detalle: 'Consulta qué recurso fue asignado y si satisface la ventana del proyecto.',
      },
      'Gerencia de Logística y Equipos': {
        participacion: 'Ejecuta',
        detalle: 'Selecciona y registra el equipo y el operador; la plataforma solo recomienda y evidencia.',
      },
      'Gerencia de Mantenimiento': {
        participacion: 'Se consulta',
        detalle: 'Aclara condición técnica cuando el equipo tiene una alerta o falla activa.',
      },
    },
    otrosActores: 'Operadores de Equipos confirman disponibilidad operativa personal.',
    estado: 'propuesta',
    fuente: '01 Parte D.5: Logística y Equipos realiza actualmente el puente manual.',
  },
  {
    paso: 'Programar y ejecutar el traslado',
    situacionActual:
      'La solicitud aprobada y la tarea de traslado viven en plataformas distintas y se reconcilian manualmente.',
    conPlataformaIntegrada:
      'La plataforma enlaza solicitud y tarea, muestra origen/destino y advierte si la máquina no puede operar.',
    responsabilidades: {
      'Gerencia Técnica de Proyectos': {
        participacion: 'Recibe visibilidad',
        detalle: 'Consulta programación, avance y riesgo de incumplimiento de la llegada.',
      },
      'Gerencia de Logística y Equipos': {
        participacion: 'Valida',
        detalle: 'Coordina el traslado y confirma que la tarea corresponde a la solicitud aprobada.',
      },
      'Gerencia de Mantenimiento': {
        participacion: 'Se consulta',
        detalle: 'Confirma si una condición técnica impide o condiciona el movimiento.',
      },
    },
    otrosActores: 'Operadores de Equipos ejecutan el movimiento bajo coordinación de Logística.',
    estado: 'propuesta',
    fuente: 'Línea de integración TO-BE: la solicitud aprobada viaja como tarea.',
  },
  {
    paso: 'Declarar indisponibilidad técnica',
    situacionActual:
      'Prisma y Startrack pueden mostrar estados distintos porque describen recurso, falla y tarea como objetos separados.',
    conPlataformaIntegrada:
      'La plataforma conserva los estados de origen, explica el objeto descrito y eleva una incoherencia para resolución humana.',
    responsabilidades: {
      'Gerencia Técnica de Proyectos': {
        participacion: 'Recibe visibilidad',
        detalle: 'Recibe el impacto sobre solicitudes y fechas del proyecto.',
      },
      'Gerencia de Logística y Equipos': {
        participacion: 'Recibe visibilidad',
        detalle: 'Recibe la restricción antes de asignar o mover el equipo.',
      },
      'Gerencia de Mantenimiento': {
        participacion: 'Valida',
        detalle: 'Confirma la condición técnica y el alcance operativo de la falla.',
      },
    },
    otrosActores: 'El operador aporta observaciones de campo cuando corresponda.',
    estado: 'propuesta',
    fuente: '01 Parte E.2 y propuesta del equipo sobre autoridad técnica de Mantenimiento.',
    preguntaPendiente: 'Cuando Prisma dice DISPONIBLE pero existe una falla activa, ¿qué condición prevalece?',
  },
  {
    paso: 'Reasignar por mantenimiento',
    situacionActual:
      'La información de falla y la demanda de proyecto se contrastan manualmente para buscar reemplazo.',
    conPlataformaIntegrada:
      'La plataforma identifica el conflicto y propone alternativas; la reasignación sigue siendo una decisión humana.',
    responsabilidades: {
      'Gerencia Técnica de Proyectos': {
        participacion: 'Recibe visibilidad',
        detalle: 'Confirma el impacto y la prioridad de la necesidad no cubierta.',
      },
      'Gerencia de Logística y Equipos': {
        participacion: 'Ejecuta',
        detalle: 'Selecciona y registra el recurso sustituto después de conocer la restricción técnica.',
      },
      'Gerencia de Mantenimiento': {
        participacion: 'Valida',
        detalle: 'Confirma que el equipo original no debe asignarse y comunica la ventana estimada de retorno.',
      },
    },
    otrosActores: 'Operadores de Equipos y Control de Costos pueden ser consultados para factibilidad.',
    estado: 'propuesta',
    fuente: 'Propuesta del equipo; la separación entre decisión técnica y reasignación logística requiere validación.',
    preguntaPendiente: '¿Quién decide formalmente sacar el equipo de operación y quién autoriza el reemplazo?',
  },
  {
    paso: 'Atender una alerta de ubicación o geocerca',
    situacionActual:
      'Startrack registra ubicación y tareas, pero el impacto en la solicitud de Prisma no queda visible en el mismo lugar.',
    conPlataformaIntegrada:
      'La plataforma relaciona la alerta con equipo, traslado y proyecto, y dirige la atención al área correspondiente.',
    responsabilidades: {
      'Gerencia Técnica de Proyectos': {
        participacion: 'Recibe visibilidad',
        detalle: 'Recibe una alerta cuando la desviación amenaza la fecha del proyecto.',
      },
      'Gerencia de Logística y Equipos': {
        participacion: 'Ejecuta',
        detalle: 'Investiga la desviación, coordina la corrección y documenta el cierre.',
      },
      'Gerencia de Mantenimiento': {
        participacion: 'Se consulta',
        detalle: 'Interviene si la desviación está relacionada con una falla o inmovilización técnica.',
      },
    },
    otrosActores: 'Operadores de Equipos aportan la confirmación de campo.',
    estado: 'propuesta',
    fuente: 'Propuesta del equipo basada en el caso de uso de geocercas; sin validación de proceso.',
    preguntaPendiente: '¿Quién recibe primero la alerta y quién tiene autoridad para cerrarla?',
  },
  {
    paso: 'Devolver el equipo al catálogo operativo',
    situacionActual:
      'El cierre técnico y la disponibilidad logística pueden quedar desalineados entre módulos y plataformas.',
    conPlataformaIntegrada:
      'La plataforma exige evidencia de cierre técnico antes de presentar el recurso como candidato de asignación.',
    responsabilidades: {
      'Gerencia Técnica de Proyectos': {
        participacion: 'Recibe visibilidad',
        detalle: 'Ve cuándo el recurso vuelve a ser elegible para solicitudes.',
      },
      'Gerencia de Logística y Equipos': {
        participacion: 'Ejecuta',
        detalle: 'Actualiza o confirma la disponibilidad logística después del cierre técnico.',
      },
      'Gerencia de Mantenimiento': {
        participacion: 'Valida',
        detalle: 'Confirma que la intervención terminó y que no persiste una restricción técnica.',
      },
    },
    otrosActores: 'Control de Costos puede cerrar la imputación económica de la intervención.',
    estado: 'propuesta',
    fuente: 'Propuesta del equipo; la autoridad final sobre disponibilidad no está confirmada.',
    preguntaPendiente: '¿Quién valida formalmente que un equipo volvió a estar disponible?',
  },
]

export type UnidadResponsable = Gerencia | 'Control de Costos' | null

/** Conecta el rol de cada regla con la unidad que debe atenderla. */
export const ROL_A_UNIDAD: Record<Rol, UnidadResponsable> = {
  PROYECTOS: 'Gerencia Técnica de Proyectos',
  LOGISTICA: 'Gerencia de Logística y Equipos',
  MANTENIMIENTO: 'Gerencia de Mantenimiento',
  COSTOS: 'Control de Costos',
  DIRECCION: null,
}

export function responsablePorRol(rol: Rol): UnidadResponsable {
  return ROL_A_UNIDAD[rol]
}

export const PASO_DE_REGLA: Record<string, string> = {
  R1: 'Programar y ejecutar el traslado',
  R2: 'Programar y ejecutar el traslado',
  R3: 'Programar y ejecutar el traslado',
  R4: 'Reasignar por mantenimiento',
  R5: 'Asignar equipo y operador',
  R6: 'Asignar equipo y operador',
  R7: 'Asignar equipo y operador',
  R8: 'Asignar equipo y operador',
}

function csvEscape(valor: string): string {
  if (/[",\n]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`
  return valor
}

export function responsabilidadesACsv(filas: FilaResponsabilidad[]): string {
  const encabezado = [
    'paso',
    'situacionActual',
    'conPlataformaIntegrada',
    ...GERENCIAS_OBLIGATORIAS.flatMap((gerencia) => [
      `${gerencia} - participación`,
      `${gerencia} - responsabilidad`,
    ]),
    'otrosActores',
    'estado',
    'fuente',
    'preguntaPendiente',
  ]

  const lineas = filas.map((fila) =>
    [
      fila.paso,
      fila.situacionActual,
      fila.conPlataformaIntegrada,
      ...GERENCIAS_OBLIGATORIAS.flatMap((gerencia) => [
        fila.responsabilidades[gerencia].participacion,
        fila.responsabilidades[gerencia].detalle,
      ]),
      fila.otrosActores,
      fila.estado,
      fila.fuente,
      fila.preguntaPendiente ?? '',
    ]
      .map(csvEscape)
      .join(','),
  )

  return [encabezado.map(csvEscape).join(','), ...lineas].join('\n')
}
