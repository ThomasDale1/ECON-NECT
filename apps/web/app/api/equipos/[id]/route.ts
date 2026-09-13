// GET /api/equipos/[id] — la ficha unificada de un equipo (S-A3).
//
// `id` es el id del equipo en Prisma, que es el que usa `EquipoUnificado.id`.
// Si no existe, 404 con el motivo: no se devuelve un objeto vacío que la ficha
// tendría que interpretar.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { exigirSesion } from '@/lib/acceso/servidor'
import { leerFlota } from '@/lib/lectura/flota'

export const dynamic = 'force-dynamic'

const IdSchema = z.string().trim().min(1).max(64)

export async function GET(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const acceso = await exigirSesion(request)
  if (acceso.respuesta) return acceso.respuesta

  const { id } = await contexto.params
  const validado = IdSchema.safeParse(id)
  if (!validado.success) {
    return NextResponse.json(
      { error: 'peticion_invalida', mensaje: validado.error.message },
      { status: 400 },
    )
  }

  try {
    const lectura = await leerFlota()
    const equipo = lectura.equipos.find((candidato) => candidato.id === validado.data)

    if (!equipo) {
      return NextResponse.json(
        {
          error: 'no_encontrado',
          mensaje: `No hay un equipo con id ${validado.data} en la lectura viva de ${lectura.datos.equipos.endpoint}.`,
          salud: lectura.salud,
          degradacion: lectura.degradacion,
        },
        { status: 404 },
      )
    }

    // La solicitud aprobada de este equipo y su tarea enlazada, si existe: es lo
    // que la ficha necesita para ofrecer (o no) el botón de propagación P1.
    const solicitudesAprobadas = lectura.datos.solicitudes.datos.filter(
      (solicitud) =>
        String(solicitud.maquinaria_id ?? '') === equipo.id &&
        (solicitud.status ?? '').toUpperCase() === 'APROBADA',
    )
    const idsConTarea = new Set(
      lectura.datos.tareas.datos
        .filter((tarea) => tarea.remote_id)
        .map((tarea) => String(tarea.remote_id).trim()),
    )

    return NextResponse.json({
      equipo,
      solicitudesAprobadas: solicitudesAprobadas.map((solicitud) => ({
        id: String(solicitud.id),
        status: solicitud.status,
        fechaInicio: solicitud.fecha_inicio,
        fechaFin: solicitud.fecha_fin,
        aprobadaEn: solicitud.approved_at,
        proyecto: solicitud.project_name,
        tieneTareaEnlazada: idsConTarea.has(String(solicitud.id).trim()),
      })),
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
