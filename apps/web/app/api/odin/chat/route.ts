import { crearContextoOdin } from '@/lib/inteligencia/contexto'
import {
  consultarOdin,
  ServicioInteligenciaNoDisponible,
} from '@/lib/inteligencia/cliente'
import { leerEquiposUnificados } from '@/lib/canonico/orquestador'
import { solicitudOdinSchema } from '@/lib/inteligencia/tipos'
import { leerSenalesOdin } from '@/lib/lectura/mantenimiento'
import { PARAMETROS_VACIOS } from '@/lib/mantenimiento/parametros'


export async function POST(request: Request) {
  const parsed = solicitudOdinSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json(
      { error: 'La consulta o el equipo no tienen un formato válido.' },
      { status: 400 },
    )
  }

  // El navegador solo elige un identificador. El servidor vuelve a leer el
  // estado canónico y minimiza el contexto antes de enviarlo al proceso local.
  const { equipos } = await leerEquiposUnificados()
  const equipo = equipos.find((item) => item.id === parsed.data.assetId)
  if (!equipo) {
    return Response.json({ error: 'Equipo no encontrado.' }, { status: 404 })
  }

  // Señales reales de mantenimiento (S-A11 Paso 8): el pronóstico del equipo
  // con los parámetros del navegador. Si la lectura falla, O.D.I.N. sigue con
  // `maintenance_signals: null` y el índice responde UNKNOWN — nunca inventa.
  const parametros = parsed.data.parametros ?? PARAMETROS_VACIOS
  const senales = await leerSenalesOdin(equipo.id, parametros).catch(() => null)

  try {
    const response = await consultarOdin({
      message: parsed.data.message,
      assetId: parsed.data.assetId,
      context: crearContextoOdin(equipo, senales?.senales ?? null),
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
