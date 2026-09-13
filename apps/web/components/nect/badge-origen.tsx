import type { Plataforma } from '@/lib/tipos/canonico'
import { cn } from '@/lib/utils'

/**
 * Badge de origen de plataforma — ui-registry.md §1.2.
 *
 * Contorno + punto de marca de 6px. Nunca relleno de color: el mockup traía el
 * badge de Startrack con relleno rojo, que es el mismo rojo de EN_RIESGO, y en
 * una tabla de excepciones eso hace que cada fila parezca crítica.
 *
 * El punto de Startrack es naranja, no rojo: se distingue de Prisma incluso en
 * daltonismo rojo-verde y no le roba el canal a la severidad.
 */
const PRESENTACION: Record<Plataforma, { etiqueta: string; punto: string }> = {
  prisma: { etiqueta: 'Prisma (esperado)', punto: 'bg-origen-prisma' },
  startrack: { etiqueta: 'Startrack (observado)', punto: 'bg-origen-startrack' },
}

export function BadgeOrigen({
  plataforma,
  corto = false,
  className,
}: {
  plataforma: Plataforma
  /** Solo el nombre, sin el paréntesis. Para espacios estrechos. */
  corto?: boolean
  className?: string
}) {
  const { etiqueta, punto } = PRESENTACION[plataforma]
  const texto = corto ? etiqueta.split(' (')[0] : etiqueta

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-card',
        'py-1 pl-2 pr-2.5 font-label text-[10px] font-semibold text-muted-foreground',
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', punto)} />
      {texto}
    </span>
  )
}
