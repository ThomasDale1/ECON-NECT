'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Tarjeta de situación — ui-registry.md §3.3.
 *
 * Dos variantes. En la de alerta el color entra por el **contenido interno**, no
 * por el borde del panel: el card exterior sigue blanco. Si el panel entero se
 * tiñera de rojo, la severidad dejaría de leerse a nivel de fila.
 */
export function PanelSituacion({
  titulo,
  conteo,
  iconoConteo,
  tono = 'neutro',
  total,
  children,
  indice,
  onIndice,
}: {
  titulo: string
  conteo: string
  iconoConteo?: React.ReactNode
  tono?: 'neutro' | 'alerta'
  total: number
  children: React.ReactNode
  indice: number
  onIndice: (indice: number) => void
}) {
  const esAlerta = tono === 'alerta'

  return (
    <section className="flex flex-1 flex-col gap-4 rounded-xl bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {esAlerta ? (
            <span className="relative flex size-3 shrink-0">
              <span
                aria-hidden
                className="absolute inline-flex size-full animate-ping rounded-full bg-veredicto-riesgo opacity-60"
              />
              <span aria-hidden className="relative inline-flex size-full rounded-full bg-veredicto-riesgo" />
            </span>
          ) : null}
          <h2 className="font-heading text-[15px] font-bold tracking-tight text-primary">{titulo}</h2>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-label text-[11px] font-bold',
              esAlerta
                ? 'bg-veredicto-riesgo-fondo text-veredicto-riesgo'
                : 'bg-origen-prisma/10 text-origen-prisma',
            )}
          >
            {iconoConteo}
            {conteo}
          </span>
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">
          {indice + 1} / {total}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {children}
        <ControlesCarrusel
          indice={indice}
          total={total}
          onIndice={onIndice}
          tono={tono}
          titulo={titulo}
        />
      </div>
    </section>
  )
}

function ControlesCarrusel({
  indice,
  total,
  onIndice,
  tono,
  titulo,
}: {
  indice: number
  total: number
  onIndice: (indice: number) => void
  tono: 'neutro' | 'alerta'
  titulo: string
}) {
  const acento = tono === 'alerta' ? 'text-veredicto-riesgo' : 'text-origen-prisma'
  const puntoActivo = tono === 'alerta' ? 'bg-veredicto-riesgo' : 'bg-origen-prisma'

  return (
    <div className="flex items-center justify-between">
      <BotonCarrusel
        etiqueta={`Anterior en ${titulo}`}
        onClick={() => onIndice((indice - 1 + total) % total)}
        className="text-muted-foreground"
      >
        <ChevronLeft aria-hidden className="size-4" />
      </BotonCarrusel>

      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ir al elemento ${i + 1} de ${titulo}`}
            aria-current={i === indice ? 'true' : undefined}
            onClick={() => onIndice(i)}
            className={cn(
              'size-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              i === indice ? puntoActivo : 'bg-border',
            )}
          />
        ))}
      </div>

      <BotonCarrusel
        etiqueta={`Siguiente en ${titulo}`}
        onClick={() => onIndice((indice + 1) % total)}
        className={acento}
      >
        <ChevronRight aria-hidden className="size-4" />
      </BotonCarrusel>
    </div>
  )
}

function BotonCarrusel({
  etiqueta,
  onClick,
  className,
  children,
}: {
  etiqueta: string
  onClick: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      onClick={onClick}
      className={cn(
        'flex size-8 items-center justify-center rounded-full border border-border bg-muted',
        'transition-colors hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Hook mínimo para que cada panel lleve su propio índice de carrusel. */
export function useCarrusel(total: number) {
  const [indice, setIndice] = useState(0)
  return { indice: Math.min(indice, Math.max(total - 1, 0)), setIndice }
}
