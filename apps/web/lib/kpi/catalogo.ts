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
      'Tarifa y mínimo contratado: `precio_x_hora` y `minimum_usage_hours` vienen poblados solo en 2 de los 17 equipos observados (13 de septiembre de 2026). Las horas reales de uso SÍ existen en el sandbox — corrección de S-A11: Startrack expone el horómetro GPS acumulado (`curOperatingHours`, reporte 22) y la serie diaria de motor encendido en segundos (`ignOnTime`, reporte 3) para 13 de 14 vehículos con horas > 0; la afirmación previa de que no había horas de uso (404 en las rutas de Prisma probadas) era cierta solo para Prisma. El KPI sigue sin ser calculable, pero por la tarifa y el mínimo, no por las horas. El valor se muestra como "No disponible — faltan tarifa y mínimo contratado", nunca un número inventado.',
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
    id: 'estado-flota-30d',
    nombre: 'Estado operativo de la flota, últimos 30 días',
    queMide:
      'Cómo cambió el estado operativo de la flota día a día en la última ventana de 30 días.',
    porQueImporta:
      'Dirección necesita ver si una incoherencia es un pico o un patrón. Una foto de hoy no alcanza para esa decisión.',
    formula:
      'Una observación por día: recuento de equipos por veredicto (o por moving_status de Startrack) en cada lectura persistida.',
    referencia: 'Contra la propia serie de las últimas 4 semanas, cuando exista.',
    accionQueDispara: 'Si el patrón empeora, abrir la bandeja; si es un pico de un día, no reorganizar la flota.',
    porQueNingunaPlataformaLoVeSola:
      'Prisma no guarda el veredicto cruzado. Startrack guarda telemetría viva, no la serie reconciliada de ECON NECT.',
    datoFaltante:
      'Histórico de 30 días. Los conectores leen el estado actual, no una serie. No se inventa una curva ni un porcentaje de tendencia.',
  },
  {
    id: 'ahorro-por-objetivo-optimizador',
    nombre: 'Ahorro del plan frente a la peor opción válida',
    queMide:
      'Por cada solicitud que el plan cubre, cuánto mejor es la máquina y el operador elegidos que la peor opción que también cumplía todas las restricciones duras de esa solicitud, en tarifa efectiva (USD/h), distancia al proyecto (km), rating del operador (pts, Startrack) y horas de motor acumuladas del vehículo que conduce el operador (h, contador de Startrack).',
    porQueImporta:
      'Muestra el costo de asignar sin criterio dentro de lo que es válido: la diferencia entre la mejor y la peor decisión posible con la flota y la gente disponibles hoy. Es el argumento de costo por hora, traslado, seguridad y reparto de carga, con su cobertura a la vista.',
    formula:
      'Por objetivo, Σ sobre las asignaciones comparables de (peor − elegido) para tarifa, distancia y horas, y de (elegido − peor) para rating. Positivo = el plan es mejor. Comparable = valor elegido real (no nulo y sin peor caso) y peor opción con dato real. Para rating se muestra además el promedio por asignación.',
    referencia:
      'Contra 0 (elegir la peor opción válida). La peor opción se evalúa por separado para cada objetivo y solo entre valores reales. Cobertura verificada el 13 de septiembre de 2026: tarifa efectiva en 8 de 16 equipos; rating en 9 de 16 operadores; horas en 10 de 16 (0 h si el conductor unido no tuvo actividad); unión operador↔conductor por código en 15 de 16. Sin total en USD: el sandbox no registra horas por jornada. Moneda: USD inferido (la operación es en El Salvador; Prisma no la declara).',
    accionQueDispara:
      'Confirmar con Logística la asignación propuesta antes de asignar a mano. Si un objetivo tiene baja cobertura, pedir que se registre el dato faltante (tarifa efectiva en Prisma, o el código de trabajador en el nombre del conductor en Startrack).',
    porQueNingunaPlataformaLoVeSola:
      'Prisma tiene las solicitudes, la disponibilidad y la tarifa; Startrack tiene las geocercas, la calificación y las horas de motor de cada conductor. Ninguna une al operador con su conductor ni compara la decisión contra las alternativas válidas.',
    datoFaltante: null,
  },
  {
    id: 'cobertura-plan-optimizador',
    nombre: 'Solicitudes cubiertas por el plan',
    queMide:
      'De las solicitudes con período vigente (PENDIENTE, y APROBADA cuya máquina confirmada ya no puede operar), cuántas tienen máquina y operador que cumplen todas las restricciones duras.',
    porQueImporta:
      'Dice cuánta demanda de maquinaria puede cubrir la flota actual sin romper la disponibilidad real, incluida la solicitud que se queda sin máquina porque la confirmada cayó. Las solicitudes que no se cubren son un faltante de flota que hoy se descubre tarde.',
    formula:
      'Cubiertas de evaluadas, donde evaluadas = cubiertas + sin asignación posible. Las excluidas (período vencido) se reportan aparte.',
    referencia:
      'Contra el total de evaluadas: todas cubiertas. Cada solicitud no cubierta trae su motivo concreto: clase, operabilidad, ventana u operador, y la lista va en orden de llegada (created_at). Si en la pila el orden de llegada va antes que la cobertura, el plan puede cubrir menos a propósito: una solicitud anterior no pierde su máquina para cubrir otras posteriores.',
    accionQueDispara:
      'Por cada no cubierta, según su motivo: rentar (0 máquinas de la clase), reprogramar (máquinas ocupadas en la ventana) o reasignar operador.',
    porQueNingunaPlataformaLoVeSola:
      'Prisma tiene la demanda y la ocupación, pero no evalúa si toda la demanda cabe a la vez respetando la disponibilidad real, que ni siquiera es un campo (01 E.2), ni propone un reemplazo cuando una máquina confirmada deja de operar. Startrack no ve la demanda.',
    datoFaltante: null,
  },

  // ── Mantenimiento preventivo por horómetro (S-A11 Paso 10b) ──────────────
  {
    id: 'avance-intervalo-mantenimiento',
    nombre: 'Avance al intervalo de mantenimiento',
    queMide:
      'Horas de motor medidas por el GPS de Startrack desde la última salida de taller del equipo, divididas por el intervalo de servicio vigente (aceite de motor y filtros). Se muestra como porcentaje y como horas de M.',
    porQueImporta:
      'El horómetro humano de Prisma (`hour_meter` del reporte de falla) solo se teclea cuando la máquina ya está en el taller; el GPS lo mide todos los días. Con esto Mantenimiento ve venir el servicio en vez de enterarse por una falla.',
    formula:
      'Σ ignOnTime (segundos, reporte diario 3 de Startrack) de los días posteriores al ancla ÷ 3600 ÷ intervalo vigente. Ancla = la más reciente entre mantenimiento_fecha_fin del equipo (Prisma, si ≤ hoy) y updated_at del último reporte FINALIZADO; sin ninguna, el primer día con datos del GPS (y se dice). Intervalo, en orden: fijado a mano en el navegador → mediana de Δhour_meter entre reportes FINALIZADO consecutivos del equipo → catálogo OEM por marca y modelo (estándar o severo) → sin dato.',
    referencia:
      'Aviso al 80 %, urgente al 90 %, vencido al 100 % del intervalo (editables por navegador, con esos valores por defecto); o contra el intervalo aprendido del propio equipo cuando hay historial. Verificado el 13 de septiembre de 2026: Σ de la serie diaria ÷ 3600 coincide con el contador del vehículo en 14 de 14; los dos horómetros (GPS y humano) nunca se comparan entre sí.',
    accionQueDispara:
      'Abrir la orden de taller preventiva antes del 100 % (P4 en Prisma + P3 en Startrack, con confirmación humana), y sacar la máquina de la demanda del optimizador para esas fechas.',
    porQueNingunaPlataformaLoVeSola:
      'Startrack tiene las horas de motor pero no sabe cuándo salió del taller ni cuál es el intervalo; Prisma tiene el taller (ventana de mantenimiento, reportes de falla) y el intervalo aprendido, pero ningún horómetro que se actualice solo. Ninguna cruza las dos cosas.',
    datoFaltante:
      'Intervalo: hoy sale del catálogo OEM (parámetro declarado con fuente externa, por marca y modelo) porque el sandbox no tiene reportes FINALIZADO con horómetro (0 reportes el 13 de septiembre de 2026). Sensores de temperatura y combustible: no existen (`sensor_readings` vacío y `fuelmeter` = 0 en 14 de 14). Los 3 equipos sin contraparte en Startrack quedan sin horómetro, y se dice.',
  },
  {
    id: 'equipos-en-alerta-preventiva',
    nombre: 'Equipos en alerta preventiva (N de M)',
    queMide:
      'Cuántos equipos con horómetro GPS e intervalo vigente están en aviso, urgente o vencido, sobre M = equipos con horómetro e intervalo. Se desglosa por nivel.',
    porQueImporta:
      'Es la cola de trabajo de Mantenimiento en un número: cuántas máquinas van a parar si nadie abre la orden, ordenadas por urgencia real y no por la fecha en que alguien se acordó.',
    formula:
      'N = equipos con nivelAlerta ≠ null (vencido > urgente > aviso); M = equipos con horasDesdeAncla e intervalo.horas no nulos. Un equipo en taller o parado por falla no cuenta como alerta mientras dure.',
    referencia:
      'Contra 0 de M: ninguna máquina llega al 100 % sin orden abierta. La cobertura M se muestra siempre al lado: hoy 14 de 17 equipos tienen horómetro y 15 de 17 tienen intervalo (13 de septiembre de 2026).',
    accionQueDispara:
      'Priorizar la orden de taller de los equipos en vencido y urgente, y sacar esas máquinas de la demanda del optimizador para la ventana de taller.',
    porQueNingunaPlataformaLoVeSola:
      'Prisma no tiene horas de motor que cambien solas; Startrack no tiene intervalo ni salida de taller. El conteo existe solo al cruzarlas.',
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
