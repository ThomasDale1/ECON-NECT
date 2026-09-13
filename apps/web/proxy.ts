import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verificarAcceso } from '@/lib/acceso/verificar'

export function proxy(request: NextRequest) {
  if (!verificarAcceso(request)) {
    const siguiente = request.nextUrl.pathname + request.nextUrl.search
    const url = request.nextUrl.clone()
    url.pathname = '/entrar'
    url.search = `?siguiente=${encodeURIComponent(siguiente)}`
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  // Excluye /entrar, internos de Next, salud y estáticos.
  matcher: ['/((?!entrar|_next|api/salud|.*\\..*).*)'],
}
