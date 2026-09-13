import type { Metadata } from 'next'
import { Marco } from '@/components/comando/marco'
import { PanelEnCurso, PanelFueraDeGeocerca } from '@/components/comando/paneles-situacion'
import { TablaExcepciones } from '@/components/comando/tabla-excepciones'
import { leerEquiposUnificados } from '@/lib/canonico/unificar'
import { ACTIVOS_EN_CURSO, VIOLACIONES_GEOCERCA } from './datos-de-ejemplo'

export const metadata: Metadata = {
  title: 'Centro de comando operativo · ECON NECT',
  description: 'Estado unificado de la maquinaria entre Prisma y Startrack.',
}

/** Lectura en vivo: nada de esta pantalla se cachea entre visitas. */
export const dynamic = 'force-dynamic'

/**
 * Centro de comando operativo.
 *
 * Server Component: lee las dos plataformas en el servidor y solo muestra. El
 * veredicto, la confianza y las reglas los calcula `lib/reglas`; acá no se
 * reconcilia nada ni el cliente ve una credencial.
 *
 * Los dos carruseles todavía leen un fixture propio: el contrato no tiene la
 * tarea de traslado con origen, destino y tiempo estimado, ni el resultado de
 * evaluar la geocerca. Startrack tampoco expone todavía el lector de tareas.
 */
export default async function CommandCenterPage() {
  const { equipos, salud, urlStartrack, leidoEn } = await leerEquiposUnificados()

  return (
    <Marco
      titulo="Centro de comando operativo"
      salud={salud}
      leidoEn={leidoEn}
    >
      <div className="grid gap-6 2xl:grid-cols-2">
        <PanelEnCurso activos={ACTIVOS_EN_CURSO} urlStartrack={urlStartrack} />
        <PanelFueraDeGeocerca violaciones={VIOLACIONES_GEOCERCA} urlStartrack={urlStartrack} />
      </div>

      <TablaExcepciones equipos={equipos} />
    </Marco>
  )
}
