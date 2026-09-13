import 'server-only'

import { respuestaOdinSchema, type ContextoOdin, type RespuestaOdin } from './tipos'


export class ServicioInteligenciaNoDisponible extends Error {
  constructor(message = 'El servicio local de inteligencia no está disponible.') {
    super(message)
    this.name = 'ServicioInteligenciaNoDisponible'
  }
}

export async function consultarOdin(input: {
  message: string
  assetId: string
  context: ContextoOdin
}): Promise<RespuestaOdin> {
  const baseUrl = process.env.INTELLIGENCE_BASE_URL ?? 'http://127.0.0.1:8001'

  try {
    const response = await fetch(`${baseUrl}/odin/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: input.message,
        asset_id: input.assetId,
        context: input.context,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(90_000),
    })

    if (!response.ok) {
      throw new ServicioInteligenciaNoDisponible()
    }

    return respuestaOdinSchema.parse(await response.json())
  } catch (error) {
    if (error instanceof ServicioInteligenciaNoDisponible) throw error
    throw new ServicioInteligenciaNoDisponible()
  }
}

