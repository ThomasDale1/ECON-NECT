// POST /api/acceso — entrar con la clave de un rol (S-C3).
// GET  /api/acceso — qué rol soy, o 401.
// DELETE /api/acceso — salir.
//
// Ruta delgada: la verificación de la clave, la firma de la cookie y el mapa de
// vistas por rol viven en `lib/acceso/` (carril C). Acá solo se valida el
// cuerpo con Zod y se fija la cookie.
//
// La respuesta NUNCA devuelve una clave, ni dice cuáles roles existen pero
// están sin configurar de forma que sirva para adivinar: solo el rol que entró.

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { asegurarEntornoCargado } from '@/lib/conectores/entorno'
import { sesionActual } from '@/lib/acceso/servidor'
import {
  ETIQUETA_ROL,
  NOMBRE_COOKIE,
  VIGENCIA_MS,
  VISTA_INICIAL,
  firmarSesion,
  hayAccesoConfigurado,
  puedePropagar,
  verificarClave,
} from '@/lib/acceso/verificar'

export const dynamic = 'force-dynamic'

const EntrarSchema = z.object({
  clave: z.string().min(1, 'Escribí la clave de tu rol.').max(200),
})

export async function POST(request: NextRequest) {
  asegurarEntornoCargado()

  const cuerpo = await request.json().catch(() => null)
  const entrada = EntrarSchema.safeParse(cuerpo)
  if (!entrada.success) {
    return NextResponse.json(
      { error: 'peticion_invalida', mensaje: 'Escribí la clave de tu rol.' },
      { status: 400 },
    )
  }

  if (!hayAccesoConfigurado()) {
    return NextResponse.json(
      {
        error: 'acceso_no_configurado',
        mensaje:
          'No hay ninguna clave de rol configurada en el servidor. Definí NECT_CLAVE_PROYECTOS, NECT_CLAVE_LOGISTICA, NECT_CLAVE_MANTENIMIENTO, NECT_CLAVE_COSTOS, NECT_CLAVE_DIRECCION y NECT_CLAVE_ADMIN en .env.local.',
      },
      { status: 503 },
    )
  }

  const rol = verificarClave(entrada.data.clave)
  if (!rol) {
    // Mismo mensaje para clave equivocada de cualquier rol: no se confirma que
    // un rol exista ni se filtra cuál acertó.
    return NextResponse.json({ error: 'clave_invalida', mensaje: 'Clave incorrecta.' }, { status: 401 })
  }

  const cookie = await firmarSesion(rol)
  if (!cookie) {
    return NextResponse.json(
      { error: 'acceso_no_configurado', mensaje: 'No se pudo firmar la sesión.' },
      { status: 503 },
    )
  }

  const respuesta = NextResponse.json({
    rol,
    etiqueta: ETIQUETA_ROL[rol],
    vistaInicial: VISTA_INICIAL[rol],
    puedePropagar: puedePropagar(rol),
  })

  respuesta.cookies.set({
    name: NOMBRE_COOKIE,
    value: cookie,
    httpOnly: true,
    sameSite: 'lax',
    // En producción (Vercel) siempre HTTPS; en local `http://localhost` no
    // aceptaría una cookie `Secure`.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(VIGENCIA_MS / 1000),
  })

  return respuesta
}

export async function GET(request: NextRequest) {
  const sesion = await sesionActual(request)
  if (!sesion) {
    return NextResponse.json(
      { error: 'no_autorizado', mensaje: 'Sin sesión válida.' },
      { status: 401 },
    )
  }

  return NextResponse.json({
    rol: sesion.rol,
    etiqueta: ETIQUETA_ROL[sesion.rol],
    vistaInicial: VISTA_INICIAL[sesion.rol],
    puedePropagar: puedePropagar(sesion.rol),
    emitidaEn: new Date(sesion.emitidaEn).toISOString(),
    venceEn: new Date(sesion.emitidaEn + VIGENCIA_MS).toISOString(),
  })
}

export async function DELETE() {
  const respuesta = NextResponse.json({ salio: true })
  respuesta.cookies.set({ name: NOMBRE_COOKIE, value: '', path: '/', maxAge: 0 })
  return respuesta
}
