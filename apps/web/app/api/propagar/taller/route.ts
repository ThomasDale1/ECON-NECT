// POST /api/propagar/taller — orden de taller preventiva, P4 + P3 (S-A11).
//
// Ruta delgada. Las tres guardas, en orden, antes de tocar `lib/propagacion`:
//
// 1. **Sesión válida y rol con permiso** (RACI: "Abrir la orden de taller
//    preventiva" la abre la Gerencia de Mantenimiento; ADMIN como llave de demo).
// 2. **Confirmación explícita** — `confirmado: true` literal en el cuerpo.
// 3. **Recurso propio** — la verifica `taller.ts` contra `NECT_EQUIPO_PROPIO`
//    / `NECT_PROYECTO_PROPIO`, del lado del servidor. Esconder el botón no
//    protege nada; mostrarlo no habilita nada.

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { exigirSesionQuePuedaProgramarTaller } from '@/lib/acceso/servidor'
import { ErrorConector, ErrorEscritura, SesionExpirada } from '@/lib/conectores/errores'
import { parametrosSchema } from '@/lib/mantenimiento/parametros'
import { abrirOrdenTaller, cerrarOrdenTaller, PropagacionRechazada } from '@/lib/propagacion/taller'

export const dynamic = 'force-dynamic'

const FechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'AAAA-MM-DD')

const PeticionSchema = z
  .object({
    accion: z.enum(['abrir', 'cerrar']),
    equipoId: z.string().trim().min(1).max(64),
    fechaInicio: FechaSchema.optional(),
    fechaFin: FechaSchema.optional(),
    notas: z.string().max(300).optional(),
    parametros: parametrosSchema.optional(),
    /** Literal `true`: un valor "parecido a verdadero" no cuenta como
     * confirmación de una persona. */
    confirmado: z.literal(true),
  })
  .strict()

/** `recurso_ajeno` es 403 y no 400: no es una petición mal formada, es una
 * petición prohibida. */
const STATUS_POR_MOTIVO: Record<string, number> = {
  equipo_no_encontrado: 404,
  sin_vehiculo: 422,
  equipo_obsoleto: 409,
  orden_ya_abierta: 409,
  orden_no_abierta: 409,
  fechas_invalidas: 400,
  recurso_ajeno: 403,
  fuente_no_disponible: 503,
}

export async function POST(request: NextRequest) {
  const acceso = await exigirSesionQuePuedaProgramarTaller(request)
  if (acceso.respuesta) return acceso.respuesta

  const cuerpo = await request.json().catch(() => null)
  const peticion = PeticionSchema.safeParse(cuerpo)
  if (!peticion.success) {
    return NextResponse.json(
      {
        error: 'peticion_invalida',
        mensaje:
          'Falta `accion`, `equipoId` o `confirmado: true`, o las fechas no son AAAA-MM-DD. Esta ruta nunca escribe sin confirmación explícita.',
      },
      { status: 400 },
    )
  }

  try {
    if (peticion.data.accion === 'abrir') {
      if (!peticion.data.fechaInicio || !peticion.data.fechaFin) {
        return NextResponse.json(
          { error: 'fechas_invalidas', mensaje: 'Abrir la orden requiere fechaInicio y fechaFin (AAAA-MM-DD).' },
          { status: 400 },
        )
      }
      const rastro = await abrirOrdenTaller({
        equipoId: peticion.data.equipoId,
        fechaInicio: peticion.data.fechaInicio,
        fechaFin: peticion.data.fechaFin,
        notas: peticion.data.notas ?? '',
        parametros: peticion.data.parametros,
        rol: acceso.sesion.rol,
      })
      return NextResponse.json({ propagado: !rastro.parcial, rastro }, { status: rastro.parcial ? 207 : 201 })
    }

    const rastro = await cerrarOrdenTaller({ equipoId: peticion.data.equipoId, rol: acceso.sesion.rol })
    return NextResponse.json({ propagado: true, rastro }, { status: 200 })
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
