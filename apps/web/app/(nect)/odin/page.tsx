import type { Metadata } from 'next'
import { Marco } from '@/components/comando/marco'
import { ConsolaOdin } from '@/components/odin/consola-odin'
import { leerEquiposUnificados } from '@/lib/canonico/orquestador'

export const metadata: Metadata = {
  title: 'O.D.I.N. · ECON NECT',
  description: 'Operador local de Datos e Inteligencia de Negocios de ECON NECT.',
}

export const dynamic = 'force-dynamic'

export default async function OdinPage() {
  const { equipos: equiposCanonicos, salud, leidoEn } = await leerEquiposUnificados()
  const equipos = equiposCanonicos.map((equipo) => ({
    id: equipo.id,
    codigo: equipo.codigoActivo.valor ?? 'Sin código',
    nombre: equipo.nombre.valor ?? 'Sin nombre',
  }))

  return (
    <Marco titulo="O.D.I.N. · Inteligencia operacional local" salud={salud} leidoEn={leidoEn}>
      <ConsolaOdin equipos={equipos} />
    </Marco>
  )
}
