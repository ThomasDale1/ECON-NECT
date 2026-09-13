import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BadgeVeredicto } from '@/components/nect/badge-veredicto'
import { TextoEnfasis } from '@/components/odin/texto-enfasis'
import { interpretarFlota, interpretarKpis, type LecturaKpi } from '@/lib/kpi/interpretacion'
import type { ParLatencia } from '@/lib/kpi/calculo'
import type { EquipoUnificado, Rol, Veredicto } from '@/lib/tipos/canonico'
import { cn } from '@/lib/utils'

/**
 * Indicadores operativos. Cada KPI se lee como O.D.I.N.: veredicto, cifra o
 * hueco, por qué, siguiente paso. La tasa de coherencia usa identidad
 * resuelta, no la flota total. Nada se inventa.
 */
const CATEGORICA = ['#0891b2', '#db2777', '#65a30d', '#4f46e5', '#0d9488', '#c026d3']

const ETIQUETA_VEREDICTO: Record<Veredicto, string> = {
  COHERENTE: 'Coherente',
  ATENCION: 'Atención',
  EN_RIESGO: 'En riesgo',
  SIN_EVIDENCIA: 'Sin evidencia',
}

const COLOR_VEREDICTO: Record<Veredicto, string> = {
  COHERENTE: 'bg-veredicto-coherente',
  ATENCION: 'bg-veredicto-atencion',
  EN_RIESGO: 'bg-veredicto-riesgo',
  SIN_EVIDENCIA: 'bg-veredicto-sin-evidencia',
}

const AGENTE: Record<Rol, string> = {
  PROYECTOS: 'Gerencia de Proyecto',
  LOGISTICA: 'Gerencia de Logística y Equipo',
  MANTENIMIENTO: 'Gerencia de Mantenimiento',
  COSTOS: 'Control de Costos',
  DIRECCION: 'Dirección de Operaciones',
}

