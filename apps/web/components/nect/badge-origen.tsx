'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check, ExternalLink } from 'lucide-react'
import type { Plataforma } from '@/lib/tipos/canonico'
import { cn } from '@/lib/utils'

/**
 * Badge de origen de plataforma — ui-registry.md §1.2.
 *
 * Sigue siendo un badge de **contorno**: la identidad de plataforma nunca usa
 * relleno de color. El mockup traía el de Startrack con relleno rojo, que es el
 * mismo rojo de `EN_RIESGO`, y en una tabla de excepciones eso hace que cada
 * fila parezca crítica.
 *
 * **Por qué copia el código en vez de enlazar al vehículo:** la pantalla de
 * rastreo de Startrack (`members-new.php`) no guarda estado en la URL —
 * seleccionar una unidad no la cambia— y su bundle solo lee `jobStatus` como
 * parámetro. No existe deep link por vehículo. Así que al pulsar se copia el
 * código y se abre el mapa: el operador pega en el filtro de la grilla y cae en
 * su unidad, sin depender de ninguna extensión del navegador.
 */
const PRESENTACION: Record<Plataforma, { etiqueta: string; contexto: string; punto: string }> = {
  prisma: { etiqueta: 'Prisma', contexto: 'esperado', punto: 'bg-origen-prisma' },
  startrack: { etiqueta: 'Startrack', contexto: 'observado', punto: 'bg-origen-startrack' },
}

type Props = {
  plataforma: Plataforma
  /** Solo el nombre, sin el paréntesis de contexto. Para espacios estrechos. */
  corto?: boolean
  /** Enlace a la plataforma. Sin esto el badge no navega. */
  href?: string | null
  /** Código del equipo. Se copia al portapapeles para pegarlo en el filtro. */
  equipo?: string
  className?: string
}

export function BadgeOrigen({ plataforma, corto = false, href, equipo, className }: Props) {
  const { etiqueta, contexto, punto } = PRESENTACION[plataforma]
  const [copiado, setCopiado] = useState(false)

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
      {href &&
        (copiado ? (
          <Check aria-hidden className="size-2.5 shrink-0 text-veredicto-coherente" />
        ) : (
          <ExternalLink aria-hidden className="size-2.5 shrink-0 opacity-60" />
        ))}
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

  async function copiarCodigo() {
    if (!equipo) return
    try {
      await navigator.clipboard.writeText(equipo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      // Sin permiso de portapapeles el enlace sigue abriendo el mapa; no se
      // interrumpe la navegación por no haber podido copiar.
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={copiarCodigo}
      aria-label={
        equipo
          ? `Abrir el mapa de Startrack y copiar el código ${equipo} para pegarlo en el filtro (se abre en otra pestaña)`
          : `Abrir ${etiqueta} (se abre en otra pestaña)`
      }
      title={
        equipo
          ? `Copia ${equipo} y abre el mapa de Startrack. Pegá el código en el filtro de la grilla.`
          : `Abrir ${etiqueta}`
      }
      className={cn(
        clases,
        'transition-colors hover:border-origen-startrack/40 hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      )}
    >
      {contenido}
      {copiado && <span className="sr-only">Código {equipo} copiado</span>}
    </a>
  )
}
