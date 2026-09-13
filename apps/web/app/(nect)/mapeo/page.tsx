import type { Metadata } from 'next'
import { Marco } from '@/components/comando/marco'
import { leerEquiposUnificados } from '@/lib/canonico/orquestador'
import { ContenidoMapeo } from './contenido'

export const metadata: Metadata = {
  title: 'Matriz de mapeo, RACI y KPIs · ECON NECT',
  description: 'Los entregables tipados del carril C, renderizados desde el código.',
}

export const dynamic = 'force-dynamic'

/**
 * Envuelve la pantalla del carril C en el marco común.
 *
 * El contenido lo escribió el carril C y se deja intacto; acá solo se le pone
 * la barra superior y el ancho del resto de la aplicación, para que no pelee
 * con la barra lateral. El propio autor dejó dicho que el carril B podía
 * integrarla a su navegación sin pedir permiso.
 */
export default async function MapeoPage() {
  const { salud, leidoEn } = await leerEquiposUnificados()

  return (
    <Marco titulo="Matriz de mapeo, RACI y KPIs" salud={salud} leidoEn={leidoEn}>
      <ContenidoMapeo />
    </Marco>
  )
}