export function PanelIndicadores({
  equipos,
  paresLatencia,
  solicitudesAprobadas,
}: {
  equipos: EquipoUnificado[]
  paresLatencia: ParLatencia[]
  solicitudesAprobadas: number
}) {
  const lecturas = interpretarKpis(equipos, paresLatencia, solicitudesAprobadas)
  const flota = interpretarFlota(lecturas, equipos)

  const porVeredicto = equipos.reduce<Record<string, number>>((acc, e) => {
    acc[e.veredicto] = (acc[e.veredicto] ?? 0) + 1
    return acc
  }, {})

  const porProyecto = agrupar(equipos, (e) => e.ubicacion?.descripcion.valor ?? 'Sin proyecto')
  const porRegla = agrupar(
    equipos.filter((e) => e.veredicto !== 'COHERENTE'),
    (e) => (e.reglas.find((r) => r.veredicto === e.veredicto) ?? e.reglas[0])?.nombre ?? 'Sin regla',
  )

  return (
    <div className="flex flex-col gap-6">
      <TarjetaLectura lectura={flota} destacada href="/command-center" cta="Abrir bandeja" />

      <section className="grid gap-4 xl:grid-cols-2">
        {lecturas.map((lectura) => (
          <TarjetaLectura
            key={lectura.id}
            lectura={lectura}
            href={lectura.id === 'tasa-coherencia' || lectura.id === 'cobertura-interpretacion' ? '/command-center' : '/flota'}
            cta={lectura.faltante ? 'Ver flota' : 'Ver excepciones'}
          />
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-card">
          <div>
            <h2 className="font-heading text-base font-bold tracking-tight text-primary">
              Distribución de veredictos
            </h2>
            <p className="font-label text-xs text-muted-foreground">
              Evidencia de esta lectura, no una serie histórica
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {(Object.keys(ETIQUETA_VEREDICTO) as Veredicto[]).map((v) => (
              <Barra
                key={v}
                etiqueta={ETIQUETA_VEREDICTO[v]}
                valor={porVeredicto[v] ?? 0}
                maximo={equipos.length}
                clase={COLOR_VEREDICTO[v]}
              />
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-card">
          <div>
            <h2 className="font-heading text-base font-bold tracking-tight text-primary">
              Equipos por proyecto
            </h2>
            <p className="font-label text-xs text-muted-foreground">
              Asignación según Prisma. Barras y no pastel.
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {porProyecto.slice(0, 6).map(([nombre, cuenta], i) => (
              <Barra
                key={nombre}
                etiqueta={nombre}
                valor={cuenta}
                maximo={porProyecto[0]?.[1] ?? 1}
                color={CATEGORICA[i]}
              />
            ))}
            {porProyecto.length > 6 && (
              <Barra
                etiqueta={`Otros (${porProyecto.length - 6} proyectos)`}
                valor={porProyecto.slice(6).reduce((s, [, c]) => s + c, 0)}
                maximo={porProyecto[0]?.[1] ?? 1}
                clase="bg-muted-foreground"
              />
            )}
          </ul>
        </section>
      </div>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-card">
        <div>
          <h2 className="font-heading text-base font-bold tracking-tight text-primary">
            Excepciones por regla
          </h2>
          <p className="font-label text-xs text-muted-foreground">
            Qué regla produjo cada veredicto distinto de coherente
          </p>
        </div>
        {porRegla.length === 0 ? (
          <p className="py-6 text-center font-label text-sm text-muted-foreground">
            No hay incoherencias detectadas con la evidencia disponible.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {porRegla.map(([nombre, cuenta], i) => (
              <Barra
                key={nombre}
                etiqueta={nombre}
                valor={cuenta}
                maximo={porRegla[0]?.[1] ?? 1}
                color={CATEGORICA[i % CATEGORICA.length]}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function TarjetaLectura({
  lectura,
  destacada = false,
  href,
  cta,
}: {
  lectura: LecturaKpi
  destacada?: boolean
  href: string
  cta: string
}) {
  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-card',
        destacada ? 'border-primary/30' : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-heading text-base font-extrabold tracking-tight text-primary">
          {lectura.nombre}
        </h2>
        <BadgeVeredicto veredicto={lectura.veredicto} />
      </div>
      <p className={cn('font-heading font-extrabold tracking-tight', destacada ? 'text-4xl' : 'text-3xl')}>
        {lectura.valor}
      </p>
      <p className="text-sm font-bold leading-snug">
        <TextoEnfasis texto={lectura.lectura} />
      </p>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Siguiente paso</p>
        <p className="mt-1 text-sm font-bold leading-snug">{lectura.paso}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{AGENTE[lectura.rol]}</p>
      </div>
      {lectura.faltante ? (
        <p className="font-label text-xs text-veredicto-sin-evidencia">Falta: {lectura.faltante}</p>
      ) : null}
      {lectura.cobertura ? (
        <p className="font-label text-[11px] text-muted-foreground">{lectura.cobertura}</p>
      ) : null}
      <p className="font-label text-[11px] text-muted-foreground">{lectura.queMide}</p>
      <Link
        href={href}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[13px] font-bold text-primary-foreground"
      >
        {cta}
        <ArrowRight aria-hidden className="size-3.5" />
      </Link>
    </article>
  )
}

function agrupar(equipos: EquipoUnificado[], clave: (e: EquipoUnificado) => string) {
  const cuentas = new Map<string, number>()
  for (const e of equipos) {
    const k = clave(e)
    cuentas.set(k, (cuentas.get(k) ?? 0) + 1)
  }
  return [...cuentas.entries()].sort((a, b) => b[1] - a[1])
}

function Barra({
  etiqueta,
  valor,
  maximo,
  color,
  clase,
}: {
  etiqueta: string
  valor: number
  maximo: number
  color?: string
  clase?: string
}) {
  const porcentaje = maximo > 0 ? Math.round((valor / maximo) * 100) : 0

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate font-label text-xs" title={etiqueta}>
          {etiqueta}
        </span>
        <span className="shrink-0 font-mono text-xs font-bold">{valor}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', clase)}
          style={{ width: `${Math.max(porcentaje, valor > 0 ? 4 : 0)}%`, backgroundColor: color }}
        />
      </div>
    </li>
  )
}
