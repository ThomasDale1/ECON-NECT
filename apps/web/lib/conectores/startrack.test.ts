import { describe, it, expect, beforeEach, vi } from 'vitest'
import { desenvolverStartrack, leerVehiculos, _reiniciarParaPruebas } from './startrack'
import { SesionExpirada } from './errores'
import { limpiarCache } from './cache'

// Valores de fixture para pruebas — NO son credenciales reales del sandbox
// (AGENTS.md §1.4). fetch está siempre simulado en este archivo: nunca sale
// una petición real de red.
beforeEach(() => {
  process.env.STARTRACK_BASE_URL = 'https://startrack.invalid'
  process.env.STARTRACK_CLIENT = 'cliente-prueba'
  process.env.STARTRACK_USER = 'usuario-prueba'
  process.env.STARTRACK_PASSWORD = 'clave-prueba'
  limpiarCache()
  _reiniciarParaPruebas()
  vi.restoreAllMocks()
})

describe('desenvolverStartrack', () => {
  // Prueba obligatoria #1 (S-A1 §"Pruebas obligatorias"): lanza SesionExpirada
  // con un cuerpo {success:false} y código 200 — el fallo que se ve como éxito
  // (01 E.7).
  it('lanza SesionExpirada cuando el cuerpo trae success:false, sin importar el código HTTP', () => {
    expect(() =>
      desenvolverStartrack({ success: false, errorMsg: 'auth error' }, 'ajax/events.php'),
    ).toThrow(SesionExpirada)
  })

  it('devuelve el payload tal cual cuando success no es false', () => {
    const payload = { success: true, vehicles: [] }
    expect(desenvolverStartrack(payload, 'ajax/vehicles.php')).toBe(payload)
  })
})

describe('reautenticación de Startrack', () => {
  // Prueba obligatoria #2: reautentica y reintenta UNA vez ante sesión
  // expirada, y no más.
  it('reautentica y reintenta una vez cuando la sesión expiró, y la segunda vez funciona', async () => {
    const llamadas: string[] = []

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input)
        if (url.includes('login.php')) {
          llamadas.push('login')
          return new Response(null, {
            status: 302,
            headers: { 'set-cookie': 'PHPSESSID=abc123; Path=/' },
          })
        }

        llamadas.push('vehicles')
        const vecesQueLlegoAVehicles = llamadas.filter((l) => l === 'vehicles').length
        if (vecesQueLlegoAVehicles === 1) {
          return new Response(JSON.stringify({ success: false, errorMsg: 'auth error' }), {
            status: 200,
          })
        }
        return new Response(JSON.stringify({ success: true, vehicles: [{ id: 1 }] }), {
          status: 200,
        })
      }),
    )

    const resultado = await leerVehiculos()

    expect(resultado.datos).toEqual([{ id: 1 }])
    expect(llamadas).toEqual(['login', 'vehicles', 'login', 'vehicles'])
  })

  it('no reintenta una segunda vez si la sesión sigue expirada tras reautenticar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input)
        if (url.includes('login.php')) {
          return new Response(null, {
            status: 302,
            headers: { 'set-cookie': 'PHPSESSID=abc123; Path=/' },
          })
        }
        return new Response(JSON.stringify({ success: false, errorMsg: 'auth error' }), {
          status: 200,
        })
      }),
    )

    await expect(leerVehiculos()).rejects.toThrow(SesionExpirada)

    const llamadasAVehicles = (fetch as ReturnType<typeof vi.fn>).mock.calls.filter(([entrada]) =>
      String(entrada).includes('vehicles'),
    )
    // Primer intento + el único reintento permitido. Nunca un tercero.
    expect(llamadasAVehicles).toHaveLength(2)
  })
})
