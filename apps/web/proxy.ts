import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verificarAcceso } from '@/lib/acceso/verificar'

/**
 * Solo delega. Toda la lógica de acceso vive en `lib/acceso/verificar.ts`,
 * que es territorio del carril C.
 *
 * En Next.js 16 este archivo se llama `proxy.ts` y exporta `proxy`;
 * `middleware.ts` es el nombre de la versión 15 y anterior.
 */
export function proxy(peticion: NextRequest) {
  if (!verificarAcceso(peticion)) {
    return NextResponse.redirect(new URL('/acceso', peticion.url))
  }
  return NextResponse.next()
}

export const proxyConfig = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
