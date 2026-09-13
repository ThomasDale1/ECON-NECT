// Pantalla de acceso por rol — S-C3 (01 Parte D.5).
//
// Vive fuera del grupo `(nect)` a propósito: no lleva barra lateral ni barra
// superior, porque todavía no hay sesión y no habría nada que navegar. Las
// fuentes de la marca se declaran acá igual que en `app/(nect)/layout.tsx`
// (Next deduplica la descarga).
//
// Si ya hay sesión válida, no se muestra el formulario: se entra directo a la
// vista del rol.

import { redirect } from 'next/navigation'
import { Exo, Lato, Roboto_Condensed } from 'next/font/google'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { FormularioAcceso } from '@/components/acceso/formulario-acceso'
import { accesoConfigurado, sesionActual } from '@/lib/acceso/servidor'
import { VISTA_INICIAL } from '@/lib/acceso/verificar'

export const metadata: Metadata = {
  title: 'Acceso · ECON NECT',
  description: 'Entrada por rol al middleware visual de la operación de maquinaria.',
}

export const dynamic = 'force-dynamic'

const exo = Exo({ subsets: ['latin'], variable: '--font-exo', display: 'swap' })
const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-lato',
  display: 'swap',
})
const robotoCondensed = Roboto_Condensed({
  subsets: ['latin'],
  variable: '--font-roboto-condensed',
  display: 'swap',
})

export default async function PaginaAcceso({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string }>
}) {
  const { desde } = await searchParams

  // `headers()` alcanza para leer la cookie: se arma un Request mínimo para
  // reusar exactamente la misma verificación que usan las rutas de API.
  const cabeceras = await headers()
  const sesion = await sesionActual(new Request('http://local/acceso', { headers: cabeceras }))
  if (sesion) redirect(VISTA_INICIAL[sesion.rol])

  // Solo se aceptan rutas internas: un `?desde=https://otro-sitio` no redirige
  // fuera de la aplicación.
  const destino = desde && desde.startsWith('/') && !desde.startsWith('//') ? desde : null

  return (
    <main
      className={`${exo.variable} ${lato.variable} ${robotoCondensed.variable} flex min-h-screen items-center justify-center bg-background p-6 font-sans text-foreground antialiased`}
    >
      <FormularioAcceso desde={destino} hayClavesConfiguradas={accesoConfigurado()} />
    </main>
  )
}
