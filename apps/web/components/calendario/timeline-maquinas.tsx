'use client'

import {
  ArrowRightLeft,
  Ban,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Route,
} from 'lucide-react'
import type {
  AsignacionPropuesta,
  FilaMaquina,
  OcupacionReal,
  RespuestaOptimizar,
  SolicitudReprogramada,
  SolicitudSinAsignacion,
} from '@/lib/optimizador/tipos'
import { BadgeOrigen } from '@/components/nect/badge-origen'
import { VerOrigen } from '@/components/nect/ver-origen'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DIAS_POR_SEMANA, aFechaUtc, clampFecha, diffDias, seSuperponen, sumarDias } from './fechas'
import { TarjetaSinAsignacion } from './tarjeta-sin-asignacion'

/**
 * Timeline de máquinas, vista Semana — S-B4 §5, ajustado el 13 de sep. 2026 y
 * en S-A10 Paso 10e. Estilo Notion: filas por máquina, columnas por día. La
 * posición de cada barra es presentación pura sobre fechas que ya trae el
 * contrato — acá no se calculan choques, objetivos ni candidatas (eso ya lo
 * hizo el solver / `lib/optimizador/adaptador.ts`).
 *
 * Clic en la cabecera de un día abre la vista Día (`vista-dia.tsx`), que tiene
 * columnas de hora pero bloques de día completo: ni Prisma ni Startrack
 * exponen hora de inicio/fin de una asignación, solo fechas (AGENTS.md §1.1).
 * El inicio de la semana visible lo guarda `Planeador`, para que "Volver a
 * semana" y la actualización automática no lo pierdan.
 */
const ANCHO_COLUMNA_PX = 140
export const ANCHO_ETIQUETA_PX = 216
export const ALTO_BARRA_PX = 44 // h-11 — agrandado a pedido (bloques de ocupación real ilegibles a 36px)
export const ESPACIO_ENTRE_CARRILES_PX = 6
const PADDING_SUPERIOR_PX = 6 // top-1.5
const PASO_CARRIL_PX = ALTO_BARRA_PX + ESPACIO_ENTRE_CARRILES_PX
// Umbral absoluto (no un múltiplo de columna): lo que hace falta para que
// "Ocupación real" + badge + botón entren sin recortarse. Con columnas de
// semana (140px) casi todo cae en la variante expandida.
const ANCHO_MINIMO_EXPANDIDO_PX = 118
/** La ocupación lleva rótulo + badge de origen + ícono de "ver origen": con el
 * umbral de 118 px el rótulo quedaba en ancho cero y una ocupación de un solo
 * día se veía como "« Prisma Ver" (visto el 13 de sep. 2026). */
const ANCHO_MINIMO_OCUPACION_EXPANDIDA_PX = 250

/** Rayado gris de la ocupación real de Prisma, compartido con la vista Día. */
export const CLASE_OCUPACION_RAYADA =
  'border border-border bg-[repeating-linear-gradient(135deg,var(--color-muted),var(--color-muted)_6px,color-mix(in_oklch,var(--color-muted),var(--color-foreground)_6%)_6px,color-mix(in_oklch,var(--color-muted),var(--color-foreground)_6%)_12px)]'

/** De qué es una ocupación real: la respalda una APROBADA del mismo proyecto
 * con esta máquina (`esDeSolicitudId`), o es un uso registrado en el equipo sin
 * esa solicitud. Solo rotula lo que ya trae el contrato. */
export function rotuloOcupacion(ocupacion: OcupacionReal, corto = false): string {
  if (ocupacion.esDeSolicitudId !== null) return corto ? 'Confirmada' : 'Confirmada en Prisma'
  return corto ? 'Sin solicitud' : 'Uso sin solicitud APROBADA'
}

/** Texto completo para el tooltip: rótulo, proyecto y fechas reales de uso. */
export function tituloOcupacion(ocupacion: OcupacionReal): string {
  const proyecto = ocupacion.codigoProyecto ?? ocupacion.proyecto.valor ?? 'sin proyecto'
  return `${rotuloOcupacion(ocupacion)} · ${proyecto} · Prisma · ${ocupacion.inicio.valor ?? 'Sin registro'} → ${ocupacion.fin.valor ?? 'Sin registro'}`
}

export const TEXTO_REEMPLAZO = 'Reemplazo propuesto — la asignación en Prisma no se modifica'

