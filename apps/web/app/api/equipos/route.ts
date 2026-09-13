// GET /api/equipos — la flota reconciliada en vivo (S-A3).
//
// Ruta delgada: valida con Zod, delega en `leerFlota()`, responde. Ninguna
// lógica de reconciliación vive acá (AGENTS.md §4.3).
//
// La respuesta SIEMPRE trae `salud` y `degradacion`, incluso cuando todo salió
// bien: la pantalla nunca queda en blanco por una caída de Startrack, y el
// cliente puede decir qué fuente falló y por qué.

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { exigirSesion } from '@/lib/acceso/servidor'
import { leerFlota } from '@/lib/lectura/flota'

export const dynamic = 'force-dynamic'

const FiltrosSchema = z.object({
  veredicto: z.enum(['COHERENTE', 'ATENCION', 'EN_RIESGO', 'SIN_EVIDENCIA']).optional(),
  rol: z.enum(['PROYECTOS', 'LOGISTICA', 'MANTENIMIENTO', 'COSTOS', 'DIRECCION']).optional(),
  /** Búsqueda por código de activo o nombre; el buscador de la vista de flota. */
  q: z.string().trim().min(1).max(80).optional(),
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

  const { veredicto, rol, q } = filtros.data

  try {
    const lectura = await leerFlota()

    let equipos = lectura.equipos
    if (veredicto) equipos = equipos.filter((equipo) => equipo.veredicto === veredicto)
    if (rol) {
      equipos = equipos.filter((equipo) =>
        equipo.reglas.some((regla) => regla.rolResponsable === rol),
      )
    }
    if (q) {
      const aguja = q.toLowerCase()
      equipos = equipos.filter(
        (equipo) =>
          (equipo.codigoActivo.valor ?? '').toLowerCase().includes(aguja) ||
          (equipo.nombre.valor ?? '').toLowerCase().includes(aguja),
      )
    }

    return NextResponse.json({
      equipos,
      total: lectura.equipos.length,
      devueltos: equipos.length,
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
