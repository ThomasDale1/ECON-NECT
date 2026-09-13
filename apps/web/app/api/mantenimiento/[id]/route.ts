// GET /api/mantenimiento/[id]?parametros= — pronóstico de un equipo (S-A11
// Paso 7). 404 si el equipo no existe en la lectura viva.

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { exigirSesion } from '@/lib/acceso/servidor'
import { ErrorConector, SesionExpirada } from '@/lib/conectores/errores'
import { leerPronostico } from '@/lib/lectura/mantenimiento'
import { leerParametrosDeQuery } from '@/lib/mantenimiento/parametros'

export const dynamic = 'force-dynamic'

const IdSchema = z.string().trim().min(1).max(64)

export async function GET(request: NextRequest, contexto: { params: Promise<{ id: string }> }) {
  const acceso = await exigirSesion(request)
  if (acceso.respuesta) return acceso.respuesta

  const { id } = await contexto.params
  const validado = IdSchema.safeParse(id)
  if (!validado.success) {
    return NextResponse.json({ error: 'peticion_invalida', mensaje: validado.error.message }, { status: 400 })
  }

  const parametros = leerParametrosDeQuery(request.nextUrl.searchParams)
  if (!parametros.ok) {
    return NextResponse.json({ error: 'parametros_invalidos', mensaje: parametros.mensaje }, { status: 400 })
  }

  try {
    const pronostico = await leerPronostico(validado.data, parametros.parametros)
    if (!pronostico) {
      return NextResponse.json(
        { error: 'no_encontrado', mensaje: `No hay un equipo con id ${validado.data} en la lectura viva.` },
        { status: 404 },
      )
    }
    return NextResponse.json(pronostico)
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
