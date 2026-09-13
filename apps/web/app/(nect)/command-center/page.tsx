import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Marco } from '@/components/comando/marco'
import { PanelEnCurso, PanelFueraDeGeocerca } from '@/components/comando/paneles-situacion'
import { TablaExcepciones } from '@/components/comando/tabla-excepciones'
import { leerEquiposUnificados } from '@/lib/canonico/orquestador'
import { tareaFinalizada } from '@/lib/canonico/catalogos'
import { NOMBRE_COOKIE, verificarCookie } from '@/lib/acceso/verificar'

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
 * Los dos carruseles de arriba derivan de la misma lectura que la tabla. Antes
 * mostraban un fixture del mockup con seis activos que no existían en ninguna
 * plataforma; se borró el 13 de septiembre de 2026 junto con este comentario,
 * que daba la geocerca por no evaluable. Sí lo es: el radio sale de
 * `GET /api/pois` (ver `leerGeocercasConGeometria`).
 */
export default async function CommandCenterPage() {
  const { equipos, salud, urlStartrack, leidoEn } = await leerEquiposUnificados()
  const sesion = await verificarCookie((await cookies()).get(NOMBRE_COOKIE)?.value)

  // Traslado vivo = Startrack tiene tarea y no está finalizada. Es el mismo
  // criterio que usa R1, para que la pantalla y el motor no discrepen.
  const enCurso = equipos.filter((e) => e.tarea != null && !tareaFinalizada(e.tarea.valor))

  // `dentro === false` es una afirmación; `null` es "no se pudo concluir" y no
  // entra al panel — se cuenta aparte para poder declarar el hueco.
  const conGeocerca = equipos.filter((e) => e.geocercaProyecto != null)
  const fueraDeGeocerca = conGeocerca.filter((e) => e.geocercaProyecto!.dentro === false)
  const sinResolver =
    equipos.length - conGeocerca.filter((e) => e.geocercaProyecto!.dentro !== null).length

  return (
    <Marco
      titulo="Centro de comando operativo"
      salud={salud}
      leidoEn={leidoEn}
    >
      <div className="grid gap-6 2xl:grid-cols-2">
        <PanelEnCurso equipos={enCurso} urlStartrack={urlStartrack} />
        <PanelFueraDeGeocerca
          equipos={fueraDeGeocerca}
          urlStartrack={urlStartrack}
          sinRadio={sinResolver}
        />
      </div>

      <TablaExcepciones equipos={equipos} rolActual={sesion?.rol ?? null} />
    </Marco>
  )
}
