/**
 * El contrato canónico de ECON NECT.
 *
 * Solo tipos, sin implementación. Es la frontera entre los cuatro carriles: el
 * núcleo lo llena, la interfaz lo renderiza, la semántica lo referencia.
 *
 * Dos reglas gobiernan todo lo de abajo (AGENTS.md §2, 01 Parte C):
 *
 *   1. Todo estado de origen conserva su `valorCrudo`. Normalizar nunca destruye
 *      el original: las dos plataformas pueden tener razón al mismo tiempo.
 *   2. Un campo que no se pudo leer es `null` con su linaje. Nunca una cadena
 *      vacía, nunca un valor inventado. El hueco documentado es la respuesta.
 */

// ─── Procedencia ─────────────────────────────────────────────────────────────

export type Plataforma = 'prisma' | 'startrack'

/** De dónde salió un valor. Es lo que alimenta el "ver origen" de un clic. */
export interface Linaje {
  plataforma: Plataforma
  /** Ruta consultada, p. ej. `/api/maquinaria/equipos`. */
  endpoint: string
  /** Nombre del campo tal como viene en la respuesta, sin renombrar. */
  campo: string
  /** El valor tal cual llegó, antes de cualquier normalización. */
  valorCrudo: unknown
  /** Instante de la lectura, ISO 8601. */
  leidoEn: string
}

/** Un valor acompañado de su procedencia. `null` = no se pudo leer. */
export interface Dato<T> {
  valor: T | null
  linaje: Linaje
}

// ─── Estados ─────────────────────────────────────────────────────────────────

/**
 * Qué objeto describe un estado. Obligatorio en todo estado de origen.
 *
 * Es lo que resuelve el Caso de Uso 02 de ECON: un equipo `OCUPADA` en Prisma y
 * una tarea `Completada` en Startrack no se contradicen, porque `OCUPADA`
 * describe el recurso y `Completada` describe la tarea.
 */
export type ObjetoDescrito = 'recurso' | 'tarea' | 'falla'

export interface EstadoOrigen {
  /** Valor normalizado para comparar. El original vive en `linaje.valorCrudo`. */
  valor: string
  objeto: ObjetoDescrito
  linaje: Linaje
}

/** Catálogos verificados contra la API el 12 de septiembre de 2026. */
export type EstadoEquipoPrisma = 'DISPONIBLE' | 'OCUPADA' | 'OBSOLETA'

export type EstadoSolicitudPrisma = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA'

export type EstadoFallaPrisma =
  | 'SIN_REVISAR'
  | 'PENDIENTE_INTERVENCION'
  | 'EN_PROCESO'
  | 'ESPERA_REPUESTOS'
  | 'TRASLADO_STD'
  | 'EN_PRUEBAS'
  | 'FINALIZADO'
  | 'RECHAZADO'

// ─── Veredicto ───────────────────────────────────────────────────────────────

/**
 * El tercer estado, el que ninguna de las dos plataformas tiene.
 *
 * `EN_RIESGO` significa *hay evidencia de riesgo*.
 * `SIN_EVIDENCIA` significa *no hay evidencia suficiente para decidir*.
 * No son lo mismo y no comparten color (ui-registry.md §1.1).
 */
export type Veredicto = 'COHERENTE' | 'ATENCION' | 'EN_RIESGO' | 'SIN_EVIDENCIA'

export type Severidad = 'alta' | 'media' | 'baja' | 'informativa'

// ─── Ubicación ───────────────────────────────────────────────────────────────

/**
 * La ubicación se resuelve en cascada y la pantalla siempre dice con qué nivel
 * está respondiendo (01 E.10).
 *
 *   1. Telemetría en vivo — mejora, no dependencia.
 *   2. Geocerca de destino de la tarea de traslado.
 *   3. Geocerca del proyecto asignado en Prisma.
 */
export type NivelDeCascada = 1 | 2 | 3

export interface Ubicacion {
  nivelDeCascada: NivelDeCascada
  /** Etiqueta legible: nombre de geocerca o de proyecto. */
  descripcion: string | null
  /** Grados decimales. La API los devuelve así, no como enteros escalados (E.8). */
  latitud: number | null
  longitud: number | null
  linaje: Linaje
}

