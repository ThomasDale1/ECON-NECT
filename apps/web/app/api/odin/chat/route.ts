import { crearContextoOdin } from '@/lib/inteligencia/contexto'
import {
  consultarOdin,
  ServicioInteligenciaNoDisponible,
} from '@/lib/inteligencia/cliente'
import { solicitudOdinSchema } from '@/lib/inteligencia/tipos'
import { EQUIPOS_EJEMPLO } from '@/lib/tipos/ejemplo'


export async function POST(request: Request) {
  const parsed = solicitudOdinSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json(
      { error: 'La consulta o el equipo no tienen un formato válido.' },
      { status: 400 },
    )
  }

  // Datos fabricados para la interfaz actual. Cuando GET /api/equipos esté
  // disponible, solo cambia esta lectura server-side; el navegador seguirá
  // enviando exclusivamente message + assetId.
  const equipo = EQUIPOS_EJEMPLO.find((item) => item.id === parsed.data.assetId)
  if (!equipo) {
    return Response.json({ error: 'Equipo no encontrado.' }, { status: 404 })
  }

  try {
    const response = await consultarOdin({
      message: parsed.data.message,
      assetId: parsed.data.assetId,
      context: crearContextoOdin(equipo),
    })
    return Response.json(response)
  } catch (error) {
    if (error instanceof ServicioInteligenciaNoDisponible) {
      return Response.json(
        {
          error: 'O.D.I.N. no está disponible. El resto de ECON NECT continúa operativo.',
          status: 'ODIN_UNAVAILABLE',
        },
        { status: 503 },
      )
    }
    throw error
  }
}

