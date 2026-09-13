import type { Metadata } from 'next'
import { Marco } from '@/components/comando/marco'
import { ConsolaOdin } from '@/components/odin/consola-odin'
import { leerEquiposUnificados } from '@/lib/canonico/orquestador'
import { claseDesdeNombre } from '@/lib/nect/clase-equipo'

export const metadata: Metadata = {
  title: 'O.D.I.N. · ECON NECT',
  description: 'Operador local de Datos e Inteligencia de Negocios de ECON NECT.',
}

export const dynamic = 'force-dynamic'

export default async function OdinPage() {
  const { equipos: equiposCanonicos, salud, leidoEn, urlPrisma, urlStartrack } =
    await leerEquiposUnificados()

  const equipos = equiposCanonicos.map((equipo) => {
    const decisiva =
      equipo.reglas.find((r) => r.veredicto === equipo.veredicto) ?? equipo.reglas[0]
    return {
      id: equipo.id,
      codigo: equipo.codigoActivo.valor ?? 'Sin código',
      nombre: equipo.nombre.valor ?? 'Sin nombre',
      veredicto: equipo.veredicto,
      lectura: decisiva?.nombre ?? null,
      paso: decisiva?.accionSugerida ?? null,
      clase: claseDesdeNombre(equipo.nombre.valor),
    }
  })

  return (
    <Marco titulo="O.D.I.N." salud={salud} leidoEn={leidoEn}>
      <ConsolaOdin equipos={equipos} urlPrisma={urlPrisma} urlStartrack={urlStartrack} />
    </Marco>
  )
}
