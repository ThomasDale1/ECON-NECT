// Ruta delgada del optimizador (S-A7 Paso 5). Ninguna lógica de optimización
// vive acá: parsea con Zod, delega en `planear()`, traduce errores a la
// tabla de status de AGENTS.md §9.6/S-A7. Nunca devuelve una credencial ni el
// `nombre` de un operador — `planear()` ya construye la respuesta sin ellos.

import { NextResponse, type NextRequest } from 'next/server'
import { ErrorConector, SesionExpirada } from '@/lib/conectores/errores'
import { ErrorSolver } from '@/lib/optimizador/cliente'
import { ErrorVerificacion, planear } from '@/lib/optimizador/planear'
import { PeticionOptimizarSchema, type ErrorOptimizar } from '@/lib/optimizador/tipos'
import { exigirSesion } from '@/lib/acceso/servidor'

export async function POST(request: NextRequest) {
  const acceso = await exigirSesion(request)
  if (acceso.respuesta) return acceso.respuesta

  const cuerpo = await request.json().catch(() => null)
  const peticion = PeticionOptimizarSchema.safeParse(cuerpo)

  if (!peticion.success) {
    const error: ErrorOptimizar = { error: 'peticion_invalida', mensaje: peticion.error.message }
    return NextResponse.json(error, { status: 400 })
  }

  try {
    const respuesta = await planear(peticion.data)
    return NextResponse.json(respuesta, { status: 200 })
  } catch (error) {
    if (error instanceof ErrorSolver) {
      const cuerpoError: ErrorOptimizar = { error: 'solver_no_disponible', mensaje: error.message }
      return NextResponse.json(cuerpoError, { status: 503 })
    }
    if (error instanceof SesionExpirada || error instanceof ErrorConector) {
      const cuerpoError: ErrorOptimizar = {
        error: 'fuente_no_disponible',
        mensaje: error.message,
        fuente: { plataforma: error.plataforma, endpoint: error.endpoint },
      }
      return NextResponse.json(cuerpoError, { status: 503 })
    }
    if (error instanceof ErrorVerificacion) {
      const cuerpoError: ErrorOptimizar = { error: 'verificacion_fallida', mensaje: error.message }
      return NextResponse.json(cuerpoError, { status: 500 })
    }
    throw error
  }
}
