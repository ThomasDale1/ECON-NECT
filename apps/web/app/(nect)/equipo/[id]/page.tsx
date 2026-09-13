import type { Metadata } from 'next'
import Link from 'next/link'
import { Marco } from '@/components/comando/marco'
import { FichaEquipo } from '@/components/comando/ficha-equipo'
import { leerEquiposUnificados } from '@/lib/canonico/orquestador'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return { title: `${decodeURIComponent(id)} · ECON NECT` }
}

/**
 * Ficha unificada de un equipo.
 *
 * Acepta el id canónico o el código de activo. Si no hay lectura que coincida,
 * se muestra un empty state dentro del marco — no un 404 blanco de Next.
 */
export default async function EquipoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const buscado = decodeURIComponent(id).toLowerCase()

  const { equipos, salud, urlStartrack, urlPrisma, leidoEn } = await leerEquiposUnificados()
  const equipo = equipos.find(
    (e) => e.id.toLowerCase() === buscado || e.codigoActivo.valor?.toLowerCase() === buscado,
  )

  if (!equipo) {
    return (
      <Marco titulo="Equipo no encontrado" salud={salud} leidoEn={leidoEn}>
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-8 shadow-card">
          <h2 className="font-heading text-lg font-extrabold tracking-tight text-primary">
            No encontramos ese equipo
          </h2>
          <p className="font-label text-sm text-muted-foreground">
            El id o el código no está en la lectura actual. Entrá por la flota para abrir una
            ficha que sí exista.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/flota"
              className="rounded-lg bg-primary px-3 py-2 font-label text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Ir a la flota
            </Link>
            <Link
              href="/command-center"
              className="rounded-lg border border-border px-3 py-2 font-label text-sm font-bold text-primary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Centro de comando
            </Link>
          </div>
        </section>
      </Marco>
    )
  }

  return (
    <Marco
      titulo={`Ficha de ${equipo.codigoActivo.valor ?? equipo.id}`}
      salud={salud}
      leidoEn={leidoEn}
    >
      <FichaEquipo equipo={equipo} urlStartrack={urlStartrack} urlPrisma={urlPrisma} />
    </Marco>
  )
}
