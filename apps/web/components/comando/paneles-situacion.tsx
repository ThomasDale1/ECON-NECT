'use client'

import { ArrowRight, Clock, MapPin, Truck, X } from 'lucide-react'
import { PanelSituacion, useCarrusel } from '@/components/comando/panel-situacion'
import { BadgeOrigen } from '@/components/nect/badge-origen'
import type { ActivoEnCurso, ViolacionGeocerca } from '@/app/(nect)/command-center/datos-de-ejemplo'

/**
 * Los dos carruseles de la fila superior del Command Center.
 *
 * Cada fila de activo lleva el badge de origen de Startrack, que es la plataforma
 * que observa el traslado y la geocerca. Va como badge de contorno con punto
 * naranja (ui-registry §1.2): el relleno rojo del mockup competía con el rojo de
 * la severidad.
 */
export function PanelEnCurso({
  activos,
  urlStartrack,
}: {
  activos: ActivoEnCurso[]
  urlStartrack: string | null
}) {
  const { indice, setIndice } = useCarrusel(activos.length)
  const activo = activos[indice]

  return (
    <PanelSituacion
      titulo="En curso"
      conteo={`${activos.length} activos en tránsito`}
      iconoConteo={<Truck aria-hidden className="size-3" />}
      total={activos.length}
      indice={indice}
      onIndice={setIndice}
    >
      <article className="flex items-center gap-4 rounded-xl bg-muted p-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-origen-prisma/10">
          <Truck aria-hidden className="size-8 text-origen-prisma" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex flex-col gap-0.5">
            <h3 className="font-heading text-sm font-bold">
              {activo.codigo} {activo.nombre}
            </h3>
            <p className="font-label text-[11px] text-muted-foreground">
              {activo.modelo} · {activo.clase}
            </p>
          </div>
          <div className="flex items-center gap-2 font-label text-[11px] text-muted-foreground">
            <MapPin aria-hidden className="size-3 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{activo.origen}</span>
            <ArrowRight aria-hidden className="size-3 shrink-0" />
            <MapPin aria-hidden className="size-3 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{activo.destino}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2.5">
          <span className="rounded-full bg-origen-prisma/10 px-2.5 py-1.5 font-label text-[11px] font-bold uppercase text-origen-prisma">
            {activo.estado}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock aria-hidden className="size-3 text-primary" />
            <span className="font-mono text-[13px] font-bold text-primary">
              ~{activo.etaMinutos} min
            </span>
          </span>
          <BadgeOrigen
            plataforma="startrack"
            corto
            href={urlStartrack}
            equipo={activo.codigo}
          />
        </div>
      </article>
    </PanelSituacion>
  )
}

export function PanelFueraDeGeocerca({
  violaciones,
  urlStartrack,
}: {
  violaciones: ViolacionGeocerca[]
  urlStartrack: string | null
}) {
  const { indice, setIndice } = useCarrusel(violaciones.length)
  const violacion = violaciones[indice]

  return (
    <PanelSituacion
      titulo="Fuera de geocerca"
      conteo={`${violaciones.length} violaciones activas`}
      tono="alerta"
      total={violaciones.length}
      indice={indice}
      onIndice={setIndice}
    >
      <article className="flex items-center gap-3 rounded-xl border border-veredicto-riesgo/20 bg-veredicto-riesgo-fondo p-3.5">
        <div className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-veredicto-riesgo/10">
          <Truck aria-hidden className="size-6 text-veredicto-riesgo" />
          <span className="absolute bottom-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-veredicto-riesgo">
            <X aria-hidden className="size-2.5 text-white" strokeWidth={3} />
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="font-heading text-sm font-bold">
            {violacion.codigo} {violacion.nombre}
          </h3>
          <p className="font-label text-[11px] text-muted-foreground">
            {violacion.modelo} · {violacion.clase}
          </p>
          <p className="flex items-center gap-1.5 font-label text-[11px] text-muted-foreground">
            <MapPin aria-hidden className="size-3 shrink-0" />
            <span className="min-w-0 truncate">{violacion.geocerca}</span>
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <time className="font-mono text-[11px] text-muted-foreground">{violacion.hora}</time>
          <button
            type="button"
            className="rounded-full bg-veredicto-riesgo px-2.5 py-1 font-label text-[11px] font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-veredicto-riesgo focus-visible:ring-offset-2"
          >
            Atender
          </button>
          <span className="inline-flex items-center gap-1 rounded-md bg-veredicto-riesgo px-2.5 py-1 font-label text-[10px] font-bold uppercase text-white">
            <X aria-hidden className="size-2.5" strokeWidth={3} />
            {violacion.severidad}
          </span>
          <BadgeOrigen
            plataforma="startrack"
            corto
            href={urlStartrack}
            equipo={violacion.codigo}
          />
        </div>
      </article>
    </PanelSituacion>
  )
}
