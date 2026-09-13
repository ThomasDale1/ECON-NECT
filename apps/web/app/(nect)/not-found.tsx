import Link from 'next/link'

export default function NectNoEncontrado() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center p-8">
      <section className="flex max-w-md flex-col gap-4 rounded-xl border border-border bg-card p-8 shadow-card">
        <h1 className="font-heading text-xl font-extrabold tracking-tight text-primary">
          Página no encontrada
        </h1>
        <p className="font-label text-sm text-muted-foreground">
          Esa ruta no existe en ECON NECT. Volvé a la flota o al centro de comando.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/flota"
            className="rounded-lg bg-primary px-3 py-2 font-label text-sm font-bold text-primary-foreground"
          >
            Flota
          </Link>
          <Link
            href="/command-center"
            className="rounded-lg border border-border px-3 py-2 font-label text-sm font-bold text-primary"
          >
            Centro de comando
          </Link>
        </div>
      </section>
    </main>
  )
}
