// Matriz de mapeo de campos — ECON NECT (S-C1/S-C2, carril C).
//
// Fuentes permitidas (AGENTS.md §1.1, §1.2):
// - 01-DEFINICION-DE-NEGOCIO.md Parte E: hallazgos verificados contra la API
//   real del sandbox el 12 de septiembre de 2026.
// - El diccionario de datos oficial de ECON ("Entropy Hack_Grupo ECON_
//   Diccionario de Datos_Final.xlsx"), leído por una persona del equipo y
//   transcrito acá como hecho estructural (módulo, campo, tipo, catálogo) —
//   nunca el archivo mismo, nunca un valor de registro real. El propio
//   diccionario declara que sus "Ejemplo" son valores fabricados para el
//   ejercicio, no volcados del sandbox.
//
// Regla dura de esta tabla (AGENTS.md §1.1): ninguna fila afirma una
// correspondencia que no esté respaldada por una de esas dos fuentes. Donde el
// nombre exacto de un campo de Prisma no fue confirmado contra ninguna de las
// dos, la fila lo dice y baja su `confianza` a `hipotesis` — nunca se inventa
// un nombre que "suene razonable". `sin equivalencia directa` es una respuesta
// tan válida como cualquier otra (ECON, brief).
//
// La matriz es completa para el alcance declarado del MVP: maquinaria,
// solicitudes, tareas, geocercas e información de mantenimiento necesaria
// para los casos de uso implementados. No se presenta como una reproducción
// exhaustiva del diccionario oficial, que prioriza campos por caso de uso.
// Todo campo fuera de este alcance queda explícitamente fuera, no inventado.

/** Vocabulario de relación entre un campo de Prisma y su contraparte de
 * Startrack. Vale tantos puntos como el contenido de la fila (AGENTS.md §1.1). */
export type TipoRelacion =
  | 'exacta'
  | 'con transformación'
  | 'requiere parseo'
  | 'mismo nombre, distinto significado'
  | 'solo en Prisma'
  | 'solo en Startrack'
  | 'sin equivalencia directa'

/** Qué tan verificada está una fila. `hipotesis` significa: consistente con lo
 * que sabemos, pero no confirmado contra la API real ni contra el diccionario
 * de datos con el nombre exacto de campo. */
export type NivelDeConfianzaMapeo = 'alta' | 'media' | 'hipotesis'

/** Cardinalidad del mapeo entre campos. Describe la estructura, no la cantidad
 * de registros de cada plataforma. */
export type CardinalidadMapeo = '1:1' | '1:N' | 'N:1' | 'N:N' | 'sin equivalencia'

export type MetadatosCampo = {
  tipoDato: string
  ejemplo: string
}

/** Una fila de la matriz de mapeo. */
export type FilaMapeo = {
  modulo: string
  campoPrisma: string | null
  campoStartrack: string | null
  prisma: MetadatosCampo
  startrack: MetadatosCampo
  cardinalidad: CardinalidadMapeo
  tipoRelacion: TipoRelacion
  transformacion: string | null
  evidencia: string
  confianza: NivelDeConfianzaMapeo
  /** ¿Sin este campo el veredicto no se puede calcular? */
  critico: boolean
}

type FilaMapeoBase = Omit<FilaMapeo, 'prisma' | 'startrack' | 'cardinalidad'>

export const ALCANCE_MATRIZ_MAPEO = {
  estado: 'Completa para el alcance del MVP',
  modulos: [
    'Maquinaria',
    'Solicitudes de maquinaria',
    'Tareas',
    'Geocercas',
    'Mantenimiento',
  ],
  limite:
    'No equivale a copiar todo el diccionario oficial. Incluye todos los campos inventariados que intervienen en los casos de uso actuales; cualquier campo adicional debe incorporarse cuando una fuente autorizada lo confirme.',
} as const

/** Entregable 1 del brief: inventario de campos/términos que ECON NECT
 * introduce y que no existen en ninguna de las dos plataformas. */
export type TerminoNuevo = {
  termino: string
  definicion: string
  porQueExiste: string
}

