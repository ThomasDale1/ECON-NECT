// Caché volátil en memoria de proceso — el único amortiguador contra un
// sandbox lento compartido por 13 equipos (AGENTS.md §4, S-A1 §4).
//
// Regla que no se negocia: si la lectura falla y la entrada en caché está
// vencida, NUNCA se sirve ese valor viejo. Se propaga el error y quien llama
// decide degradar (p. ej. a SIN_EVIDENCIA). Servir un dato vencido como si
// fuera vigente es exactamente la mentira que este producto existe para
// evitar (principio C.4).

import 'server-only'

type Entrada<T> = {
  valor: T
  expiraEn: number
}

const almacen = new Map<string, Entrada<unknown>>()

/** TTL por defecto: 45s, dentro del rango de 30–60s que pide el prompt. */
export const TTL_POR_DEFECTO_MS = 45_000

/**
 * Devuelve el valor en caché si sigue vigente. Si no, corre `leer()`:
 * - Si `leer()` resuelve, guarda el nuevo valor y lo devuelve.
 * - Si `leer()` falla, propaga el error tal cual — nunca cae de vuelta al
 *   valor vencido.
 */
export async function conCache<T>(
  clave: string,
  leer: () => Promise<T>,
  ttlMs: number = TTL_POR_DEFECTO_MS,
): Promise<T> {
  const ahora = Date.now()
  const entrada = almacen.get(clave) as Entrada<T> | undefined

  if (entrada && entrada.expiraEn > ahora) {
    return entrada.valor
  }

  const valor = await leer()
  almacen.set(clave, { valor, expiraEn: ahora + ttlMs })
  return valor
}

/** Olvida toda entrada cuya clave empiece con `prefijo`. Se usa después de una
 * escritura (S-A4): si la tarea recién creada no se ve hasta que venza el TTL,
 * la incoherencia sigue en pantalla un minuto después de haberla resuelto — y
 * ese instante es justamente el de la demo. Devuelve cuántas entradas olvidó. */
export function invalidarCache(prefijo: string): number {
  let olvidadas = 0
  for (const clave of [...almacen.keys()]) {
    if (clave.startsWith(prefijo)) {
      almacen.delete(clave)
      olvidadas++
    }
  }
  return olvidadas
}

/** Solo para pruebas: vacía el caché entre casos. */
export function limpiarCache(): void {
  almacen.clear()
}
