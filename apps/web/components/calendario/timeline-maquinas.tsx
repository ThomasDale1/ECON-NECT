'use client'

import { useState } from 'react'
import { Ban, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CloudRain } from 'lucide-react'
import type { AsignacionPropuesta, FilaMaquina, OcupacionReal, RespuestaOptimizar } from '@/lib/optimizador/tipos'
import { BadgeOrigen } from '@/components/nect/badge-origen'
import { VerOrigen } from '@/components/nect/ver-origen'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Timeline de máquinas — S-B4 §5 + ajuste de UX del 13 de sep. 2026 (feedback
 * directo sobre la primera versión). Estilo Notion: filas por máquina,
 * columnas por día. La posición de cada barra es presentación pura sobre
 * fechas que ya trae el contrato — acá no se calculan choques, objetivos ni
 * candidatas (eso ya lo hizo el solver / `lib/optimizador/adaptador.ts`).
 *
 * **Por qué no hay eje de horas:** ni Prisma ni Startrack exponen hora de
 * inicio/fin de una asignación — solo `fecha_inicio`/`fecha_fin` a nivel de
 * día completo (`lib/optimizador/tipos.ts`). Pintar un eje 6am–18pm sería
 * inventar una precisión que el sandbox no tiene (AGENTS.md §1.1). En su
 * lugar, la vista se acota a **una semana navegable** — mismo dato, más
 * legible — con `‹ Semana anterior` / `Semana siguiente ›` para recorrer todo
 * `horizonte`.
 */
const ANCHO_COLUMNA_PX = 140
const ANCHO_ETIQUETA_PX = 216
const ALTO_BARRA_PX = 44 // h-11 — agrandado a pedido (bloques de ocupación real ilegibles a 36px)
const ESPACIO_ENTRE_CARRILES_PX = 6
const PADDING_SUPERIOR_PX = 6 // top-1.5
const PASO_CARRIL_PX = ALTO_BARRA_PX + ESPACIO_ENTRE_CARRILES_PX
// Umbral absoluto (no un múltiplo de columna): lo que hace falta para que
// "Ocupación real" + badge + botón entren sin recortarse. Con columnas de
// semana (140px) casi todo cae en la variante expandida.
const ANCHO_MINIMO_EXPANDIDO_PX = 118
const DIAS_POR_PAGINA = 7

/**
 * Reparte ítems que pueden superponerse en fecha en "carriles" verticales
 * (algoritmo greedy de asignación de intervalos): dos ítems que se encimen
 * nunca comparten carril.
 */
function asignarCarriles<T>(items: T[], rango: (item: T) => [number, number]): { item: T; carril: number }[] {
  const ordenados = [...items]
    .map((item) => ({ item, rango: rango(item) }))
    .sort((a, b) => a.rango[0] - b.rango[0])

  const finPorCarril: number[] = []
  const resultado: { item: T; carril: number }[] = []

  for (const { item, rango: [inicio, fin] } of ordenados) {
    let carril = finPorCarril.findIndex((finCarril) => finCarril < inicio)
    if (carril === -1) {
      carril = finPorCarril.length
      finPorCarril.push(fin)
    } else {
      finPorCarril[carril] = fin
    }
    resultado.push({ item, carril })
  }

  return resultado
}

function altoFila(cantidadCarriles: number): number {
  return PADDING_SUPERIOR_PX * 2 + Math.max(cantidadCarriles, 1) * PASO_CARRIL_PX - ESPACIO_ENTRE_CARRILES_PX
}

