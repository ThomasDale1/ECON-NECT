// Ruta delgada del optimizador (S-A7 Paso 5). Ninguna lógica de optimización
// vive acá: parsea con Zod, delega en `planear()`, traduce errores a la
// tabla de status de AGENTS.md §9.6/S-A7 (compartida en `./errores.ts`). Nunca
// devuelve una credencial ni el `nombre` de un operador — `planear()` ya
// construye la respuesta sin ellos.

import { NextResponse, type NextRequest } from 'next/server'
import { planear } from '@/lib/optimizador/planear'
import { PeticionOptimizarSchema, type ErrorOptimizar } from '@/lib/optimizador/tipos'
import { exigirSesion } from '@/lib/acceso/servidor'
import { respuestaDeErrorOptimizar } from './errores'

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
    const respuestaError = respuestaDeErrorOptimizar(error)
    if (respuestaError) return respuestaError
    throw error
  }
}
