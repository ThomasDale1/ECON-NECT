// Traducción de errores del optimizador a HTTP, compartida por
// `POST /api/optimizar` y `POST /api/optimizar/reprogramacion`. Sin lógica de
// negocio: solo la tabla de status de AGENTS.md §9.6/S-A7.

import { NextResponse } from 'next/server'
import { ErrorConector, SesionExpirada } from '@/lib/conectores/errores'
import { ErrorSolver } from '@/lib/optimizador/cliente'
import { ErrorVerificacion } from '@/lib/optimizador/planear'
import type { ErrorOptimizar } from '@/lib/optimizador/tipos'

/** `null` si el error no es de los conocidos: la ruta lo relanza. */
export function respuestaDeErrorOptimizar(error: unknown): NextResponse<ErrorOptimizar> | null {
  if (error instanceof ErrorSolver) {
    return NextResponse.json({ error: 'solver_no_disponible', mensaje: error.message }, { status: 503 })
  }
  if (error instanceof SesionExpirada || error instanceof ErrorConector) {
    return NextResponse.json(
      {
        error: 'fuente_no_disponible',
        mensaje: error.message,
        fuente: { plataforma: error.plataforma, endpoint: error.endpoint },
      },
      { status: 503 },
    )
  }
  if (error instanceof ErrorVerificacion) {
    return NextResponse.json({ error: 'verificacion_fallida', mensaje: error.message }, { status: 500 })
  }
  return null
}