const MATRIZ_MAPEO_BASE: FilaMapeoBase[] = [
  // ── Maquinaria ───────────────────────────────────────────────────────
  {
    modulo: 'Maquinaria',
    campoPrisma: 'Empresa',
    campoStartrack: 'Grupo, Etiquetas (módulo Vehículos)',
    tipoRelacion: 'con transformación',
    transformacion:
      'Prisma guarda solo el nombre del equipo participante; Startrack lo repite dentro de Etiquetas precedido de un correlativo («Equipo N - «nombre»») y por separado en Grupo, cuyo valor es el mismo para todos los participantes y por lo tanto no distingue a ninguno. Extraer el nombre de equipo de Etiquetas antes de comparar contra Empresa.',
    evidencia:
      'Diccionario de datos, hoja PRISMA (módulo Maquinaria, campo "Empresa" — "Código interno utilizado para identificar el equipo", valores posibles "Nombres de Equipos de Participantes"). Hoja STARTRACK, módulo Vehículos, campos "Grupo" (un único valor común a todos los participantes) y "Etiquetas" (correlativo seguido del nombre del equipo).',
    confianza: 'alta',
    critico: true,
  },
  {
    modulo: 'Maquinaria',
    campoPrisma: 'No. de activo',
    campoStartrack: 'Descripción (módulo Vehículos)',
    tipoRelacion: 'con transformación',
    transformacion:
      'Prisma concatena código y nombre en un solo texto («código - nombre del equipo»); Startrack expone el código solo en Descripción y el tipo aparte en Tipo. Extraer el código como subcadena, hasta el primer " - ", antes de comparar.',
    evidencia:
      'Diccionario de datos, hoja PRISMA (módulo Maquinaria, campo "No. de activo" — "Número de activo fijo asociado al equipo", cuyo ejemplo concatena código y nombre). Hoja STARTRACK, módulo Vehículos, campo "Descripción" (solo el código). Confirma 01 Parte E.4 (verificado contra la API real): la llave de unión es el código de activo de Prisma contra la descripción del vehículo en Startrack, coincide en 14 de los 15 equipos observados.',
    confianza: 'alta',
    critico: true,
  },
  {
    modulo: 'Maquinaria',
    campoPrisma: 'Nombre del equipo',
    campoStartrack: null,
    tipoRelacion: 'solo en Prisma',
    transformacion: null,
    evidencia:
      'Diccionario de datos, hoja PRISMA (módulo Maquinaria, campo "Nombre del equipo" — "Denominación o descripción del equipo", sin catálogo). Sin fila equivalente confirmada en Startrack: "Descripción" de Vehículos guarda el código (ver fila "No. de activo" arriba), no esta denominación.',
    confianza: 'media',
    critico: false,
  },
  {
    modulo: 'Maquinaria',
    campoPrisma: 'Clase de equipo (`clase_equipo`)',
    campoStartrack: 'Tipo (módulo Vehículos) — `veh_type`',
    tipoRelacion: 'con transformación',
    transformacion:
      'Corrección verificada el 12 de septiembre contra la API real: `veh_type` en Startrack es un código entero (se observaron los valores 8, 11 y 12), no el texto de la clase que documenta el diccionario. El mapeo código→clase no está verificado — no se inventa una tabla de traducción que "suene razonable" (AGENTS.md §1.1).',
    evidencia:
      'Diccionario de datos: hoja PRISMA (módulo Maquinaria, campo "Clase de equipo") y hoja STARTRACK (módulo Vehículos, campo "Tipo") documentan el mismo catálogo nominal — Excavadora; Retroexcavadora; Motoniveladora; Minicargador; Cargador frontal. La API real expone el campo como `veh_type`: un código entero, no ese texto.',
    confianza: 'media',
    critico: false,
  },
  {
    modulo: 'Maquinaria',
    campoPrisma: 'Estado (módulo Maquinaria — el recurso)',
    campoStartrack: 'Estado (módulo Vehículos — status 0–9 del conductor)',
    tipoRelacion: 'sin equivalencia directa',
    transformacion:
      'Ninguna transformación: Prisma `estado` es el recurso; Startrack `status` es el estado del conductor. No se fusionan.',
    evidencia:
      '01 Parte E.2 (verificado contra la API real): el catálogo del recurso en Prisma tiene 3 valores en mayúsculas — DISPONIBLE, OCUPADA, OBSOLETA — y no incluye "en mantenimiento". El diccionario de datos (hoja PRISMA, módulo Maquinaria, campo "Estado" — "Estado operativo o de disponibilidad de la maquinaria") documenta un catálogo distinto de 5 valores en Título — Disponible; Ocupada; Mant. preventivo; Mant. correctivo; Obsoletas — que mezcla el estado del recurso con el de la máquina de estados de falla. Es evidencia directa de "dos vocabularios dentro del mismo sistema" (01 E.8). Startrack expone `status` como código 0-9 (API: ajax/vehicles.php). Interpretación operativa del 13-sep-2026: 0 / vacío / null = Normal; 1 = Mantenimiento; 2 = Fuera de servicio; 3 = Dispositivo de rastreo en reparación; 4 = Se usa de vez en cuando; 5 = En línea; 6 = Fuera de línea; 7 = Almorzando; 8 = Reunión; 9 = Vacaciones. El "0" observado en 14 de 14 era ese código, no "salud del rastreo". Confirmado el 13-sep-2026: el catálogo describe al conductor (Almorzando, Reunión, Vacaciones, En línea…), no al recurso. No se fusiona con DISPONIBLE / OCUPADA / OBSOLETA.',
    confianza: 'alta',
    critico: true,
  },
  {
    modulo: 'Maquinaria',
    campoPrisma: 'Estado (módulo Mantenimiento, diccionario de datos)',
    campoStartrack: null,
    tipoRelacion: 'mismo nombre, distinto significado',
    transformacion: null,
    evidencia:
      'Diccionario de datos, hoja PRISMA (módulo Mantenimiento, campo "Estado" — "Estado de la maquinaria", cuyo ejemplo concatena el código de activo con un estado, sin catálogo propio listado): parece reutilizar el mismo catálogo del recurso (ver fila "Estado (módulo Maquinaria)" arriba) y no corresponde al catálogo de 8 valores de la máquina de estados de falla que 01 Parte E.2 verificó contra la API real. El diccionario no documenta un módulo "Falla" separado — se deja constancia de esa ausencia en vez de forzar la equivalencia.',
    confianza: 'media',
    critico: false,
  },
  {
    modulo: 'Maquinaria',
    campoPrisma: 'estado (objeto Falla — no aparece como módulo propio en el diccionario compartido)',
    campoStartrack: null,
    tipoRelacion: 'sin equivalencia directa',
    transformacion: null,
    evidencia:
      '01 Parte E.2 (verificado contra la API real): catálogo de 8 valores — SIN_REVISAR, PENDIENTE_INTERVENCION, EN_PROCESO, ESPERA_REPUESTOS, TRASLADO_STD, EN_PRUEBAS, FINALIZADO, RECHAZADO — describe la intervención de mantenimiento, un objeto que Startrack no modela como máquina de estados equivalente (el módulo Mantenimiento de Startrack registra la ejecución, no un estado del mismo vocabulario).',
    confianza: 'alta',
    critico: true,
  },
  {
    modulo: 'Maquinaria',
    campoPrisma: 'estado = TRASLADO_STD (objeto Falla)',
    campoStartrack:
      'Tipo (módulo Tareas), valor de catálogo "Traslado" (el diccionario lo escribe "Trasalado" [sic]; la API real lo devuelve bien escrito — ver fila "Tipo (módulo Tareas)")',
    tipoRelacion: 'sin equivalencia directa',
    transformacion:
      'Propuesta de arquitectura, no implementada: al entrar la falla en TRASLADO_STD, generar o verificar una tarea en Startrack con Tipo = traslado, enlazada por remote_id.',
    evidencia:
      '01 Parte E.3 (verificado): el catálogo de estados de falla de Prisma nombra un traslado que se ejecuta en la otra plataforma, sin ninguna implementación que los conecte hoy. Diccionario de datos, hoja STARTRACK, módulo Tareas, campo "Tipo" (valor de catálogo observado "Trasalado" [tal cual aparece, con el error de tipeo]) es el objeto más cercano en Startrack.',
    confianza: 'alta',
    critico: true,
  },
  {
    modulo: 'Maquinaria',
    campoPrisma: 'bandera de paro (`active_failure_is_paro`)',
    campoStartrack: null,
    tipoRelacion: 'solo en Prisma',
    transformacion: null,
    evidencia:
      'Corrección verificada el 12 de septiembre contra `GET /api/maquinaria/equipos` (detalle del equipo): el nombre de campo queda confirmado como `active_failure_is_paro` — indica si la falla activa del equipo fuerza un paro. En el mismo endpoint se confirman, con igual confianza, `active_failure_status` (estado de la falla activa) y `occupied_without_project` (equipo OCUPADA sin proyecto asignado, insumo de R6). Ninguno de los tres aparece en el diccionario de datos compartido — se documenta su existencia y su efecto sobre el veredicto, sin inventar nombres de columna.',
    confianza: 'alta',
    critico: true,
  },
  {
    modulo: 'Maquinaria',
    campoPrisma: 'No. de activo + Clase de equipo',
    campoStartrack: null,
    tipoRelacion: 'sin equivalencia directa',
    transformacion: null,
    evidencia:
      '01 Parte E.4 (verificado): 1 de los 15 equipos observados no tiene contraparte en Startrack — un huérfano real, no forzado. Ese mismo registro trae su valor de catálogo de clase en plural cuando el resto de la flota lo tiene en singular: dos defectos distintos en un solo registro.',
    confianza: 'alta',
    critico: true,
  },
  ...(['Marca', 'Modelo', 'Año'] as const).map<FilaMapeoBase>((atributo) => ({
    modulo: 'Maquinaria',
    campoPrisma: `${atributo.toLowerCase()} (nombre exacto de columna no confirmado)`,
    campoStartrack: `${atributo} (módulo Vehículos)`,
    tipoRelacion: 'exacta',
    transformacion: null,
    evidencia:
      '01 Parte E.8 (verificado): los atributos técnicos están casi siempre vacíos en Prisma y completos en Startrack; el hueco es de completitud, no de correspondencia. El nombre exacto de la columna Prisma no fue confirmado y permanece explícito como pendiente.',
    confianza: 'media',
    critico: false,
  })),
  {
    modulo: 'Maquinaria',
    campoPrisma: null,
    campoStartrack: 'Color (módulo Vehículos)',
    tipoRelacion: 'solo en Startrack',
    transformacion: null,
    evidencia:
      'Diccionario de datos, hoja STARTRACK, módulo Vehículos. No se confirmó una columna equivalente en Prisma dentro del alcance permitido.',
    confianza: 'media',
    critico: false,
  },

  // ── Solicitudes de maquinaria ────────────────────────────────────────
  {
    modulo: 'Solicitudes de maquinaria',
    campoPrisma: 'Proyecto',
    campoStartrack: 'Nombre (módulo Geocercas)',
    tipoRelacion: 'con transformación',
    transformacion:
      'Unir por código de proyecto, no por nombre completo: el nombre es frágil (01 E.4).',
    evidencia:
      'Diccionario de datos: hoja PRISMA (módulo Solicitudes de maquinaria, campo "Proyecto" — "Proyecto asociado a la solicitud de maquinaria", cuyo ejemplo concatena código de proyecto, empresa, obra y zona) y hoja STARTRACK (módulo Geocercas, campo "Nombre") documentan el mismo formato de ejemplo. 01 Parte E.4 (verificado contra la API real): los nombres coinciden en casi todos los casos observados, excepto en uno donde los componentes del nombre aparecen en distinto orden.',
    confianza: 'alta',
    critico: true,
  },
  {
    modulo: 'Solicitudes de maquinaria',
    campoPrisma: 'Tipo',
    campoStartrack: 'Tipo (módulo Vehículos)',
    tipoRelacion: 'exacta',
    transformacion: null,
    evidencia:
      'Diccionario de datos, hoja PRISMA (módulo Solicitudes de maquinaria, campo "Tipo" — "Tipo o clase de maquinaria requerida por el proyecto"): mismo catálogo que "Clase de equipo" de Maquinaria y que "Tipo" de Vehículos en Startrack.',
    confianza: 'alta',
    critico: false,
  },
  {
    modulo: 'Solicitudes de maquinaria',
    campoPrisma: 'Solicita',
    campoStartrack: null,
    tipoRelacion: 'solo en Prisma',
    transformacion: null,
    evidencia:
      'Diccionario de datos, hoja PRISMA (módulo Solicitudes de maquinaria, campo "Solicita" — "Solicitante del equipo (Gerente de Proyecto)", tipo "Catálogo", valores posibles "Usuario"). El rol entre paréntesis en la descripción confirma documentalmente que la Gerencia Técnica de Proyectos es quien origina la solicitud (01 Parte D.5; ver lib/gobernanza/responsabilidades.ts, paso "Originar la solicitud de maquinaria"). El valor de ejemplo del diccionario es un nombre fabricado para el ejercicio; no se transcribe acá (AGENTS.md §1.2).',
    confianza: 'alta',
    critico: false,
  },
  {
    modulo: 'Solicitudes de maquinaria',
    campoPrisma: 'Período',
    campoStartrack: null,
    tipoRelacion: 'solo en Prisma',
    transformacion: null,
    evidencia:
      'Diccionario de datos, hoja PRISMA (módulo Solicitudes de maquinaria, campo "Período" — "Fechas desde la cual se requiere la maquinaria", tipo "Fecha", valores posibles "Fechas"). Es el dato que la ficha unificada muestra junto a la tarea de traslado (01 Parte F, Caso 01).',
    confianza: 'alta',
    critico: false,
  },
  {
    modulo: 'Solicitudes de maquinaria',
    campoPrisma: 'Estado de solicitud',
    campoStartrack: null,
    tipoRelacion: 'sin equivalencia directa',
    transformacion: null,
    evidencia:
      '01 Parte E.2 (verificado contra la API real): catálogo APROBADA / PENDIENTE / RECHAZADA. El diccionario de datos (hoja PRISMA, módulo Solicitudes de maquinaria, campo "Estado de solicitud") documenta un catálogo más corto y en Título — "Aprobada o Pendiente", sin "Rechazada" — otro caso de dos vocabularios dentro del mismo sistema (01 E.8). Startrack no modela un objeto "solicitud".',
    confianza: 'alta',
    critico: true,
  },
  {
    modulo: 'Solicitudes de maquinaria',
    campoPrisma: 'Maquinaria',
    campoStartrack: null,
    tipoRelacion: 'requiere parseo',
    transformacion:
      'El valor observado combina código, tipo y un correlativo en un solo texto; separar el código antes de usarlo como llave de identidad.',
    evidencia:
      'Diccionario de datos, hoja PRISMA (módulo Solicitudes de maquinaria, campo "Maquinaria" — "Nombre del equipo asignado a la solicitud"): catálogo cuyo ejemplo concatena código y nombre del equipo, con valores posibles que incluyen "+ Correlativo".',
    confianza: 'alta',
    critico: true,
  },

  // ── Tareas (Startrack) ───────────────────────────────────────────────
  {
    modulo: 'Tareas',
    campoPrisma: null,
    campoStartrack: 'Estado (módulo Tareas)',
    tipoRelacion: 'mismo nombre, distinto significado',
    transformacion: null,
    evidencia:
      'Diccionario de datos, hoja STARTRACK (módulo Tareas, fila 27): catálogo "Pendiente; Completada; Cancelada; estados personalizados" — describe el objeto tarea, no el recurso ni la falla. Es la base de la regla R2 (traslado sobre equipo que no puede operar) y del Caso de Uso 02 (01 Parte F).',
    confianza: 'alta',
    critico: true,
  },
  {
    modulo: 'Tareas',
    campoPrisma: null,
    campoStartrack: 'Tipo (módulo Tareas)',
    tipoRelacion: 'sin equivalencia directa',
    transformacion: null,
    evidencia:
      'Diccionario de datos, hoja STARTRACK (módulo Tareas, fila 26): catálogo "Trasalado" [sic] y personalizable. Corrección verificada contra la API real (`GET /api/job/type`): el valor de catálogo se devuelve como "Traslado", bien escrito — el typo es del diccionario, no del dato; se documentan ambas grafías con esta nota. Sin contraparte estructurada en Prisma más allá de TRASLADO_STD (ver fila de Maquinaria/Falla arriba).',
    confianza: 'media',
    critico: false,
  },
  {
    modulo: 'Tareas',
    campoPrisma: null,
    campoStartrack: 'Origen, Destino (módulo Tareas)',
    tipoRelacion: 'con transformación',
    transformacion:
      'Los valores referencian geocercas por nombre ("Personalizable: Geocercas y Puntos de Referencia"); resolver contra el catálogo de geocercas para obtener coordenadas — nivel 2 de la cascada de ubicación (01 E.10).',
    evidencia: 'Diccionario de datos, hoja STARTRACK (módulo Tareas, filas 29-30).',
    confianza: 'alta',
    critico: false,
  },
  {
    modulo: 'Operadores',
    campoPrisma: 'cod_trabajador (/api/maquinaria/operadores)',
    campoStartrack: 'fn (ajax/drivers.php, módulo Conductores)',
    tipoRelacion: 'requiere parseo',
    transformacion:
      'En la API, `fn` junta el código de trabajador y el nombre del conductor separados por " - " (el diccionario lo documenta con guion largo). Tomar el texto antes del primer " - ", recortado, y compararlo exacto contra `cod_trabajador`; unir solo si el código es único en los dos lados, y si no, no unir ninguno. Nunca por nombre: el nombre no sale del conector. Asignar (módulo Tareas) y Conductor (módulo Vehículos) referencian al mismo conductor según el diccionario, pero esos dos campos no se volvieron a verificar contra la API.',
    evidencia:
      'Verificado contra la API real el 13 de septiembre de 2026: `fn` de `ajax/drivers.php` con forma `código - nombre`; el prefijo coincide exacto y 1:1 con `cod_trabajador` en 15 de 16 operadores; 0 duplicados. Antecedente: diccionario de datos, hoja STARTRACK (módulo Tareas, fila 33, y módulo Vehículos, fila 13): tipo "Usuario / referencia", con ejemplo en formato "código — nombre completo" (el nombre del ejemplo no se transcribe, AGENTS.md §1.2). Confirma 01 Parte E.8: "código embebido en texto libre".',
    confianza: 'alta',
    critico: false,
  },
  {
    modulo: 'Conductores',
    campoPrisma: null,
    campoStartrack: 'Calificación de seguridad del conductor — scores[].safety_score (ajax/report.php?id=32, reporte de conductores)',
    tipoRelacion: 'solo en Startrack',
    transformacion:
      'Valor de 0 a 100, más alto = mejor. Se une al operador de Prisma por el código de la fila anterior (`driver_id` = `i` de `ajax/drivers.php`). Si un conductor trae más de una calificación, no se promedia.',
    evidencia:
      'Verificado contra la API real el 13 de septiembre de 2026: el reporte no es una lista `{success, data}` sino `timezone`, `detail[]`, `detailAlerts[]` y `scores[]`; `scores[]` trae `driver_id` y `safety_score` numérico, con fila para 9 conductores. `detailAlerts[]` trae el nombre del conductor y se descarta al leer (AGENTS.md §1.2).',
    confianza: 'alta',
    critico: false,
  },
  {
    modulo: 'Conductores',
    campoPrisma: null,
    campoStartrack: 'Horas de motor acumuladas del vehículo del conductor — detail[].ignOnTime (ajax/report.php?id=32, reporte de conductores)',
    tipoRelacion: 'solo en Startrack',
    transformacion:
      'Unidad horas, contador acumulado desde la instalación del GPS. Para las horas de motor de un operador se toma la lectura más alta de su conductor en la ventana de 30 días; nunca la suma ni una división entre 60.',
    evidencia:
      'Verificado contra la API real el 13 de septiembre de 2026 (corregido esa misma madrugada): `detail[]` trae una fila por conductor y día con actividad (`driver_id`, `vehicle_id`, `date`, `ignOnTime`, `movingTime`, `distance`…). `ignOnTime` coincide al cuarto decimal con `ign_on_time` de `api/vehicle/{id}/status` (acumulado) en 6 de 6 vehículos comparados y no con `stat_ign_on_time` (del día); la suma de la serie diaria del reporte 3 (`ignOnTime` en segundos) ÷ 3600 reproduce ese acumulado en 14 de 14. La inferencia anterior ("minutos, ≤ 1440") solo era compatible con seis días de GPS instalado.',
    confianza: 'alta',
    critico: false,
  },
  {
    modulo: 'Geocercas / Tareas',
    campoPrisma: null,
    campoStartrack: 'Latitud, Longitud (módulos Geocercas y Tareas)',
    tipoRelacion: 'con transformación',
    transformacion:
      'El diccionario de datos documenta el campo como "Coordenada" con ejemplos que tienen forma de enteros escalados (agrupados en miles); la API real las devuelve en grados decimales. Convertir antes de comparar contra el diccionario.',
    evidencia:
      'Diccionario de datos, hoja STARTRACK (módulo Geocercas, filas 20-21; módulo Tareas, filas 31-32): tipo "Coordenada", ejemplos con forma de entero escalado. 01 Parte E.8 (verificado contra la API real): "las coordenadas se documentan como enteros escalados y se devuelven en grados decimales".',
    confianza: 'alta',
    critico: false,
  },
  {
    modulo: 'Startrack',
    campoPrisma: null,
    campoStartrack: 'ID remoto (módulo Vehículos)',
    tipoRelacion: 'solo en Startrack',
    transformacion:
      'Recomendación central de arquitectura: escribir el identificador de Prisma en este campo al resolver identidad, para pasar de una unión por texto a una unión determinística.',
    evidencia:
      'Corrección verificada el 12 de septiembre: `remote_id` no aparece en la proyección del listado de `ajax/vehicles.php` — no se ve ni poblado ni vacío ahí, la proyección simplemente no lo devuelve. Su existencia se documenta por el diccionario de datos, hoja STARTRACK, módulo Vehículos, fila 14 ("ID remoto" — "Identificador utilizado por la organización para relacionar el activo con reportes o integraciones"). No se afirma "vacío" de un campo que la proyección no expone.',
    confianza: 'media',
    critico: false,
  },
  {
    modulo: 'Startrack',
    campoPrisma: null,
    campoStartrack: 'remote_id (módulo Geocercas)',
    tipoRelacion: 'solo en Startrack',
    transformacion: null,
    evidencia:
      'Corrección verificada el 12 de septiembre: `remote_id` no aparece en la proyección del listado de `ajax/namedPlaces.php` — no se ve ni poblado ni vacío ahí. No aparece como fila propia en el diccionario compartido (que prioriza campos por caso de uso). No se afirma "vacío" de un campo que la proyección no expone.',
    confianza: 'media',
    critico: false,
  },
  {
    modulo: 'Startrack',
    campoPrisma: null,
    campoStartrack: 'remote_id (módulo Tareas)',
    tipoRelacion: 'solo en Startrack',
    transformacion:
      'Es el campo que la propagación P1 escribe: el id de la solicitud de Prisma queda en el remote_id de la tarea creada en Startrack.',
    evidencia:
      'Corrección verificada el 12 de septiembre contra `GET /api/job`, campo `remote_id`: ECON no lo llena en su operación; los valores presentes en el sandbox son escrituras de prueba de los equipos del hackathon — aparece poblado en parte de las tareas del pool compartido, incluida una nuestra que enlaza una solicitud por `remote_id`. La recomendación de arquitectura se mantiene y se refuerza: el mecanismo persiste, falta que Prisma lo llene sistemáticamente. No aparece como fila propia en el diccionario compartido.',
    confianza: 'alta',
    critico: true,
  },

  // Mantenimiento preventivo por horómetro (S-A11)
  {
    modulo: 'Mantenimiento preventivo',
    campoPrisma: 'mantenimiento_fecha_inicio, mantenimiento_fecha_fin, mantenimiento_notas (GET/PATCH /api/maquinaria/equipos/{id})',
    campoStartrack: 'status = 1 (PUT api/vehicle/{id})',
    tipoRelacion: 'con transformación',
    transformacion:
      'La orden de taller de ECON NECT escribe una ventana de mantenimiento en Prisma y marca el vehículo como Mantenimiento en Startrack. No fusiona estados: Prisma guarda la ventana del recurso; Startrack guarda el estado publicado por el vehículo. Siempre requiere confirmación humana y recurso propio.',
    evidencia:
      'Verificado en planeación S-A11 el 13 de septiembre de 2026: el detalle de equipo de Prisma expone `mantenimiento_fecha_inicio`, `mantenimiento_fecha_fin` y `mantenimiento_notas`; Startrack acepta el estado 1 como Mantenimiento en `api/vehicle/{id}`. No se usa tarea de Startrack: no hay tipo Mantenimiento ni geocerca de taller en el sandbox autorizado.',
    confianza: 'alta',
    critico: true,
  },
  {
    modulo: 'Mantenimiento preventivo',
    campoPrisma: null,
    campoStartrack: 'curOperatingHours (ajax/report.php?id=22, reporte Estado de flota)',
    tipoRelacion: 'solo en Startrack',
    transformacion:
      'Horas de motor acumuladas del GPS, en horas. Sirve como contador vivo y como linaje del horómetro. No se compara contra `hour_meter` de Prisma porque son fuentes y escalas operativas distintas.',
    evidencia:
      'Verificado contra el sandbox el 13 de septiembre de 2026: el reporte 22 expone `curOperatingHours` y coincide con `ign_on_time` del status del vehículo en la muestra observada. La afirmación se guarda como hecho estructural, sin transcribir valores de registro.',
    confianza: 'alta',
    critico: true,
  },
  {
    modulo: 'Mantenimiento preventivo',
    campoPrisma: null,
    campoStartrack: 'detail[].ignOnTime (ajax/report.php?id=3, Resumen Diario)',
    tipoRelacion: 'solo en Startrack',
    transformacion:
      'Segundos por vehículo y día. ECON NECT suma las filas del vehículo posteriores al ancla y divide entre 3600 para obtener horas desde la última salida de taller.',
    evidencia:
      'Verificado contra el sandbox el 13 de septiembre de 2026: `ignOnTime` del reporte diario está en segundos y la suma por vehículo reproduce el horómetro vivo. El campo `driver` de ese reporte es nombre de persona y se descarta en el conector.',
    confianza: 'alta',
    critico: true,
  },
  {
    modulo: 'Mantenimiento preventivo',
    campoPrisma: 'hour_meter (GET /api/maquinaria/fallas)',
    campoStartrack: null,
    tipoRelacion: 'solo en Prisma',
    transformacion:
      'Solo se usa para aprender un intervalo interno mediante la mediana de diferencias entre reportes FINALIZADO consecutivos del mismo equipo. Nunca se compara con el horómetro GPS vivo.',
    evidencia:
      'Planeación S-A11: Prisma guarda el horómetro humano dentro de reportes de falla; el usuario lo teclea cuando el equipo ya está en taller. Por honestidad de datos, se usa solo como serie interna de Prisma y no como equivalencia de Startrack.',
    confianza: 'alta',
    critico: false,
  },

  // Coherencia de estado — resolver R2 desde "Tomar acción" del centro de comando
  {
    modulo: 'Coherencia de estado (R2)',
    campoPrisma: 'estado del equipo (PATCH /api/maquinaria/equipos/{id}/estado)',
    campoStartrack: 'status de la tarea de Traslado (PUT api/job/{id})',
    tipoRelacion: 'con transformación',
    transformacion:
      'No son el mismo objeto: Prisma describe el recurso y Startrack la tarea. La equivalencia solo existe para apagar R2 cuando una persona elige qué lado manda. Mantener Prisma (OBSOLETA) → la tarea de Traslado pasa a 2 = Cancelada. Mantener Startrack (traslado Pendiente) → el equipo pasa a DISPONIBLE. Si el equipo no opera por falla o paro, no hay equivalencia por estado y no se escribe. Siempre con confirmación humana y recurso propio.',
    evidencia:
      'Verificado en vivo el 13 de septiembre de 2026: `GET api/job/status` devuelve cuatro estados (0 Pendiente, 1 Completada, 2 Cancelada, 3 Parcial) y ninguno equivale a "Suspendida"; `GET /api/job` devuelve `status_name` en inglés (Pending, Canceled, Partial observados); OPTIONS de `api/job/{id}` anuncia GET y PUT, y OPTIONS de `/api/maquinaria/equipos/{id}/estado` anuncia PATCH. Un PUT sobre una tarea propia ya cancelada respondió 403 "no puede modificar una Tarea cancelada": Cancelada es definitiva. Confianza media: ni el PUT sobre una tarea Pendiente ni el cuerpo `{ estado }` del PATCH se han ejercido con una escritura exitosa.',
    confianza: 'media',
    critico: false,
  },

  {
    modulo: 'Solicitudes',
    campoPrisma: 'created_at (solicitudes de maquinaria de Prisma)',
    campoStartrack: null,
    tipoRelacion: 'solo en Prisma',
    transformacion:
      'Define el orden de llegada del optimizador: primero en pedir, primero en ser atendido. A diferencia de fecha_inicio y fecha_fin, trae fecha y hora. Una solicitud sin valor interpretable va después de todas y se avisa; nunca se inventa una fecha.',
    evidencia:
      'Verificado contra la API real el 13 de septiembre de 2026: created_at con fecha y hora en 20 de 20 solicitudes; 15 valores distintos entre las 15 PENDIENTE vigentes, sin empates. Startrack no tiene la solicitud.',
    confianza: 'alta',
    critico: false,
  },

  // ── Mantenimiento (Startrack) ────────────────────────────────────────
  ...(['Proveedor', 'Mecánico', 'Motivo de reparación', 'Odómetro', 'Horómetro'] as const).map<FilaMapeoBase>(
    (campo) => ({
      modulo: 'Mantenimiento',
      campoPrisma: null,
      campoStartrack: `${campo} (módulo Mantenimiento)`,
      tipoRelacion: 'solo en Startrack',
      transformacion: null,
      evidencia:
        'Diccionario de datos, hoja STARTRACK (módulo Mantenimiento, filas 35-45): registra la ejecución del mantenimiento. Prisma modela la falla como máquina de estados, pero no se confirmó un equivalente a este nivel de detalle.',
      confianza: 'media',
      critico: false,
    }),
  ),
]

