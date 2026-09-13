// GET /api/salud — estado de cada conector y frescura de la lectura (S-A3).
//
// Es la única ruta que `proxy.ts` deja pasar sin sesión: tiene que poder
// responder cuando nadie inició sesión todavía (la pantalla de acceso la
// muestra) y cuando algo está caído. Por eso no devuelve ni un dato de ECON —
// solo nombre de plataforma, endpoint intentado, latencia y hora.
//
// No pide la posición en vivo de cada vehículo: son ~15 peticiones extra que
// para medir salud no aportan nada.

import { NextResponse } from 'next/server'
import { leerFlota, UMBRAL_LENTA_MS } from '@/lib/lectura/flota'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const lectura = await leerFlota({ incluirPosicionEnVivo: false })

    const hayCaida = lectura.salud.some((fuente) => fuente.estado === 'caida')

    return NextResponse.json(
      {
        salud: lectura.salud,
        degradacion: lectura.degradacion,
        // Solo plataforma, endpoint y mensaje de error: ningún registro.
        fallas: lectura.fallas,
        umbralLentaMs: UMBRAL_LENTA_MS,
        equiposLeidos: lectura.equipos.length,
        leidoEn: lectura.leidoEn,
      },
      // 200 aunque una fuente esté caída: la respuesta es válida y describe la
      // caída. 503 solo cuando ninguna de las dos respondió.
      { status: hayCaida && lectura.salud.every((f) => f.estado === 'caida') ? 503 : 200 },
    )
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
