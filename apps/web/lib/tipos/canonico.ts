// Contrato de tipos de ECON NECT — el modelo canónico compartido entre los
// cuatro carriles. Congelado a las 17:30 (AGENTS.md §4.2, S-A0 §5).
//
// Reglas del contrato:
// - Todo estado de origen conserva su `valorCrudo`. Nunca se normaliza
//   destruyendo el original.
// - Un campo que no se pudo leer es `null` con su linaje, nunca una cadena
//   vacía ni un valor inventado.
// - `confianza < 45` fuerza `veredicto = 'SIN_EVIDENCIA'` (umbral de
//   ui-registry.md §1.3). Es una heurística determinística, no ML.
// - Cambiar este archivo después de las 17:30 exige avisar a B y C en voz alta.

/** Cuál de las dos plataformas fuente. */
export type Plataforma = 'prisma' | 'startrack'

/** El veredicto operativo que el motor de reconciliación calcula. */
export type Veredicto = 'COHERENTE' | 'ATENCION' | 'EN_RIESGO' | 'SIN_EVIDENCIA'

/** Urgencia de una regla disparada. Independiente del veredicto: dos reglas
 * con el mismo veredicto pueden tener distinta urgencia. */
export type Severidad = 'alta' | 'media' | 'baja'

/** Vocabulario de gerencias compartido entre reglas (A), RACI (C) y acceso (C). */
export type Rol =
  | 'PROYECTOS'
  | 'LOGISTICA'
  | 'MANTENIMIENTO'
  | 'COSTOS'
  | 'DIRECCION'

/** De dónde vino un valor: la plataforma, el endpoint, el campo, el valor
 * crudo tal cual llegó, y a qué hora se leyó. */
export type Linaje = {
  plataforma: Plataforma
  endpoint: string
  campo: string
  valorCrudo: unknown
  leidoEn: string
}

/** Un valor con su linaje. */
export type Dato<T> = {
  valor: T | null
  linaje: Linaje
}

/** Qué describe un estado de origen. Resuelve el Caso de Uso 02 de ECON: dos
 * estados distintos pueden ser ambos correctos porque describen objetos
 * distintos. */
export type ObjetoDescrito = 'recurso' | 'tarea' | 'falla'

/** Un estado tal como lo reporta la plataforma de origen, con su objeto y linaje. */
export type EstadoOrigen = {
  valor: string
  objeto: ObjetoDescrito
  linaje: Linaje
}

/** Nivel de la cascada de ubicación (01 E.10). */
export type NivelDeCascada = 1 | 2 | 3

/** Ubicación resuelta de un equipo, con su nivel de cascada y linaje por campo. */
export type Ubicacion = {
  nivel: NivelDeCascada
  descripcion: Dato<string>
  lat: Dato<number>
  lon: Dato<number>
}

/** El resultado de evaluar una regla de coherencia sobre un equipo. */
export type ResultadoRegla = {
  regla: string
  nombre: string
  veredicto: Veredicto
  severidad: Severidad
  confianza: number
  porque: string[]
  accionSugerida: string
  rolResponsable: Rol
  camposFaltantes: string[]
}

/** La identidad canónica de un equipo, con sus estados de ambas plataformas,
 * su ubicación, y el veredicto calculado. */
export type EquipoUnificado = {
  id: string
  codigoActivo: Dato<string>
  nombre: Dato<string>
  identidadResuelta: boolean
  equipo: EstadoOrigen | null
  solicitud: EstadoOrigen | null
  falla: EstadoOrigen | null
  vehiculo: EstadoOrigen | null
  tarea: EstadoOrigen | null
  ubicacion: Ubicacion | null
  veredicto: Veredicto
  confianza: number
  reglas: ResultadoRegla[]
  leidoEn: string
}

/** Una fila de la bandeja de excepciones. */
export type Incoherencia = {
  equipoId: string
  codigoActivo: string
  veredicto: Veredicto
  severidad: Severidad
  confianza: number
  regla: string
  accionSugerida: string
  rolResponsable: Rol
  proyecto: Dato<string>
}

/** El estado de salud de una de las dos plataformas fuente. */
export type SaludFuente = {
  plataforma: Plataforma
  estado: 'ok' | 'lenta' | 'caida'
  ultimaLecturaBuena: string | null
  latenciaMs: number | null
}
