'use client'

import { useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import type { Plataforma } from '@/lib/tipos/canonico'
import { cn } from '@/lib/utils'

/**
 * Relectura manual de una plataforma.
 *
 * No recarga la página: llama a una Server Action que invalida el caché de esa
 * fuente y revalida la ruta. Next vuelve a renderizar el árbol de servidor y
 * manda solo lo que cambió, así que el estado de cliente sobrevive.
 */
export function BotonActualizar({
  plataforma,
  nombre,
  onActualizar,
}: {
  plataforma: Plataforma
  nombre: string
  onActualizar: (plataforma: Plataforma) => Promise<void>
}) {
  const [pendiente, iniciar] = useTransition()

  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() => iniciar(() => onActualizar(plataforma))}
      aria-label={pendiente ? `Leyendo ${nombre}…` : `Volver a leer ${nombre}`}
      title={`Volver a leer ${nombre}`}
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-md text-marina-media',
        'transition-colors hover:bg-white/10 hover:text-white',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-clara',
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
    >
      <RefreshCw aria-hidden className={cn('size-3', pendiente && 'animate-spin')} />
    </button>
  )
}

/** Relee Prisma y Startrack en la misma acción. */
export function BotonActualizarAmbas({
  onActualizar,
  contraida = false,
}: {
  onActualizar: () => Promise<void>
  contraida?: boolean
}) {
  const [pendiente, iniciar] = useTransition()

  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() => iniciar(() => onActualizar())}
      aria-label={pendiente ? 'Leyendo Prisma y Startrack…' : 'Releer Prisma y Startrack'}
      title="Releer Prisma y Startrack"
      className={cn(
        'flex items-center justify-center gap-2 rounded-lg border border-marina-borde bg-marina-clara',
        'py-2 font-label text-xs font-bold text-white transition-colors hover:bg-white/10',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-clara',
        'disabled:cursor-not-allowed disabled:opacity-50',
        contraida ? 'px-0' : 'px-3.5',
      )}
    >
      <RefreshCw aria-hidden className={cn('size-3.5', pendiente && 'animate-spin')} />
      {!contraida && (pendiente ? 'Leyendo ambas…' : 'Releer ambas')}
    </button>
  )
}
