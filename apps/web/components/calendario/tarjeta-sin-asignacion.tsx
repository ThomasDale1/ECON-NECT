'use client'

import type { CSSProperties, ReactNode } from 'react'
import { ArrowRightLeft, Ban, Check, Lightbulb, Minus, Scale, X } from 'lucide-react'
import type {
  AsignacionPropuesta,
  FilaMaquina,
  IdPrioridad,
  RespuestaOptimizar,
  SolicitudSinAsignacion,
} from '@/lib/optimizador/tipos'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { VerOrigen } from '@/components/nect/ver-origen'
import { cn } from '@/lib/utils'
import { seSuperponen } from './fechas'
import { NOMBRE_OBJETIVO } from './objetivos'

/**
 * Card flotante de una solicitud "sin asignación posible" — se abre al pasar
 * el cursor (o con foco/clic) sobre la barra gris de la semana o del día.
 *
 * Explica el porqué con lo que ya trae `RespuestaOptimizar`, sin recalcular el
 * plan: los conteos del embudo de restricciones duras son los del servidor
 * (`candidatas`, lib/optimizador/adaptador.ts), el motivo es el de
 * `ensamblar.ts`, y la pila y sus niveles son los que el solver fijó. Lo único
 * que se hace acá es presentación: listar las máquinas de la misma clase y las
 * propuestas que se enciman en fechas, igual que el timeline posiciona barras.
 *
 * El solver no reporta qué nivel de la pila desempató una solicitud concreta:
 * la card lo dice así, y muestra la evidencia (orden de llegada, niveles
 * fijados) en vez de afirmar un nivel que no puede señalar (AGENTS.md §1.1).
 */

type IdEtapa = 'clase' | 'opera' | 'ventana' | 'operador'

type Etapa = { id: IdEtapa; titulo: string; regla: string; conteo: number }

const FORMATO_CREADA = new Intl.DateTimeFormat('es-SV', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/El_Salvador',
})

const FORMATO_NIVEL = new Intl.NumberFormat('es-SV', { maximumFractionDigits: 2 })

function formatearCreada(iso: string | null): string {
  if (!iso) return 'Sin registro'
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? iso : FORMATO_CREADA.format(new Date(ms))
}

function etapasDe(s: SolicitudSinAsignacion): Etapa[] {
  const { solicitud, candidatas } = s
  const ventana = `${solicitud.inicioEfectivo} → ${solicitud.fin.valor ?? 'Sin registro'}`
  return [
    {
      id: 'clase',
      titulo: 'Clase compatible',
      regla: `El tipo pedido (${solicitud.clase.valor ?? 'sin clase'}) tiene que ser igual a clase_equipo del equipo en Prisma.`,
      conteo: candidatas.claseCompatible,
    },
    {
      id: 'opera',
      titulo: 'Puede operar',
      regla: 'Ni OBSOLETA, ni con bandera de paro, ni con una falla activa (distinta de FINALIZADO o RECHAZADO).',
      conteo: candidatas.operables,
    },
    {
      id: 'ventana',
      titulo: 'Libre en las fechas',
      regla: `Su fecha_inicio_uso / fecha_fin_uso en Prisma no se encima con ${ventana}.`,
      conteo: candidatas.libresEnVentana,
    },
    {
      id: 'operador',
      titulo: 'Con operador disponible',
      regla: 'Hay al menos un operador activo que no está asociado a otra máquina ocupada en esas fechas.',
      conteo: candidatas.conOperadorLibre,
    },
  ]
}

const ACCION_POR_BLOQUEO: Record<IdEtapa, (s: SolicitudSinAsignacion) => string> = {
  clase: (s) =>
    `Conseguir (rentar o trasladar) una máquina de clase ${s.solicitud.clase.valor ?? 'la pedida'}, o confirmar con Proyectos que el tipo pedido es el correcto.`,
  opera: (s) =>
    `Que Mantenimiento cierre la falla o levante el paro de alguna de las ${s.candidatas.claseCompatible} máquina(s) de la clase, en Prisma.`,
  ventana: (s) =>
    `Mover las fechas de la solicitud, o liberar en Prisma una de las ${s.candidatas.operables} máquina(s) operables que hoy están ocupadas en esas fechas.`,
  operador: () => 'Activar un operador en Prisma, o liberar uno de los asociados a una máquina ocupada en esas fechas.',
}

