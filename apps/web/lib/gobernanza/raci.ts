// Matriz RACI — ECON NECT (S-C1/S-C2, carril C).
//
// Filas por paso del proceso, columnas por los seis agentes del diagrama
// TO-BE de ECON (01-DEFINICION-DE-NEGOCIO.md Parte B).
//
// ⚠ Ninguna fila de este archivo está validada todavía. `estado: 'propuesta'`
// en todas: son la mejor hipótesis del equipo a partir del diagrama TO-BE y de
// la Parte D.5, no una confirmación de un mentor de proceso de ECON. Cada fila
// que depende de una pregunta sin responder trae `preguntaRelacionada`
// apuntando a la pregunta exacta de docs/02-ROADMAP.md §3 que la cerraría.
// Cambiar `estado` a `'validada'` requiere una respuesta textual de un mentor,
// anotada en `fuente`.

import type { Rol } from '@/lib/tipos/canonico'

/** Los seis agentes del diagrama TO-BE de ECON. */
export type Agente =
  | 'Licitaciones'
  | 'Gerencia de Proyecto'
  | 'Gerencia de Logística y Equipo'
  | 'Operadores de Equipos'
  | 'Gerencia de Mantenimiento'
  | 'Control de Costos'

export const AGENTES: Agente[] = [
  'Licitaciones',
  'Gerencia de Proyecto',
  'Gerencia de Logística y Equipo',
  'Operadores de Equipos',
  'Gerencia de Mantenimiento',
  'Control de Costos',
]

/** Responsable · Aprueba (accountable) · Consultado · Informado. `null` si el
 * agente no participa de ese paso. */
export type Asignacion = 'R' | 'A' | 'C' | 'I' | null

export type FilaRaci = {
  paso: string
  asignaciones: Record<Agente, Asignacion>
  estado: 'propuesta' | 'validada'
  fuente: string
  preguntaRelacionada?: string
}