/** Contorno punteado de una propuesta que solo existe en la vista previa de
 * reprogramación. Compartido con la vista Día. */
export const CLASE_REPROGRAMADA = 'outline-2 outline-dashed -outline-offset-4 outline-white/80'

export function tituloReprogramada(r: SolicitudReprogramada): string {
  return `Reprogramada +${r.atrasoDias} día(s): pedida ${r.original.inicio} → ${r.original.fin}, propuesta ${r.propuesta.inicio} → ${r.propuesta.fin} (vista previa, no se guarda)`
}

/**
 * Velocidad promedio asumida para estimar el tiempo de viaje entre dos
 * proyectos consecutivos de una misma máquina — **supuesto del planificador,
 * no un dato de Prisma/Startrack** (ninguna de las dos expone velocidad de
 * traslado real). Decisión explícita del 13 de sep. 2026, pedida así en
 * feedback directo, con la referencia "40km ≈ 1h" como calibración. Por eso
 * `GapViaje` SIEMPRE rotula el resultado como estimado y nunca lo mezcla con
 * un objetivo real del solver (`distancia`, que sí es haversine contra
 * geocercas reales, se muestra aparte, sin convertir a tiempo).
 */
const VELOCIDAD_ESTIMADA_KMH = 40

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatearHorasEstimadas(horas: number): string {
  if (horas < 1) return `${Math.round(horas * 60)} min`
  return `${horas.toFixed(horas < 10 ? 1 : 0)} h`
}

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

