import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verificarAcceso } from '@/lib/acceso/verificar'

export function proxy(request: NextRequest) {
  if (!verificarAcceso(request)) {
    return new NextResponse(null, { status: 401 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|api/salud|.*\\..*).*)'],
}