function aFechaUtc(fecha: string): number {
  const [y, m, d] = fecha.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function diffDias(desde: string, hasta: string): number {
  return Math.round((aFechaUtc(hasta) - aFechaUtc(desde)) / 86_400_000)
}

function sumarDias(fecha: string, dias: number): string {
  return new Date(aFechaUtc(fecha) + dias * 86_400_000).toISOString().slice(0, 10)
}

function clampFecha(fecha: string, min: string, max: string): string {
  if (fecha < min) return min
  if (fecha > max) return max
  return fecha
}

function seSuperponen(aInicio: string, aFin: string, bInicio: string, bFin: string): boolean {
  return aInicio <= bFin && aFin >= bInicio
}

function diasDelRango(desde: string, hasta: string): string[] {
  const total = diffDias(desde, hasta)
  const dias: string[] = []
  for (let i = 0; i <= total; i++) dias.push(sumarDias(desde, i))
  return dias
}

const DIA_SEMANA_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const FORMATO_RANGO = new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short', timeZone: 'UTC' })

function formatearRangoSemana(desde: string, hasta: string): string {
  const d = new Date(aFechaUtc(desde))
  const h = new Date(aFechaUtc(hasta))
  return `${FORMATO_RANGO.format(d)} – ${FORMATO_RANGO.format(h)}`
}

function EncabezadoDia({ fecha, esHoy }: { fecha: string; esHoy: boolean }) {
  const d = new Date(aFechaUtc(fecha))
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col items-center justify-center gap-0.5 border-l border-border py-2 font-label text-[11px]',
        esHoy ? 'bg-primary/5 font-bold text-primary' : 'text-muted-foreground',
      )}
      style={{ width: ANCHO_COLUMNA_PX }}
    >
      <span className="capitalize">{DIA_SEMANA_LARGO[d.getUTCDay()]}</span>
      <span className="font-mono text-base">{d.getUTCDate()}</span>
      {esHoy && <span className="font-label text-[9px] uppercase tracking-widest">Hoy</span>}
    </div>
  )
}

type VentanaSemana = { desde: string; hasta: string }

/** Posición y recorte de una barra contra la ventana visible. El recorte es
 * puramente visual (qué tanto se ve en esta semana) — nunca cambia la fecha
 * real, que se sigue pudiendo auditar con "ver origen" / el detalle. */
function posicion(ventana: VentanaSemana, inicioReal: string, finReal: string, carril = 0) {
  const inicioVisible = clampFecha(inicioReal, ventana.desde, ventana.hasta)
  const finVisible = clampFecha(finReal, ventana.desde, ventana.hasta)
  const left = diffDias(ventana.desde, inicioVisible) * ANCHO_COLUMNA_PX
  const width = (diffDias(inicioVisible, finVisible) + 1) * ANCHO_COLUMNA_PX - 3
  const top = PADDING_SUPERIOR_PX + carril * PASO_CARRIL_PX
  return {
    left,
    top,
    width: Math.max(width, ANCHO_COLUMNA_PX - 3),
    cortadaIzq: inicioReal < ventana.desde,
    cortadaDer: finReal > ventana.hasta,
  }
}

function MarcaCorte({ lado }: { lado: 'izq' | 'der' }) {
  const Icono = lado === 'izq' ? ChevronsLeft : ChevronsRight
  return (
    <Icono
      aria-hidden
      className={cn('absolute top-1/2 size-3.5 -translate-y-1/2 opacity-70', lado === 'izq' ? 'left-0.5' : 'right-0.5')}
    />
  )
}

function BarraOcupacionReal({
  ocupacion,
  ventana,
  carril,
}: {
  ocupacion: OcupacionReal
  ventana: VentanaSemana
  carril: number
}) {
  if (ocupacion.inicio.valor === null || ocupacion.fin.valor === null) return null
  const { left, top, width, cortadaIzq, cortadaDer } = posicion(ventana, ocupacion.inicio.valor, ocupacion.fin.valor, carril)
  const compacto = width < ANCHO_MINIMO_EXPANDIDO_PX

  return (
    <div
      className={cn(
        'absolute flex items-center overflow-hidden border border-border bg-[repeating-linear-gradient(135deg,var(--color-muted),var(--color-muted)_6px,color-mix(in_oklch,var(--color-muted),var(--color-foreground)_6%)_6px,color-mix(in_oklch,var(--color-muted),var(--color-foreground)_6%)_12px)]',
        compacto ? 'justify-center px-1' : 'gap-2 px-2.5',
        cortadaIzq ? 'rounded-l-none pl-4' : 'rounded-l-lg',
        cortadaDer ? 'rounded-r-none pr-4' : 'rounded-r-lg',
      )}
      style={{ left, top, width, height: ALTO_BARRA_PX }}
      title="Ocupación real · Prisma"
    >
      {cortadaIzq && <MarcaCorte lado="izq" />}
      {compacto ? (
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-origen-prisma" />
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate font-label text-[11px] font-semibold text-muted-foreground">
            Ocupación real
          </span>
          <BadgeOrigen plataforma="prisma" corto />
        </>
      )}
      <VerOrigen linaje={[ocupacion.inicio.linaje, ocupacion.fin.linaje]} compacto={compacto} />
      {cortadaDer && <MarcaCorte lado="der" />}
    </div>
  )
}

