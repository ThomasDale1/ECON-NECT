'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart2,
  LayoutDashboard,
  List,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Table2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { BotonActualizar } from '@/components/comando/boton-actualizar'
import type { Plataforma, SaludFuente } from '@/lib/tipos/canonico'
import { cn } from '@/lib/utils'

/**
 * Barra lateral del Command Center — ui-registry.md §3.1.
 *
 * Se puede contraer a solo iconos. Contraída sigue mostrando el punto de salud
 * de cada plataforma, porque ese bloque no es decoración: es la prueba en vivo
 * de que estamos leyendo las dos APIs. Cuando una se cae, el punto cambia y el
 * veredicto degrada a SIN_EVIDENCIA.
 */
type Navegacion = { etiqueta: string; icono: LucideIcon; href: string }

// La ficha unificada no está acá a propósito: necesita un equipo, y se entra a
// ella desde la flota. Un ítem de nav que lleva a un 404 es peor que no tenerlo.
const NAVEGACION: Navegacion[] = [
  { etiqueta: 'Centro de comando', icono: LayoutDashboard, href: '/command-center' },
  { etiqueta: 'Flota', icono: List, href: '/flota' },
  { etiqueta: 'Indicadores', icono: BarChart2, href: '/indicadores' },
  { etiqueta: 'Mapeo y RACI', icono: Table2, href: '/mapeo' },
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

export function BarraLateral({
  salud,
  onActualizar,
}: {
  salud: SaludFuente[]
  /** Server Action de relectura. Sin ella el estado se muestra sin botón. */
  onActualizar?: (plataforma: Plataforma) => Promise<void>
}) {
  const ruta = usePathname()
  const [contraida, setContraida] = useState(false)

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col justify-between self-start',
        'overflow-y-auto bg-marina text-white',
        // La contracción se anima; el estado vive en el layout, así que sobrevive
        // a la navegación y solo cambia cuando se vuelve a pulsar el botón.
        'transition-[width] duration-300 ease-in-out motion-reduce:transition-none',
        contraida ? 'w-16' : 'w-60',
      )}
    >
      <div className={cn('flex flex-col gap-6 pb-4 pt-7', contraida ? 'px-3' : 'px-5')}>
        <div className={cn('flex items-center gap-2.5', contraida && 'justify-center')}>
          {/* Logo oficial del usuario: public/econ-nect-logo.png */}
          {contraida ? (
            <Image
              src="/econ-nect-logo.png"
              alt="ECON NECT"
              width={34}
              height={34}
              className="size-[34px] shrink-0 rounded-lg object-contain"
            />
          ) : (
            <div className="flex min-w-0 flex-col gap-1">
              <Image
                src="/econ-nect-logo.png"
                alt="ECON NECT"
                width={160}
                height={40}
                className="h-9 w-auto max-w-full object-contain object-left"
              />
              <span className="font-label text-[9px] uppercase leading-none text-marca-clara">
                Capa de operaciones
              </span>
            </div>
          )}
        </div>

        {contraida ? (
          <button
            type="button"
            title="Buscar"
            aria-label="Buscar"
            className="flex h-9 items-center justify-center rounded-lg border border-marina-borde bg-marina-clara text-marina-media transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-clara"
          >
            <Search aria-hidden className="size-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-marina-borde bg-marina-clara px-3 py-2">
            <Search aria-hidden className="size-3.5 shrink-0 text-marina-media" />
            <span className="min-w-0 flex-1 font-label text-xs text-marina-media">Buscar…</span>
            <kbd className="rounded bg-marina-honda px-1.5 py-0.5 font-label text-[9px] font-bold text-marina-tenue">
              ⌘K
            </kbd>
          </div>
        )}

        <nav className="flex flex-col gap-1">
          {!contraida && (
            <p className="font-label text-[9px] font-bold uppercase tracking-widest text-marina-tenue">
              Navegación
            </p>
          )}
          {NAVEGACION.map(({ etiqueta, icono: Icono, href }) => {
            const activo = ruta === href || ruta.startsWith(`${href}/`)
            return (
              <Link
                key={etiqueta}
                href={href}
                aria-current={activo ? 'page' : undefined}
                title={contraida ? etiqueta : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg py-2.5 text-[13px] transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-clara',
                  contraida ? 'justify-center px-0' : 'px-3',
                  activo
                    ? 'bg-marca font-label font-bold text-white'
                    : 'font-label text-marina-texto hover:bg-white/5',
                )}
              >
                <Icono aria-hidden className="size-4 shrink-0" />
                {!contraida && (
                  <>
                    <span className="flex-1">{etiqueta}</span>
                    {activo && <span aria-hidden className="size-1.5 rounded-full bg-marca-clara" />}
                  </>
                )}
                {contraida && <span className="sr-only">{etiqueta}</span>}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className={cn('flex flex-col gap-4 bg-marina-honda pb-4 pt-5', contraida ? 'px-3' : 'px-5')}>
        {!contraida && (
          <p className="font-label text-[9px] font-bold uppercase tracking-widest text-marina-tenue">
            Estado de plataformas
          </p>
        )}

        {salud.map((fuente) => (
          <div
            key={fuente.plataforma}
            className={cn('flex items-center gap-2', contraida && 'justify-center')}
            title={
              contraida
                ? `${NOMBRE_PLATAFORMA[fuente.plataforma]}: ${PALABRA_SALUD[fuente.estado]}`
                : undefined
            }
          >
            <span className="relative flex size-[7px] shrink-0">
              {fuente.estado === 'ok' ? (
                <span
                  aria-hidden
                  className="absolute inline-flex size-full animate-ping rounded-full bg-veredicto-coherente opacity-60"
                />
              ) : null}
              <span
                aria-hidden
                className={cn(
                  'relative inline-flex size-full rounded-full',
                  PUNTO_SALUD[fuente.estado],
                )}
              />
            </span>
            {contraida ? (
              <span className="sr-only">
                {NOMBRE_PLATAFORMA[fuente.plataforma]}: {PALABRA_SALUD[fuente.estado]}
              </span>
            ) : (
              <div className="flex min-w-0 flex-1 flex-col gap-px">
                <div className="flex items-center justify-between">
                  <span className="font-label text-[11px] font-bold text-[#b8cdd8]">
                    {NOMBRE_PLATAFORMA[fuente.plataforma]}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn('font-label text-[10px] font-bold', TEXTO_SALUD[fuente.estado])}
                    >
                      {PALABRA_SALUD[fuente.estado]}
                    </span>
                    {onActualizar && (
                      <BotonActualizar
                        plataforma={fuente.plataforma}
                        nombre={NOMBRE_PLATAFORMA[fuente.plataforma]}
                        onActualizar={onActualizar}
                      />
                    )}
                  </span>
                </div>
                {/* `latenciaMs` en null significa que la lectura salió del caché en
                    memoria, así que no hay medición nueva de la plataforma. Se dice
                    eso, y no un número que mediría el caché y no el sandbox. */}
                <span className="font-mono text-[9px] text-marina-media">
                  {fuente.latenciaMs === null ? 'Desde caché' : `${fuente.latenciaMs} ms`}
                </span>
              </div>
            )}
          </div>
        ))}

        {!contraida && <p className="font-label text-[10px] text-[#2d4a60]">v2.4.1-Tactical</p>}

        <button
          type="button"
          onClick={() => setContraida((c) => !c)}
          aria-expanded={!contraida}
          title={contraida ? 'Expandir la barra lateral' : 'Contraer la barra lateral'}
          aria-label={contraida ? 'Expandir la barra lateral' : 'Contraer la barra lateral'}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg border border-marina-borde bg-marina-clara',
            'py-2 font-label text-xs text-marina-media transition-colors hover:text-white',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-clara',
            contraida ? 'px-0' : 'px-3.5',
          )}
        >
          {contraida ? (
            <PanelLeftOpen aria-hidden className="size-3.5" />
          ) : (
            <>
              <PanelLeftClose aria-hidden className="size-3.5" />
              Contraer
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
