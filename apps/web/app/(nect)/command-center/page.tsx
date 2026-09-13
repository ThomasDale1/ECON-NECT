import type { Metadata } from 'next'
import { BarraSuperior } from '@/components/comando/barra-superior'
import { PanelEnCurso, PanelFueraDeGeocerca } from '@/components/comando/paneles-situacion'
import { TablaExcepciones } from '@/components/comando/tabla-excepciones'
import { EQUIPOS_EJEMPLO } from '@/lib/tipos/ejemplo'
import { ACTIVOS_EN_CURSO, VIOLACIONES_GEOCERCA } from './datos-de-ejemplo'

export const metadata: Metadata = {
  title: 'Centro de comando operativo · ECON NECT',
  description: 'Estado unificado de la maquinaria entre Prisma y Startrack.',
}

/**
 * Centro de comando operativo.
 *
 * La UI solo muestra: el veredicto, la confianza y las reglas vienen calculados,
 * acá no se recalcula nada.
 *
 * **De dónde sale cada cosa hoy:**
 *
 * - La tabla de excepciones lee `EQUIPOS_EJEMPLO`, que ya cumple el contrato
 *   `EquipoUnificado`. Cuando el carril A publique la ruta de API, se cambia ese
 *   import por la lectura del servidor y la tabla no se toca.
 * - Los dos carruseles todavía leen un fixture propio, porque el contrato no
 *   tiene los campos que necesitan: la tarea de traslado con origen, destino y
 *   tiempo estimado, y el resultado de evaluar la geocerca. Están pedidos al
 *   carril A; hasta entonces no se puede derivar sin inventar.
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

        <TablaExcepciones equipos={EQUIPOS_EJEMPLO} />
      </main>
    </>
  )
}