function BarraPropuesta({
  asignacion,
  ventana,
  carril,
  onSeleccionar,
}: {
  asignacion: AsignacionPropuesta
  ventana: VentanaSemana
  carril: number
  onSeleccionar: (a: AsignacionPropuesta) => void
}) {
  const { left, top, width, cortadaIzq, cortadaDer } = posicion(
    ventana,
    asignacion.solicitud.inicioEfectivo,
    asignacion.solicitud.fin.valor!,
    carril,
  )
  const clima = asignacion.clima
  const compacto = width < ANCHO_MINIMO_EXPANDIDO_PX

  return (
    <button
      type="button"
      onClick={() => onSeleccionar(asignacion)}
      title={`${asignacion.solicitud.codigoProyecto ?? asignacion.solicitud.proyecto.valor ?? 'Sin registro'} · ${asignacion.operador.codTrabajador.valor ?? 'Sin registro'}`}
      className={cn(
        'absolute flex flex-col justify-center gap-0.5 overflow-hidden bg-marca px-2.5 text-left text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-clara focus-visible:ring-offset-1',
        cortadaIzq ? 'rounded-l-none pl-4' : 'rounded-l-lg',
        cortadaDer ? 'rounded-r-none pr-4' : 'rounded-r-lg',
      )}
      style={{ left, top, width, height: ALTO_BARRA_PX }}
    >
      {cortadaIzq && <MarcaCorte lado="izq" />}
      <span className="truncate font-label text-xs font-semibold leading-tight">
        {asignacion.solicitud.codigoProyecto ?? asignacion.solicitud.proyecto.valor ?? 'Sin registro'}
      </span>
      {!compacto && (
        <span className="flex items-center gap-1 truncate font-mono text-[10px] leading-tight text-white/80">
          {asignacion.operador.codTrabajador.valor ?? 'Sin registro'}
          {clima.estado === 'evaluado' && clima.diasConLluvia > 0 && (
            <span className="flex items-center gap-0.5">
              <CloudRain aria-hidden className="size-2.5 shrink-0" />
              Lluvia probable {clima.diasConLluvia}/{clima.diasEvaluados}d
            </span>
          )}
          {clima.estado === 'sin_pronostico' && (
            <span className="truncate text-white/60">· {clima.motivo}</span>
          )}
        </span>
      )}
      {cortadaDer && <MarcaCorte lado="der" />}
    </button>
  )
}

function BarraSinAsignacion({
  ventana,
  inicio,
  fin,
  carril,
  texto,
}: {
  ventana: VentanaSemana
  inicio: string
  fin: string
  carril: number
  texto: string
}) {
  const { left, top, width, cortadaIzq, cortadaDer } = posicion(ventana, inicio, fin, carril)
  const compacto = width < ANCHO_MINIMO_EXPANDIDO_PX
  return (
    <div
      className={cn(
        'absolute flex items-center overflow-hidden border border-dashed border-border bg-muted',
        compacto ? 'justify-center px-1' : 'gap-1.5 px-2.5',
        cortadaIzq ? 'rounded-l-none pl-4' : 'rounded-l-lg',
        cortadaDer ? 'rounded-r-none pr-4' : 'rounded-r-lg',
      )}
      style={{ left, top, width, height: ALTO_BARRA_PX }}
      title={texto}
    >
      {cortadaIzq && <MarcaCorte lado="izq" />}
      <Ban aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      {!compacto && <span className="truncate font-label text-[11px] text-muted-foreground">{texto}</span>}
      {cortadaDer && <MarcaCorte lado="der" />}
    </div>
  )
}

