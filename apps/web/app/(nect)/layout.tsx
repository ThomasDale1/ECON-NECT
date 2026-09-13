import { BarraLateral } from '@/components/comando/barra-lateral'
import { leerEquiposUnificados } from '@/lib/canonico/orquestador'
import { actualizarFuente, actualizarFuentes } from './acciones'

/**
 * Envoltorio de las pantallas de ECON NECT.
 *
 * La barra lateral vive acá, no en cada página. Un layout no se vuelve a
 * montar al navegar, así que su estado de contracción sobrevive de una
 * pantalla a otra.
 *
 * La lectura está memoizada por petición (`cache()` de React), así que que el
 * layout pida la salud y la página pida los equipos no duplica llamadas al
 * sandbox.
 *
 * Exo, Lato y Roboto Condensed se declaran en `app/layout.tsx` sobre `<html>`
 * para que los diálogos portaleados hereden la misma letra que el command center.
 */
export default async function NectLayout({ children }: { children: React.ReactNode }) {
  const { salud } = await leerEquiposUnificados()

  return (
    <div className="flex min-h-screen bg-background font-sans text-foreground antialiased">
      <BarraLateral salud={salud} onActualizar={actualizarFuente} onActualizarTodas={actualizarFuentes} />
      {children}
    </div>
  )
}
