import { ArrowRightLeft } from 'lucide-react'
import { mejoraDeAsignacion } from '@/lib/kpi/optimizador'
import {
  SOFT_CONSTRAINTS,
  type AsignacionPropuesta,
  type IdSoftConstraint,
  type PeorOpcionValida,
  type ValorObjetivo,
} from '@/lib/optimizador/tipos'
import type { Linaje } from '@/lib/tipos/canonico'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { VerOrigen } from '@/components/nect/ver-origen'
import { NOMBRE_OBJETIVO, formatearValor } from './objetivos'
import { TEXTO_REEMPLAZO } from './timeline-maquinas'

/**
 * Detalle de una asignación propuesta — S-B4 §6, reescrito en S-A10 Paso 10g.
 * Solo muestra: cada valor viene tal cual del contrato `AsignacionPropuesta`,
 * y la mejora por fila sale de `mejoraDeAsignacion` (lib/kpi/optimizador.ts),
 * la misma función que suma el KPI — la UI no la recalcula por su cuenta.
 * Nunca muestra un nombre de operador ni de conductor: solo códigos.
 */
const OBJETIVOS_CON_ORIGEN_DE_OPERADOR: IdSoftConstraint[] = ['ratingOperador', 'horasOperador']

function CeldaPlan({ objetivo, valor }: { objetivo: IdSoftConstraint; valor: ValorObjetivo }) {
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
      <span className="font-mono text-xs">
        {formatearValor(objetivo, valor.valor)} {valor.unidad}
      </span>
      {valor.peorCasoAplicado && (
        <Badge variant="outline" className="text-[10px]">
          peor caso declarado
        </Badge>
      )}
      {valor.motivo && <span className="text-right text-[11px] text-muted-foreground">{valor.motivo}</span>}
    </div>
  )
}

function CeldaPeor({
  objetivo,
  peor,
  unidad,
}: {
  objetivo: IdSoftConstraint
  peor: PeorOpcionValida
  unidad: ValorObjetivo['unidad']
}) {
  const cobertura = `${peor.candidatasConDato} de ${peor.candidatasValidas} candidatas con dato`
  if (peor.valor === null) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-muted-foreground">Sin registro</span>
        <span className="text-[11px] text-muted-foreground">{cobertura}</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="font-mono text-xs">
        {formatearValor(objetivo, peor.valor)} {unidad}
      </span>
      <span className="text-[11px] text-muted-foreground">{cobertura}</span>
    </div>
  )
}

function CeldaMejora({ asignacion, objetivo }: { asignacion: AsignacionPropuesta; objetivo: IdSoftConstraint }) {
  const mejora = mejoraDeAsignacion(asignacion, objetivo)
  if (mejora === null) return <span className="text-muted-foreground">No comparable</span>

  const unidad = asignacion.objetivos[objetivo].unidad
  const texto =
    objetivo === 'ratingOperador'
      ? `+${formatearValor(objetivo, mejora)} ${unidad}`
      : `${formatearValor(objetivo, mejora)} ${unidad} menos`
  return <span className="font-mono text-xs">{texto}</span>
}

function recolectarLinaje(asignacion: AsignacionPropuesta): Linaje[] {
  const linaje: Linaje[] = [
    asignacion.solicitud.estado.linaje,
    asignacion.solicitud.clase.linaje,
    asignacion.solicitud.proyecto.linaje,
    asignacion.solicitud.inicio.linaje,
    asignacion.solicitud.fin.linaje,
    asignacion.solicitud.creadaEn.linaje,
    asignacion.maquina.codigoActivo.linaje,
    asignacion.maquina.clase.linaje,
    asignacion.operador.codTrabajador.linaje,
  ]
  for (const id of SOFT_CONSTRAINTS) {
    linaje.push(...asignacion.objetivos[id].linaje)
  }
  if (asignacion.reemplazaConfirmada) {
    linaje.push(asignacion.reemplazaConfirmada.maquina.codigoActivo.linaje)
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
      <SheetContent className="overflow-y-auto p-0 data-[side=right]:sm:max-w-xl!">
        {asignacion && (
          <>
            <SheetHeader>
              <SheetTitle>
                {asignacion.solicitud.codigoProyecto ?? asignacion.solicitud.proyecto.valor ?? 'Solicitud'}
              </SheetTitle>
              <SheetDescription>Propuesta del optimizador — no se escribe nada en Prisma ni Startrack.</SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-5 px-4 pb-4">
              {asignacion.reemplazaConfirmada && (
                <section className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted px-3 py-2.5">
                  <h3 className="flex items-center gap-1.5 font-label text-xs font-bold">
                    <ArrowRightLeft aria-hidden className="size-3.5" />
                    {TEXTO_REEMPLAZO}
                  </h3>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Máquina confirmada</dt>
                    <dd className="text-right font-mono text-xs">
                      {asignacion.reemplazaConfirmada.maquina.codigoActivo.valor ?? 'Sin registro'}
                    </dd>
                    <dt className="text-muted-foreground">Motivo</dt>
                    <dd className="text-right">{asignacion.reemplazaConfirmada.motivo}</dd>
                  </dl>
                </section>
              )}

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
                  <dt className="text-muted-foreground">Pedida (orden de llegada)</dt>
                  <dd className="text-right font-mono text-xs">
                    {asignacion.solicitud.creadaEn.valor ?? 'Sin registro'}
                  </dd>
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
                  Objetivos frente a la peor opción válida
                </h3>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <caption className="sr-only">
                      Valor del plan, peor opción válida y mejora para cada objetivo de esta asignación
                    </caption>
                    <thead>
                      <tr className="border-b border-border bg-muted">
                        <th scope="col" className="px-2 py-1.5 text-left font-medium">
                          Objetivo
                        </th>
                        <th scope="col" className="px-2 py-1.5 text-right font-medium">
                          Plan
                        </th>
                        <th scope="col" className="px-2 py-1.5 text-right font-medium">
                          Peor opción válida
                        </th>
                        <th scope="col" className="px-2 py-1.5 text-right font-medium">
                          Mejora
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {SOFT_CONSTRAINTS.map((id) => (
                        <tr key={id} className="border-b border-border align-top last:border-b-0">
                          <th scope="row" className="px-2 py-1.5 text-left font-normal">
                            <div className="flex flex-col items-start gap-0.5">
                              <span>{NOMBRE_OBJETIVO[id]}</span>
                              {OBJETIVOS_CON_ORIGEN_DE_OPERADOR.includes(id) && (
                                <VerOrigen linaje={asignacion.objetivos[id].linaje} />
                              )}
                            </div>
                          </th>
                          <td className="px-2 py-1.5 text-right">
                            <CeldaPlan objetivo={id} valor={asignacion.objetivos[id]} />
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            <CeldaPeor
                              objetivo={id}
                              peor={asignacion.peorOpcionValida[id]}
                              unidad={asignacion.objetivos[id].unidad}
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            <CeldaMejora asignacion={asignacion} objetivo={id} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <VerOrigen linaje={recolectarLinaje(asignacion)} etiqueta="Ver origen de todos los campos" />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
