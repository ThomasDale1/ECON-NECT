import { Ban, CircleCheck, TriangleAlert } from 'lucide-react'
import type { RespuestaOptimizar } from '@/lib/optimizador/tipos'
import { cn } from '@/lib/utils'
import { NOMBRE_OBJETIVO } from './objetivos'

/**
 * Resumen de niveles — S-B4 §7. El estado del solver (óptimo / factible /
 * infactible) no es un veredicto de reconciliación: no usa la escala de
 * severidad de ui-registry §1.1 (verde/ámbar/rojo/violeta), que está reservada
 * a `Veredicto`. Acá va neutro, con ícono + texto para no perder el
 * significado sin color.
 */
const PRESENTACION_ESTADO: Record<
  RespuestaOptimizar['estado'],
  { icono: typeof CircleCheck; texto: string; clase: string }
> = {
  optimo: { icono: CircleCheck, texto: 'Óptimo probado', clase: 'text-foreground' },
  factible: { icono: TriangleAlert, texto: 'Factible — no se probó el óptimo en el tiempo límite', clase: 'text-foreground' },
  infactible: { icono: Ban, texto: 'Infactible', clase: 'text-foreground' },
}

export function ResumenNiveles({ respuesta }: { respuesta: RespuestaOptimizar }) {
  const { icono: Icono, texto, clase } = PRESENTACION_ESTADO[respuesta.estado]

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-card">
      <div className={cn('flex items-center gap-2 font-label text-sm font-bold', clase)}>
        <Icono aria-hidden className="size-4" />
        {texto}
      </div>

      {respuesta.motivoInfactible && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          {respuesta.motivoInfactible}
        </p>
      )}

      {respuesta.niveles.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {respuesta.niveles.map((nivel) => (
            <li
              key={nivel.objetivo}
              className="flex items-center justify-between gap-3 border-t border-border pt-1.5 text-sm first:border-t-0 first:pt-0"
            >
              <span>{NOMBRE_OBJETIVO[nivel.objetivo]}</span>
              <span className="flex items-center gap-2 font-mono text-xs">
                {nivel.valor} {nivel.unidad}
                {!nivel.probadoOptimo && (
                  <span className="text-muted-foreground">(no se probó el óptimo en el tiempo límite)</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