function FilaMaquinaComponente({
  maquina,
  ventana,
  asignaciones,
  onSeleccionar,
  anchoTotal,
}: {
  maquina: FilaMaquina
  ventana: VentanaSemana
  asignaciones: AsignacionPropuesta[]
  onSeleccionar: (a: AsignacionPropuesta) => void
  anchoTotal: number
}) {
  type Item =
    | { tipo: 'ocupacion'; indice: number; data: OcupacionReal }
    | { tipo: 'propuesta'; data: AsignacionPropuesta }

  // Solo lo que se superpone con la semana visible entra al reparto de
  // carriles — lo que queda fuera se ve al navegar a esa semana.
  const items: Item[] = [
    ...maquina.ocupacionReal
      .map((data, indice) => ({ tipo: 'ocupacion' as const, indice, data }))
      .filter(
        (item) =>
          item.data.inicio.valor !== null &&
          item.data.fin.valor !== null &&
          seSuperponen(item.data.inicio.valor, item.data.fin.valor, ventana.desde, ventana.hasta),
      ),
    ...asignaciones
      .filter((a) => seSuperponen(a.solicitud.inicioEfectivo, a.solicitud.fin.valor!, ventana.desde, ventana.hasta))
      .map((data) => ({ tipo: 'propuesta' as const, data })),
  ]

  const itemsConCarril = asignarCarriles(items, (item) => {
    const [inicio, fin] =
      item.tipo === 'ocupacion'
        ? [item.data.inicio.valor!, item.data.fin.valor!]
        : [item.data.solicitud.inicioEfectivo, item.data.solicitud.fin.valor!]
    return [diffDias(ventana.desde, inicio), diffDias(ventana.desde, fin)]
  })

  const cantidadCarriles = itemsConCarril.reduce((max, { carril }) => Math.max(max, carril + 1), 0)
  const altoFilaMaquina = altoFila(cantidadCarriles)

  return (
    <div className="flex border-b border-border last:border-b-0">
      <div
        className="sticky left-0 z-1 flex shrink-0 flex-col justify-center gap-0.5 border-r border-border bg-card px-3 py-2"
        style={{ width: ANCHO_ETIQUETA_PX }}
      >
        <span className="truncate text-sm font-semibold">{maquina.codigoActivo.valor ?? 'Sin registro'}</span>
        <span className="truncate text-xs text-muted-foreground">
          {maquina.clase.valor ?? 'Sin registro'}
          {!maquina.claseEnCatalogo && ' · clase fuera de catálogo'}
        </span>
        {!maquina.puedeOperar && maquina.motivoNoOpera && (
          <span className="truncate text-[11px] text-muted-foreground">{maquina.motivoNoOpera}</span>
        )}
      </div>
      <div className="relative shrink-0" style={{ width: anchoTotal, height: altoFilaMaquina }}>
        {itemsConCarril.map(({ item, carril }) =>
          item.tipo === 'ocupacion' ? (
            <BarraOcupacionReal key={`ocupacion-${item.indice}`} ocupacion={item.data} ventana={ventana} carril={carril} />
          ) : (
            <BarraPropuesta
              key={item.data.solicitud.id}
              asignacion={item.data}
              ventana={ventana}
              carril={carril}
              onSeleccionar={onSeleccionar}
            />
          ),
        )}
      </div>
    </div>
  )
}

