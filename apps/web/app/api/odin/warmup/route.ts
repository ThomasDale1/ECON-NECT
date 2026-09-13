import { NextResponse } from 'next/server'

/**
 * Mantiene Qwen cargado en Ollama. No lee Prisma ni Startrack.
 * Se llama al abrir /odin para que la primera consulta no pague el cold start.
 */
export async function POST() {
  const baseUrl = process.env.ODIN_MODEL_BASE_URL ?? 'http://127.0.0.1:11434'
  const model = process.env.ODIN_MODEL_NAME ?? 'qwen3:4b-instruct'

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        keep_alive: '30m',
        messages: [{ role: 'user', content: 'ok' }],
        options: { temperature: 0, num_predict: 1 },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(90_000),
    })
    return NextResponse.json({ ok: response.ok, warm: response.ok })
  } catch {
    return NextResponse.json({ ok: false, warm: false }, { status: 503 })
  }
}
