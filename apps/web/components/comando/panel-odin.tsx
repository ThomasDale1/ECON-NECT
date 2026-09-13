'use client'

import { useState } from 'react'
import { MessageCircle, PanelRightClose, TriangleAlert, Zap } from 'lucide-react'
import type {
  AlertaEnviada,
  ConflictoDisponibilidad,
  Prediccion,
} from '@/app/(nect)/datos-odin'
import { cn } from '@/lib/utils'

/**
 * Drawer contextual de O.D.I.N..
 *
 * Es un **feature**, no una pantalla: se acopla a la derecha del Command Center
 * y se puede plegar. Cerrado deja una pestaña estrecha para volver a abrirlo.
 *
 * ⚠ Todo su contenido está fabricado y así está marcado en `datos-odin.ts`.
 * No hay modelo de predicción detrás, no hay integración de mensajería y ningún
 * botón envía nada: los de acción están deshabilitados a propósito, porque un
 * botón que parece que hace algo y no lo hace es peor que uno que se ve
 * apagado.
 */
export function PanelOdin({
  prediccion,
  alertas,
  conflicto,
  consultas,
}: {
  prediccion: Prediccion
  alertas: AlertaEnviada[]
  conflicto: ConflictoDisponibilidad
  consultas: string[]
}) {
  const [abierto, setAbierto] = useState(true)

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir el panel de O.D.I.N."
        className="sticky top-0 flex h-screen shrink-0 flex-col items-center gap-2 self-start border-l border-border bg-card px-2 pt-6 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-marca-clara to-primary">
          <Zap aria-hidden className="size-4 text-white" />
        </span>
        <span className="font-label text-[10px] font-bold uppercase tracking-widest [writing-mode:vertical-rl]">
          O.D.I.N.
        </span>
      </button>
    )
  }

  return (
    <aside
      aria-label="Panel de O.D.I.N."
      className={cn(
        'flex h-screen w-[380px] flex-col overflow-hidden border-l border-border bg-muted',
        // Ancho completo solo cuando sobra espacio. Por debajo de xl flota sobre
        // el contenido en vez de robarle ancho: con la barra lateral y este panel
        // acoplados, una pantalla de 1280 dejaba la tabla sin sitio.
        'max-xl:fixed max-xl:right-0 max-xl:top-0 max-xl:z-40 max-xl:shadow-2xl',
        'xl:sticky xl:top-0 xl:shrink-0 xl:self-start',
      )}
    >
      <header className="flex items-center gap-3 border-b border-border bg-card p-5">
        <span className="relative flex size-[42px] shrink-0">
          <span className="flex size-full items-center justify-center rounded-full bg-gradient-to-br from-marca-clara to-primary shadow-md">
            <Zap aria-hidden className="size-5 text-white" />
          </span>
          <span
            aria-hidden
            className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-card bg-veredicto-coherente"
          />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-heading text-base font-extrabold tracking-wide text-primary">
            O.D.I.N.
          </span>
          <span className="font-label text-[11px] text-muted-foreground">
            Operador de Datos e Inteligencia de Negocios
          </span>
        </span>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          aria-label="Plegar el panel de O.D.I.N."
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <PanelRightClose aria-hidden className="size-4" />
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        <p className="rounded-lg border border-dashed border-border px-3 py-2 font-label text-[10px] leading-relaxed text-muted-foreground">
          Maqueta de propuesta. El contenido es fabricado: no hay modelo detrás ni se envía ningún
          mensaje.
        </p>

        {/* Predicción preventiva */}
        <article className="flex flex-col gap-3 rounded-xl border border-veredicto-atencion/30 bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-label text-[11px] font-bold uppercase text-veredicto-atencion">
              <TriangleAlert aria-hidden className="size-3.5" />
              Predicción preventiva
            </span>
            <span className="rounded border border-veredicto-atencion/30 px-1.5 py-0.5 font-mono text-[9px] font-bold text-veredicto-atencion">
              Confianza {prediccion.confianza}%
            </span>
          </div>
          <p className="font-label text-xs leading-relaxed">
            <strong className="font-bold">{prediccion.activo}</strong> {prediccion.resumen}{' '}
            <span className="font-bold text-veredicto-riesgo">{prediccion.detalle}</span>
          </p>
          <div className="flex gap-2">
            <Accion principal>Programar mant.</Accion>
            <Accion>Ver historial</Accion>
          </div>
        </article>

        {/* Registro de alertas */}
        <section className="flex flex-col gap-3">
          <h3 className="font-label text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Registro de alertas enviadas
          </h3>
          {alertas.map((alerta) => (
            <div key={alerta.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="flex size-4 items-center justify-center rounded-full bg-veredicto-coherente">
                    <MessageCircle aria-hidden className="size-2.5 text-white" />
                  </span>
                  <span className="font-label text-[11px] font-bold">
                    {alerta.destinatario}{' '}
                    <span className="font-normal text-muted-foreground">({alerta.area})</span>
                  </span>
                </span>
                <time className="font-label text-[10px] text-muted-foreground">{alerta.hace}</time>
              </div>
              <p className="rounded-lg border border-veredicto-coherente/20 bg-veredicto-coherente-fondo p-2.5 font-label text-[11px] leading-snug text-muted-foreground">
                {alerta.mensaje}
              </p>
            </div>
          ))}
        </section>

        <hr className="border-border" />

        {/* Conflicto de disponibilidad */}
        <article className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-4">
          <span className="flex items-center gap-1.5 font-label text-[11px] font-bold uppercase text-primary">
            <Zap aria-hidden className="size-3.5" />
            {conflicto.titulo}
          </span>
          <p className="font-label text-[11px] leading-relaxed text-muted-foreground">
            {conflicto.situacion}
          </p>
          <div className="flex flex-col gap-1.5 rounded-lg border border-origen-prisma/25 bg-origen-prisma/5 p-2.5">
            <span className="font-label text-[10px] font-bold uppercase text-origen-prisma">
              Recomendación
            </span>
            <p className="font-label text-[11px] leading-snug text-foreground">
              {conflicto.recomendacion}
            </p>
          </div>
          <div className="flex gap-2">
            <Accion principal>Aceptar propuesta</Accion>
            <Accion>Ignorar</Accion>
          </div>
        </article>
      </div>

      <footer className="flex flex-col gap-2 border-t border-border bg-card p-4">
        <span className="font-label text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          Consultas rápidas
        </span>
        <div className="flex flex-wrap gap-1.5">
          {consultas.map((consulta) => (
            <button
              key={consulta}
              type="button"
              disabled
              className="cursor-not-allowed rounded-full border border-border bg-muted px-2.5 py-1.5 font-label text-[10px] font-semibold text-muted-foreground opacity-70"
            >
              {consulta}
            </button>
          ))}
        </div>
      </footer>
    </aside>
  )
}

/** Botón de acción de la maqueta: se ve, no hace. */
function Accion({ children, principal = false }: { children: React.ReactNode; principal?: boolean }) {
  return (
    <button
      type="button"
      disabled
      title="Maqueta: esta acción todavía no está implementada"
      className={cn(
        'flex-1 cursor-not-allowed rounded-md py-2 font-label text-[11px] font-bold opacity-70',
        principal ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
      )}
    >
      {children}
    </button>
  )
}