type SituacionMaquina = { maquina: FilaMaquina; tipo: 'no_opera' | 'ocupada' | 'propuesta' | 'libre'; detalle: string }

function situacionesDeLaClase(s: SolicitudSinAsignacion, respuesta: RespuestaOptimizar): SituacionMaquina[] {
  const { solicitud } = s
  const fin = solicitud.fin.valor
  if (!fin || !solicitud.clase.valor) return []
  const orden: Record<SituacionMaquina['tipo'], number> = { propuesta: 0, ocupada: 1, no_opera: 2, libre: 3 }

  return respuesta.maquinas
    .filter((m) => m.claseEnCatalogo && m.clase.valor === solicitud.clase.valor)
    .map((maquina): SituacionMaquina => {
      if (!maquina.puedeOperar) {
        return { maquina, tipo: 'no_opera', detalle: maquina.motivoNoOpera ?? 'no puede operar' }
      }
      const ocupacion = maquina.ocupacionReal.find(
        (o) =>
          o.esDeSolicitudId !== solicitud.id &&
          o.inicio.valor !== null &&
          o.fin.valor !== null &&
          seSuperponen(o.inicio.valor, o.fin.valor, solicitud.inicioEfectivo, fin),
      )
      if (ocupacion) {
        const proyecto = ocupacion.codigoProyecto ?? ocupacion.proyecto.valor ?? 'sin proyecto'
        const tipoUso = ocupacion.esDeSolicitudId !== null ? 'confirmada en Prisma' : 'uso sin solicitud APROBADA'
        return {
          maquina,
          tipo: 'ocupada',
          detalle: `ocupada ${ocupacion.inicio.valor} → ${ocupacion.fin.valor} · ${proyecto} (${tipoUso})`,
        }
      }
      const propuesta = respuesta.asignaciones.find(
        (a) =>
          a.maquina.id === maquina.id &&
          a.solicitud.fin.valor !== null &&
          seSuperponen(a.solicitud.inicioEfectivo, a.solicitud.fin.valor, solicitud.inicioEfectivo, fin),
      )
      if (propuesta) {
        const proyecto = propuesta.solicitud.codigoProyecto ?? propuesta.solicitud.proyecto.valor ?? 'sin proyecto'
        return {
          maquina,
          tipo: 'propuesta',
          detalle: `el plan la propone para ${proyecto} (${propuesta.solicitud.inicioEfectivo} → ${propuesta.solicitud.fin.valor})`,
        }
      }
      return { maquina, tipo: 'libre', detalle: 'libre en esas fechas' }
    })
    .sort((a, b) => orden[a.tipo] - orden[b.tipo])
}

type Llegada = 'antes' | 'despues' | 'igual' | 'sin_dato'

function comparaLlegada(propuesta: AsignacionPropuesta, s: SolicitudSinAsignacion): Llegada {
  const a = propuesta.solicitud.creadaEn.valor ? Date.parse(propuesta.solicitud.creadaEn.valor) : NaN
  const b = s.solicitud.creadaEn.valor ? Date.parse(s.solicitud.creadaEn.valor) : NaN
  if (Number.isNaN(a) || Number.isNaN(b)) return 'sin_dato'
  if (a === b) return 'igual'
  return a < b ? 'antes' : 'despues'
}

const TEXTO_LLEGADA: Record<Llegada, string> = {
  antes: 'pidió antes',
  despues: 'pidió después',
  igual: 'pidió a la misma hora',
  sin_dato: 'sin created_at',
}

function Seccion({ titulo, icono, children }: { titulo: string; icono?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t border-border px-4 py-3">
      <h4 className="flex items-center gap-1.5 font-label text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {icono}
        {titulo}
      </h4>
      {children}
    </section>
  )
}

