import { cn } from '@/lib/utils'

/**
 * Confianza — ui-registry.md §1.3.
 *
 * Escala secuencial, no semáforo: la confianza es un continuo. Lleva barra
 * además del número, y el número siempre está escrito — nunca solo color.
 *
 * Por debajo de 45 el dato es insuficiente y fuerza SIN_EVIDENCIA, así que la
 * barra se pinta en gris en vez de en rojo: no es una alarma, es un hueco.
 */
function escala(porcentaje: number) {
  if (porcentaje >= 85) return { barra: 'bg-veredicto-coherente', texto: 'text-veredicto-coherente', lectura: 'alta' }
  if (porcentaje >= 65) return { barra: 'bg-veredicto-atencion', texto: 'text-veredicto-atencion', lectura: 'media' }
  if (porcentaje >= 45) return { barra: 'bg-origen-startrack', texto: 'text-origen-startrack', lectura: 'baja' }
  return { barra: 'bg-muted-foreground', texto: 'text-muted-foreground', lectura: 'insuficiente' }
}

export function BarraConfianza({
  porcentaje,
  className,
}: {
  porcentaje: number
  className?: string
}) {
  const acotado = Math.max(0, Math.min(100, porcentaje))
  const { barra, texto, lectura } = escala(acotado)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        role="meter"
        aria-valuenow={acotado}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Confianza ${lectura}`}
        className="h-1.5 w-12 overflow-hidden rounded-full bg-muted"
      >
        <div className={cn('h-full rounded-full', barra)} style={{ width: `${acotado}%` }} />
      </div>
      <span className={cn('font-mono text-xs font-bold', texto)}>{acotado}%</span>
    </div>
  )
}