const NO_APLICA: MetadatosCampo = {
  tipoDato: 'No aplica',
  ejemplo: 'Sin campo en esta plataforma',
}

const NO_CONFIRMADO: MetadatosCampo = {
  tipoDato: 'No confirmado en fuentes permitidas',
  ejemplo: 'Pendiente de confirmar; no se inventa un valor',
}

const METADATOS_PRISMA: Record<string, MetadatosCampo> = {
  Empresa: { tipoDato: 'Catálogo / texto', ejemplo: 'Nombre de la empresa propietaria (forma del valor)' },
  'No. de activo': {
    tipoDato: 'Texto compuesto',
    ejemplo: '«código de activo - nombre del equipo» (forma del valor)',
  },
  'Nombre del equipo': {
    tipoDato: 'Texto',
    ejemplo: 'Nombre descriptivo del equipo (forma del valor)',
  },
  'Clase de equipo (`clase_equipo`)': {
    tipoDato: 'Catálogo',
    ejemplo: 'Clase de equipo (valor de catálogo)',
  },
  'Estado (módulo Maquinaria — el recurso)': {
    tipoDato: 'Catálogo',
    ejemplo: 'DISPONIBLE (valor de catálogo)',
  },
  'Estado (módulo Mantenimiento, diccionario de datos)': {
    tipoDato: 'Catálogo / texto compuesto',
    ejemplo: '«código de activo - estado» (forma del valor)',
  },
  'estado (objeto Falla — no aparece como módulo propio en el diccionario compartido)': {
    tipoDato: 'Catálogo',
    ejemplo: 'SIN_REVISAR (valor de catálogo)',
  },
  'estado = TRASLADO_STD (objeto Falla)': {
    tipoDato: 'Catálogo',
    ejemplo: 'TRASLADO_STD (valor de catálogo)',
  },
  'bandera de paro (`active_failure_is_paro`)': {
    tipoDato: 'Booleano',
    ejemplo: 'true (ejemplo de estructura)',
  },
  'No. de activo + Clase de equipo': {
    tipoDato: 'Texto compuesto + catálogo',
    ejemplo: '«código de activo» + «clase de equipo» (forma del valor)',
  },
  Proyecto: {
    tipoDato: 'Referencia / texto compuesto',
    ejemplo: '«código de proyecto - empresa - obra - zona» (forma del valor)',
  },
  Tipo: { tipoDato: 'Catálogo', ejemplo: 'Clase de equipo (valor de catálogo)' },
  Solicita: { tipoDato: 'Usuario / referencia', ejemplo: 'Usuario autorizado (ejemplo genérico)' },
  Período: { tipoDato: 'Fecha o rango de fechas', ejemplo: 'Fecha requerida (ejemplo genérico)' },
  'Estado de solicitud': { tipoDato: 'Catálogo', ejemplo: 'APROBADA (valor de catálogo)' },
  Maquinaria: {
    tipoDato: 'Catálogo / texto compuesto',
    ejemplo: '«código de activo - nombre del equipo» (forma del valor)',
  },
  'cod_trabajador (/api/maquinaria/operadores)': {
    tipoDato: 'Texto (código de trabajador)',
    ejemplo: 'Código de trabajador (forma del valor)',
  },
  'created_at (solicitudes de maquinaria de Prisma)': {
    tipoDato: 'Fecha AAAA-MM-DD (sin hora)',
    ejemplo: 'Fecha de creación de la solicitud (forma del valor)',
  },
  'estado del equipo (PATCH /api/maquinaria/equipos/{id}/estado)': {
    tipoDato: 'Catálogo',
    ejemplo: 'DISPONIBLE (valor de catálogo)',
  },
}

