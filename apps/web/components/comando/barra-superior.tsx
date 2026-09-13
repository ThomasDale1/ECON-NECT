import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Barra superior — ui-registry.md §3.2.
 *
 * La píldora EN VIVO solo se pinta si la última lectura tiene menos de un TTL de
 * antigüedad. Si el dato está viejo dice DATO VIEJO en ámbar, con la hora de la
 * última lectura buena. Mentir acá rompe el principio de que todo dato muestra
 * su origen.
 */
export function BarraSuperior({
  titulo,
  ultimaLectura,
  datoViejo = false,
  usuario,
}: {
  titulo: string
  /** Hora de la última lectura buena, ya formateada. */
  ultimaLectura: string
  datoViejo?: boolean
  usuario: { nombre: string; iniciales: string }
}) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-9 py-4 shadow-header">
      <div className="flex items-center gap-3.5">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
            'font-label text-[10px] font-bold uppercase tracking-wide',
            datoViejo
              ? 'bg-veredicto-atencion-fondo text-veredicto-atencion'
              : 'bg-veredicto-riesgo-fondo text-veredicto-riesgo',
          )}
        >
          <span className="relative flex size-1.5">
            {!datoViejo && (
              <span
                aria-hidden
                className="absolute inline-flex size-full animate-ping rounded-full bg-veredicto-riesgo opacity-70"
              />
            )}
            <span
              aria-hidden
              className={cn(
                'relative inline-flex size-full rounded-full',
                datoViejo ? 'bg-veredicto-atencion' : 'bg-veredicto-riesgo',
              )}
            />
          </span>
          {datoViejo ? 'Dato viejo' : 'En vivo'}
        </span>
        <h1 className="font-heading text-xl font-bold tracking-tight text-primary">{titulo}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex w-[260px] items-center gap-2 rounded-lg border border-border bg-muted px-3.5 py-2">
          <Search aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="font-label text-[13px] text-muted-foreground">
            Buscar equipos, proyectos…
          </span>
        </div>
        <time className="font-mono text-xs text-muted-foreground">{ultimaLectura}</time>
        <div className="flex items-center gap-2">
          <span className="flex size-[30px] items-center justify-center rounded-full bg-primary font-label text-[11px] font-bold text-primary-foreground">
            {usuario.iniciales}
          </span>
          <span className="font-label text-[13px] font-semibold">{usuario.nombre}</span>
        </div>
      </div>
    </header>
  )
}
