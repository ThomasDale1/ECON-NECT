import 'server-only'

/**
 * Resolución de identidad entre Prisma y Startrack.
 *
 * La llave verificada es el **código de activo**, no el nombre. `lib/mapeo`
 * documenta la regla y su evidencia:
 *
 * > Prisma concatena código y tipo en un solo texto ("CF-03 - Cargador frontal
 * > 03"); Startrack expone el código solo ("CF-03") en Descripción y el tipo
 * > aparte en Tipo. Extraer el código como subcadena antes de comparar.
 *
 * El mapeo por nombre de proyecto está **descartado por evidencia**: los nombres
 * coinciden en casi todos los casos excepto en uno, donde los componentes
 * aparecen en distinto orden. Ese único caso prueba que unir por nombre es
 * frágil (01 E.4).
 *
 * Un equipo sin contraparte no es un error del sistema: es un huérfano real y se
 * reporta como tal.
 */

/**
 * Extrae el código de activo de un texto de cualquiera de las dos plataformas.
 *
 * Toma el primer segmento antes de un separador (` - `, `–`, `/`, `|`) y lo
 * normaliza a mayúsculas sin espacios. Si no hay separador, usa la primera
 * palabra: Startrack ya expone el código solo.
 */
export function extraerCodigo(texto: string | null | undefined): string | null {
  if (typeof texto !== 'string') return null
  const limpio = texto.trim()
  if (limpio === '') return null

  const [primerSegmento] = limpio.split(/\s+[-–—/|]\s+/)
  const candidato = (primerSegmento ?? limpio).trim().split(/\s+/)[0] ?? ''
  const normalizado = candidato.toUpperCase().replace(/[^A-Z0-9-]/g, '')

  return normalizado === '' ? null : normalizado
}

/** Dos textos describen el mismo activo si su código extraído coincide. */
export function mismoActivo(textoPrisma: string | null, textoStartrack: string | null): boolean {
  const a = extraerCodigo(textoPrisma)
  const b = extraerCodigo(textoStartrack)
  return a !== null && a === b
}

/**
 * Indexa los vehículos de Startrack por código de activo.
 *
 * Si dos vehículos comparten código la identidad es ambigua, así que ninguno se
 * indexa: es preferible declarar que no se puede resolver a elegir uno al azar.
 */
export function indexarPorCodigo<T>(
  registros: T[],
  leerTexto: (registro: T) => string | null,
): Map<string, T> {
  const vistos = new Map<string, T>()
  const ambiguos = new Set<string>()

  for (const registro of registros) {
    const codigo = extraerCodigo(leerTexto(registro))
    if (codigo === null) continue
    if (vistos.has(codigo)) {
      ambiguos.add(codigo)
      continue
    }
    vistos.set(codigo, registro)
  }

  for (const codigo of ambiguos) vistos.delete(codigo)
  return vistos
}

/**
 * Extrae el código de proyecto (`PROY-005`) de un texto.
 *
 * Prisma nombra el proyecto `"PROY-014 - The Hub - Proyecto Xi - La Unión"` y
 * Startrack nombra la geocerca `"PROY-005 - Goat Goating Goats - Proyecto
 * Épsilon - La Libertad"`. Comparten el código al inicio, así que el cruce se
 * hace **por código y no por nombre**: 01 E.4 documenta que unir por nombre es
 * frágil porque en un caso los componentes vienen en distinto orden.
 */
export function extraerCodigoProyecto(texto: string | null | undefined): string | null {
  if (typeof texto !== 'string') return null
  const m = texto.toUpperCase().match(/PROY[-\s]?(\d{1,4})/)
  return m ? `PROY-${m[1].padStart(3, '0')}` : null
}

/**
 * Distancia en metros entre dos puntos (fórmula del semiverseno).
 *
 * Con el radio de la geocerca sin publicar, esta distancia es lo único que se
 * puede afirmar sobre la relación entre el equipo y su proyecto.
 */
export function distanciaEnMetros(
  latA: number,
  lonA: number,
  latB: number,
  lonB: number,
): number {
  const R = 6_371_000
  const rad = (g: number) => (g * Math.PI) / 180
  const dLat = rad(latB - latA)
  const dLon = rad(lonB - lonA)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(latA)) * Math.cos(rad(latB)) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}
