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
 * manda solo lo que cambió, así que el estado de cliente —la posición de los
 * carruseles— sobrevive.
 *
 * Mientras la lectura corre el botón queda deshabilitado y el ícono gira, para
 * que no se dispare dos veces contra un sandbox que comparten 13 equipos.
 */
export function BotonActualizar({
  plataforma,
  nombre,
  onActualizar,
}: {
  plataforma: Plataforma
  nombre: string
  /** Server Action. Se recibe por prop para que este componente no importe servidor. */
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