const METADATOS_STARTRACK: Record<string, MetadatosCampo> = {
  'status de la tarea de Traslado (PUT api/job/{id})': {
    tipoDato: 'Catálogo (código en texto)',
    ejemplo: '2 = Cancelada (valor de catálogo)',
  },
  'Grupo, Etiquetas (módulo Vehículos)': {
    tipoDato: 'Grupo + lista de etiquetas',
    ejemplo: '«grupo» + «etiqueta de equipo» (forma del valor)',
  },
  'Descripción (módulo Vehículos)': { tipoDato: 'Texto', ejemplo: 'Código de activo del equipo (forma del valor)' },
  'Tipo (módulo Vehículos) — `veh_type`': {
    tipoDato: 'Entero en API / catálogo nominal en diccionario',
    ejemplo: '8 (valor estructural observado)',
  },
  'Estado (módulo Vehículos)': { tipoDato: 'Código / texto', ejemplo: '0 (valor estructural observado)' },
  'Tipo (módulo Tareas), valor de catálogo "Traslado" (el diccionario lo escribe "Trasalado" [sic]; la API real lo devuelve bien escrito — ver fila "Tipo (módulo Tareas)")': {
    tipoDato: 'Catálogo personalizable',
    ejemplo: 'Traslado (valor de catálogo)',
  },
  'Marca (módulo Vehículos)': { tipoDato: 'Texto', ejemplo: 'Marca del vehículo (forma del valor)' },
  'Modelo (módulo Vehículos)': { tipoDato: 'Texto', ejemplo: 'Modelo del vehículo (forma del valor)' },
  'Año (módulo Vehículos)': { tipoDato: 'Texto', ejemplo: 'Año de fabricación, cuatro dígitos (forma del valor)' },
  'Color (módulo Vehículos)': { tipoDato: 'Texto', ejemplo: 'Color del vehículo (forma del valor)' },
  'Marca, Modelo, Año, Color (módulo Vehículos)': {
    tipoDato: 'Texto por atributo',
    ejemplo: 'Valores descriptivos por atributo (ejemplo genérico)',
  },
  'Nombre (módulo Geocercas)': {
    tipoDato: 'Texto compuesto',
    ejemplo: '«código de proyecto - empresa - obra - zona» (forma del valor)',
  },
  'Tipo (módulo Vehículos)': { tipoDato: 'Catálogo', ejemplo: 'Clase de equipo (valor de catálogo)' },
  'Estado (módulo Tareas)': { tipoDato: 'Catálogo', ejemplo: 'Pendiente (valor de catálogo)' },
  'Tipo (módulo Tareas)': { tipoDato: 'Catálogo personalizable', ejemplo: 'Traslado (valor de catálogo)' },
  'Origen, Destino (módulo Tareas)': {
    tipoDato: 'Dos referencias a geocerca o punto',
    ejemplo: 'Geocerca origen + geocerca destino (ejemplo genérico)',
  },
  'Asignar (módulo Tareas), Conductor (módulo Vehículos)': {
    tipoDato: 'Usuario / referencia',
    ejemplo: '«código - nombre»; solo se lee el código (forma del valor)',
  },
  'Latitud, Longitud (módulos Geocercas y Tareas)': {
    tipoDato: 'Dos coordenadas decimales',
    ejemplo: 'Par de grados decimales (forma del valor)',
  },
  'ID remoto (módulo Vehículos)': {
    tipoDato: 'Identificador / texto',
    ejemplo: 'Identificador del equipo en Prisma (forma del valor)',
  },
  'remote_id (módulo Geocercas)': {
    tipoDato: 'Identificador / texto',
    ejemplo: 'Identificador del proyecto (forma del valor)',
  },
  'remote_id (módulo Tareas)': {
    tipoDato: 'Identificador / texto',
    ejemplo: 'Identificador de la solicitud (forma del valor)',
  },
  'Proveedor (módulo Mantenimiento)': {
    tipoDato: 'Texto / referencia',
    ejemplo: 'Nombre del proveedor del servicio (forma del valor)',
  },
  'Mecánico (módulo Mantenimiento)': {
    tipoDato: 'Texto / referencia',
    ejemplo: 'Nombre del mecánico que atendió (forma del valor)',
  },
  'Motivo de reparación (módulo Mantenimiento)': {
    tipoDato: 'Texto',
    ejemplo: 'Motivo de la reparación (forma del valor)',
  },
  'Odómetro (módulo Mantenimiento)': {
    tipoDato: 'Numérico',
    ejemplo: 'Kilometraje acumulado (forma del valor)',
  },
  'Horómetro (módulo Mantenimiento)': {
    tipoDato: 'Numérico',
    ejemplo: 'Horas de uso acumuladas (forma del valor)',
  },
  'Estado (módulo Vehículos — status 0–9 del conductor)': {
    tipoDato: 'Entero 0–9 (catálogo del conductor, no del recurso)',
    ejemplo: 'Código de estado del conductor (valor de catálogo)',
  },
  'fn (ajax/drivers.php, módulo Conductores)': {
    tipoDato: 'Texto compuesto «código - nombre»',
    ejemplo: 'Solo se lee el código antes de " - "; el nombre se descarta (§1.2)',
  },
  'Calificación de seguridad del conductor — scores[].safety_score (ajax/report.php?id=32, reporte de conductores)':
    {
      tipoDato: 'Numérico 0–100',
      ejemplo: 'Puntaje de seguridad del conductor (forma del valor)',
    },
  'Horas con motor encendido por conductor y día — detail[].ignOnTime (ajax/report.php?id=32, reporte de conductores)':
    {
      tipoDato: 'Numérico en minutos (unidad inferida, no declarada)',
      ejemplo: 'Minutos con motor encendido en el día (forma del valor)',
    },
}

