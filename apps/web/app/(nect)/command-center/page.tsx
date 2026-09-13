import type { Metadata } from 'next'
import { BarraSuperior } from '@/components/comando/barra-superior'
import { PanelEnCurso, PanelFueraDeGeocerca } from '@/components/comando/paneles-situacion'
import { TablaExcepciones } from '@/components/comando/tabla-excepciones'
import { ACTIVOS_EN_CURSO, EXCEPCIONES, VIOLACIONES_GEOCERCA } from './datos-de-ejemplo'

export const metadata: Metadata = {
  title: 'Centro de comando operativo · ECON NECT',
  description: 'Estado unificado de la maquinaria entre Prisma y Startrack.',
}

/**
 * Centro de comando operativo.
 *
 * La UI solo muestra: el veredicto y la confianza vienen calculados, acá no se
 * recalcula nada. Hoy lee de `datos-de-ejemplo.ts`; cuando el carril A publique
 * las rutas de API ese import se cambia por la lectura del servidor y el resto
 * de la pantalla no se toca.
 */
export default function CommandCenterPage() {
  return (
    <>
      <BarraSuperior
        titulo="Centro de comando operativo"
        ultimaLectura="14:32:07"
        usuario={{ nombre: 'Jefe de sala de control', iniciales: 'JC' }}
      />

      <main className="flex flex-col gap-6 p-7">
        <div className="grid gap-6 lg:grid-cols-2">
          <PanelEnCurso activos={ACTIVOS_EN_CURSO} />
          <PanelFueraDeGeocerca violaciones={VIOLACIONES_GEOCERCA} />
        </div>

        <TablaExcepciones filas={EXCEPCIONES} />
      </main>
    </>
  )
}