export function altoFila(cantidadCarriles: number): number {
  return PADDING_SUPERIOR_PX * 2 + Math.max(cantidadCarriles, 1) * PASO_CARRIL_PX - ESPACIO_ENTRE_CARRILES_PX
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

/** Código, clase y motivo de no operar de una máquina — la misma columna fija
 * en la semana y en el día. */
export function EtiquetaMaquina({ maquina }: { maquina: FilaMaquina }) {
  return (
    <>
      <span className="truncate text-sm font-semibold">{maquina.codigoActivo.valor ?? 'Sin registro'}</span>
      <span className="truncate text-xs text-muted-foreground">
        {maquina.clase.valor ?? 'Sin registro'}
        {!maquina.claseEnCatalogo && ' · clase fuera de catálogo'}
      </span>
      {!maquina.puedeOperar && maquina.motivoNoOpera && (
        <span className="truncate text-[11px] text-muted-foreground" title={maquina.motivoNoOpera}>
          {maquina.motivoNoOpera}
        </span>
      )}
    </>
  )
}

function EncabezadoDia({ fecha, esHoy, onClick }: { fecha: string; esHoy: boolean; onClick: () => void }) {
  const d = new Date(aFechaUtc(fecha))
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Ver el ${fecha} por horas`}
      className={cn(
        'flex shrink-0 flex-col items-center justify-center gap-0.5 border-l border-border py-2 font-label text-[11px] transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
        esHoy ? 'bg-primary/5 font-bold text-primary' : 'text-muted-foreground',
      )}
      style={{ width: ANCHO_COLUMNA_PX }}
    >
      <span className="capitalize">{DIA_SEMANA_LARGO[d.getUTCDay()]}</span>
      <span className="font-mono text-base">{d.getUTCDate()}</span>
      {esHoy && <span className="font-label text-[9px] uppercase tracking-widest">Hoy</span>}
    </button>
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
  const compacto = width < ANCHO_MINIMO_OCUPACION_EXPANDIDA_PX

  return (
    <div
      className={cn(
        'absolute flex items-center gap-1.5 overflow-hidden px-2',
        CLASE_OCUPACION_RAYADA,
        cortadaIzq ? 'rounded-l-none pl-4' : 'rounded-l-lg',
        cortadaDer ? 'rounded-r-none pr-4' : 'rounded-r-lg',
      )}
      style={{ left, top, width, height: ALTO_BARRA_PX }}
      title={tituloOcupacion(ocupacion)}
    >
      {cortadaIzq && <MarcaCorte lado="izq" />}
      {compacto && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-origen-prisma" />}
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate font-label text-[11px] font-semibold text-muted-foreground">
          {rotuloOcupacion(ocupacion, compacto)}
          {!compacto && ocupacion.codigoProyecto && ` · ${ocupacion.codigoProyecto}`}
        </span>
        {compacto && ocupacion.codigoProyecto && (
          <span className="truncate font-mono text-[10px] text-muted-foreground">{ocupacion.codigoProyecto}</span>
        )}
      </span>
      {!compacto && <BadgeOrigen plataforma="prisma" corto />}
      <VerOrigen linaje={[ocupacion.inicio.linaje, ocupacion.fin.linaje, ocupacion.proyecto.linaje]} compacto />
      {cortadaDer && <MarcaCorte lado="der" />}
    </div>
  )
}

function BarraPropuesta({
  asignacion,
  ventana,
  carril,
  onSeleccionar,
  reprogramada,
}: {
  asignacion: AsignacionPropuesta
  ventana: VentanaSemana
  carril: number
  onSeleccionar: (a: AsignacionPropuesta) => void
  reprogramada?: SolicitudReprogramada
}) {
  const { left, top, width, cortadaIzq, cortadaDer } = posicion(
    ventana,
    asignacion.solicitud.inicioEfectivo,
    asignacion.solicitud.fin.valor!,
    carril,
  )
  const compacto = width < ANCHO_MINIMO_EXPANDIDO_PX
  const codigo = asignacion.solicitud.codigoProyecto ?? asignacion.solicitud.proyecto.valor ?? 'Sin registro'
  const operador = asignacion.operador.codTrabajador.valor ?? 'Sin registro'
  const esReemplazo = asignacion.reemplazaConfirmada !== null

  return (
    <button
      type="button"
      onClick={() => onSeleccionar(asignacion)}
      title={[`${codigo} · ${operador}`, esReemplazo ? TEXTO_REEMPLAZO : null, reprogramada ? tituloReprogramada(reprogramada) : null]
        .filter(Boolean)
        .join(' · ')}
      className={cn(
        'absolute flex flex-col justify-center gap-0.5 overflow-hidden bg-marca px-2.5 text-left text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-clara focus-visible:ring-offset-1',
        cortadaIzq ? 'rounded-l-none pl-4' : 'rounded-l-lg',
        cortadaDer ? 'rounded-r-none pr-4' : 'rounded-r-lg',
        reprogramada && CLASE_REPROGRAMADA,
      )}
      style={{ left, top, width, height: ALTO_BARRA_PX }}
    >
      {cortadaIzq && <MarcaCorte lado="izq" />}
      <span className="flex items-center gap-1 truncate font-label text-xs font-semibold leading-tight">
        {reprogramada ? (
          <CalendarClock aria-hidden className="size-3 shrink-0" />
        ) : (
          esReemplazo && <ArrowRightLeft aria-hidden className="size-3 shrink-0" />
        )}
        <span className="truncate">{codigo}</span>
      </span>
      {!compacto &&
        (reprogramada ? (
          <span className="truncate font-label text-[10px] leading-tight text-white/90">
            +{reprogramada.atrasoDias} d · vista previa · {operador}
          </span>
        ) : esReemplazo ? (
          <span className="truncate font-label text-[10px] leading-tight text-white/90">{TEXTO_REEMPLAZO}</span>
        ) : (
          <span className="truncate font-mono text-[10px] leading-tight text-white/80">{operador}</span>
        ))}
      {compacto && esReemplazo && <span className="sr-only">{TEXTO_REEMPLAZO}</span>}
      {compacto && reprogramada && <span className="sr-only">{tituloReprogramada(reprogramada)}</span>}
      {cortadaDer && <MarcaCorte lado="der" />}
    </button>
  )
}

function BarraSinAsignacion({
  ventana,
  carril,
  sinAsignacion,
  respuesta,
}: {
  ventana: VentanaSemana
  carril: number
  sinAsignacion: SolicitudSinAsignacion
  respuesta: RespuestaOptimizar
}) {
  const { solicitud } = sinAsignacion
  const texto = `${solicitud.clase.valor ?? 'Sin registro'} · ${solicitud.codigoProyecto ?? solicitud.proyecto.valor ?? 'Sin registro'} · ${sinAsignacion.motivo}`
  const { left, top, width, cortadaIzq, cortadaDer } = posicion(ventana, solicitud.inicioEfectivo, solicitud.fin.valor!, carril)
  const compacto = width < ANCHO_MINIMO_EXPANDIDO_PX
  return (
    <TarjetaSinAsignacion
      sinAsignacion={sinAsignacion}
      respuesta={respuesta}
      className={cn(
        'absolute flex items-center overflow-hidden border border-dashed border-border bg-muted transition-colors hover:border-foreground/40',
        compacto ? 'justify-center px-1' : 'gap-1.5 px-2.5',
        cortadaIzq ? 'rounded-l-none pl-4' : 'rounded-l-lg',
        cortadaDer ? 'rounded-r-none pr-4' : 'rounded-r-lg',
      )}
      style={{ left, top, width, height: ALTO_BARRA_PX }}
    >
      {cortadaIzq && <MarcaCorte lado="izq" />}
      <Ban aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      {!compacto && <span className="truncate font-label text-[11px] text-muted-foreground">{texto}</span>}
      {cortadaDer && <MarcaCorte lado="der" />}
    </TarjetaSinAsignacion>
  )
}

/**
 * Gap de viaje entre dos propuestas consecutivas de una misma máquina.
 * `km` sale de una distancia real (haversine entre las geocercas de los dos
 * proyectos, `SolicitudPlan.destino`) — la hora es la única parte estimada
 * (`VELOCIDAD_ESTIMADA_KMH`), y el rótulo lo deja explícito siempre, incluso
 * en la variante compacta (el ícono `Route` es distinto al de una barra real
 * a propósito). Solo se dibuja entre dos `AsignacionPropuesta`: una
 * "Ocupación real" (APROBADA) no expone destino en el contrato.
 */
function GapViaje({ ventana, desde, hasta, km, carril }: { ventana: VentanaSemana; desde: string; hasta: string; km: number; carril: number }) {
  const { left, top, width, cortadaIzq, cortadaDer } = posicion(ventana, desde, hasta, carril)
  const horas = km / VELOCIDAD_ESTIMADA_KMH
  const compacto = width < ANCHO_MINIMO_EXPANDIDO_PX
  const texto = `${km.toFixed(0)} km entre proyectos · ~${formatearHorasEstimadas(horas)} de viaje estimado a ${VELOCIDAD_ESTIMADA_KMH} km/h (no es un dato de Prisma/Startrack)`

  return (
    <div
      className={cn(
        'absolute flex items-center gap-1 overflow-hidden rounded-md border border-dashed border-muted-foreground/30 text-muted-foreground',
        compacto ? 'justify-center px-1' : 'px-2',
      )}
      style={{ left, top: top + ALTO_BARRA_PX / 4, width, height: ALTO_BARRA_PX / 2 }}
      title={texto}
    >
      {cortadaIzq && <MarcaCorte lado="izq" />}
      <Route aria-hidden className="size-3 shrink-0" />
      {!compacto && (
        <span className="truncate font-label text-[10px]">
          {km.toFixed(0)} km · ~{formatearHorasEstimadas(horas)} viaje (estimado)
        </span>
      )}
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
  reprogramadas,
}: {
  maquina: FilaMaquina
  ventana: VentanaSemana
  asignaciones: AsignacionPropuesta[]
  onSeleccionar: (a: AsignacionPropuesta) => void
  anchoTotal: number
  reprogramadas?: ReadonlyMap<string, SolicitudReprogramada>
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

  // Gap de viaje entre dos propuestas consecutivas (no ocupación real — ver
  // el comentario de GapViaje). Se calcula sobre TODAS las asignaciones de la
  // máquina (no solo las visibles) para no perder el gap que arranca en una
  // semana y sigue en la otra; el propio `GapViaje`/`posicion()` recorta lo
  // que no entra en `ventana`.
  const carrilPorSolicitudId = new Map(
    itemsConCarril
      .filter((ic): ic is { item: Extract<Item, { tipo: 'propuesta' }>; carril: number } => ic.item.tipo === 'propuesta')
      .map(({ item, carril }) => [item.data.solicitud.id, carril]),
  )
  const asignacionesOrdenadas = [...asignaciones].sort((a, b) =>
    a.solicitud.inicioEfectivo.localeCompare(b.solicitud.inicioEfectivo),
  )
  const gaps: { desde: string; hasta: string; km: number; carril: number }[] = []
  for (let i = 0; i < asignacionesOrdenadas.length - 1; i++) {
    const actual = asignacionesOrdenadas[i]
    const siguiente = asignacionesOrdenadas[i + 1]
    const gapDesde = sumarDias(actual.solicitud.fin.valor!, 1)
    const gapHasta = sumarDias(siguiente.solicitud.inicioEfectivo, -1)
    if (gapDesde > gapHasta) continue // adyacentes o superpuestas: sin día libre para viajar
    if (!seSuperponen(gapDesde, gapHasta, ventana.desde, ventana.hasta)) continue

    const origen = actual.solicitud.destino
    const destino = siguiente.solicitud.destino
    if (!origen || !destino || origen.lat.valor == null || origen.lon.valor == null || destino.lat.valor == null || destino.lon.valor == null) {
      continue // sin las dos geocercas resueltas no hay distancia real que mostrar
    }

    const carrilActual = carrilPorSolicitudId.get(actual.solicitud.id)
    const carrilSiguiente = carrilPorSolicitudId.get(siguiente.solicitud.id)
    if (carrilActual == null || carrilSiguiente == null || carrilActual !== carrilSiguiente) continue

    gaps.push({
      desde: gapDesde,
      hasta: gapHasta,
      km: haversineKm(origen.lat.valor, origen.lon.valor, destino.lat.valor, destino.lon.valor),
      carril: carrilActual,
    })
  }

  return (
    <div className="flex border-b border-border last:border-b-0">
      <div
        className="sticky left-0 z-1 flex shrink-0 flex-col justify-center gap-0.5 border-r border-border bg-card px-3 py-2"
        style={{ width: ANCHO_ETIQUETA_PX }}
      >
        <EtiquetaMaquina maquina={maquina} />
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
              reprogramada={reprogramadas?.get(item.data.solicitud.id)}
            />
          ),
        )}
        {gaps.map((g, i) => (
          <GapViaje key={`gap-${i}`} ventana={ventana} desde={g.desde} hasta={g.hasta} km={g.km} carril={g.carril} />
        ))}
      </div>
    </div>
  )
}

export function TimelineMaquinas({
  respuesta,
  inicioSemana,
  onCambiarInicioSemana,
  onSeleccionarAsignacion,
  onSeleccionarDia,
  reprogramadas,
}: {
  respuesta: RespuestaOptimizar
  inicioSemana: string
  onCambiarInicioSemana: (fecha: string) => void
  onSeleccionarAsignacion: (a: AsignacionPropuesta) => void
  onSeleccionarDia: (fecha: string) => void
  /** Solo en la vista previa de reprogramación: marca las propuestas movidas. */
  reprogramadas?: ReadonlyMap<string, SolicitudReprogramada>
}) {
  const { desde: desdeHorizonte, hasta: hastaHorizonte } = respuesta.horizonte
  const desdeSemana = clampFecha(inicioSemana, desdeHorizonte, hastaHorizonte)
  const hastaSemana = clampFecha(sumarDias(desdeSemana, DIAS_POR_SEMANA - 1), desdeSemana, hastaHorizonte)
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
            onClick={() => onCambiarInicioSemana(sumarDias(desdeSemana, -DIAS_POR_SEMANA))}
            disabled={!puedeIrAnterior}
          >
            <ChevronLeft aria-hidden className="size-3.5" />
            Semana anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCambiarInicioSemana(sumarDias(desdeSemana, DIAS_POR_SEMANA))}
            disabled={!puedeIrSiguiente}
          >
            Semana siguiente
            <ChevronRight aria-hidden className="size-3.5" />
          </Button>
          {desdeSemana !== respuesta.hoy && (
            <Button variant="ghost" size="sm" onClick={() => onCambiarInicioSemana(respuesta.hoy)}>
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
                <EncabezadoDia
                  key={fecha}
                  fecha={fecha}
                  esHoy={fecha === respuesta.hoy}
                  onClick={() => onSeleccionarDia(fecha)}
                />
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
                    carril={carril}
                    sinAsignacion={s}
                    respuesta={respuesta}
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
              reprogramadas={reprogramadas}
            />
          ))}
        </div>
      </div>

      {respuesta.sinAsignacion.length > sinAsignacionVisible.length && (
        <p className="text-xs text-muted-foreground">
          {`${respuesta.sinAsignacion.length - sinAsignacionVisible.length} solicitud(es) sin asignación posible caen fuera de esta semana — navegá para verlas.`}
        </p>
      )}
    </div>
  )
}
