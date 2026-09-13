// Catálogo de KPIs — ECON NECT (S-C1/S-C2, carril C).
//
// Doctrina del workshop de analítica de ECON (01-DEFINICION-DE-NEGOCIO.md
// Parte D.7): "Una métrica informa; un KPI mueve a una decisión." Ningún
// indicador entra sin sus seis campos. Si no es calculable con lo que el
// sandbox expone, `datoFaltante` lo dice — nunca se inventa un valor.

export type Kpi = {
  id: string
  nombre: string
  queMide: string
  porQueImporta: string
  formula: string
  referencia: string
  /** Qué hace el usuario al verlo. Si no dispara ninguna acción, no es KPI. */
  accionQueDispara: string
  porQueNingunaPlataformaLoVeSola: string
  /** Si no es calculable con lo que el sandbox expone, qué dato falta. `null`
   * si hoy sí es calculable. */
  datoFaltante: string | null
}

export const CATALOGO_KPI: Kpi[] = [
  {
    id: 'tiempo-muerto-quetzales',
    nombre: 'Tiempo muerto en quetzales',
    queMide:
      'Las horas mínimas contratadas de un equipo que no se alcanzaron, multiplicadas por su tarifa vigente.',
    porQueImporta:
      'Convierte el argumento de "reducción de tiempos muertos" en una cifra defendible, no en un adjetivo (01 Parte E.6, criterio de rúbrica 1.1).',
    formula:
      '(horas mínimas contratadas − horas reales de uso) × tarifa efectiva vigente del equipo, sumado por proyecto o por flota.',
    referencia:
      'Contra el mínimo contratado por equipo (histórico de tarifas y horas mínimas expuesto por la API de Prisma).',
    accionQueDispara: 'Reasignar el equipo a otro proyecto, o renegociar el mínimo contratado.',
    porQueNingunaPlataformaLoVeSola:
      'Prisma tiene la tarifa y el mínimo contratado; Startrack tiene las horas reales de uso del equipo en el terreno. Ninguna de las dos cruza ambas cosas hoy.',
    datoFaltante:
      'Horas reales de uso: no expuestas por ningún endpoint del sandbox (404 verificado en las rutas de uso/bitácora probadas: .../uso, .../usage, .../eventos, .../events, .../historial, y las de nivel de módulo). Además, `precio_x_hora` y `minimum_usage_hours` vienen poblados solo en 1 de los 15 equipos observados. La fórmula queda declarada arriba; el valor se muestra como "No disponible — falta el timestamp/horas reales", nunca un número inventado.',
  },
  {
    id: 'latencia-solicitud-traslado',
    nombre: 'Latencia solicitud aprobada → tarea de traslado',
    queMide:
      'Horas entre que una solicitud queda APROBADA en Prisma y que nace la tarea de traslado correspondiente en Startrack.',
    porQueImporta:
      'Mide en horas el puente manual que hoy caminan las personas (01 Parte B.1) — es la línea punteada 1 del TO-BE, sin ejecutar.',
    formula:
      'instante de creación de la tarea en Startrack − instante en que la solicitud pasó a APROBADA en la bitácora de eventos de Prisma.',
    referencia:
      'Contra el tiempo que un mentor de proceso declare como normal hoy (pregunta de oro, 02 Roadmap §3), y contra 0 horas una vez que P1 esté activo. Cobertura verificada el 12 de septiembre: calculable donde `remote_id` enlaza tarea con solicitud; hoy 1 de 5 solicitudes aprobadas — el resto espera que P1 llene `remote_id` sistemáticamente. Esa brecha de cobertura es, en sí misma, el argumento del producto.',
    accionQueDispara: 'Activar la propagación P1 para ese caso, o escalar el retraso a Logística.',
    porQueNingunaPlataformaLoVeSola:
      'El instante de aprobación vive en la bitácora de eventos de Prisma; el instante de creación de la tarea vive en Startrack. Cruzarlos es exactamente el trabajo que hoy hace una persona por teléfono.',
    datoFaltante: null,
  },
  {
    id: 'tasa-coherencia',
    nombre: 'Tasa de coherencia entre plataformas',
    queMide:
      'Proporción de equipos con veredicto COHERENTE sobre el total de equipos interpretables (con identidad resuelta).',
    porQueImporta: 'Resume la salud de la integración en un solo número para Dirección de Operaciones (01 Parte D.5).',
    formula: 'equipos con veredicto COHERENTE ÷ equipos con identidadResuelta = true.',
    referencia: 'Contra el 100 % (todo lo interpretable, coherente) y contra su propia serie histórica en el panel.',
    accionQueDispara: 'Atender la bandeja de incoherencias, empezando por severidad alta.',
    porQueNingunaPlataformaLoVeSola:
      'Cada plataforma solo ve su propio estado; la coherencia es, por definición, una comparación entre las dos.',
    datoFaltante: null,
  },
  {
    id: 'cobertura-interpretacion',
    nombre: 'Cobertura de interpretación',
    queMide:
      'Proporción de equipos con identidadResuelta = true (el sistema pudo cruzar ambas plataformas) sobre el total de equipos observados.',
    porQueImporta:
      'Se muestra siempre junto a la tasa de coherencia: sin ella, una tasa de coherencia alta puede esconder que buena parte de la flota ni siquiera se pudo interpretar (01 Parte D.7).',
    formula: 'equipos con identidadResuelta = true ÷ total de equipos observados.',
    referencia: 'Contra el 100 % de la flota total leída en la última consulta.',
    accionQueDispara:
      'Investigar los huérfanos (identidad no resuelta) uno por uno, empezando por el caso ya confirmado en el sandbox (01 Parte E.4).',
    porQueNingunaPlataformaLoVeSola:
      'Ninguna de las dos plataformas sabe que le falta una contraparte en la otra: cada una solo ve sus propios registros.',
    datoFaltante: null,
  },
]

function csvEscape(valor: string): string {
  if (/[",\n]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`
  return valor
}

export function catalogoKpiACsv(kpis: Kpi[]): string {
  const encabezado = [
    'id',
    'nombre',
    'queMide',
    'porQueImporta',
    'formula',
    'referencia',
    'accionQueDispara',
    'porQueNingunaPlataformaLoVeSola',
    'datoFaltante',
  ]
  const lineas = kpis.map((kpi) =>
    [
      kpi.id,
      kpi.nombre,
      kpi.queMide,
      kpi.porQueImporta,
      kpi.formula,
      kpi.referencia,
      kpi.accionQueDispara,
      kpi.porQueNingunaPlataformaLoVeSola,
      kpi.datoFaltante ?? '',
    ]
      .map(csvEscape)
      .join(',')
  )
  return [encabezado.join(','), ...lineas].join('\n')
}
