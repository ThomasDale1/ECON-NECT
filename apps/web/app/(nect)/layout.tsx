import { Exo, Lato, Roboto_Condensed } from 'next/font/google'
import { BarraLateral } from '@/components/comando/barra-lateral'
import { PanelOdin } from '@/components/comando/panel-odin'
import { leerEquiposUnificados } from '@/lib/canonico/orquestador'
import { actualizarFuente } from './acciones'
import { ALERTAS, CONFLICTO, CONSULTAS_RAPIDAS, PREDICCION } from './datos-odin'

/**
 * Envoltorio de las pantallas de ECON NECT.
 *
 * **La barra lateral vive acá, no en cada página.** Un layout no se vuelve a
 * montar al navegar, así que su estado —si está contraída— sobrevive de una
 * pantalla a otra. Cuando vivía dentro de la página, cada navegación la
 * remontaba y volvía a abrirse sola.
 *
 * La lectura está memoizada por petición (`cache()` de React), así que que el
 * layout pida la salud y la página pida los equipos no duplica llamadas al
 * sandbox.
 *
 * O.D.I.N. también vive acá: es un asistente, así que acompaña a todas las
 * pantallas y conserva si está plegado al navegar.
 *
 * Las fuentes se declaran acá y no en `app/layout.tsx` porque ese archivo es del
 * carril A (AGENTS.md §4.2).
 */
const exo = Exo({ subsets: ['latin'], variable: '--font-exo', display: 'swap' })
const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-lato',
  display: 'swap',
})
const robotoCondensed = Roboto_Condensed({
  subsets: ['latin'],
  variable: '--font-roboto-condensed',
  display: 'swap',
})

export default async function NectLayout({ children }: { children: React.ReactNode }) {
  const { salud } = await leerEquiposUnificados()

  return (
    <div
      className={`${exo.variable} ${lato.variable} ${robotoCondensed.variable} flex min-h-screen bg-background font-sans text-foreground antialiased`}
    >
      <BarraLateral salud={salud} onActualizar={actualizarFuente} />
      {children}
      <PanelOdin
        prediccion={PREDICCION}
        alertas={ALERTAS}
        conflicto={CONFLICTO}
        consultas={CONSULTAS_RAPIDAS}
      />
    </div>
  )
}
