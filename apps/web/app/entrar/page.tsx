import type { Metadata } from 'next'
import Image from 'next/image'
import { FormularioEntrar } from './formulario'

export const metadata: Metadata = {
  title: 'Entrar · ECON NECT',
}

/**
 * Pantalla de acceso — fuera del grupo `(nect)` para no montar barra lateral
 * ni O.D.I.N. El logo oficial vive en `/econ-nect-logo.png`.
 */
export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ siguiente?: string }>
}) {
  const { siguiente } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-xl border border-border bg-card p-8 shadow-card">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/econ-nect-logo.png"
            alt="ECON NECT"
            width={220}
            height={64}
            priority
            className="h-14 w-auto object-contain"
          />
        </div>

        <FormularioEntrar siguiente={siguiente ?? '/command-center'} />
      </div>
    </main>
  )
}
