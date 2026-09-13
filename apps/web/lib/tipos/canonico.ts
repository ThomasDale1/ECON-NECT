// Contrato de tipos de ECON NECT — el modelo canónico compartido entre los
// cuatro carriles. Congelado a las 17:30 (AGENTS.md §4.2, S-A0 §5).
//
// Reglas del contrato:
// - Todo estado de origen conserva su `valorCrudo`. Nunca se normaliza
//   destruyendo el original.
// - Un campo que no se pudo leer es `null` con su linaje, nunca una cadena
//   vacía ni un valor inventado.
// - `confianza < 45` fuerza `veredicto = 'SIN_EVIDENCIA'`. Ese umbral es una
//   heurística elegida de ui-registry.md §1.3, no una constante medida ni ML.
// - El nivel de resolución de identidad (1/2/3) es heurística de enlace, NO
//   certeza: nivel 2 y 3 restan confianza; no se tratan como identidad segura.
// - Cambiar este archivo después de las 17:30 exige avisar a B y C en voz alta.

/** Cuál de las dos plataformas fuente. */
export type Plataforma = 'prisma' | 'startrack'

/** El veredicto operativo que el motor de reconciliación calcula. */
export type Veredicto = 'COHERENTE' | 'ATENCION' | 'EN_RIESGO' | 'SIN_EVIDENCIA'

/** Urgencia de una regla disparada. Independiente del veredicto: dos reglas
 * con el mismo veredicto pueden tener distinta urgencia. */
export type Severidad = 'alta' | 'media' | 'baja'

/** Vocabulario de gerencias compartido entre reglas, responsabilidades y acceso. */
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
/**
 * La geocerca del proyecto asignado, con la distancia a la posición reportada.
 *
 * `radioMetros` sale de `GET /api/pois` (13 de septiembre de 2026). Hasta
 * entonces el proyecto lo daba por inexistente porque
 * `ajax/namedPlaces.php?cmd=list` no lo publica; el sondeo se había hecho solo
 * contra ese endpoint. **Con radio y posición en vivo sí se puede afirmar
 * "dentro" o "fuera"**, y eso es lo que expone `dentro`. Cuando falta
 * cualquiera de los dos el campo va en `null` — que no es lo mismo que estar
 * fuera. El hueco se declara, no se rellena.
 */
export type Geocerca = {
  nombre: Dato<string>
  lat: Dato<number>
  lon: Dato<number>
  distanciaMetros: number | null
  /**
   * Radio de la geocerca, en metros. Sale de `GET /api/pois` (`radius`), no de
   * `ajax/namedPlaces.php?cmd=list`, que no lo publica — de ahí venía la
   * afirmación anterior de que el radio no existía. `null` cuando la geocerca
   * no trae radio utilizable.
   */
  radioMetros: number | null
  /**
   * ¿El equipo está dentro de su geocerca? `true`/`false` solo cuando hay
   * posición en vivo Y radio; `null` cuando falta cualquiera de los dos, que es
   * distinto de "está fuera".
   *
   * En las geocercas poligonales (`is_round = 0`) el radio describe el círculo
   * que las contiene, así que un `false` es firme —está fuera del círculo, y
   * por lo tanto del polígono— pero un `true` significa "dentro del círculo
   * que la contiene". Eso lo declara `precisionRadio`.
   */
  dentro: boolean | null
  /** `exacta` en las circulares; `circulo-contenedor` en las poligonales. */
  precisionRadio: 'exacta' | 'circulo-contenedor' | null
}

/**
 * Nivel de la cascada de respaldo que resolvió la identidad (identidad.ts):
 * 1 = remote_id, 2 = código de activo, 3 = clave. `null` = sin contraparte.
 * Es una heurística de enlace, no certeza.
 */
export type NivelResolucionIdentidad = 1 | 2 | 3

export type PersonaAsignada = {
  etiqueta: string
  codigo: string | null
  linaje: Linaje
}

export type AsignacionPersonas = {
  prisma: PersonaAsignada | null
  startrack: PersonaAsignada | null
}

export type EquipoUnificado = {
  id: string
  codigoActivo: Dato<string>
  nombre: Dato<string>
  identidadResuelta: boolean
  /**
   * Cascada que resolvió el vínculo Prisma↔Startrack. `null` si no hay
   * contraparte. Heurística documentada — no se trata como certeza.
   */
  nivelResolucionIdentidad: NivelResolucionIdentidad | null
  equipo: EstadoOrigen | null
  solicitud: EstadoOrigen | null
  falla: EstadoOrigen | null
  vehiculo: EstadoOrigen | null
  tarea: EstadoOrigen | null
  ubicacion: Ubicacion | null
  /** Opcional: solo existe si el proyecto de Prisma cruzó con una geocerca. */
  geocercaProyecto?: Geocerca | null
  /**
   * Sugerencia (no hecho, no veredicto) cuando Startrack va ≤5 min adelante de
   * Prisma: es posible que Prisma aún no se haya actualizado. `null` si faltan
   * fechas o el desfase no aplica.
   */
  interpretacionDesfase: string | null
  /**
   * Startrack: conductor de la maquinaria (`asignacion.startrack`).
   * Prisma: operador si el equipo lo trae (`asignacion.prisma`) — otro catálogo.
   * No se cruzan.
   */
  asignacion?: AsignacionPersonas | null
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
