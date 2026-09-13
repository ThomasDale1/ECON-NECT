import Link from 'next/link'

export default function NoEncontrado() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
      <div className="flex max-w-md flex-col gap-3 rounded-xl border border-border bg-card p-8 text-center shadow-card">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-primary">
          Página no encontrada
        </h1>
        <p className="font-label text-sm text-muted-foreground">
          Esa ruta no existe en ECON NECT. Volvé a la flota o al centro de comando.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/flota"
            className="rounded-lg border border-border px-3 py-2 font-label text-sm font-bold text-primary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Flota
          </Link>
          <Link
            href="/command-center"
            className="rounded-lg bg-primary px-3 py-2 font-label text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Centro de comando
          </Link>
        </div>
      </div>
    </main>
  )
}
