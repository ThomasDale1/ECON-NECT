// GET /api/incoherencias — la bandeja de excepciones (S-A3).
//
// Una fila por regla disparada, ordenada por severidad, con el rol responsable
// y la acción sugerida. La proyección vive en `lib/canonico/incoherencias.ts`
// (función pura); acá solo se valida el filtro y se responde.
//
// `?rol=` es lo que hace útil la vista por rol de D.5: cada gerencia ve su
// propia cola sin ver la de las demás.

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { construirIncoherencias } from '@/lib/canonico/incoherencias'
import { exigirSesion } from '@/lib/acceso/servidor'
import { leerFlota } from '@/lib/lectura/flota'

export const dynamic = 'force-dynamic'

const FiltrosSchema = z.object({
  rol: z.enum(['PROYECTOS', 'LOGISTICA', 'MANTENIMIENTO', 'COSTOS', 'DIRECCION']).optional(),
  severidad: z.enum(['alta', 'media', 'baja']).optional(),
  veredicto: z.enum(['ATENCION', 'EN_RIESGO', 'SIN_EVIDENCIA']).optional(),
})

export async function GET(request: NextRequest) {
  const acceso = await exigirSesion(request)
  if (acceso.respuesta) return acceso.respuesta

  const filtros = FiltrosSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!filtros.success) {
    return NextResponse.json(
      { error: 'peticion_invalida', mensaje: filtros.error.message },
      { status: 400 },
    )
  }

  const { rol, severidad, veredicto } = filtros.data

  try {
    const lectura = await leerFlota()
    const todas = construirIncoherencias(lectura.equipos, lectura.datos)

    let incoherencias = todas
    if (rol) incoherencias = incoherencias.filter((fila) => fila.rolResponsable === rol)
    if (severidad) incoherencias = incoherencias.filter((fila) => fila.severidad === severidad)
    if (veredicto) incoherencias = incoherencias.filter((fila) => fila.veredicto === veredicto)

    return NextResponse.json({
      incoherencias,
      total: todas.length,
      devueltas: incoherencias.length,
      salud: lectura.salud,
      degradacion: lectura.degradacion,
      leidoEn: lectura.leidoEn,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'lectura_fallida',
        mensaje: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    )
  }
}
