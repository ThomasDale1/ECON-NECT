import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import type { Plataforma } from '@/lib/tipos/canonico'
import { cn } from '@/lib/utils'

/**
 * Badge de origen de plataforma — ui-registry.md §1.2.
 *
 * Sigue siendo un badge de **contorno**: la identidad de plataforma nunca usa
 * relleno de color. El mockup traía el badge de Startrack con relleno rojo, que
 * es el mismo rojo de `EN_RIESGO`, y en una tabla de excepciones eso hace que
 * cada fila parezca crítica.
 *
 * Startrack se dibuja con su logo de marca; Prisma, que no tiene logo entregado,
 * con el punto azul de 6px del registro.
 *
 * Con `href` el badge se vuelve un enlace al registro del equipo en la
 * plataforma de origen, para poder saltar del veredicto al sistema que lo
 * reportó. El nombre accesible dice a dónde lleva, no solo "Startrack".
 */
const PRESENTACION: Record<Plataforma, { etiqueta: string; contexto: string; punto: string }> = {
  prisma: { etiqueta: 'Prisma', contexto: 'esperado', punto: 'bg-origen-prisma' },
  startrack: { etiqueta: 'Startrack', contexto: 'observado', punto: 'bg-origen-startrack' },
}

type Props = {
  plataforma: Plataforma
  /** Solo el nombre, sin el paréntesis de contexto. Para espacios estrechos. */
  corto?: boolean
  /** Enlace al registro del equipo en la plataforma. Sin esto el badge no navega. */
  href?: string | null
  /** Qué equipo abre el enlace, para el nombre accesible. */
  equipo?: string
  className?: string
}

export function BadgeOrigen({ plataforma, corto = false, href, equipo, className }: Props) {
  const { etiqueta, contexto, punto } = PRESENTACION[plataforma]

  const contenido = (
    <>
      {plataforma === 'startrack' ? (
        // El logo es la etiqueta: el `alt` lleva el nombre de la plataforma.
        <Image
          src="/startrack.png"
          alt={etiqueta}
          width={64}
          height={13}
          className="h-[13px] w-auto shrink-0"
        />
      ) : (
        <>
          <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', punto)} />
          {etiqueta}
        </>
      )}
      {!corto && <span className="text-muted-foreground">({contexto})</span>}
      {href && <ExternalLink aria-hidden className="size-2.5 shrink-0 opacity-60" />}
    </>
  )

  const clases = cn(
    'inline-flex items-center gap-1.5 rounded-full border border-border bg-card',
    'py-1 pl-2 pr-2.5 font-label text-[10px] font-semibold text-muted-foreground',
    className,
  )

  if (!href) {
    return <span className={clases}>{contenido}</span>
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={
        equipo ? `Abrir ${equipo} en ${etiqueta} (se abre en otra pestaña)` : `Abrir en ${etiqueta}`
      }
      className={cn(
        clases,
        'transition-colors hover:border-origen-startrack/40 hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      )}
    >
      {contenido}
    </a>
  )
}
