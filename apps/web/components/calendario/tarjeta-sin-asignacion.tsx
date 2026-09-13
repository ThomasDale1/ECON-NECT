'use client'

import type { CSSProperties, ReactNode } from 'react'
import { ArrowRightLeft, Ban, Lightbulb } from 'lucide-react'
import type { RespuestaOptimizar, SolicitudSinAsignacion } from '@/lib/optimizador/tipos'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { VerOrigen } from '@/components/nect/ver-origen'
import { cn } from '@/lib/utils'

/**
 * Card flotante de una solicitud "sin asignación posible" — se abre al pasar
 * el cursor (o con foco/clic) sobre la barra gris de la semana o del día.
 *
 * Versión corta (feedback directo, 13 sep. 2026: "solo la información más
 * importante"): qué solicitud es, el motivo del servidor, el embudo de
 * restricciones duras en una línea y qué haría falta. Los conteos son los de
 * `candidatas` (lib/optimizador/adaptador.ts); nada se recalcula acá.
 */

type IdEtapa = 'clase' | 'opera' | 'ventana' | 'operador'

type Etapa = { id: IdEtapa; rotulo: string; conteo: number }

function etapasDe(s: SolicitudSinAsignacion): Etapa[] {
  const { candidatas } = s
  return [
    { id: 'clase', rotulo: 'de la clase', conteo: candidatas.claseCompatible },
    { id: 'opera', rotulo: 'operan', conteo: candidatas.operables },
    { id: 'ventana', rotulo: 'libres', conteo: candidatas.libresEnVentana },
    { id: 'operador', rotulo: 'con operador', conteo: candidatas.conOperadorLibre },
  ]
}

const ACCION_POR_BLOQUEO: Record<IdEtapa, (s: SolicitudSinAsignacion) => string> = {
  clase: (s) =>
    `Conseguir (rentar o trasladar) una máquina de clase ${s.solicitud.clase.valor ?? 'la pedida'}, o confirmar con Proyectos el tipo pedido.`,
  opera: () => 'Que Mantenimiento cierre la falla o levante el paro de alguna máquina de la clase, en Prisma.',
  ventana: () => 'Mover las fechas de la solicitud, o liberar en Prisma una máquina operable ocupada en esas fechas.',
  operador: () => 'Activar un operador en Prisma, o liberar uno asociado a una máquina ocupada en esas fechas.',
}

const ACCION_POR_PILA =
  'Mover las fechas, o subir en la pila el criterio que la favorece y re-optimizar.'

function EmbudoEnLinea({ etapas, bloqueo }: { etapas: Etapa[]; bloqueo: IdEtapa | null }) {
  const indiceBloqueo = bloqueo === null ? -1 : etapas.findIndex((e) => e.id === bloqueo)
  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs">
      <span className="text-muted-foreground">Candidatas:</span>
      {etapas.map((etapa, i) => {
        const sinEvaluar = indiceBloqueo !== -1 && i > indiceBloqueo
        return (
          <span key={etapa.id} className={cn('flex items-baseline gap-1.5', sinEvaluar && 'opacity-50')}>
            {i > 0 && <span aria-hidden className="text-muted-foreground">→</span>}
            <span className={cn(i === indiceBloqueo && 'font-semibold underline decoration-foreground/40 underline-offset-2')}>
              <span className="font-mono tabular-nums">{sinEvaluar ? '—' : etapa.conteo}</span> {etapa.rotulo}
            </span>
          </span>
        )
      })}
    </p>
  )
}

export function TarjetaSinAsignacion({
  sinAsignacion: s,
  className,
  style,
  children,
}: {
  sinAsignacion: SolicitudSinAsignacion
  /** Se conserva por compatibilidad con los llamadores; la versión corta no la usa. */
  respuesta?: RespuestaOptimizar
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  const { solicitud } = s
  const clase = solicitud.clase.valor ?? 'Sin registro'
  const proyecto = solicitud.codigoProyecto ?? solicitud.proyecto.valor ?? 'Sin registro'
  const etapas = etapasDe(s)
  const bloqueo = etapas.find((e) => e.conteo === 0)?.id ?? null
  const accion = bloqueo !== null ? ACCION_POR_BLOQUEO[bloqueo](s) : ACCION_POR_PILA

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        closeDelay={150}
        aria-label={`Sin asignación posible: ${clase} · ${proyecto} · ${s.motivo}. Ver explicación.`}
        className={cn(
          'cursor-help text-left outline-none focus-visible:ring-2 focus-visible:ring-ring data-popup-open:border-foreground/40',
          className,
        )}
        style={style}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="max-h-(--available-height) w-[24rem] max-w-[calc(100vw-2rem)] gap-0 overflow-y-auto p-0"
      >
        <header className="flex flex-col gap-1.5 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-label text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <Ban aria-hidden className="size-3.5" />
              Sin asignación posible
            </span>
            <VerOrigen
              compacto
              linaje={[
                solicitud.estado.linaje,
                solicitud.clase.linaje,
                solicitud.proyecto.linaje,
                solicitud.inicio.linaje,
                solicitud.fin.linaje,
              ]}
            />
          </div>
          <p className="text-sm font-semibold">
            {clase} · {proyecto}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            {solicitud.estado.valor && (
              <Badge variant="outline" className="text-[10px]">
                {solicitud.estado.valor}
              </Badge>
            )}
            <span className="font-mono">
              {solicitud.inicioEfectivo} → {solicitud.fin.valor ?? 'Sin registro'}
            </span>
          </div>
          <p className="rounded-lg border border-dashed border-border bg-muted px-2.5 py-1.5 text-xs">{s.motivo}</p>
          {s.reemplazaConfirmada && (
            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <ArrowRightLeft aria-hidden className="mt-0.5 size-3 shrink-0" />
              <span>
                Estaba confirmada con {s.reemplazaConfirmada.maquina.codigoActivo.valor ?? 'una máquina sin código'}, que ya
                no opera. La asignación en Prisma no se modifica.
              </span>
            </p>
          )}
          <EmbudoEnLinea etapas={etapas} bloqueo={bloqueo} />
        </header>

        <section className="flex flex-col gap-1 border-t border-border px-4 py-3">
          <h4 className="flex items-center gap-1.5 font-label text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <Lightbulb aria-hidden className="size-3" />
            Qué haría falta
          </h4>
          <p className="text-xs leading-relaxed">{accion}</p>
        </section>
      </PopoverContent>
    </Popover>
  )
}