function Embudo({ etapas, bloqueo }: { etapas: Etapa[]; bloqueo: IdEtapa | null }) {
  const indiceBloqueo = bloqueo === null ? -1 : etapas.findIndex((e) => e.id === bloqueo)
  return (
    <ol className="flex flex-col gap-1.5">
      {etapas.map((etapa, i) => {
        const esBloqueo = i === indiceBloqueo
        const sinEvaluar = indiceBloqueo !== -1 && i > indiceBloqueo
        return (
          <li
            key={etapa.id}
            className={cn(
              'flex items-start gap-2.5 rounded-lg border px-2.5 py-2',
              esBloqueo ? 'border-foreground/40 bg-muted' : 'border-border',
              sinEvaluar && 'opacity-50',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                esBloqueo ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground',
              )}
            >
              {sinEvaluar ? (
                <Minus aria-hidden className="size-2.5" />
              ) : esBloqueo ? (
                <X aria-hidden className="size-2.5" />
              ) : (
                <Check aria-hidden className="size-2.5" />
              )}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold">
                  {i + 1}. {etapa.titulo}
                  {esBloqueo && <span className="ml-1.5 font-label text-[10px] uppercase tracking-wider">· aquí se cae</span>}
                </span>
                <span className="shrink-0 font-mono text-xs tabular-nums">
                  {sinEvaluar ? '—' : etapa.conteo} <span className="text-muted-foreground">máq.</span>
                </span>
              </span>
              <span className="text-[11px] leading-snug text-muted-foreground">{etapa.regla}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function formatearNivel(valor: number, unidad: string): string {
  return `${FORMATO_NIVEL.format(valor)} ${unidad}`.trim()
}

function ExplicacionPila({
  s,
  respuesta,
  competidoras,
}: {
  s: SolicitudSinAsignacion
  respuesta: RespuestaOptimizar
  competidoras: AsignacionPropuesta[]
}) {
  const { pila, niveles } = respuesta
  const indiceCobertura = pila.indexOf('cobertura')
  const indiceOrden = pila.indexOf('ordenLlegada')
  const ordenManda = indiceOrden !== -1 && indiceOrden < indiceCobertura
  const decisivo: IdPrioridad = ordenManda ? 'ordenLlegada' : 'cobertura'
  const nivelDecisivo = niveles.find((n) => n.objetivo === decisivo)
  const desempate = pila.slice(pila.indexOf(decisivo) + 1)
  const antes = competidoras.filter((c) => comparaLlegada(c, s) === 'antes').length
  const totalSolicitudes = respuesta.asignaciones.length + respuesta.sinAsignacion.length

  return (
    <div className="flex flex-col gap-2 text-xs leading-relaxed">
      <p>
        Esta solicitud <strong>sí pasó las cuatro restricciones duras</strong>: ninguna regla la prohíbe. Quedó fuera
        por la <strong>pila de prioridades</strong>, que el solver (OR-Tools CP-SAT) resuelve en orden lexicográfico:
        fija el óptimo de cada nivel, con tolerancia 0, antes de pasar al siguiente. Máquina y operador no pueden
        repetirse en dos solicitudes que se enciman en fechas.
      </p>

      <div className="rounded-lg border border-border bg-muted px-3 py-2">
        <span className="font-label text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Métrica que decide primero · nivel {pila.indexOf(decisivo) + 1} de {pila.length}
        </span>
        <p className="mt-1 font-semibold">{NOMBRE_OBJETIVO[decisivo]}</p>
        {ordenManda ? (
          <p className="mt-1 text-muted-foreground">
            El orden de llegada va arriba de la cobertura: el solver recorre las solicitudes de la primera a la última
            en pedir (created_at de Prisma) y en cada paso fija cuántas quedan cubiertas. Una solicitud anterior nunca
            pierde su máquina ni su operador para cubrir una posterior.
            {competidoras.length > 0 &&
              ` ${antes} de las ${competidoras.length} propuesta(s) de la misma clase que se enciman con esta pidieron antes.`}
          </p>
        ) : (
          <p className="mt-1 text-muted-foreground">
            El primer nivel maximiza cuántas solicitudes quedan cubiertas
            {nivelDecisivo && ` (fijado en ${FORMATO_NIVEL.format(nivelDecisivo.valor)} de ${totalSolicitudes})`}.
            Cubrir esta no subía ese total: la máquina o el operador que necesitaba solo alcanzaba dejando sin cubrir
            otra solicitud que se encima en fechas.
          </p>
        )}
        {nivelDecisivo && !nivelDecisivo.probadoOptimo && (
          <p className="mt-1 text-muted-foreground">
            Ojo: en este nivel se agotó el tiempo del solver; el valor se fijó sin prueba de óptimo.
          </p>
        )}
      </div>

      {desempate.length > 0 && (
        <div className="flex flex-col gap-1">
          <p>
            Con ese nivel ya fijado, qué solicitud se quedó la máquina lo desempatan los niveles siguientes, en este
            orden:
          </p>
          <ol className="flex flex-col gap-0.5">
            {desempate.map((objetivo) => {
              const nivel = niveles.find((n) => n.objetivo === objetivo)
              return (
                <li key={objetivo} className="flex items-baseline justify-between gap-2">
                  <span>
                    <span className="font-mono text-muted-foreground">{pila.indexOf(objetivo) + 1}.</span>{' '}
                    {NOMBRE_OBJETIVO[objetivo]}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                    {nivel ? `fijado en ${formatearNivel(nivel.valor, nivel.unidad)}${nivel.probadoOptimo ? '' : ' · sin prueba de óptimo'}` : 'Sin registro'}
                  </span>
                </li>
              )
            })}
          </ol>
          <p className="text-[11px] text-muted-foreground">
            El solver no reporta cuál de estos niveles hizo el desempate para esta solicitud en particular. Por ser
            lexicográfico, decidió el primero de la lista que distinguía entre las dos opciones.
            {s.solicitud.destino === null &&
              ' Esta solicitud no resuelve geocerca de destino, así que en distancia entraba con el peor caso declarado.'}
          </p>
        </div>
      )}
    </div>
  )
}

export function TarjetaSinAsignacion({
  sinAsignacion: s,
  respuesta,
  className,
  style,
  children,
}: {
  sinAsignacion: SolicitudSinAsignacion
  respuesta: RespuestaOptimizar
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  const { solicitud } = s
  const clase = solicitud.clase.valor ?? 'Sin registro'
  const proyecto = solicitud.codigoProyecto ?? solicitud.proyecto.valor ?? 'Sin registro'
  const etapas = etapasDe(s)
  const bloqueo = etapas.find((e) => e.conteo === 0)?.id ?? null
  const situaciones = situacionesDeLaClase(s, respuesta)
  const fin = solicitud.fin.valor
  const competidoras =
    fin === null
      ? []
      : respuesta.asignaciones
          .filter(
            (a) =>
              a.maquina.clase.valor === solicitud.clase.valor &&
              a.solicitud.fin.valor !== null &&
              seSuperponen(a.solicitud.inicioEfectivo, a.solicitud.fin.valor, solicitud.inicioEfectivo, fin),
          )
          .sort((a, b) => (a.solicitud.creadaEn.valor ?? '').localeCompare(b.solicitud.creadaEn.valor ?? ''))
  const recortadaAHoy = solicitud.inicio.valor !== null && solicitud.inicio.valor < solicitud.inicioEfectivo

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        closeDelay={150}
        aria-label={`Sin asignación posible: ${clase} · ${proyecto} · ${s.motivo}. Ver explicación detallada.`}
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
        className="max-h-(--available-height) w-[30rem] max-w-[calc(100vw-2rem)] gap-0 overflow-y-auto p-0"
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
                solicitud.creadaEn.linaje,
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
              {solicitud.inicioEfectivo} → {fin ?? 'Sin registro'}
            </span>
            <span>· pedida {formatearCreada(solicitud.creadaEn.valor)}</span>
          </div>
          {recortadaAHoy && (
            <p className="text-[11px] text-muted-foreground">
              Prisma la pide desde {solicitud.inicio.valor}; como ese día ya pasó, se planea desde hoy.
            </p>
          )}
          <p className="rounded-lg border border-dashed border-border bg-muted px-2.5 py-1.5 text-xs">{s.motivo}</p>
        </header>

        {s.reemplazaConfirmada && (
          <Seccion titulo="Era una APROBADA con máquina rota" icono={<ArrowRightLeft aria-hidden className="size-3" />}>
            <p className="text-xs leading-relaxed">
              Prisma la tenía confirmada con{' '}
              <strong>{s.reemplazaConfirmada.maquina.codigoActivo.valor ?? 'una máquina sin código'}</strong>, que ya no
              puede operar: {s.reemplazaConfirmada.motivo}. Por eso volvió a la demanda y se buscó reemplazo, sin
              encontrarlo. La asignación en Prisma no se modifica.
            </p>
          </Seccion>
        )}

        <Seccion titulo="Restricciones duras (embudo de candidatas)">
          <p className="text-[11px] leading-snug text-muted-foreground">
            Cada paso filtra las máquinas del anterior. Si alguno llega a 0, ninguna preferencia de la pila puede
            saltárselo: el solver descarta la opción, no la sugiere.
          </p>
          <Embudo etapas={etapas} bloqueo={bloqueo} />
        </Seccion>

        <Seccion titulo="Por qué se decidió así" icono={<Scale aria-hidden className="size-3" />}>
          {bloqueo !== null ? (
            <p className="text-xs leading-relaxed">
              No es una preferencia del plan: la solicitud se cae en el paso{' '}
              <strong>
                {etapas.findIndex((e) => e.id === bloqueo) + 1}. {etapas.find((e) => e.id === bloqueo)!.titulo}
              </strong>
              , que es una restricción dura. Da igual cómo esté ordenada la pila: con 0 candidatas en ese paso no hay
              ninguna asignación válida que proponer.
            </p>
          ) : (
            <ExplicacionPila s={s} respuesta={respuesta} competidoras={competidoras} />
          )}
        </Seccion>

        {bloqueo === null && competidoras.length > 0 && (
          <Seccion titulo={`Propuestas que compiten (${competidoras.length})`}>
            <ul className="flex flex-col gap-1">
              {competidoras.map((c) => (
                <li key={c.solicitud.id} className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate">
                    <span className="font-semibold">{c.solicitud.codigoProyecto ?? c.solicitud.proyecto.valor ?? 'Sin registro'}</span>{' '}
                    <span className="text-muted-foreground">
                      · {c.maquina.codigoActivo.valor ?? 'Sin registro'} · op. {c.operador.codTrabajador.valor ?? 'Sin registro'}
                    </span>
                  </span>
                  <span className="shrink-0 font-label text-[11px] text-muted-foreground">
                    {TEXTO_LLEGADA[comparaLlegada(c, s)]}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground">
              Propuestas del plan con máquina de la misma clase y fechas que se enciman con esta.
            </p>
          </Seccion>
        )}

        {situaciones.length > 0 && (
          <Seccion titulo={`Máquinas de clase ${clase} (${situaciones.length})`}>
            <ul className="flex flex-col gap-1">
              {situaciones.map(({ maquina, tipo, detalle }) => (
                <li key={maquina.id} className="flex items-baseline gap-2 text-xs">
                  <span className="w-20 shrink-0 truncate font-mono font-semibold">
                    {maquina.codigoActivo.valor ?? 'Sin registro'}
                  </span>
                  <span className={cn('min-w-0', tipo === 'libre' ? 'text-foreground' : 'text-muted-foreground')}>
                    {detalle}
                  </span>
                </li>
              ))}
            </ul>
          </Seccion>
        )}

        <Seccion titulo="Qué haría falta para cubrirla" icono={<Lightbulb aria-hidden className="size-3" />}>
          <p className="text-xs leading-relaxed">
            {bloqueo !== null
              ? ACCION_POR_BLOQUEO[bloqueo](s)
              : `Si esta solicitud debe ganar, subí en la pila el criterio que la favorece y re-optimizá, o mové sus fechas para que no se encime con ${competidoras.length > 0 ? `las ${competidoras.length} propuesta(s) de la lista` : 'las propuestas de su clase'}.`}
          </p>
          <p className="text-[11px] text-muted-foreground">El plan solo propone: la decisión y el cambio en Prisma son de una persona.</p>
        </Seccion>
      </PopoverContent>
    </Popover>
  )
}
