export default function PaginaInicio() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2">
      <h1 className="text-2xl font-semibold">ECON NECT — andamio listo</h1>
      <p className="text-sm text-muted-foreground">
        {new Date().toLocaleDateString('es-GT', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>
    </main>
  )
}
