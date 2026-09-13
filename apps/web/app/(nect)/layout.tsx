import { Exo, Lato, Roboto_Condensed } from 'next/font/google'
import { BarraLateral } from '@/components/comando/barra-lateral'

/**
 * Envoltorio de las pantallas de ECON NECT: barra lateral fija + área de trabajo.
 *
 * Las fuentes se declaran acá y no en `app/layout.tsx` porque ese archivo es del
 * carril A (AGENTS.md §4.2). Las variables se aplican al contenedor, así que
 * cubren todo el subárbol de rutas sin tocar territorio ajeno.
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

export default function NectLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${exo.variable} ${lato.variable} ${robotoCondensed.variable} flex min-h-screen bg-background font-sans text-foreground antialiased`}
    >
      <BarraLateral />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
