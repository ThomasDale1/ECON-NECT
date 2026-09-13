// Cliente HTTP a services/solver/ (S-A7 Paso 4e). server-only. No usa
// `ErrorConector` (exige una `Plataforma` del contrato congelado, que solo
// conoce 'prisma' | 'startrack') — el solver no es ninguna de las dos.

import 'server-only'
import type { EntradaSolver, SalidaSolver } from './tipos'

export class ErrorSolver extends Error {
  constructor(
    public readonly endpoint: string,
    causa: string,
  ) {
    super(`Error llamando al solver (${endpoint}): ${causa}`)
    this.name = 'ErrorSolver'
  }
}

function baseUrl(): string {
  const url = process.env.SOLVER_BASE_URL
  if (!url) {
    throw new ErrorSolver('config', 'falta SOLVER_BASE_URL en .env.local')
  }
  return url.replace(/\/$/, '')
}

/** Llama a `POST /optimizar`. Timeout = (cantidad de niveles × tiempo límite
 * por nivel) + 10s (Paso 4e) — un nivel por elemento de la pila (la cobertura
 * va dentro de la pila desde el 13 de septiembre de 2026). Nunca loguea el cuerpo de la petición ni de
 * la respuesta (AGENTS.md §12.1). */
export async function optimizarEnSolver(entrada: EntradaSolver): Promise<SalidaSolver> {
  const endpoint = '/optimizar'
  const niveles = Math.max(entrada.pila.length, 1)
  const timeoutMs = niveles * entrada.tiempoLimitePorNivelS * 1000 + 10_000

  const controlador = new AbortController()
  const timeout = setTimeout(() => controlador.abort(), timeoutMs)

  let respuesta: Response
  try {
    respuesta = await fetch(`${baseUrl()}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entrada),
      signal: controlador.signal,
    })
  } catch (error) {
    throw new ErrorSolver(endpoint, error instanceof Error ? error.message : String(error))
  } finally {
    clearTimeout(timeout)
  }

  if (!respuesta.ok) {
    let detalle = `status ${respuesta.status}`
    try {
      const cuerpo = (await respuesta.json()) as { detail?: unknown }
      if (typeof cuerpo.detail === 'string') detalle = cuerpo.detail
    } catch {
      // sin cuerpo JSON útil; se mantiene el detalle por status
    }
    throw new ErrorSolver(endpoint, detalle)
  }

  return (await respuesta.json()) as SalidaSolver
}
