'use client'

import { NotificadorMantenimiento } from '@/components/mantenimiento/notificador-mantenimiento'
import { BadgeMantenimientoPreventivo } from '@/components/mantenimiento/badge-mantenimiento'
import { cn } from '@/lib/utils'

/**
 * Barra superior.
 *
 * Deliberadamente mínima: la hora de la última lectura y quién está viendo. El
 * título de pantalla lo da la barra lateral, que ya marca dónde estás, y el
 * buscador vive dentro de cada pantalla que lo necesita.
 *
 * El título sigue existiendo como `h1` para lectores de pantalla: quitarlo del
 * todo dejaría la página sin encabezado que anunciar.
 *
 * **La píldora solo aparece cuando hay algo que advertir.** Si la última lectura
 * pasó el TTL dice DATO VIEJO en ámbar; si está fresca no se pinta nada, porque
 * un cartel permanente de "EN VIVO" es ruido y, el día que el dato esté viejo,
 * nadie notaría el cambio (ui-registry §3.2 y §4).
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
    <header className="flex items-center justify-end gap-4 border-b border-border bg-card px-9 py-3 shadow-header">
      <h1 className="sr-only">{titulo}</h1>

      {datoViejo && (
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1',
            'bg-veredicto-atencion-fondo font-label text-[10px] font-bold uppercase tracking-wide text-veredicto-atencion',
          )}
        >
          <span aria-hidden className="size-1.5 rounded-full bg-veredicto-atencion" />
          Dato viejo
        </span>
      )}

      <div className="flex shrink-0 items-center gap-2">
        <BadgeMantenimientoPreventivo />
        <NotificadorMantenimiento />
      </div>

      <time className="shrink-0 font-mono text-xs text-muted-foreground">{ultimaLectura}</time>

      <div className="flex shrink-0 items-center gap-2">
        <span className="flex size-[30px] items-center justify-center rounded-full bg-primary font-label text-[11px] font-bold text-primary-foreground">
          {usuario.iniciales}
        </span>
        <span className="whitespace-nowrap font-label text-[13px] font-semibold">
          {usuario.nombre}
        </span>
      </div>
    </header>
  )
}
