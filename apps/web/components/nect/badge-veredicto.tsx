import { CircleCheck, CircleHelp, OctagonAlert, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Veredicto } from '@/lib/tipos/canonico'
import { cn } from '@/lib/utils'

/**
 * Badge de veredicto — ui-registry.md §1.1.
 *
 * Siempre ícono + texto, nunca solo color: ningún significado se comunica solo
 * por color (§5, accesibilidad y daltonismo).
 *
 * `SIN_EVIDENCIA` va en violeta, nunca en rojo. El rojo está reservado para
 * `EN_RIESGO`, que significa que hay evidencia de riesgo. Pintar la
 * incertidumbre de rojo convierte "no sé" en "alarma", que es justo el error
 * que el producto existe para evitar.
 */
const PRESENTACION: Record<Veredicto, { etiqueta: string; icono: LucideIcon; clases: string }> = {
  COHERENTE: {
    etiqueta: 'Coherente',
    icono: CircleCheck,
    clases: 'bg-veredicto-coherente-fondo text-veredicto-coherente',
  },
  ATENCION: {
    etiqueta: 'Atención',
    icono: TriangleAlert,
    clases: 'bg-veredicto-atencion-fondo text-veredicto-atencion',
  },
  EN_RIESGO: {
    etiqueta: 'En riesgo',
    icono: OctagonAlert,
    clases: 'bg-veredicto-riesgo-fondo text-veredicto-riesgo',
  },
  SIN_EVIDENCIA: {
    etiqueta: 'Sin evidencia',
    icono: CircleHelp,
    clases: 'bg-veredicto-sin-evidencia-fondo text-veredicto-sin-evidencia',
  },
}

export function BadgeVeredicto({
  veredicto,
  className,
}: {
  veredicto: Veredicto
  className?: string
}) {
  const { etiqueta, icono: Icono, clases } = PRESENTACION[veredicto]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full py-1 pl-2 pr-2.5',
        'font-label text-[10px] font-bold uppercase tracking-wide',
        clases,
        className,
      )}
    >
      <Icono aria-hidden className="size-3 shrink-0" />
      {etiqueta}
    </span>
  )
}
