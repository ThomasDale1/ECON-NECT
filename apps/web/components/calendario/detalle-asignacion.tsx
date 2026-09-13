import { CloudRain } from 'lucide-react'
import { SOFT_CONSTRAINTS, type AsignacionPropuesta, type ValorObjetivo } from '@/lib/optimizador/tipos'
import type { Linaje } from '@/lib/tipos/canonico'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { VerOrigen } from '@/components/nect/ver-origen'
import { NOMBRE_OBJETIVO } from './objetivos'

/**
 * Detalle de una asignación propuesta — S-B4 §6. Solo muestra: nada de lo que
 * aparece acá se recalcula, viene tal cual del contrato `AsignacionPropuesta`.
 */
function celdaObjetivo(valor: ValorObjetivo) {
  if (valor.valor === null) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-muted-foreground">Sin registro</span>
        {valor.motivo && <span className="text-[11px] text-muted-foreground">{valor.motivo}</span>}
      </div>
    )
  }
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="font-mono">
        {valor.valor} {valor.unidad}
      </span>
      {valor.peorCasoAplicado && (
        <span className="inline-flex items-center gap-1">
          <Badge variant="outline" className="text-[10px]">
            peor caso declarado
          </Badge>
        </span>
      )}
      {valor.peorCasoAplicado && valor.motivo && (
        <span className="text-[11px] text-muted-foreground">{valor.motivo}</span>
      )}
    </div>
  )
}

function recolectarLinaje(asignacion: AsignacionPropuesta): Linaje[] {
  const linaje: Linaje[] = [
    asignacion.solicitud.estado.linaje,
    asignacion.solicitud.clase.linaje,
    asignacion.solicitud.proyecto.linaje,
    asignacion.solicitud.inicio.linaje,
    asignacion.solicitud.fin.linaje,
    asignacion.maquina.codigoActivo.linaje,
    asignacion.maquina.clase.linaje,
    asignacion.operador.codTrabajador.linaje,
  ]
  for (const id of SOFT_CONSTRAINTS) {
    linaje.push(...asignacion.objetivos[id].linaje)
  }
  if (asignacion.manual) {
    linaje.push(asignacion.manual.maquina.codigoActivo.linaje)
    for (const id of SOFT_CONSTRAINTS) {
      linaje.push(...asignacion.manual.objetivos[id].linaje)
    }
  }
  return linaje
}

export function DetalleAsignacion({
  asignacion,
  abierto,
  onOpenChange,
}: {
  asignacion: AsignacionPropuesta | null
  abierto: boolean
  onOpenChange: (abierto: boolean) => void
}) {
  return (
    <Sheet open={abierto} onOpenChange={(open) => onOpenChange(open)}>
      <SheetContent className="overflow-y-auto p-0">
        {asignacion && (
          <>
            <SheetHeader>
              <SheetTitle>
                {asignacion.solicitud.codigoProyecto ?? asignacion.solicitud.proyecto.valor ?? 'Solicitud'}
              </SheetTitle>
              <SheetDescription>Propuesta del optimizador — no se escribe nada en Prisma ni Startrack.</SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-5 px-4 pb-4">
              <section className="flex flex-col gap-2">
                <h3 className="font-label text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Solicitud
                </h3>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                  <dt className="text-muted-foreground">Estado</dt>
                  <dd className="text-right">{asignacion.solicitud.estado.valor ?? 'Sin registro'}</dd>
                  <dt className="text-muted-foreground">Clase</dt>
                  <dd className="text-right">{asignacion.solicitud.clase.valor ?? 'Sin registro'}</dd>
                  <dt className="text-muted-foreground">Proyecto</dt>
                  <dd className="text-right">{asignacion.solicitud.proyecto.valor ?? 'Sin registro'}</dd>
                  <dt className="text-muted-foreground">Período pedido</dt>
                  <dd className="text-right font-mono text-xs">
                    {asignacion.solicitud.inicio.valor} → {asignacion.solicitud.fin.valor}
                  </dd>
                  <dt className="text-muted-foreground">Inicio efectivo</dt>
                  <dd className="text-right font-mono text-xs">{asignacion.solicitud.inicioEfectivo}</dd>
                </dl>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="font-label text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Máquina y operador
                </h3>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                  <dt className="text-muted-foreground">Máquina</dt>
                  <dd className="text-right">{asignacion.maquina.codigoActivo.valor ?? 'Sin registro'}</dd>
                  <dt className="text-muted-foreground">Operador</dt>
                  <dd className="text-right font-mono text-xs">
                    {asignacion.operador.codTrabajador.valor ?? 'Sin registro'}
                  </dd>
                </dl>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="font-label text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Objetivos
                </h3>
                <dl className="flex flex-col gap-2 text-sm">
                  {SOFT_CONSTRAINTS.map((id) => (
                    <div key={id} className="flex items-start justify-between gap-3 border-t border-border pt-2 first:border-t-0 first:pt-0">
                      <dt className="text-muted-foreground">{NOMBRE_OBJETIVO[id]}</dt>
                      <dd>{celdaObjetivo(asignacion.objetivos[id])}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {asignacion.manual && (
                <section className="flex flex-col gap-2">
                  <h3 className="font-label text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Comparación con la asignación manual
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted">
                          <th scope="col" className="px-2 py-1.5 text-left font-medium">
                            Objetivo
                          </th>
                          <th scope="col" className="px-2 py-1.5 text-right font-medium">
                            Manual observada (Prisma)
                          </th>
                          <th scope="col" className="px-2 py-1.5 text-right font-medium">
                            Propuesta del optimizador
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {SOFT_CONSTRAINTS.map((id) => (
                          <tr key={id} className="border-b border-border last:border-b-0">
                            <td className="px-2 py-1.5">{NOMBRE_OBJETIVO[id]}</td>
                            <td className="px-2 py-1.5 text-right">{celdaObjetivo(asignacion.manual!.objetivos[id])}</td>
                            <td className="px-2 py-1.5 text-right">{celdaObjetivo(asignacion.objetivos[id])}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <section className="flex flex-col gap-2">
                <h3 className="font-label text-xs font-bold uppercase tracking-wide text-muted-foreground">Clima</h3>
                {asignacion.clima.estado === 'evaluado' ? (
                  <div className="flex flex-col gap-1 text-sm">
                    <p className="flex items-center gap-1.5">
                      <CloudRain aria-hidden className="size-3.5 text-muted-foreground" />
                      {asignacion.clima.diasConLluvia} de {asignacion.clima.diasEvaluados} días evaluados con lluvia
                      probable
                    </p>
                    {asignacion.clima.diasSinPronostico > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {asignacion.clima.diasSinPronostico} día(s) sin pronóstico
                      </p>
                    )}
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {asignacion.clima.fuente.proveedor} · coordenada a {asignacion.clima.fuente.decimalesCoordenada}{' '}
                      decimal · leído {asignacion.clima.fuente.leidoEn}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{asignacion.clima.motivo}</p>
                )}
              </section>

              <VerOrigen linaje={recolectarLinaje(asignacion)} etiqueta="Ver origen de todos los campos" />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
