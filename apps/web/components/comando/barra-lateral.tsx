import Link from 'next/link'
import { BarChart2, Cpu, Cuboid, LayoutDashboard, List, PanelLeftClose, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Plataforma, SaludFuente } from '@/lib/tipos/canonico'
import { cn } from '@/lib/utils'

/**
 * Barra lateral del Command Center — ui-registry.md §3.1.
 *
 * El bloque de estado de plataformas del pie no es decoración: es la prueba en
 * vivo de que estamos leyendo las dos APIs. Cuando una se cae, el punto cambia
 * y el veredicto degrada a SIN_EVIDENCIA.
 */
type Navegacion = { etiqueta: string; icono: LucideIcon; href: string; activo?: boolean }

const NAVEGACION: Navegacion[] = [
  { etiqueta: 'Command Center', icono: LayoutDashboard, href: '/command-center', activo: true },
  { etiqueta: 'Ficha unificada', icono: Cuboid, href: '/equipo' },
  { etiqueta: 'Flota', icono: List, href: '/flota' },
  { etiqueta: 'Indicadores', icono: BarChart2, href: '/indicadores' },
]

type Estado = SaludFuente['estado']

const NOMBRE_PLATAFORMA: Record<Plataforma, string> = {
  prisma: 'Prisma',
  startrack: 'Startrack',
}

/** El estado se dice con palabra además de color: el color solo no comunica (§5). */
const PALABRA_SALUD: Record<Estado, string> = {
  ok: 'En línea',
  lenta: 'Lenta',
  caida: 'Caída',
}

const PUNTO_SALUD: Record<Estado, string> = {
  ok: 'bg-veredicto-coherente',
  lenta: 'bg-veredicto-atencion',
  caida: 'bg-veredicto-riesgo',
}

const TEXTO_SALUD: Record<Estado, string> = {
  ok: 'text-veredicto-coherente',
  lenta: 'text-veredicto-atencion',
  caida: 'text-veredicto-riesgo',
}

export function BarraLateral({ salud }: { salud: SaludFuente[] }) {
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col justify-between self-start overflow-y-auto bg-marina text-white">
      <div className="flex flex-col gap-6 px-5 pb-4 pt-7">
        <div className="flex items-center gap-2.5">
          <div className="flex size-[34px] shrink-0 items-center justify-center rounded-lg bg-marca-clara">
            <Cpu aria-hidden className="size-5 text-white" />
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-heading text-[17px] font-extrabold leading-none">ECONNECT</span>
            <span className="font-label text-[9px] uppercase leading-none text-marca-clara">
              Capa de operaciones
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-marina-borde bg-marina-clara px-3 py-2">
          <Search aria-hidden className="size-3.5 shrink-0 text-marina-media" />
          <span className="min-w-0 flex-1 font-label text-xs text-marina-media">Buscar…</span>
          <kbd className="rounded bg-marina-honda px-1.5 py-0.5 font-label text-[9px] font-bold text-marina-tenue">
            ⌘K
          </kbd>
        </div>

        <nav className="flex flex-col gap-1">
          <p className="font-label text-[9px] font-bold uppercase tracking-widest text-marina-tenue">
            Navegación
          </p>
          {NAVEGACION.map(({ etiqueta, icono: Icono, href, activo }) => (
            <Link
              key={etiqueta}
              href={href}
              aria-current={activo ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-clara',
                activo
                  ? 'bg-marca font-label font-bold text-white'
                  : 'font-label text-marina-texto hover:bg-white/5',
              )}
            >
              <Icono aria-hidden className="size-4 shrink-0" />
              <span className="flex-1">{etiqueta}</span>
              {activo ? <span aria-hidden className="size-1.5 rounded-full bg-marca-clara" /> : null}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-4 bg-marina-honda px-5 pb-4 pt-5">
        <p className="font-label text-[9px] font-bold uppercase tracking-widest text-marina-tenue">
          Estado de plataformas
        </p>

        {salud.map((fuente) => (
          <div key={fuente.plataforma} className="flex items-center gap-2">
            <span className="relative flex size-[7px] shrink-0">
              {fuente.estado === 'ok' ? (
                <span
                  aria-hidden
                  className="absolute inline-flex size-full animate-ping rounded-full bg-veredicto-coherente opacity-60"
                />
              ) : null}
              <span
                aria-hidden
                className={cn('relative inline-flex size-full rounded-full', PUNTO_SALUD[fuente.estado])}
              />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-px">
              <div className="flex items-center justify-between">
                <span className="font-label text-[11px] font-bold text-[#b8cdd8]">
                  {NOMBRE_PLATAFORMA[fuente.plataforma]}
                </span>
                <span className={cn('font-label text-[10px] font-bold', TEXTO_SALUD[fuente.estado])}>
                  {PALABRA_SALUD[fuente.estado]}
                </span>
              </div>
              {/* Solo se escribe lo que el contrato trae. El mockup mostraba un
                  porcentaje de disponibilidad que ninguna fuente reporta: un
                  número sin endpoint detrás no se pinta (ui-registry §1.4). */}
              <span className="font-mono text-[9px] text-marina-media">
                {fuente.latenciaMs === null
                  ? 'Latencia sin registro'
                  : `${fuente.latenciaMs} ms de latencia`}
              </span>
            </div>
          </div>
        ))}

        <p className="font-label text-[10px] text-[#2d4a60]">v2.4.1-Tactical</p>

        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-lg border border-marina-borde bg-marina-clara px-3.5 py-2 font-label text-xs text-marina-media transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-clara"
        >
          <PanelLeftClose aria-hidden className="size-3.5" />
          Contraer
        </button>
      </div>
    </aside>
  )
}
