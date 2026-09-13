'use client'

import { ArrowRight, CircleCheck, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { BadgeVeredicto } from '@/components/nect/badge-veredicto'
import { FALTANTE_EN_PALABRAS } from '@/components/nect/faltantes'
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
 * El detalle de una fila de la bandeja, en un diálogo.
 *
 * La tabla queda con lo que se escanea de un vistazo —severidad, activo, los dos
 * estados, si la evidencia está completa— y todo lo que se lee con calma vive
 * acá: por qué el motor concluyó eso, qué falta, cuál es el siguiente paso y
 * quién lo ejecuta.
 *
 * El color sigue significando una sola cosa: severidad del veredicto. El bloque
 * de "qué falta" va en violeta, nunca en rojo, porque evidencia insuficiente no
 * es una alarma (ui-registry §1.1).
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
  const faltantes = [...new Set(equipo.reglas.flatMap((r) => r.camposFaltantes))]
  const codigo = equipo.codigoActivo.valor ?? equipo.id
  const completa = faltantes.length === 0

  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          'flex w-full flex-col items-start gap-1 rounded-lg px-2 py-1.5 text-left transition-colors',
          'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        )}
      >
        <span
          className={cn(
            'flex items-center gap-1.5 font-label text-[12px] font-bold',
            completa ? 'text-veredicto-coherente' : 'text-veredicto-sin-evidencia',
          )}
        >
          {completa ? (
            <CircleCheck aria-hidden className="size-3.5 shrink-0" />
          ) : (
            <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
          )}
          {completa ? 'Evidencia completa' : `Faltan ${faltantes.length} datos`}
        </span>
        <span className="flex items-center gap-1 font-label text-[11px] text-muted-foreground underline-offset-2 group-hover:underline">
          Ver siguientes pasos
          <ArrowRight aria-hidden className="size-3" />
        </span>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-3">
            <span className="font-heading text-lg font-extrabold text-primary">{codigo}</span>
            <BadgeVeredicto veredicto={equipo.veredicto} />
          </DialogTitle>
          <DialogDescription className="text-left">
            {equipo.nombre.valor ?? 'Sin nombre registrado'}
            {equipo.ubicacion?.descripcion.valor ? ` · ${equipo.ubicacion.descripcion.valor}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {decisiva && (
            <section className="flex flex-col gap-2">
              <h3 className="font-label text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Por qué
              </h3>
              <p className="font-label text-sm font-bold">{decisiva.nombre}</p>
              <ul className="flex list-disc flex-col gap-1 pl-5 font-label text-[13px] leading-snug text-muted-foreground">
                {decisiva.porque.map((razon) => (
                  <li key={razon}>{razon}</li>
                ))}
              </ul>
            </section>
          )}

          <section
            className={cn(
              'flex flex-col gap-2 rounded-lg border p-4',
              completa
                ? 'border-veredicto-coherente/25 bg-veredicto-coherente-fondo'
                : 'border-veredicto-sin-evidencia/25 bg-veredicto-sin-evidencia-fondo',
            )}
          >
            <h3
              className={cn(
                'font-label text-[11px] font-bold uppercase tracking-wide',
                completa ? 'text-veredicto-coherente' : 'text-veredicto-sin-evidencia',
              )}
            >
              {completa ? 'Evidencia completa' : 'Qué falta para poder concluir'}
            </h3>
            {completa ? (
              <p className="font-label text-[13px] leading-snug">
                Las dos plataformas respondieron con todo lo que esta regla necesita.
              </p>
            ) : (
              <ul className="flex list-disc flex-col gap-1 pl-5 font-label text-[13px] leading-snug">
                {faltantes.map((f) => (
                  <li key={f}>{FALTANTE_EN_PALABRAS[f] ?? f}</li>
                ))}
              </ul>
            )}
          </section>

          {decisiva && (
            <section className="flex flex-col gap-2 rounded-lg border border-border bg-muted p-4">
              <h3 className="font-label text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Siguiente paso
              </h3>
              <p className="font-label text-[13px] leading-snug">{decisiva.accionSugerida}</p>
              <p className="font-label text-[12px] text-muted-foreground">
                Responsable: <strong className="font-bold">{ROL[decisiva.rolResponsable]}</strong>
              </p>
            </section>
          )}

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/equipo/${encodeURIComponent(equipo.id)}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2',
                'font-label text-[13px] font-bold text-primary-foreground transition-opacity hover:opacity-90',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              )}
            >
              Abrir la ficha completa
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
            {/* Propagar la decisión a la otra plataforma es S-A4 y todavía no
                existe. Un botón que parece ejecutar y no ejecuta es peor que uno
                apagado. */}
            <button
              type="button"
              disabled
              title="Propagar la decisión a Startrack llega en S-A4"
              className="cursor-not-allowed rounded-lg border border-border px-4 py-2 font-label text-[13px] font-bold text-muted-foreground opacity-60"
            >
              Tomar acción
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
