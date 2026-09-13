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
// Esta es una v1 parcial: el diccionario compartido prioriza campos por caso
// de uso (no es exhaustivo, lo dice su propia hoja de instrucciones) y la
// sesión de planeación decidió no perseguir más cobertura contra el reloj del
// hackathon. Los módulos sin fila acá quedan pendientes, no inventados.

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

/** Una fila de la matriz de mapeo. */
export type FilaMapeo = {
  modulo: string
  campoPrisma: string | null
  campoStartrack: string | null
  tipoRelacion: TipoRelacion
  transformacion: string | null
  evidencia: string
  confianza: NivelDeConfianzaMapeo
  /** ¿Sin este campo el veredicto no se puede calcular? */
  critico: boolean
}

/** Entregable 1 del brief: inventario de campos/términos que ECON NECT
 * introduce y que no existen en ninguna de las dos plataformas. */
export type TerminoNuevo = {
  termino: string
  definicion: string
  porQueExiste: string
}

export const MATRIZ_MAPEO: FilaMapeo[] = [
  // ── Maquinaria ───────────────────────────────────────────────────────
  {
    modulo: 'Maquinaria',
    campoPrisma: 'Empresa',
    campoStartrack: 'Grupo, Etiquetas (módulo Vehículos)',
    tipoRelacion: 'con transformación',
    transformacion:
      'Prisma guarda solo el nombre del equipo de hackathon ("The Hub"); Startrack lo repite dentro de Etiquetas junto a un correlativo ("Equipo 14 - The Hub") y por separado en Grupo ("Vehículos-Hackathon", un valor compartido por todos los equipos, no distintivo). Extraer el nombre de equipo de Etiquetas antes de comparar contra Empresa.',
    evidencia:
      'Diccionario de datos, hoja PRISMA (módulo Maquinaria, campo "Empresa" — "Código interno utilizado para identificar el equipo", ejemplo "The Hub", valores posibles "Nombres de Equipos de Participantes"). Hoja STARTRACK, módulo Vehículos, campos "Grupo" (ejemplo "Vehículos-Hackathon") y "Etiquetas" (ejemplo "Equipo 14 - The Hub").',
    confianza: 'alta',
    critico: true,
  },
  {
    modulo: 'Maquinaria',
    campoPrisma: 'No. de activo',
    campoStartrack: 'Descripción (módulo Vehículos)',
    tipoRelacion: 'con transformación',
    transformacion:
      'Prisma concatena código y tipo en un solo texto ("CF-03 - Cargador frontal 03"); Startrack expone el código solo ("CF-03") en Descripción y el tipo aparte en Tipo. Extraer el código como subcadena antes de comparar.',
    evidencia:
      'Diccionario de datos, hoja PRISMA (módulo Maquinaria, campo "No. de activo" — "Número de activo fijo asociado al equipo", ejemplo "CF-03 - Cargador frontal 03"). Hoja STARTRACK, módulo Vehículos, campo "Descripción" (ejemplo "CF-03"). Confirma 01 Parte E.4 (verificado contra la API real): la llave de unión es el código de activo de Prisma contra la descripción del vehículo en Startrack, coincide en 14 de los 15 equipos observados.',
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
      'Diccionario de datos, hoja PRISMA (módulo Maquinaria, campo "Nombre del equipo" — "Denominación o descripción del equipo", ejemplo "Cargador frontal 03", sin catálogo). Sin fila equivalente confirmada en Startrack: "Descripción" de Vehículos guarda el código (ver fila "No. de activo" arriba), no esta denominación.',
    confianza: 'media',
    critico: false,
  },
  {
    modulo: 'Maquinaria',
    campoPrisma: 'Clase de equipo',
    campoStartrack: 'Tipo (módulo Vehículos)',
    tipoRelacion: 'exacta',
    transformacion: null,
    evidencia:
      'Diccionario de datos: hoja PRISMA (módulo Maquinaria, campo "Clase de equipo") y hoja STARTRACK (módulo Vehículos, campo "Tipo") documentan el mismo catálogo observado — Excavadora; Retroexcavadora; Motoniveladora; Minicargador; Cargador frontal.',
    confianza: 'alta',
    critico: false,
  },
  {
    modulo: 'Maquinaria',
    campoPrisma: 'Estado (módulo Maquinaria — el recurso)',
    campoStartrack: 'Estado (módulo Vehículos)',
    tipoRelacion: 'mismo nombre, distinto significado',
    transformacion:
      'Ninguna transformación resuelve esto: describen objetos distintos con catálogos distintos. No se fusionan (01 Parte C.3) — se conservan ambos y se etiquetan con qué objeto describen.',
    evidencia:
      '01 Parte E.2 (verificado contra la API real): el catálogo del recurso en Prisma tiene 3 valores en mayúsculas — DISPONIBLE, OCUPADA, OBSOLETA — y no incluye "en mantenimiento". El diccionario de datos (hoja PRISMA, módulo Maquinaria, campo "Estado" — "Estado operativo o de disponibilidad de la maquinaria") documenta un catálogo distinto de 5 valores en Título — Disponible; Ocupada; Mant. preventivo; Mant. correctivo; Obsoletas — que mezcla el estado del recurso con el de la máquina de estados de falla. Es evidencia directa de "dos vocabularios dentro del mismo sistema" (01 E.8). Startrack (hoja STARTRACK, módulo Vehículos, campo "Estado") documenta un catálogo distinto ("Normal" como ejemplo) que describe la salud del rastreo del activo, no su disponibilidad operativa.',
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
      'Diccionario de datos, hoja PRISMA (módulo Mantenimiento, campo "Estado" — "Estado de la maquinaria", ejemplo "CF-03 - Obsoleto", sin catálogo propio listado): parece reutilizar el mismo catálogo del recurso (ver fila "Estado (módulo Maquinaria)" arriba) y no corresponde al catálogo de 8 valores de la máquina de estados de falla que 01 Parte E.2 verificó contra la API real. El diccionario no documenta un módulo "Falla" separado — se deja constancia de esa ausencia en vez de forzar la equivalencia.',
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
    campoStartrack: 'Tipo (módulo Tareas), valor de catálogo "Trasalado" [sic]',
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
    campoPrisma: 'bandera de paro (nombre exacto de campo no confirmado)',
    campoStartrack: null,
    tipoRelacion: 'solo en Prisma',
    transformacion: null,
    evidencia:
      '01 Parte E.2 (verificado contra la API real): la propia API expone una bandera para el caso de un equipo "OCUPADA" sin proyecto asignado. No aparece en el diccionario de datos compartido — se documenta su existencia y su efecto sobre el veredicto, sin inventar un nombre de columna.',
    confianza: 'hipotesis',
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
  {
    modulo: 'Maquinaria',
    campoPrisma: 'marca, modelo, año (nombres exactos de columna no confirmados)',
    campoStartrack: 'Marca, Modelo, Año, Color (módulo Vehículos)',
    tipoRelacion: 'exacta',
    transformacion: null,
    evidencia:
      '01 Parte E.8 (verificado): los atributos técnicos del equipo están vacíos en la totalidad de los registros observados de una plataforma y completos en la otra — el mapeo existe, el dato no. Distinta de "sin equivalencia directa": el hueco es de completitud, no de correspondencia. Diccionario de datos, hoja STARTRACK (módulo Vehículos) documenta Año, Color y Marca como campos de texto simple; el diccionario de PRISMA compartido no incluyó una fila equivalente para esta v1.',
    confianza: 'alta',
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
      'Diccionario de datos: hoja PRISMA (módulo Solicitudes de maquinaria, campo "Proyecto" — "Proyecto asociado a la solicitud de maquinaria", ejemplo "PROY-014 - The Hub - Proyecto Xi - La Unión") y hoja STARTRACK (módulo Geocercas, campo "Nombre") documentan el mismo formato de ejemplo. 01 Parte E.4 (verificado contra la API real): los nombres coinciden en casi todos los casos observados, excepto en uno donde los componentes del nombre aparecen en distinto orden.',
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
      'Diccionario de datos, hoja PRISMA (módulo Solicitudes de maquinaria, campo "Solicita" — "Solicitante del equipo (Gerente de Proyecto)", tipo "Catálogo", valores posibles "Usuario"). El rol entre paréntesis en la descripción confirma documentalmente que la Gerencia de Proyecto es quien origina la solicitud (01 Parte D.5; ver lib/gobernanza/raci.ts, paso "Originar la solicitud"). El valor de ejemplo del diccionario es un nombre fabricado para el ejercicio; no se transcribe acá (AGENTS.md §1.2).',
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
      'Diccionario de datos, hoja PRISMA (módulo Solicitudes de maquinaria, campo "Maquinaria" — "Nombre del equipo asignado a la solicitud"): catálogo con ejemplo "CF-03 - Cargador frontal 03" y valores posibles que incluyen "+ Correlativo".',
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
      'Diccionario de datos, hoja STARTRACK (módulo Tareas, fila 26): catálogo "Trasalado" [sic] y personalizable. Sin contraparte estructurada en Prisma más allá de TRASLADO_STD (ver fila de Maquinaria/Falla arriba).',
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
    modulo: 'Tareas',
    campoPrisma: 'operador asignado (módulo Solicitudes u Operadores; nombre exacto de columna no confirmado)',
    campoStartrack: 'Asignar (módulo Tareas), Conductor (módulo Vehículos)',
    tipoRelacion: 'requiere parseo',
    transformacion:
      'El valor de Startrack junta el código de motorista y el nombre completo separados por guion largo (formato observado: "código — nombre"); extraer el código antes de comparar contra el operador de Prisma.',
    evidencia:
      'Diccionario de datos, hoja STARTRACK (módulo Tareas, fila 33, y módulo Vehículos, fila 13): tipo "Usuario / referencia", con ejemplo en formato "código — nombre completo" (el nombre del ejemplo no se transcribe, AGENTS.md §1.2). Confirma 01 Parte E.8: "código embebido en texto libre" y "una columna con dos significados — nombre de usuario en unos registros, nombre de empresa en otros".',
    confianza: 'media',
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
      '01 Parte E.5 (verificado contra la API real): remote_id existe en vehículos, geocercas y tareas de Startrack, vacío en la totalidad de los registros del sandbox. Diccionario de datos, hoja STARTRACK, módulo Vehículos, fila 14 ("ID remoto" — "Identificador utilizado por la organización para relacionar el activo con reportes o integraciones"), confirma el propósito documentado del campo.',
    confianza: 'alta',
    critico: false,
  },
  {
    modulo: 'Startrack',
    campoPrisma: null,
    campoStartrack: 'remote_id (módulo Geocercas)',
    tipoRelacion: 'solo en Startrack',
    transformacion: null,
    evidencia:
      '01 Parte E.5 (verificado contra la API real): remote_id existe también en geocercas, vacío en todos los registros observados. No aparece como fila propia en el diccionario compartido (que prioriza campos por caso de uso), pero sí en la respuesta real de la API.',
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
      '01 Parte E.5 (verificado contra la API real, incluida una escritura de prueba: "creamos una tarea con remote_id poblado y el campo persistió"). No aparece como fila propia en el diccionario compartido.',
    confianza: 'alta',
    critico: true,
  },

  // ── Mantenimiento (Startrack) ────────────────────────────────────────
  {
    modulo: 'Mantenimiento',
    campoPrisma: null,
    campoStartrack:
      'Proveedor, Mecánico, Motivo de reparación, Odómetro, Horómetro (módulo Mantenimiento)',
    tipoRelacion: 'solo en Startrack',
    transformacion: null,
    evidencia:
      'Diccionario de datos, hoja STARTRACK (módulo Mantenimiento, filas 35-45): registra la ejecución del mantenimiento (proveedor, mecánico, kilometraje, horas de uso). Prisma modela la falla como máquina de estados (01 E.2), pero no se confirmó un equivalente a este nivel de detalle en el diccionario compartido.',
    confianza: 'media',
    critico: false,
  },
]

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
    'campoStartrack',
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
      fila.campoStartrack ?? '',
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
