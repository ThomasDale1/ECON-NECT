'use client'

import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Linaje } from '@/lib/tipos/canonico'

/**
 * Ver origen — el linaje de un dato, en un clic.
 *
 * Es lo que vuelve auditable la afirmación de que no inventamos nada: plataforma,
 * endpoint, campo, **valor crudo tal como llegó** y hora de lectura. Cuando el
 * jurado sospeche de un número, se lo demostramos acá.
 */
const PLATAFORMA = { prisma: 'Prisma', startrack: 'Startrack' } as const

function comoTexto(valor: unknown): string {
  if (valor === null) return 'null'
  if (valor === undefined) return 'undefined'
  if (typeof valor === 'string') return valor === '' ? '(cadena vacía)' : valor
  if (typeof valor === 'object') return JSON.stringify(valor)
  return String(valor)
}

export function VerOrigen({ linaje, etiqueta }: { linaje: Linaje; etiqueta?: string }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Ver el origen de ${etiqueta ?? 'este dato'}`}
        className="inline-flex size-4 items-center justify-center rounded text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Info aria-hidden className="size-3" />
      </PopoverTrigger>
      <PopoverContent className="w-80 text-left">
        <dl className="flex flex-col gap-2 font-label text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Plataforma</dt>
            <dd className="font-bold">{PLATAFORMA[linaje.plataforma]}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-muted-foreground">Endpoint</dt>
            <dd className="truncate font-mono text-[11px]">{linaje.endpoint}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Campo</dt>
            <dd className="font-mono text-[11px]">{linaje.campo}</dd>
          </div>
          <div className="flex flex-col gap-1 border-t border-border pt-2">
            <dt className="text-muted-foreground">Valor crudo</dt>
            <dd className="break-all rounded bg-muted px-2 py-1 font-mono text-[11px]">
              {comoTexto(linaje.valorCrudo)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-border pt-2">
            <dt className="text-muted-foreground">Leído</dt>
            <dd className="font-mono text-[11px]">
              {new Date(linaje.leidoEn).toLocaleString('es-SV', { hour12: false })}
            </dd>
          </div>
        </dl>
      </PopoverContent>
    </Popover>
  )
}
