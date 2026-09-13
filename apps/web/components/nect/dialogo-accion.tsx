'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { BadgeVeredicto } from '@/components/nect/badge-veredicto'
import { FALTANTE_EN_PALABRAS } from '@/components/nect/faltantes'
import { lecturaRespaldo } from '@/components/nect/respaldo'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { EquipoUnificado, ResultadoRegla, Rol } from '@/lib/tipos/canonico'
import { cn } from '@/lib/utils'

/**
 * Detalle de una fila: por qué el motor concluyó eso, si había datos
 * suficientes, y el siguiente paso. El color solo expresa severidad.
 */
const ROL: Record<Rol, string> = {
  PROYECTOS: 'Proyectos',
  LOGISTICA: 'Logística',
  MANTENIMIENTO: 'Mantenimiento',
  COSTOS: 'Control de costos',
  DIRECCION: 'Dirección',
}

export function DialogoAccion({ equipo }: { equipo: EquipoUnificado }) {
  const decisiva: ResultadoRegla | undefined =
    equipo.reglas.find((r) => r.veredicto === equipo.veredicto) ?? equipo.reglas[0]
  const { faltantes, puedeConcluir, etiqueta } = lecturaRespaldo(equipo)
  const codigo = equipo.codigoActivo.valor ?? equipo.id

  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          'group flex w-full cursor-pointer flex-col items-start gap-1 rounded-lg border border-border bg-card px-3 py-2 text-left',
          'transition-colors hover:border-primary hover:bg-muted',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        )}
      >
        <span
          className={cn(
            'font-label text-[12px] font-bold tracking-normal',
            puedeConcluir ? 'text-foreground' : 'text-veredicto-sin-evidencia',
          )}
        >
          {etiqueta}
        </span>
        <span className="font-label text-[11px] leading-snug tracking-normal text-muted-foreground">
          {decisiva?.accionSugerida ?? 'Sin paso sugerido'}
        </span>
        <span className="mt-0.5 flex items-center gap-1 font-label text-[11px] font-bold text-primary underline-offset-2 group-hover:underline">
          Ver detalle
          <ArrowRight aria-hidden className="size-3" />
        </span>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-3">
            <span className="font-heading text-lg font-extrabold tracking-tight text-primary">
              {codigo}
            </span>
            <BadgeVeredicto veredicto={equipo.veredicto} />
          </DialogTitle>
          <DialogDescription className="text-left font-label tracking-normal">
            {equipo.nombre.valor ?? 'Sin nombre registrado'}
            {equipo.ubicacion?.descripcion.valor ? ` · ${equipo.ubicacion.descripcion.valor}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 font-label tracking-normal">
          {decisiva && (
            <section className="flex flex-col gap-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Lectura del motor
              </h3>
              <p className="text-sm font-bold">{decisiva.nombre}</p>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-[13px] leading-snug text-muted-foreground">
                {decisiva.porque.map((razon) => (
                  <li key={razon}>{razon}</li>
                ))}
              </ul>
            </section>
          )}

          <section
            className={cn(
              'flex flex-col gap-2 rounded-lg border p-4',
              puedeConcluir
                ? 'border-border bg-muted'
                : 'border-veredicto-sin-evidencia/25 bg-veredicto-sin-evidencia-fondo',
            )}
          >
            <h3
              className={cn(
                'text-[11px] font-bold uppercase tracking-wide',
                puedeConcluir ? 'text-foreground' : 'text-veredicto-sin-evidencia',
              )}
            >
              {etiqueta}
            </h3>
            {puedeConcluir ? (
              <p className="text-[13px] leading-snug">
                Prisma y Startrack devolvieron lo que esta regla necesita. El
                veredicto no es por un hueco: es la interpretación de esos datos.
              </p>
            ) : (
              <ul className="flex list-disc flex-col gap-1 pl-5 text-[13px] leading-snug">
                {faltantes.length > 0 ? (
                  faltantes.map((f) => <li key={f}>{FALTANTE_EN_PALABRAS[f] ?? f}</li>)
                ) : (
                  <li>La evidencia no alcanza para afirmar ni descartar un riesgo.</li>
                )}
              </ul>
            )}
          </section>

          {decisiva && (
            <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Siguiente paso
              </h3>
              <p className="text-[13px] leading-snug">{decisiva.accionSugerida}</p>
              <p className="text-[12px] text-muted-foreground">
                Responsable: <strong className="font-bold">{ROL[decisiva.rolResponsable]}</strong>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Lo propone la regla {decisiva.regla}, no un pronóstico. O.D.I.N.
                explica; no cambia este paso.
              </p>
            </section>
          )}

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/equipo/${encodeURIComponent(equipo.id)}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2',
                'text-[13px] font-bold text-primary-foreground transition-opacity hover:opacity-90',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              )}
            >
              Abrir la ficha completa
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
            <button
              type="button"
              disabled
              title="Propagar la decisión a Startrack llega en S-A4"
              className="cursor-not-allowed rounded-lg border border-border px-4 py-2 text-[13px] font-bold text-muted-foreground opacity-60"
            >
              Tomar acción
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
