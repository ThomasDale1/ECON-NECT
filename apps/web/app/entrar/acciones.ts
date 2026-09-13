'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_ROL, hayClavesConfiguradas, rolParaClave } from '@/lib/acceso/verificar'

function destinoSeguro(siguiente: string | null | undefined): string {
  if (!siguiente || !siguiente.startsWith('/') || siguiente.startsWith('//')) {
    return '/command-center'
  }
  return siguiente
}

export type EstadoEntrar = { error: string | null }

export async function entrarConClave(
  _prev: EstadoEntrar,
  formData: FormData,
): Promise<EstadoEntrar> {
  const clave = String(formData.get('clave') ?? '')
  const siguiente = String(formData.get('siguiente') ?? '')

  if (!hayClavesConfiguradas()) {
    return { error: 'El acceso no está configurado. Faltan las claves de rol en el servidor.' }
  }

  const rol = rolParaClave(clave)
  if (!rol) {
    return { error: 'Clave incorrecta.' }
  }

  const jar = await cookies()
  jar.set(COOKIE_ROL, rol, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })

  redirect(destinoSeguro(siguiente))
}

export async function cerrarSesion(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE_ROL)
  redirect('/entrar')
}
