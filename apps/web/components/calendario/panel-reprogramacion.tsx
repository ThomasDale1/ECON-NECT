'use client'

import { AlertTriangle, CalendarClock, RefreshCw, X } from 'lucide-react'
import type { RespuestaReprogramacion } from '@/lib/optimizador/tipos'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Panel de la vista previa de reprogramación. Solo muestra lo que calcula
 * `POST /api/optimizar/reprogramacion` (lib/optimizador/reprogramar.ts): las
 * fechas nuevas, el atraso, la máquina y el operador, y las solicitudes que no
 * se pueden reprogramar con su motivo. No guarda nada, ni en Prisma ni en el
 * navegador. Nunca muestra nombres de operador: solo códigos.
 */
export const TEXTO_VISTA_PREVIA = 'Vista previa — no se guarda nada en Prisma ni Startrack'

export function PanelReprogramacion({
  datos,
  cargando,
  error,
  hora,
  onRecalcular,
  onCerrar,
}: {
  datos: RespuestaReprogramacion | null
  cargando: boolean
  error: string | null
  hora: string | null
  onRecalcular: () => void
  onCerrar: () => void
}) {
  const reprogramadas = datos?.reprogramadas ?? []
  const noReprogramables = datos?.noReprogramables ?? []
  const total = reprogramadas.length + noReprogramables.length
  const atrasoTotal = reprogramadas.reduce((suma, r) => suma + r.atrasoDias, 0)
  const atrasoMaximo = reprogramadas.reduce((max, r) => Math.max(max, r.atrasoDias), 0)

  return (
    <section
      aria-label="Vista previa de reprogramación"
      className="flex flex-col gap-4 rounded-xl border border-dashed border-foreground/30 bg-card p-5 shadow-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
            <CalendarClock aria-hidden className="size-4" />
            Reprogramación propuesta
            <Badge variant="outline" className="text-[10px]">
              Vista previa
            </Badge>
          </h2>
          <p className="text-xs text-muted-foreground">
            {TEXTO_VISTA_PREVIA}. {hora ? `Calculada ${hora}. ` : ''}La actualización automática queda en pausa
            mientras esté abierta.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={onRecalcular} disabled={cargando}>
            <RefreshCw aria-hidden className={cargando ? 'animate-spin' : undefined} />
            Recalcular
          </Button>
          <Button variant="ghost" size="sm" onClick={onCerrar}>
            <X aria-hidden />
            Cerrar vista previa
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden />
          <AlertTitle>No se pudo calcular la reprogramación</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {cargando && datos === null && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-72" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {datos && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Resumen etiqueta="Entran en otras fechas" valor={`${reprogramadas.length} de ${total}`} />
            <Resumen etiqueta="Atraso total" valor={`${atrasoTotal} día(s)`} />
            <Resumen etiqueta="Atraso más largo" valor={reprogramadas.length > 0 ? `${atrasoMaximo} día(s)` : '—'} />
          </div>

          {reprogramadas.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <caption className="sr-only">Solicitudes reprogramadas en la vista previa</caption>
                <thead className="bg-muted/50 text-left font-label text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2">Proyecto</th>
                    <th scope="col" className="px-3 py-2">Clase</th>
                    <th scope="col" className="px-3 py-2">Pedida</th>
                    <th scope="col" className="px-3 py-2">Propuesta</th>
                    <th scope="col" className="px-3 py-2 text-right">Días</th>
                    <th scope="col" className="px-3 py-2 text-right">Atraso</th>
                    <th scope="col" className="px-3 py-2">Máquina · operador</th>
                  </tr>
                </thead>
                <tbody>
                  {reprogramadas.map((r) => (
                    <tr key={r.solicitudId} className="border-t border-border">
                      <th scope="row" className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                        {r.codigoProyecto ?? 'Sin registro'}
                        {r.eraAprobada && (
                          <span className="block font-label text-[10px] font-normal text-muted-foreground">
                            APROBADA con máquina rota
                          </span>
                        )}
                      </th>
                      <td className="px-3 py-2 whitespace-nowrap">{r.clase ?? 'Sin registro'}</td>
                      <td className="px-3 py-2 font-mono text-xs whitespace-nowrap text-muted-foreground line-through decoration-muted-foreground/50">
                        {r.original.inicio} → {r.original.fin}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs font-semibold whitespace-nowrap">
                        {r.propuesta.inicio} → {r.propuesta.fin}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">{r.dias}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs font-semibold tabular-nums">+{r.atrasoDias} d</td>
                      <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                        {r.maquina.codigoActivo ?? 'Sin registro'} · {r.operador.codTrabajador ?? 'Sin registro'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {noReprogramables.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <h3 className="font-label text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                No se pueden reprogramar ({noReprogramables.length})
              </h3>
              <ul className="flex flex-col gap-1">
                {noReprogramables.map((n) => (
                  <li key={n.solicitudId} className="text-sm">
                    <span className="font-semibold">{n.codigoProyecto ?? 'Sin registro'}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      · {n.clase ?? 'Sin registro'} — {n.motivo}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Cómo se calcula: en orden de llegada, cada solicitud sin asignación se prueba desde el día siguiente a su
            inicio, un día a la vez, con la misma cantidad de días que pidió. Se queda con la primera ventana que pasa
            las mismas restricciones duras del plan y en la que el solver le encuentra máquina y operador sin quitarle
            la asignación a ninguna solicitud ya cubierta (esas no cambian de máquina, operador ni fechas). Entre las
            opciones de ese día elige con tu pila de prioridades. Mover las fechas en Prisma es decisión de una persona.
          </p>
        </>
      )}
    </section>
  )
}

function Resumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <p className="font-label text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{etiqueta}</p>
      <p className="font-heading text-lg font-semibold tabular-nums">{valor}</p>
    </div>
  )
}
