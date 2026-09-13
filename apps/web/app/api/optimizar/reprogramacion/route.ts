// Ruta delgada de la vista previa de reprogramación. Parsea con Zod, delega
// en `reprogramar()` y traduce errores. No escribe nada en Prisma ni en
// Startrack: la respuesta es una propuesta que el navegador solo muestra.

import { NextResponse, type NextRequest } from 'next/server'
import { exigirSesion } from '@/lib/acceso/servidor'
import { reprogramar } from '@/lib/optimizador/reprogramar'
import { PeticionReprogramarSchema, type ErrorOptimizar } from '@/lib/optimizador/tipos'
import { respuestaDeErrorOptimizar } from '../errores'

export async function POST(request: NextRequest) {
  const acceso = await exigirSesion(request)
  if (acceso.respuesta) return acceso.respuesta

  const cuerpo = await request.json().catch(() => null)
  const peticion = PeticionReprogramarSchema.safeParse(cuerpo)

  if (!peticion.success) {
    const error: ErrorOptimizar = { error: 'peticion_invalida', mensaje: peticion.error.message }
    return NextResponse.json(error, { status: 400 })
  }

  try {
    const respuesta = await reprogramar(peticion.data)
    return NextResponse.json(respuesta, { status: 200 })
  } catch (error) {
    const respuestaError = respuestaDeErrorOptimizar(error)
    if (respuestaError) return respuestaError
    throw error
  }
}
