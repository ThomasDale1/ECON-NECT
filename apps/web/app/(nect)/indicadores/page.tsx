import type { Metadata } from 'next'
import { Marco } from '@/components/comando/marco'
import { PanelIndicadores } from '@/components/comando/panel-indicadores'
import { leerEquiposUnificados } from '@/lib/canonico/orquestador'

export const metadata: Metadata = {
  title: 'Indicadores operativos · ECON NECT',
  description: 'Indicadores que solo existen porque las dos plataformas están integradas.',
}

export const dynamic = 'force-dynamic'

export default async function IndicadoresPage() {
  const { equipos, salud, leidoEn } = await leerEquiposUnificados()


  return (
    <Marco
      titulo="Indicadores operativos"
      salud={salud}
      leidoEn={leidoEn}
    >
      <PanelIndicadores equipos={equipos} />
    </Marco>
  )
}
