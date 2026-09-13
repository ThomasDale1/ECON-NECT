import type { Metadata } from 'next'
import { Marco } from '@/components/comando/marco'
import { TablaFlota } from '@/components/comando/tabla-flota'
import { leerEquiposUnificados } from '@/lib/canonico/unificar'

export const metadata: Metadata = {
  title: 'Inventario de flota · ECON NECT',
  description: 'Todos los equipos con su estado en Prisma, en Startrack y el veredicto integrado.',
}

export const dynamic = 'force-dynamic'

/**
 * Inventario operativo de flota.
 *
 * Es la pantalla por donde el jurado entra cuando pide un equipo al azar, así
 * que recorre la flota completa que devuelvan los conectores. Nada hardcodeado.
 */
export default async function FlotaPage() {
  const { equipos, salud, leidoEn } = await leerEquiposUnificados()


  return (
    <Marco
      titulo="Inventario operativo de flota"
      salud={salud}
      leidoEn={leidoEn}
    >
      <TablaFlota equipos={equipos} />
    </Marco>
  )
}
