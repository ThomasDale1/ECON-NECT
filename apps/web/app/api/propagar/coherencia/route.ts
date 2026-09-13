// POST /api/propagar/coherencia — resolver R2 eligiendo qué plataforma manda.
//
// Ruta delgada. Las tres guardas, en orden, antes de tocar `lib/propagacion`:
//
// 1. **Sesión válida y rol con permiso** — R2 es de "Programar y ejecutar el
//    traslado": Logística (o ADMIN como llave de demo).
// 2. **Confirmación explícita** — `confirmado: true` literal en el cuerpo.
// 3. **Recurso propio** — la verifica `coherencia.ts` contra
//    `NECT_EQUIPO_PROPIO` / `NECT_PROYECTO_PROPIO`, del lado del servidor.

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { exigirSesionQuePuedaPropagar } from '@/lib/acceso/servidor'
import { ErrorConector, ErrorEscritura, SesionExpirada } from '@/lib/conectores/errores'
import { PropagacionRechazada, resolverCoherenciaEstado } from '@/lib/propagacion/coherencia'

export const dynamic = 'force-dynamic'

const PeticionSchema = z
  .object({
    equipoId: z.string().trim().min(1).max(64),
    mantener: z.enum(['prisma', 'startrack']),
    /** Literal `true`: un valor "parecido a verdadero" no cuenta como
     * confirmación de una persona. */
    confirmado: z.literal(true),
  })
  .strict()

const STATUS_POR_MOTIVO: Record<string, number> = {
  equipo_no_encontrado: 404,
  sin_vehiculo: 422,
  sin_incoherencia: 409,
  impedimento_de_falla: 409,
  recurso_ajeno: 403,
  fuente_no_disponible: 503,
}

export async function POST(request: NextRequest) {
  const acceso = await exigirSesionQuePuedaPropagar(request)
  if (acceso.respuesta) return acceso.respuesta

  const cuerpo = await request.json().catch(() => null)
  const peticion = PeticionSchema.safeParse(cuerpo)
  if (!peticion.success) {
    return NextResponse.json(
      {
        error: 'peticion_invalida',
        mensaje:
          'Falta `equipoId`, `mantener` ("prisma" o "startrack") o `confirmado: true`. Esta ruta nunca escribe sin confirmación explícita.',
      },
      { status: 400 },
    )
  }

  try {
    const rastro = await resolverCoherenciaEstado({
      equipoId: peticion.data.equipoId,
      mantener: peticion.data.mantener,
      rol: acceso.sesion.rol,
    })
    return NextResponse.json({ propagado: !rastro.parcial, rastro }, { status: rastro.parcial ? 207 : 200 })
  } catch (error) {
    if (error instanceof PropagacionRechazada) {
      return NextResponse.json(
        { error: error.motivo, mensaje: error.message, ...error.detalle },
        { status: STATUS_POR_MOTIVO[error.motivo] ?? 400 },
      )
    }
    if (error instanceof ErrorEscritura) {
      return NextResponse.json(
        {
          error: 'escritura_rechazada',
          mensaje: error.message,
          fuente: { plataforma: error.plataforma, endpoint: error.endpoint },
        },
        { status: 502 },
      )
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
    throw error
  }
}
