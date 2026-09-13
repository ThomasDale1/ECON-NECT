import type { Metadata } from 'next'
import { ConsolaOdin } from '@/components/odin/consola-odin'
import { EQUIPOS_EJEMPLO } from '@/lib/tipos/ejemplo'


export const metadata: Metadata = {
  title: 'O.D.I.N. · ECON NECT',
  description: 'Operador local de Datos e Inteligencia de Negocios de ECON NECT.',
}

export default function OdinPage() {
  const equipos = EQUIPOS_EJEMPLO.map((equipo) => ({
    id: equipo.id,
    codigo: equipo.codigoActivo.valor ?? 'Sin código',
    nombre: equipo.nombre.valor ?? 'Sin nombre',
  }))

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-7">
      <div>
        <p className="font-label text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Inteligencia operacional local
        </p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-primary">O.D.I.N.</h1>
      </div>
      <ConsolaOdin equipos={equipos} />
    </main>
  )
}

