// Conector de clima (S-A7 Paso 3). server-only. Única fuente externa que no
// es de ECON: Open-Meteo, pública y sin clave. Solo alimenta una alerta — no
// entra a la pila del optimizador ni mueve fechas (AGENTS.md §12.1).
//
// No usa `ErrorConector` (exige una `Plataforma` del contrato congelado
// lib/tipos/canonico.ts, que solo conoce 'prisma' | 'startrack') ni `conCache`
// de lib/conectores/cache.ts en su forma de clave libre — se reimplementa acá
// un TTL propio de 30 min para no acoplar esta fuente al vocabulario de las
// dos plataformas de ECON.

import 'server-only'

const ENDPOINT_BASE = 'https://api.open-meteo.com/v1/forecast'
const TTL_MS = 30 * 60 * 1000
const TIMEOUT_MS = 8_000

export class ErrorClima extends Error {
  constructor(
    public readonly endpoint: string,
    causa: string,
  ) {
    super(`Error leyendo Open-Meteo (${endpoint}): ${causa}`)
    this.name = 'ErrorClima'
  }
}

export type DiaPronostico = { fecha: string; probabilidadMaxPct: number | null }
export type PronosticoLluvia = { dias: DiaPronostico[]; endpoint: string; leidoEn: string }

type Entrada = { valor: PronosticoLluvia; expiraEn: number }
const cache = new Map<string, Entrada>()

function redondear1Decimal(valor: number): number {
  return Math.round(valor * 10) / 10
}

function construirEndpoint(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: 'precipitation_probability_max',
    forecast_days: '16',
    timezone: 'America/El_Salvador',
  })
  return `${ENDPOINT_BASE}?${params.toString()}`
}

/** Lee el pronóstico de lluvia de los próximos 16 días para una coordenada.
 * Redondea `lat`/`lon` a 1 decimal DENTRO de esta función, para que ningún
 * llamador pueda saltarse esa regla (Paso 3). Nunca loguea la coordenada ni
 * la respuesta. */
export async function leerPronosticoLluvia(lat: number, lon: number): Promise<PronosticoLluvia> {
  const latRedondeada = redondear1Decimal(lat)
  const lonRedondeada = redondear1Decimal(lon)
  const endpoint = construirEndpoint(latRedondeada, lonRedondeada)
  const clave = `${latRedondeada},${lonRedondeada}`

  const ahora = Date.now()
  const entrada = cache.get(clave)
  if (entrada && entrada.expiraEn > ahora) {
    return entrada.valor
  }

  const controlador = new AbortController()
  const timeout = setTimeout(() => controlador.abort(), TIMEOUT_MS)

  let respuesta: Response
  try {
    respuesta = await fetch(endpoint, { signal: controlador.signal })
  } catch (error) {
    throw new ErrorClima(ENDPOINT_BASE, error instanceof Error ? error.message : String(error))
  } finally {
    clearTimeout(timeout)
  }

  if (!respuesta.ok) {
    throw new ErrorClima(ENDPOINT_BASE, `status ${respuesta.status}`)
  }

  let cuerpo: unknown
  try {
    cuerpo = await respuesta.json()
  } catch {
    throw new ErrorClima(ENDPOINT_BASE, 'respuesta no-JSON')
  }

  const daily = (cuerpo as { daily?: { time?: unknown; precipitation_probability_max?: unknown } }).daily
  const tiempos = Array.isArray(daily?.time) ? (daily!.time as unknown[]) : []
  const probabilidades = Array.isArray(daily?.precipitation_probability_max)
    ? (daily!.precipitation_probability_max as unknown[])
    : []

  const dias: DiaPronostico[] = tiempos.map((fecha, i) => {
    const probabilidad = probabilidades[i]
    return {
      fecha: String(fecha),
      probabilidadMaxPct: typeof probabilidad === 'number' ? probabilidad : null,
    }
  })

  const valor: PronosticoLluvia = { dias, endpoint: ENDPOINT_BASE, leidoEn: new Date().toISOString() }
  cache.set(clave, { valor, expiraEn: ahora + TTL_MS })
  return valor
}
