import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
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
 * Acepta el id canónico o el código de activo, para que el jurado pueda entrar
 * por cualquiera de los dos. Nada hardcodeado: si el equipo existe en la lectura,
 * la ficha existe.
 */
export default async function EquipoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const buscado = decodeURIComponent(id).toLowerCase()

  const { equipos, salud, urlStartrack, leidoEn } = await leerEquiposUnificados()
  const equipo = equipos.find(
    (e) => e.id.toLowerCase() === buscado || e.codigoActivo.valor?.toLowerCase() === buscado,
  )

  if (!equipo) notFound()


  return (
    <Marco
      titulo={`Ficha de ${equipo.codigoActivo.valor ?? equipo.id}`}
      salud={salud}
      leidoEn={leidoEn}
    >
      <FichaEquipo equipo={equipo} urlStartrack={urlStartrack} />
    </Marco>
  )
}
