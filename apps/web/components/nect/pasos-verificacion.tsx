import { BadgeOrigen } from '@/components/nect/badge-origen'
import { urlFichaPrisma } from '@/lib/nect/enlaces'
import type { EquipoUnificado } from '@/lib/tipos/canonico'

/**
 * Pasos literales de verificación humana cuando la identidad es débil o falta
 * evidencia. No es un veredicto nuevo: es una guía para abrir ambas plataformas
 * y comparar estados/objetos antes de tratarlos como el mismo activo.
 */
export function PasosVerificacion({
  equipo,
  urlPrisma,
  urlStartrack,
}: {
  equipo: EquipoUnificado
  urlPrisma: string | null
  urlStartrack: string | null
}) {
  const codigo = equipo.codigoActivo.valor ?? undefined
  const identidadDebil =
    !equipo.identidadResuelta ||
    equipo.nivelResolucionIdentidad === 2 ||
    equipo.nivelResolucionIdentidad === 3
  const faltaContraparte = equipo.vehiculo === null || equipo.equipo === null
  const sinEvidencia = equipo.veredicto === 'SIN_EVIDENCIA'

  if (!identidadDebil && !faltaContraparte && !sinEvidencia) return null

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-card">
      <h3 className="font-heading text-sm font-bold tracking-tight text-primary">
        Pasos de verificación humana
      </h3>
      <ol className="flex list-decimal flex-col gap-3 pl-5 font-label text-[13px] leading-relaxed text-foreground">
        <li className="flex flex-wrap items-center gap-2">
          <span>Abrí la ficha del equipo en Prisma.</span>
          <BadgeOrigen plataforma="prisma" corto href={urlFichaPrisma(urlPrisma, equipo.id)} equipo={codigo} />
        </li>
        <li className="flex flex-wrap items-center gap-2">
          <span>Abrí Startrack y pegá el mismo código en el filtro.</span>
          <BadgeOrigen plataforma="startrack" corto href={urlStartrack} equipo={codigo} />
        </li>
        <li>
          Compará los estados y los objetos que describe cada plataforma (recurso, tarea, falla).
        </li>
        <li>
          Solo entonces tratá ambos registros como el mismo activo.
        </li>
      </ol>
    </section>
  )
}
