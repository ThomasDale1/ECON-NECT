// POST /api/propagar/traslado — Propagación P1 (S-A4).
//
// Ruta delgada. Las tres guardas, en orden, antes de tocar `lib/propagacion`:
//
// 1. **Sesión válida y rol con permiso** (S-C3 + RACI: "Programar el traslado"
//    lo aprueba Logística).
// 2. **Confirmación explícita** — `confirmado: true` en el cuerpo. Nunca
//    automático (01 C.3). El diálogo de la interfaz es la primera barrera; esta
//    es la que de verdad cuenta.
// 3. **Recurso propio** — la verifica `propagarTrasladoP1` contra
//    `NECT_EQUIPO_PROPIO`/`NECT_PROYECTO_PROPIO`, del lado del servidor. La
//    interfaz no puede saltearla escondiendo o mostrando un botón.

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { exigirSesionQuePuedaPropagar } from '@/lib/acceso/servidor'
import { ErrorConector, ErrorEscritura, SesionExpirada } from '@/lib/conectores/errores'
import { PropagacionRechazada, propagarTrasladoP1 } from '@/lib/propagacion/p1'

export const dynamic = 'force-dynamic'

const PeticionSchema = z.object({
  solicitudId: z.string().trim().min(1).max(64),
  /** Sin esto no se escribe. Literal `true`: un valor "parecido a verdadero" no
   * cuenta como confirmación de una persona. */
  confirmado: z.literal(true),
})

/** Qué código HTTP le toca a cada rechazo. `recurso_ajeno` es 403 y no 400: no
 * es una petición mal formada, es una petición prohibida. */
const STATUS_POR_MOTIVO: Record<string, number> = {
  solicitud_no_encontrada: 404,
  solicitud_no_aprobada: 409,
  tarea_ya_existe: 409,
  sin_vehiculo: 422,
  sin_geocerca_destino: 422,
  sin_tipo_traslado: 422,
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
          'Falta `solicitudId` o `confirmado: true`. Esta ruta nunca escribe sin confirmación explícita.',
      },
      { status: 400 },
    )
  }

  try {
    const rastro = await propagarTrasladoP1({
      solicitudId: peticion.data.solicitudId,
      rol: acceso.sesion.rol,
    })
    return NextResponse.json({ propagado: true, rastro }, { status: 201 })
  } catch (error) {
    if (error instanceof PropagacionRechazada) {
      return NextResponse.json(
        { error: error.motivo, mensaje: error.message, ...error.detalle },
        { status: STATUS_POR_MOTIVO[error.motivo] ?? 400 },
      )
    }
    if (error instanceof ErrorEscritura) {
      // La plataforma rechazó la escritura. No se reintenta sola: el mensaje
      // vuelve tal cual para que lo lea una persona.
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
