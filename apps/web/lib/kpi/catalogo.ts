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
    nombre: 'Tiempo muerto en USD',
    queMide:
      'Las horas mínimas contratadas de un equipo que no se alcanzaron, multiplicadas por su tarifa vigente. USD — moneda inferida: la operación es en El Salvador; Prisma no la declara.',
    porQueImporta:
      'Convierte el argumento de "reducción de tiempos muertos" en una cifra defendible, no en un adjetivo (01 Parte E.6, criterio de rúbrica 1.1).',
    formula:
      '(horas mínimas contratadas − horas reales de uso) × tarifa efectiva vigente del equipo, en USD, sumado por proyecto o por flota.',
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
  {
    id: 'ahorro-por-objetivo-optimizador',
    nombre: 'Ahorro proyectado por objetivo (asignación manual vs. optimizador)',
    queMide:
      'En las solicitudes APROBADA que ya tienen una máquina asignada a mano en Prisma, cuánto mejora la asignación que propone el optimizador en cada objetivo de la pila (distancia, tarifa efectiva, holgura, continuidad de operador). Solo cuenta los casos donde ambas asignaciones tienen dato real.',
    porQueImporta:
      'Compara la propuesta contra lo que la operación hizo de verdad, no contra un escenario imaginado. Es el argumento de reducción de costos y tiempos muertos, con su cobertura a la vista (01 E.6).',
    formula:
      'Por objetivo, Σ sobre las aprobadas comparables de (valor manual − valor propuesto) para distancia y tarifa, y de (valor propuesto − valor manual) para holgura y continuidad. Positivo = la propuesta es mejor. Comparable = ambos valores no nulos y sin peor caso aplicado.',
    referencia:
      'Contra 0 (la asignación manual observada). Cobertura verificada el 12 de septiembre de 2026: la tarifa efectiva está poblada en 8 de 16 equipos; la distancia, la holgura y la continuidad de la asignación manual no son calculables, porque el sandbox no registra dónde estaba la máquina antes de moverse, su ocupación previa ni el operador de la solicitud. La cobertura de cada objetivo se muestra junto al número. Moneda: USD inferido (la operación es en El Salvador; Prisma no la declara).',
    accionQueDispara:
      'Revisar con Logística las solicitudes donde la propuesta mejora la tarifa antes de confirmar la siguiente asignación. Si la cobertura es baja, pedir que se registre el origen y el operador de cada asignación.',
    porQueNingunaPlataformaLoVeSola:
      'Prisma tiene la asignación manual y la tarifa, y Startrack tiene las geocercas que dan la distancia. Ninguna de las dos compara lo asignado contra una asignación alternativa óptima.',
    datoFaltante: null,
  },
  {
    id: 'lluvia-clases-sensibles-optimizador',
    nombre: 'Asignaciones con lluvia probable en clases sensibles',
    queMide:
      'De las asignaciones propuestas para clases que el planificador marcó como sensibles a la lluvia (trabajos como aplanar tierra o aplicar mezclas), cuántas tienen al menos un día con probabilidad máxima de precipitación ≥ 50 % dentro de su período.',
    porQueImporta:
      'Una máquina movilizada para trabajar en días de lluvia es tiempo muerto pagado. La operación es en El Salvador, en temporada de lluvias en septiembre. Anticiparlo permite reprogramar antes de movilizar.',
    formula:
      'Conteo de asignaciones con clase ∈ clases sensibles y al menos un día con precipitation_probability_max ≥ 50 %, sobre el total de asignaciones de clases sensibles. Las que no tienen pronóstico se reportan aparte.',
    referencia:
      'Contra 0. Fuente: pronóstico diario de Open-Meteo (16 días, zona America/El_Salvador, coordenada de la geocerca del proyecto redondeada a 1 decimal). Las clases sensibles son criterio del planificador, no un dato de Prisma ni de Startrack. Un día fuera del horizonte de pronóstico cuenta como "sin pronóstico", nunca como día seco.',
    accionQueDispara:
      'Reprogramar la solicitud con la Gerencia de Proyecto, o preparar un plan alterno de trabajo antes de movilizar la máquina.',
    porQueNingunaPlataformaLoVeSola:
      'Prisma tiene las fechas y la clase, y Startrack la geocerca del proyecto. Ninguna de las dos integra un pronóstico del clima.',
    datoFaltante: null,
  },
  {
    id: 'cobertura-plan-optimizador',
    nombre: 'Cobertura del plan de asignación',
    queMide:
      'Proporción de solicitudes evaluables (PENDIENTE o APROBADA con período vigente) para las que existe una asignación que respeta todas las restricciones duras.',
    porQueImporta:
      'Dice cuánta demanda de maquinaria puede cubrir la flota actual sin romper la disponibilidad real. Las solicitudes que no se cubren son un faltante de flota que hoy se descubre tarde.',
    formula:
      'Asignaciones propuestas ÷ (asignaciones propuestas + solicitudes sin asignación posible). Las excluidas (período vencido) no entran al denominador y se reportan aparte.',
    referencia:
      'Contra 100 %. Cada solicitud no cubierta trae su motivo concreto: clase, operabilidad, ventana u operador.',
    accionQueDispara:
      'Escalar a Logística las solicitudes sin asignación posible para rentar, reprogramar o reasignar.',
    porQueNingunaPlataformaLoVeSola:
      'Prisma tiene la demanda y la ocupación, pero no evalúa si toda la demanda cabe a la vez respetando la disponibilidad real, que ni siquiera es un campo (01 E.2). Startrack no ve la demanda.',
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
