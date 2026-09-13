// Puerta de entrada de cada request (Next 16 reemplazó `middleware.ts` por
// `proxy.ts`). Archivo de carril A: delega en `lib/acceso/verificar.ts`, que es
// de carril C, y no decide nada por su cuenta.
//
// Lo que hace acá es **redirigir**, no autorizar. `verificarAcceso` solo mira
// que exista una cookie con forma de sesión: el proxy puede correr sin acceso a
// las variables de entorno de la raíz del repositorio, así que no puede
// verificar la firma. La autorización de verdad la hace cada ruta de API con
// `exigirSesion()` (lib/acceso/servidor.ts), que es donde está el dato — una
// cookie falsificada llega al cascarón de la aplicación y a ningún dato de ECON.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verificarAcceso } from '@/lib/acceso/verificar'

export function proxy(request: NextRequest) {
  if (verificarAcceso(request)) return NextResponse.next()

  // Una ruta de API responde 401 en JSON: un redirect a HTML rompería al
  // cliente que la consume.
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'no_autorizado', mensaje: 'Sin sesión. Entrá en /acceso.' },
      { status: 401 },
    )
  }

  const destino = new URL('/acceso', request.url)
  destino.searchParams.set('desde', request.nextUrl.pathname)
  return NextResponse.redirect(destino)
}

export const config = {
  // Quedan fuera: los estáticos de Next, la pantalla de acceso y su ruta, y
  // `/api/salud` — que tiene que poder responder sin sesión, porque la propia
  // pantalla de acceso muestra el estado de las dos plataformas.
  matcher: ['/((?!_next|acceso|api/acceso|api/salud|.*\\..*).*)'],
}
