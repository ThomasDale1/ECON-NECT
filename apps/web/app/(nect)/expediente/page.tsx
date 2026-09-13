import type { Metadata } from 'next'
import { Marco } from '@/components/comando/marco'
import { ExpedienteVivo } from '@/components/expediente/expediente-vivo'
import { leerEquiposUnificados } from '@/lib/canonico/orquestador'

export const metadata: Metadata = {
  title: 'Expediente vivo · ECON NECT',
  description: 'Vista ejecutiva de una decision operativa con evidencia, responsable y siguiente accion.',
}

export const dynamic = 'force-dynamic'

export default async function ExpedientePage() {
  const { equipos, salud, leidoEn } = await leerEquiposUnificados()

  return (
    <Marco titulo="Expediente vivo" salud={salud} leidoEn={leidoEn}>
      <ExpedienteVivo equipos={equipos} />
    </Marco>
  )
}