// ─── Identidad ───────────────────────────────────────────────────────────────

/**
 * Cómo se unieron el equipo de Prisma y el vehículo de Startrack.
 *
 * `codigoActivo` es la llave verificada. `sinContraparte` es un resultado
 * legítimo: hay un huérfano real en el sandbox y se muestra como tal (01 E.4).
 * El mapeo por nombre está descartado por evidencia.
 */
export type MetodoDeUnion = 'codigoActivo' | 'remoteId' | 'sinContraparte'

export interface IdentidadCanonica {
  /** Identificador canónico dentro de ECON NECT. */
  id: string
  /** Código de activo en Prisma. Es la llave de unión. */
  codigoActivo: string | null
  nombre: string | null
  clase: string | null
  idPrisma: string | null
  idStartrack: string | null
  metodo: MetodoDeUnion
  /** Falso = huérfano. La interfaz no debe fingir que hay contraparte. */
  identidadResuelta: boolean
}

// ─── Equipo unificado ────────────────────────────────────────────────────────

/** Lo que Prisma sabe. Tres máquinas de estado separadas, sin colapsar (01 E.2). */
export interface LadoPrisma {
  estadoEquipo: EstadoOrigen | null
  estadoSolicitud: EstadoOrigen | null
  estadoFalla: EstadoOrigen | null
  /** Bandera de paro de la falla activa. Es el tercer elemento del cruce. */
  enParo: Dato<boolean> | null
  proyectoAsignado: Dato<string> | null
  operador: Dato<string> | null
}

/** Lo que Startrack sabe. */
export interface LadoStartrack {
  estadoVehiculo: EstadoOrigen | null
  estadoTarea: EstadoOrigen | null
  destinoTarea: Dato<string> | null
  conductor: Dato<string> | null
  /** Existe en vehículos, geocercas y tareas; vacío en todo el sandbox (01 E.5). */
  remoteId: Dato<string> | null
}

export interface EquipoUnificado {
  identidad: IdentidadCanonica
  prisma: LadoPrisma
  startrack: LadoStartrack
  ubicacion: Ubicacion | null
  veredicto: Veredicto
  /** Las reglas que produjeron el veredicto, en orden de severidad. */
  resultados: ResultadoRegla[]
  leidoEn: string
}

// ─── Reglas e incoherencias ──────────────────────────────────────────────────

export interface ResultadoRegla {
  /** Identificador estable de la regla, p. ej. `R-TRASLADO-CON-FALLA`. */
  regla: string
  /** Nombre en lenguaje de negocio, el que se muestra en pantalla. */
  nombre: string
  veredicto: Veredicto
  severidad: Severidad
  /** Por qué concluyó eso, en frases legibles. Una por evidencia. */
  porque: string[]
  accionSugerida: string
  /** Enlaza con la RACI del carril C. */
  rolResponsable: string
  /** Qué faltó para poder concluir. Vacío si no faltó nada. */
  camposFaltantes: string[]
}

/** Una fila de la bandeja: no es una lista de errores, es una cola de trabajo. */
export interface Incoherencia {
  id: string
  equipoId: string
  codigoActivo: string | null
  veredicto: Veredicto
  severidad: Severidad
  titulo: string
  /** Lo que observó cada plataforma, para mostrarlas lado a lado. */
  observadoPrisma: string | null
  observadoStartrack: string | null
  porque: string[]
  accionSugerida: string
  rolResponsable: string
  detectadaEn: string
}

// ─── Salud de las fuentes ────────────────────────────────────────────────────

/**
 * `caida` incluye el caso traicionero: Startrack responde HTTP 200 con
 * `success: false` cuando la sesión expiró (01 E.7). Se detecta por el cuerpo.
 */
export type SaludFuente = 'ok' | 'lenta' | 'caida'

export interface EstadoFuente {
  plataforma: Plataforma
  salud: SaludFuente
  /** Última lectura que sí trajo datos buenos, ISO 8601. */
  ultimaLecturaBuena: string | null
  /** Mensaje de error etiquetado, si lo hay. */
  detalle: string | null
}
