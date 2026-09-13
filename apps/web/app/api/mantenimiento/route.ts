// GET /api/mantenimiento?parametros= — pronóstico de mantenimiento preventivo
// de toda la flota (S-A11 Paso 7). Ruta delgada: sesión, parámetros con Zod,
// delega en `leerMantenimiento`, responde. El servidor no guarda los
// parámetros: los aplica y devuelve cuáles cambiaron el resultado.

import { NextResponse, type NextRequest } from 'next/server'
import { exigirSesion } from '@/lib/acceso/servidor'
import { ErrorConector, SesionExpirada } from '@/lib/conectores/errores'
import { leerMantenimiento } from '@/lib/lectura/mantenimiento'
import { leerParametrosDeQuery } from '@/lib/mantenimiento/parametros'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const acceso = await exigirSesion(request)
  if (acceso.respuesta) return acceso.respuesta

  const parametros = leerParametrosDeQuery(request.nextUrl.searchParams)
  if (!parametros.ok) {
    return NextResponse.json({ error: 'parametros_invalidos', mensaje: parametros.mensaje }, { status: 400 })
  }

  try {
    return NextResponse.json(await leerMantenimiento(parametros.parametros))
  } catch (error) {
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
    throw error
  }
}
