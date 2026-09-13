// GET /api/indicadores — el catálogo de KPIs de carril C, alimentado con la
// lectura viva (S-A3).
//
// Devuelve los seis campos de cada KPI (01 D.7) más su valor, su estado y **de
// qué endpoint salió cada cifra**. Un KPI sin dato no desaparece de la
// respuesta: viene con `estado: 'no_calculable'` y el dato que falta.

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { construirIndicadores } from '@/lib/lectura/indicadores'
import { exigirSesion } from '@/lib/acceso/servidor'
import { leerFlota } from '@/lib/lectura/flota'

export const dynamic = 'force-dynamic'

const FiltrosSchema = z.object({
  /** `?estado=calculado` para el panel de tiles; sin filtro devuelve todo el
   * catálogo, huecos incluidos. */
  estado: z.enum(['calculado', 'no_calculable', 'requiere_optimizador']).optional(),
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

  try {
    const lectura = await leerFlota()
    const todos = construirIndicadores(lectura)
    const indicadores = filtros.data.estado
      ? todos.filter((indicador) => indicador.estado === filtros.data.estado)
      : todos

    return NextResponse.json({
      indicadores,
      total: todos.length,
      devueltos: indicadores.length,
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
