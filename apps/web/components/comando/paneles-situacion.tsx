'use client'

import { Clock, MapPin, Truck, X } from 'lucide-react'
import { PanelSituacion, useCarrusel } from '@/components/comando/panel-situacion'
import { BadgeOrigen } from '@/components/nect/badge-origen'
import { VerOrigen } from '@/components/nect/ver-origen'
import type { EquipoUnificado } from '@/lib/tipos/canonico'

/**
 * Los dos carruseles de la fila superior del Command Center.
 *
 * **Los dos leen la flota real.** Hasta el 13 de septiembre de 2026 mostraban
 * un fixture escrito a mano desde el mockup: tres traslados y tres violaciones
 * de geocerca que no existían en ninguna plataforma. Un número en pantalla
 * tiene que poder señalar de qué endpoint salió (AGENTS.md §1.1), así que el
 * fixture se borró y estos paneles derivan de `EquipoUnificado`.
 *
 * Cuando no hay nada que mostrar, el panel lo dice. Un carrusel vacío es un
 * resultado legítimo, y muy distinto de inventarle contenido.
 */

/** Un traslado vivo: hay tarea en Startrack y no está finalizada. */
export function PanelEnCurso({
  equipos,
  urlStartrack,
}: {
  equipos: EquipoUnificado[]
  urlStartrack: string | null
}) {
  const { indice, setIndice } = useCarrusel(equipos.length)
  const equipo = equipos[indice]

  return (
    <PanelSituacion
      titulo="Tareas de traslado vivas"
      conteo={`${equipos.length} ${equipos.length === 1 ? 'tarea abierta' : 'tareas abiertas'}`}
      iconoConteo={<Truck aria-hidden className="size-3" />}
      total={equipos.length}
      indice={indice}
      onIndice={setIndice}
    >
      {equipo ? (
        <article className="flex items-center gap-4 rounded-xl bg-muted p-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-origen-prisma/10">
            <Truck aria-hidden className="size-8 text-origen-prisma" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <div className="flex flex-col gap-0.5">
              <h3 className="font-heading text-sm font-bold">
                {equipo.codigoActivo.valor ?? 'Sin código'} {equipo.nombre.valor ?? ''}
              </h3>
              {equipo.equipo?.valor ? (
                <p className="font-label text-[11px] text-muted-foreground">
                  Prisma: {equipo.equipo.valor}
                </p>
              ) : null}
            </div>
            {equipo.ubicacion?.descripcion.valor ? (
              <div className="flex items-center gap-2 font-label text-[11px] text-muted-foreground">
                <MapPin aria-hidden className="size-3 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  {equipo.ubicacion.descripcion.valor}
                </span>
                <VerOrigen
                  linaje={equipo.ubicacion.descripcion.linaje}
                  etiqueta="la ubicación"
                  compacto
                />
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2.5">
            {/* El estado es el que devuelve Startrack, sin traducir: llamarlo
                "En curso" cuando la tarea dice Pending sería afirmar de más. */}
            <span className="flex items-center gap-1.5">
              <span className="rounded-full bg-origen-prisma/10 px-2.5 py-1.5 font-label text-[11px] font-bold uppercase text-origen-prisma">
                {equipo.tarea?.valor ?? 'Sin estado'}
              </span>
              {equipo.tarea ? (
                <VerOrigen linaje={equipo.tarea.linaje} etiqueta="el estado de la tarea" compacto />
              ) : null}
            </span>
            <BadgeOrigen
              plataforma="startrack"
              corto
              href={urlStartrack}
              equipo={equipo.codigoActivo.valor ?? undefined}
            />
          </div>
        </article>
      ) : (
        <PanelVacio
          titulo="Ninguna tarea de traslado abierta"
          detalle="Startrack no devolvió tareas vivas para los equipos de esta lectura. No es un fallo: es el estado del sandbox ahora mismo."
        />
      )}
    </PanelSituacion>
  )
}

/** Equipos cuya posición en vivo cae fuera del radio de su geocerca. */
export function PanelFueraDeGeocerca({
  equipos,
  urlStartrack,
  sinRadio,
}: {
  equipos: EquipoUnificado[]
  urlStartrack: string | null
  /** Cuántos equipos tienen geocerca pero no se pudo resolver dentro/fuera. */
  sinRadio: number
}) {
  const { indice, setIndice } = useCarrusel(equipos.length)
  const equipo = equipos[indice]
  const geocerca = equipo?.geocercaProyecto ?? null

  return (
    <PanelSituacion
      titulo="Fuera de geocerca"
      conteo={`${equipos.length} ${equipos.length === 1 ? 'equipo fuera' : 'equipos fuera'}`}
      tono="alerta"
      total={equipos.length}
      indice={indice}
      onIndice={setIndice}
    >
      {equipo && geocerca ? (
        <article className="flex items-center gap-3 rounded-xl border border-veredicto-riesgo/20 bg-veredicto-riesgo-fondo p-3.5">
          <div className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-veredicto-riesgo/10">
            <Truck aria-hidden className="size-6 text-veredicto-riesgo" />
            <span className="absolute bottom-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-veredicto-riesgo">
              <X aria-hidden className="size-2.5 text-white" strokeWidth={3} />
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="font-heading text-sm font-bold">
              {equipo.codigoActivo.valor ?? 'Sin código'} {equipo.nombre.valor ?? ''}
            </h3>
            <p className="flex items-center gap-1.5 font-label text-[11px] text-muted-foreground">
              <MapPin aria-hidden className="size-3 shrink-0" />
              <span className="min-w-0 truncate">{geocerca.nombre.valor ?? 'Sin geocerca'}</span>
              <VerOrigen linaje={geocerca.nombre.linaje} etiqueta="la geocerca" compacto />
            </p>
            {/* La cifra es la que sostiene la afirmación: a cuánto está del
                centro y cuál es el radio contra el que se comparó. */}
            <p className="font-mono text-[11px] text-veredicto-riesgo">
              {formatearDistancia(geocerca.distanciaMetros)} del centro · radio{' '}
              {formatearDistancia(geocerca.radioMetros)}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {geocerca.precisionRadio === 'circulo-contenedor' ? (
              <span className="font-label text-[10px] text-muted-foreground">radio aproximado</span>
            ) : null}
            <BadgeOrigen
              plataforma="startrack"
              corto
              href={urlStartrack}
              equipo={equipo.codigoActivo.valor ?? undefined}
            />
          </div>
        </article>
      ) : (
        <PanelVacio
          titulo="Ningún equipo fuera de su geocerca"
          detalle={
            sinRadio > 0
              ? `Ninguno de los equipos con posición en vivo cae fuera del radio de su geocerca. Quedan ${sinRadio} sin resolver por falta de radio o de posición.`
              : 'Ninguno de los equipos con posición en vivo cae fuera del radio de su geocerca.'
          }
        />
      )}
    </PanelSituacion>
  )
}

/** Metros hasta 1 km; kilómetros con un decimal a partir de ahí. */
function formatearDistancia(metros: number | null): string {
  if (metros === null) return 'sin dato'
  if (metros < 1000) return `${metros} m`
  return `${(metros / 1000).toFixed(1)} km`
}

function PanelVacio({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-dashed border-border bg-muted/40 p-4">
      <p className="flex items-center gap-2 font-heading text-[13px] font-bold text-muted-foreground">
        <Clock aria-hidden className="size-3.5" />
        {titulo}
      </p>
      <p className="font-label text-[11px] leading-snug text-muted-foreground">{detalle}</p>
    </div>
  )
}