/**
 * Campos cuyo tipo de dato **de verdad** no se pudo confirmar en una fuente
 * permitida. Es una lista explícita, no el resultado de que un lookup falle:
 * "no confirmado" es una afirmación sobre la evidencia y tiene que declararse
 * a mano, igual que `sin equivalencia directa` (AGENTS.md §1.1).
 *
 * Hasta que este catálogo estaba incompleto, un nombre de campo sin entrada
 * caía acá en silencio y la matriz declaraba "pendiente de confirmar" sobre
 * hallazgos que el equipo sí había verificado. `metadatosCampo` ahora exige
 * que el hueco sea deliberado; `matriz.test.ts` verifica que ninguna fila
 * quede sin metadato por olvido.
 */
const SIN_TIPO_CONFIRMADO: ReadonlySet<string> = new Set([
  'marca (nombre exacto de columna no confirmado)',
  'modelo (nombre exacto de columna no confirmado)',
  'año (nombre exacto de columna no confirmado)',
])

export function metadatosCampo(
  plataforma: 'Prisma' | 'Startrack',
  nombre: string | null,
): MetadatosCampo | null {
  if (!nombre) return NO_APLICA
  if (SIN_TIPO_CONFIRMADO.has(nombre)) return NO_CONFIRMADO
  const catalogo = plataforma === 'Prisma' ? METADATOS_PRISMA : METADATOS_STARTRACK
  // `null` = falta la entrada en el catálogo. No es lo mismo que "no
  // confirmado", y la prueba lo trata como error en vez de mostrarlo.
  return catalogo[nombre] ?? null
}

