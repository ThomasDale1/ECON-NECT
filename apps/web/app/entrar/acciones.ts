'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  NOMBRE_COOKIE,
  VIGENCIA_MS,
  VISTA_INICIAL,
  firmarSesion,
  hayAccesoConfigurado,
  verificarClave,
} from '@/lib/acceso/verificar'
import { asegurarEntornoCargado } from '@/lib/conectores/entorno'

function destinoSeguro(siguiente: string | null | undefined, porDefecto: string): string {
  if (!siguiente || !siguiente.startsWith('/') || siguiente.startsWith('//')) {
    return porDefecto
  }
  return siguiente
}

export type EstadoEntrar = { error: string | null }

export async function entrarConClave(
  _prev: EstadoEntrar,
  formData: FormData,
): Promise<EstadoEntrar> {
  // Next solo lee el `.env.local` de su Root Directory; las claves viven en el
  // de la raíz del repositorio (AGENTS.md §1.4).
  asegurarEntornoCargado()

  const clave = String(formData.get('clave') ?? '')
  const siguiente = String(formData.get('siguiente') ?? '')

  if (!hayAccesoConfigurado()) {
    return { error: 'El acceso no está configurado. Faltan las claves de rol en el servidor.' }
  }

  const rol = verificarClave(clave)
  if (!rol) {
    return { error: 'Clave incorrecta.' }
  }

  // La cookie lleva el rol firmado con HMAC, nunca la clave. La firma se
  // vuelve a verificar en cada ruta de API: el proxy no es la autorización.
  const valor = await firmarSesion(rol)
  if (!valor) {
    return { error: 'El servidor no pudo firmar la sesión. Revisá las claves de rol.' }
  }

  const jar = await cookies()
  jar.set(NOMBRE_COOKIE, valor, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(VIGENCIA_MS / 1000),
  })

  redirect(destinoSeguro(siguiente, VISTA_INICIAL[rol]))
}

export async function cerrarSesion(): Promise<void> {
  const jar = await cookies()
  jar.delete(NOMBRE_COOKIE)
  redirect('/entrar')
}