export const RACI_PROCESO: FilaRaci[] = [
  {
    paso: 'Originar la solicitud',
    asignaciones: {
      Licitaciones: 'C',
      'Gerencia de Proyecto': 'R',
      'Gerencia de Logística y Equipo': 'I',
      'Operadores de Equipos': 'I',
      'Gerencia de Mantenimiento': null,
      'Control de Costos': 'I',
    },
    estado: 'propuesta',
    fuente:
      '01 Parte D.5: "Gerencia Técnica de Proyectos... es quien origina la solicitud", y el diccionario de datos de Prisma lo confirma documentalmente — el campo "Solicita" del módulo Solicitudes de maquinaria se describe como "Solicitante del equipo (Gerente de Proyecto)" (ver lib/mapeo/matriz.ts). Licitaciones como consultada por su rol en Preconstrucción (01 Parte B).',
    preguntaRelacionada:
      '02 §3, pregunta 1: "¿Quién aprueba realmente una solicitud de maquinaria, y quién la origina?" (el origen ya tiene respaldo documental; la aprobación sigue abierta)',
  },
  {
    paso: 'Aprobarla',
    asignaciones: {
      Licitaciones: null,
      'Gerencia de Proyecto': 'C',
      'Gerencia de Logística y Equipo': 'A',
      'Operadores de Equipos': null,
      'Gerencia de Mantenimiento': 'I',
      'Control de Costos': 'C',
    },
    estado: 'propuesta',
    fuente:
      'Propuesta del equipo: Logística y Equipo como dueña del recurso que se asigna. No confirmada.',
    preguntaRelacionada:
      '02 §3, pregunta 1: "¿Quién aprueba realmente una solicitud de maquinaria, y quién la origina?"',
  },
  {
    paso: 'Asignar equipo y operador',
    asignaciones: {
      Licitaciones: null,
      'Gerencia de Proyecto': 'I',
      'Gerencia de Logística y Equipo': 'R',
      'Operadores de Equipos': 'C',
      'Gerencia de Mantenimiento': null,
      'Control de Costos': 'I',
    },
    estado: 'propuesta',
    fuente:
      '01 Parte D.5: "Gerencia de Logística y Equipo... es la gerencia que hace el puente manual hoy".',
  },
  {
    paso: 'Programar el traslado',
    asignaciones: {
      Licitaciones: null,
      'Gerencia de Proyecto': 'I',
      'Gerencia de Logística y Equipo': 'A',
      'Operadores de Equipos': 'R',
      'Gerencia de Mantenimiento': null,
      'Control de Costos': null,
    },
    estado: 'propuesta',
    fuente:
      'Propuesta del equipo, alineada con la línea punteada 1 del TO-BE (01 Parte B): "solicitud aprobada / viaja como tarea".',
  },
  {
    paso: 'Confirmar indisponibilidad técnica',
    asignaciones: {
      Licitaciones: null,
      'Gerencia de Proyecto': 'I',
      'Gerencia de Logística y Equipo': 'I',
      'Operadores de Equipos': 'C',
      'Gerencia de Mantenimiento': 'A',
      'Control de Costos': null,
    },
    estado: 'propuesta',
    fuente: 'Propuesta del equipo: Mantenimiento como autoridad técnica sobre la falla.',
    preguntaRelacionada:
      '02 §3, pregunta 6: "Cuando un equipo dice DISPONIBLE pero tiene una falla activa, ¿cuál manda para ustedes?"',
  },
  {
    paso: 'Reasignar por mantenimiento',
    asignaciones: {
      Licitaciones: null,
      'Gerencia de Proyecto': 'I',
      'Gerencia de Logística y Equipo': 'C',
      'Operadores de Equipos': null,
      'Gerencia de Mantenimiento': 'R',
      'Control de Costos': null,
    },
    estado: 'propuesta',
    fuente: 'Propuesta del equipo, sin validar.',
    preguntaRelacionada:
      '02 §3, pregunta 2: "¿Quién decide que un equipo sale de operación: Mantenimiento o Logística?"',
  },
  {
    paso: 'Atender salida de geocerca',
    asignaciones: {
      Licitaciones: null,
      'Gerencia de Proyecto': null,
      'Gerencia de Logística y Equipo': 'A',
      'Operadores de Equipos': 'R',
      'Gerencia de Mantenimiento': 'I',
      'Control de Costos': null,
    },
    estado: 'propuesta',
    fuente: 'Propuesta del equipo, sin validar.',
    preguntaRelacionada:
      '02 §3, preguntas 3 y 4: "¿Quién debe enterarse primero de que un equipo no va a llegar?" / "¿Quién cierra una alerta de salida de geocerca?"',
  },
  {
    paso: 'Devolver el equipo al catálogo operativo',
    asignaciones: {
      Licitaciones: null,
      'Gerencia de Proyecto': 'I',
      'Gerencia de Logística y Equipo': 'A',
      'Operadores de Equipos': null,
      'Gerencia de Mantenimiento': 'C',
      'Control de Costos': null,
    },
    estado: 'propuesta',
    fuente: 'Propuesta del equipo, sin validar.',
    preguntaRelacionada:
      '02 §3, pregunta 5: "¿Quién valida que un equipo volvió a estar disponible?"',
  },
  {
    paso: 'Imputar costos',
    asignaciones: {
      Licitaciones: null,
      'Gerencia de Proyecto': 'I',
      'Gerencia de Logística y Equipo': 'I',
      'Operadores de Equipos': null,
      'Gerencia de Mantenimiento': null,
      'Control de Costos': 'A',
    },
    estado: 'propuesta',
    fuente:
      '01 Parte D.5: "Control de Costos... aparece en el AS-IS y en el TO-BE; cierra el ciclo de dinero".',
  },
]

/** Traduce el vocabulario de 5 roles de `lib/tipos/canonico.ts` (compartido
 * con las reglas de A y con el acceso por rol) al agente del TO-BE
 * correspondiente. Es el enlace que vuelve utilizable la bandeja de
 * incoherencias: cada regla nombra un `Rol`, y esto dice qué agente la
 * resuelve. `DIRECCION` no tiene paso propio en el proceso — su vista es
 * transversal (panel de indicadores y salud de la integración, 01 Parte D.5). */
export const ROL_A_AGENTE: Record<Rol, Agente | null> = {
  PROYECTOS: 'Gerencia de Proyecto',
  LOGISTICA: 'Gerencia de Logística y Equipo',
  MANTENIMIENTO: 'Gerencia de Mantenimiento',
  COSTOS: 'Control de Costos',
  DIRECCION: null,
}

export function agenteResponsablePorRol(rol: Rol): Agente | null {
  return ROL_A_AGENTE[rol]
}

function csvEscape(valor: string): string {
  if (/[",\n]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`
  return valor
}

export function raciACsv(filas: FilaRaci[]): string {
  const encabezado = ['paso', ...AGENTES, 'estado', 'fuente']
  const lineas = filas.map((fila) =>
    [
      fila.paso,
      ...AGENTES.map((agente) => fila.asignaciones[agente] ?? ''),
      fila.estado,
      fila.fuente,
    ]
      .map(csvEscape)
      .join(',')
  )
  return [encabezado.join(','), ...lineas].join('\n')
}