function cardinalidadDe(fila: FilaMapeoBase): CardinalidadMapeo {
  if (
    fila.tipoRelacion === 'solo en Prisma' ||
    fila.tipoRelacion === 'solo en Startrack' ||
    fila.tipoRelacion === 'sin equivalencia directa' ||
    fila.tipoRelacion === 'mismo nombre, distinto significado'
  ) {
    return 'sin equivalencia'
  }
  if (fila.campoPrisma === 'Empresa' || fila.campoPrisma?.startsWith('operador asignado')) {
    return '1:N'
  }
  if (!fila.campoPrisma || !fila.campoStartrack) return 'sin equivalencia'
  return '1:1'
}

export const MATRIZ_MAPEO: FilaMapeo[] = MATRIZ_MAPEO_BASE.map((fila) => ({
  ...fila,
  prisma: metadatosCampo('Prisma', fila.campoPrisma) ?? NO_CONFIRMADO,
  startrack: metadatosCampo('Startrack', fila.campoStartrack) ?? NO_CONFIRMADO,
  cardinalidad: cardinalidadDe(fila),
}))

/** Entregable 1 del brief: los campos que ECON NECT introduce y que no
 * existen en ninguna de las dos plataformas. */
export const TERMINOS_NUEVOS: TerminoNuevo[] = [
  {
    termino: 'veredicto',
    definicion:
      'El tercer estado que ECON NECT calcula, distinto del de Prisma y del de Startrack, para responder si la operación de un equipo es consistente.',
    porQueExiste:
      'Ninguna plataforma calcula hoy un juicio que cruce a la otra; sin él, dos estados igual de correctos parecen una contradicción sin resolver (01 Parte C.3).',
  },
  {
    termino: 'confianza',
    definicion:
      'Número de 0 a 100 que expresa cuánta evidencia sostiene el veredicto calculado.',
    porQueExiste:
      'Distingue "sabemos que está bien" de "no hay con qué decidir", evitando que la incertidumbre se disfrace de certeza (01 Parte D.4).',
  },
  {
    termino: 'linaje',
    definicion:
      'El rastro de un valor: plataforma, endpoint, campo, valor crudo y hora de lectura.',
    porQueExiste:
      'Es lo que hace auditable en un clic la afirmación de que ningún dato en pantalla fue inventado (01 Parte C.4).',
  },
  {
    termino: 'nivelDeCascadaDeUbicacion',
    definicion:
      'Cuál de los tres niveles de resolución de ubicación se usó para mostrar dónde está un equipo: telemetría, geocerca de la tarea de traslado, o geocerca del proyecto asignado.',
    porQueExiste:
      'Ninguna plataforma expone hoy una ubicación única y confiable; la cascada declara siempre qué nivel se usó en vez de fingir una precisión que no existe (01 Parte E.10).',
  },
  {
    termino: 'objetoDescrito',
    definicion:
      'Etiqueta que dice si un estado de origen describe el recurso, una tarea o una falla.',
    porQueExiste:
      'Resuelve el Caso de Uso 02: dos estados distintos pueden ser ambos correctos porque describen objetos distintos, y sin esta etiqueta esa distinción se pierde (01 Parte C.3, D.3).',
  },
  {
    termino: 'identidadResuelta',
    definicion:
      'Booleano que dice si el equipo de Prisma encontró su contraparte en Startrack.',
    porQueExiste:
      'Sin él, un huérfano real (01 Parte E.4) se vería igual que un error de mapeo; con él, se muestra como hallazgo, no como falla del sistema.',
  },
]

function csvEscape(valor: string): string {
  if (/[",\n]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`
  return valor
}

/** Exportación de la matriz a CSV, para el botón de la pantalla y para el
 * entregable de docs/entregables/ (01 Parte G). */
export function matrizACsv(filas: FilaMapeo[]): string {
  const encabezado = [
    'modulo',
    'campoPrisma',
    'tipoDatoPrisma',
    'ejemploPrisma',
    'campoStartrack',
    'tipoDatoStartrack',
    'ejemploStartrack',
    'cardinalidad',
    'tipoRelacion',
    'transformacion',
    'evidencia',
    'confianza',
    'critico',
  ]
  const lineas = filas.map((fila) =>
    [
      fila.modulo,
      fila.campoPrisma ?? '',
      fila.prisma.tipoDato,
      fila.prisma.ejemplo,
      fila.campoStartrack ?? '',
      fila.startrack.tipoDato,
      fila.startrack.ejemplo,
      fila.cardinalidad,
      fila.tipoRelacion,
      fila.transformacion ?? '',
      fila.evidencia,
      fila.confianza,
      fila.critico ? 'sí' : 'no',
    ]
      .map(csvEscape)
      .join(',')
  )
  return [encabezado.join(','), ...lineas].join('\n')
}
