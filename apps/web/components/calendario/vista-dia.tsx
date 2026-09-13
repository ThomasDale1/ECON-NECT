'use client'

import { useSyncExternalStore } from 'react'
import { ArrowRightLeft, Ban, CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react'
import type {
  AsignacionPropuesta,
  FilaMaquina,
  RespuestaOptimizar,
  SolicitudReprogramada,
} from '@/lib/optimizador/tipos'
import { BadgeOrigen } from '@/components/nect/badge-origen'
import { VerOrigen } from '@/components/nect/ver-origen'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { aFechaUtc, estaEnRango, sumarDias } from './fechas'
import { TarjetaSinAsignacion } from './tarjeta-sin-asignacion'
import {
  ALTO_BARRA_PX,
  ANCHO_ETIQUETA_PX,
  CLASE_OCUPACION_RAYADA,
  ESPACIO_ENTRE_CARRILES_PX,
  EtiquetaMaquina,
  CLASE_REPROGRAMADA,
  TEXTO_REEMPLAZO,
  altoFila,
  tituloReprogramada,
  rotuloOcupacion,
  tituloOcupacion,
} from './timeline-maquinas'

/**
 * Vista Día — S-A10 Paso 10e. Filas por máquina y 24 columnas de hora
 * (00:00–24:00). Todo bloque cubre el día completo: Prisma registra
 * solicitudes y uso de maquinaria por fecha, sin hora, y dibujar un bloque de
 * 8:00 a 17:00 sería inventar una precisión que el sandbox no tiene
 * (AGENTS.md §1.1). Filtra la misma `RespuestaOptimizar` que la semana: no
 * calcula choques ni candidatas.
 */
const ANCHO_HORA_PX = 64
const HORAS_DEL_DIA = 24
const ANCHO_DIA_PX = ANCHO_HORA_PX * HORAS_DEL_DIA
const PADDING_SUPERIOR_PX = 6
const PASO_CARRIL_PX = ALTO_BARRA_PX + ESPACIO_ENTRE_CARRILES_PX
const ANCHO_BLOQUE_PX = ANCHO_DIA_PX - 3

const FORMATO_FECHA = new Intl.DateTimeFormat('es-SV', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const FONDO_HORAS = {
  backgroundImage: 'linear-gradient(to right, var(--color-border) 1px, transparent 1px)',
  backgroundSize: `${ANCHO_HORA_PX}px 100%`,
}

function etiquetaHora(hora: number): string {
  return `${String(hora).padStart(2, '0')}:00`
}

// Reloj para la línea de "ahora": se suscribe a un intervalo en vez de leer
// la hora durante el render.
function suscribirReloj(avisar: () => void): () => void {
  const id = window.setInterval(avisar, 15_000)
  return () => window.clearInterval(id)
}
function minutoActual(): number | null {
  return Math.floor(Date.now() / 60_000)
}
function sinReloj(): number | null {
  return null
}

/** Hora decimal (0–24) en America/El_Salvador para un minuto epoch. */
function horaDecimalElSalvador(minutoEpoch: number): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/El_Salvador',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(minutoEpoch * 60_000))
  const hora = Number(partes.find((p) => p.type === 'hour')?.value ?? '0')
  const minuto = Number(partes.find((p) => p.type === 'minute')?.value ?? '0')
  return hora + minuto / 60
}

function topCarril(carril: number): number {
  return PADDING_SUPERIOR_PX + carril * PASO_CARRIL_PX
}

function FilaDia({
  maquina,
  fecha,
  asignaciones,
  onSeleccionar,
  reprogramadas,
}: {
  maquina: FilaMaquina
  fecha: string
  asignaciones: AsignacionPropuesta[]
  onSeleccionar: (a: AsignacionPropuesta) => void
  reprogramadas?: ReadonlyMap<string, SolicitudReprogramada>
}) {
  const ocupaciones = maquina.ocupacionReal.filter(
    (o) => o.inicio.valor !== null && o.fin.valor !== null && estaEnRango(fecha, o.inicio.valor, o.fin.valor),
  )
  const propuestas = asignaciones.filter((a) => estaEnRango(fecha, a.solicitud.inicioEfectivo, a.solicitud.fin.valor!))

  return (
    <div className="flex border-b border-border last:border-b-0">
      <div
        className="sticky left-0 z-3 flex shrink-0 flex-col justify-center gap-0.5 border-r border-border bg-card px-3 py-2"
        style={{ width: ANCHO_ETIQUETA_PX }}
      >
        <EtiquetaMaquina maquina={maquina} />
      </div>
      <div
        className="relative shrink-0"
        style={{ ...FONDO_HORAS, width: ANCHO_DIA_PX, height: altoFila(ocupaciones.length + propuestas.length) }}
      >
        {ocupaciones.map((ocupacion, i) => (
          <div
            key={`ocupacion-${i}`}
            className={cn('absolute left-0 flex items-center gap-2 overflow-hidden rounded-lg px-3', CLASE_OCUPACION_RAYADA)}
            style={{ top: topCarril(i), width: ANCHO_BLOQUE_PX, height: ALTO_BARRA_PX }}
            title={tituloOcupacion(ocupacion)}
          >
            <span className="min-w-0 truncate font-label text-[11px] font-semibold text-muted-foreground">
              {rotuloOcupacion(ocupacion)}
              {ocupacion.codigoProyecto && ` · ${ocupacion.codigoProyecto}`}
              {!maquina.puedeOperar && ' · la máquina ya no opera'}
            </span>
            <BadgeOrigen plataforma="prisma" corto />
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
              {ocupacion.inicio.valor ?? 'Sin registro'} → {ocupacion.fin.valor ?? 'Sin registro'}
            </span>
            <VerOrigen linaje={[ocupacion.inicio.linaje, ocupacion.fin.linaje, ocupacion.proyecto.linaje]} />
          </div>
        ))}
        {propuestas.map((asignacion, i) => {
          const codigo = asignacion.solicitud.codigoProyecto ?? asignacion.solicitud.proyecto.valor ?? 'Sin registro'
          const operador = asignacion.operador.codTrabajador.valor ?? 'Sin registro'
          const reemplazo = asignacion.reemplazaConfirmada
          const reprogramada = reprogramadas?.get(asignacion.solicitud.id)
          return (
            <button
              key={asignacion.solicitud.id}
              type="button"
              onClick={() => onSeleccionar(asignacion)}
              title={[`${codigo} · ${operador}`, reemplazo ? TEXTO_REEMPLAZO : null, reprogramada ? tituloReprogramada(reprogramada) : null]
                .filter(Boolean)
                .join(' · ')}
              className={cn(
                'absolute left-0 flex items-center gap-3 overflow-hidden rounded-lg bg-marca px-3 text-left text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-clara focus-visible:ring-offset-1',
                reprogramada && CLASE_REPROGRAMADA,
              )}
              style={{ top: topCarril(ocupaciones.length + i), width: ANCHO_BLOQUE_PX, height: ALTO_BARRA_PX }}
            >
              {reprogramada && (
                <span className="flex shrink-0 items-center gap-1 rounded-md bg-white/15 px-1.5 py-0.5 font-label text-[10px]">
                  <CalendarClock aria-hidden className="size-3" />
                  Reprogramada +{reprogramada.atrasoDias} d · pedida {reprogramada.original.inicio} → {reprogramada.original.fin} · vista previa
                </span>
              )}
              <span className="truncate font-label text-xs font-semibold">
                {codigo} · <span className="font-mono">{operador}</span>
              </span>
              {reemplazo && (
                <span className="flex shrink-0 items-center gap-1 rounded-md bg-white/15 px-1.5 py-0.5 font-label text-[10px]">
                  <ArrowRightLeft aria-hidden className="size-3" />
                  Reemplaza a {reemplazo.maquina.codigoActivo.valor ?? 'Sin registro'} (confirmada en Prisma)
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function VistaDia({
  respuesta,
  fecha,
  onCambiarFecha,
  onVolverASemana,
  onSeleccionarAsignacion,
  reprogramadas,
}: {
  respuesta: RespuestaOptimizar
  /** Ya acotada al horizonte por quien la pasa. */
  fecha: string
  onCambiarFecha: (fecha: string) => void
  onVolverASemana: () => void
  onSeleccionarAsignacion: (a: AsignacionPropuesta) => void
  /** Solo en la vista previa de reprogramación: marca las propuestas movidas. */
  reprogramadas?: ReadonlyMap<string, SolicitudReprogramada>
}) {
  const minuto = useSyncExternalStore<number | null>(suscribirReloj, minutoActual, sinReloj)

  const { desde, hasta } = respuesta.horizonte
  const esHoy = fecha === respuesta.hoy

  const asignacionesPorMaquina = new Map<string, AsignacionPropuesta[]>()
  for (const a of respuesta.asignaciones) {
    const lista = asignacionesPorMaquina.get(a.maquina.id) ?? []
    lista.push(a)
    asignacionesPorMaquina.set(a.maquina.id, lista)
  }

  const maquinasConOcupacion = respuesta.maquinas.filter((m) =>
    m.ocupacionReal.some((o) => o.inicio.valor !== null && o.fin.valor !== null && estaEnRango(fecha, o.inicio.valor, o.fin.valor)),
  ).length
  const propuestasDelDia = respuesta.asignaciones.filter((a) =>
    estaEnRango(fecha, a.solicitud.inicioEfectivo, a.solicitud.fin.valor!),
  ).length
  const sinAsignacionDelDia = respuesta.sinAsignacion.filter((s) =>
    estaEnRango(fecha, s.solicitud.inicioEfectivo, s.solicitud.fin.valor!),
  )

  const horaAhora = esHoy && minuto !== null ? horaDecimalElSalvador(minuto) : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Día anterior"
            onClick={() => onCambiarFecha(sumarDias(fecha, -1))}
            disabled={fecha <= desde}
          >
            <ChevronLeft aria-hidden className="size-3.5" />
          </Button>
          <span className="min-w-56 text-center font-label text-sm font-semibold capitalize">
            {FORMATO_FECHA.format(new Date(aFechaUtc(fecha)))}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Día siguiente"
            onClick={() => onCambiarFecha(sumarDias(fecha, 1))}
            disabled={fecha >= hasta}
          >
            <ChevronRight aria-hidden className="size-3.5" />
          </Button>
          {esHoy && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-label text-[10px] font-bold uppercase tracking-widest text-primary">
              Hoy
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onVolverASemana}>
          Volver a semana
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {maquinasConOcupacion} máquinas con ocupación · {propuestasDelDia} propuestas · {sinAsignacionDelDia.length} sin
        asignación posible
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <div className="relative" style={{ width: ANCHO_ETIQUETA_PX + ANCHO_DIA_PX }}>
          <div className="sticky top-0 z-4 flex border-b border-border bg-card">
            <div
              className="sticky left-0 z-5 shrink-0 border-r border-border bg-card px-3 py-2 font-label text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
              style={{ width: ANCHO_ETIQUETA_PX }}
            >
              Máquina
            </div>
            <div className="flex shrink-0" style={{ width: ANCHO_DIA_PX }}>
              {Array.from({ length: HORAS_DEL_DIA }, (_, hora) => (
                <div
                  key={hora}
                  className="relative flex shrink-0 items-center border-l border-border px-1.5 py-2 font-mono text-[10px] text-muted-foreground"
                  style={{ width: ANCHO_HORA_PX }}
                >
                  {etiquetaHora(hora)}
                  {hora === HORAS_DEL_DIA - 1 && <span className="absolute right-1">24:00</span>}
                </div>
              ))}
            </div>
          </div>

          {sinAsignacionDelDia.length > 0 && (
            <div className="flex border-b border-border">
              <div
                className="sticky left-0 z-3 flex shrink-0 items-center border-r border-border bg-card px-3 py-2 text-sm font-semibold"
                style={{ width: ANCHO_ETIQUETA_PX }}
              >
                Sin asignación posible
              </div>
              <div
                className="relative shrink-0"
                style={{ ...FONDO_HORAS, width: ANCHO_DIA_PX, height: altoFila(sinAsignacionDelDia.length) }}
              >
                {sinAsignacionDelDia.map((s, i) => {
                  const texto = `${s.solicitud.clase.valor ?? 'Sin registro'} · ${s.solicitud.codigoProyecto ?? s.solicitud.proyecto.valor ?? 'Sin registro'} · ${s.motivo}`
                  return (
                    <TarjetaSinAsignacion
                      key={s.solicitud.id}
                      sinAsignacion={s}
                      respuesta={respuesta}
                      className="absolute left-0 flex items-center gap-1.5 overflow-hidden rounded-lg border border-dashed border-border bg-muted px-3 transition-colors hover:border-foreground/40"
                      style={{ top: topCarril(i), width: ANCHO_BLOQUE_PX, height: ALTO_BARRA_PX }}
                    >
                      <Ban aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate font-label text-[11px] text-muted-foreground">{texto}</span>
                    </TarjetaSinAsignacion>
                  )
                })}
              </div>
            </div>
          )}

          {respuesta.maquinas.map((maquina) => (
            <FilaDia
              key={maquina.id}
              maquina={maquina}
              fecha={fecha}
              asignaciones={asignacionesPorMaquina.get(maquina.id) ?? []}
              onSeleccionar={onSeleccionarAsignacion}
              reprogramadas={reprogramadas}
            />
          ))}

          {horaAhora !== null && (
            <div
              aria-hidden
              className="pointer-events-none absolute top-0 bottom-0 z-2 w-0.5 bg-primary"
              style={{ left: ANCHO_ETIQUETA_PX + horaAhora * ANCHO_HORA_PX }}
            />
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Prisma registra solicitudes y uso de maquinaria por fecha, sin hora: cada bloque cubre el día completo.
      </p>
    </div>
  )
}