export function TimelineMaquinas({
  respuesta,
  onSeleccionarAsignacion,
}: {
  respuesta: RespuestaOptimizar
  onSeleccionarAsignacion: (a: AsignacionPropuesta) => void
}) {
  const [excluidasAbiertas, setExcluidasAbiertas] = useState(false)
  const [inicioSemana, setInicioSemana] = useState(respuesta.horizonte.desde)

  const { desde: desdeHorizonte, hasta: hastaHorizonte } = respuesta.horizonte
  const desdeSemana = clampFecha(inicioSemana, desdeHorizonte, hastaHorizonte)
  const hastaSemana = clampFecha(sumarDias(desdeSemana, DIAS_POR_PAGINA - 1), desdeSemana, hastaHorizonte)
  const ventana: VentanaSemana = { desde: desdeSemana, hasta: hastaSemana }

  const dias = diasDelRango(desdeSemana, hastaSemana)
  const anchoTotal = dias.length * ANCHO_COLUMNA_PX

  const puedeIrAnterior = desdeSemana > desdeHorizonte
  const puedeIrSiguiente = hastaSemana < hastaHorizonte

  const asignacionesPorMaquina = new Map<string, AsignacionPropuesta[]>()
  for (const a of respuesta.asignaciones) {
    const lista = asignacionesPorMaquina.get(a.maquina.id) ?? []
    lista.push(a)
    asignacionesPorMaquina.set(a.maquina.id, lista)
  }

  const sinAsignacionVisible = respuesta.sinAsignacion.filter((s) =>
    seSuperponen(s.solicitud.inicioEfectivo, s.solicitud.fin.valor!, ventana.desde, ventana.hasta),
  )
  const sinAsignacionConCarril = asignarCarriles(sinAsignacionVisible, (s) => [
    diffDias(ventana.desde, s.solicitud.inicioEfectivo),
    diffDias(ventana.desde, s.solicitud.fin.valor!),
  ])
  const altoSinAsignacion = altoFila(
    sinAsignacionConCarril.reduce((max, { carril }) => Math.max(max, carril + 1), 0),
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInicioSemana(sumarDias(desdeSemana, -DIAS_POR_PAGINA))}
            disabled={!puedeIrAnterior}
          >
            <ChevronLeft aria-hidden className="size-3.5" />
            Semana anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInicioSemana(sumarDias(desdeSemana, DIAS_POR_PAGINA))}
            disabled={!puedeIrSiguiente}
          >
            Semana siguiente
            <ChevronRight aria-hidden className="size-3.5" />
          </Button>
          {desdeSemana !== respuesta.hoy && (
            <Button variant="ghost" size="sm" onClick={() => setInicioSemana(respuesta.hoy)}>
              Hoy
            </Button>
          )}
        </div>
        <span className="font-label text-sm font-semibold tabular-nums">{formatearRangoSemana(desdeSemana, hastaSemana)}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <div style={{ width: ANCHO_ETIQUETA_PX + anchoTotal }}>
          <div className="sticky top-0 z-2 flex border-b border-border bg-card">
            <div
              className="sticky left-0 z-3 shrink-0 border-r border-border bg-card px-3 py-2 font-label text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
              style={{ width: ANCHO_ETIQUETA_PX }}
            >
              Máquina
            </div>
            <div className="flex shrink-0" style={{ width: anchoTotal }}>
              {dias.map((fecha) => (
                <EncabezadoDia key={fecha} fecha={fecha} esHoy={fecha === respuesta.hoy} />
              ))}
            </div>
          </div>

          {sinAsignacionVisible.length > 0 && (
            <div className="flex border-b border-border">
              <div
                className="sticky left-0 z-1 flex shrink-0 items-center border-r border-border bg-card px-3 py-2 text-sm font-semibold"
                style={{ width: ANCHO_ETIQUETA_PX }}
              >
                Sin asignación posible
              </div>
              <div className="relative shrink-0" style={{ width: anchoTotal, height: altoSinAsignacion }}>
                {sinAsignacionConCarril.map(({ item: s, carril }) => (
                  <BarraSinAsignacion
                    key={s.solicitud.id}
                    ventana={ventana}
                    inicio={s.solicitud.inicioEfectivo}
                    fin={s.solicitud.fin.valor!}
                    carril={carril}
                    texto={`${s.solicitud.clase.valor ?? 'Sin registro'} · ${s.solicitud.codigoProyecto ?? s.solicitud.proyecto.valor ?? 'Sin registro'} · ${s.motivo}`}
                  />
                ))}
              </div>
            </div>
          )}

          {respuesta.maquinas.map((maquina) => (
            <FilaMaquinaComponente
              key={maquina.id}
              maquina={maquina}
              ventana={ventana}
              asignaciones={asignacionesPorMaquina.get(maquina.id) ?? []}
              onSeleccionar={onSeleccionarAsignacion}
              anchoTotal={anchoTotal}
            />
          ))}
        </div>
      </div>

      {(respuesta.sinAsignacion.length > sinAsignacionVisible.length || respuesta.excluidas.length > 0) && (
        <p className="text-xs text-muted-foreground">
          {respuesta.sinAsignacion.length > sinAsignacionVisible.length &&
            `${respuesta.sinAsignacion.length - sinAsignacionVisible.length} solicitud(es) sin asignación posible caen fuera de esta semana — navegá para verlas.`}
        </p>
      )}

      {respuesta.excluidas.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <button
            type="button"
            onClick={() => setExcluidasAbiertas((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-expanded={excluidasAbiertas}
          >
            {excluidasAbiertas ? (
              <ChevronDown aria-hidden className="size-4" />
            ) : (
              <ChevronRight aria-hidden className="size-4" />
            )}
            {respuesta.excluidas.length} solicitud(es) excluida(s) (período vencido)
          </button>
          {excluidasAbiertas && (
            <ul className="flex flex-col gap-1.5 border-t border-border px-4 py-3">
              {respuesta.excluidas.map((e) => (
                <li key={e.solicitud.id} className="text-sm text-muted-foreground">
                  {e.solicitud.codigoProyecto ?? e.solicitud.proyecto.valor ?? 'Sin registro'} — {e.motivo}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
