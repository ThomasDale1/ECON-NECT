import { CATALOGO_KPI } from '@/lib/kpi/catalogo'
import type { EquipoUnificado, Veredicto } from '@/lib/tipos/canonico'
import { cn } from '@/lib/utils'

/**
 * Indicadores operativos.
 *
 * Doctrina de KPI: **un indicador que no dispara una acción es adorno**, y
 * ningún número aparece sin poder señalar de qué lectura salió. Los que el
 * sandbox no permite calcular se listan con el dato que falta, en vez de
 * rellenarlos con un valor inventado.
 *
 * Paleta categórica validada con el script de la guía de visualización
 * (lightness, croma, separación para daltonismo y contraste: todo pasa en claro).
 * No reutiliza los colores de veredicto: esos están reservados para severidad.
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

export function PanelIndicadores({ equipos }: { equipos: EquipoUnificado[] }) {
  const total = equipos.length || 1

  const porVeredicto = equipos.reduce<Record<string, number>>((acc, e) => {
    acc[e.veredicto] = (acc[e.veredicto] ?? 0) + 1
    return acc
  }, {})

  const coherentes = porVeredicto.COHERENTE ?? 0
  const sinEvidencia = porVeredicto.SIN_EVIDENCIA ?? 0
  const excepciones = equipos.length - coherentes
  const identidadResuelta = equipos.filter((e) => e.identidadResuelta).length
  const confianzaMedia = Math.round(equipos.reduce((s, e) => s + e.confianza, 0) / total)

  const porProyecto = agrupar(equipos, (e) => e.ubicacion?.descripcion.valor ?? 'Sin proyecto')
  const porRegla = agrupar(
    equipos.filter((e) => e.veredicto !== 'COHERENTE'),
    (e) => (e.reglas.find((r) => r.veredicto === e.veredicto) ?? e.reglas[0])?.nombre ?? 'Sin regla',
  )

  const sinCalcular = CATALOGO_KPI.filter((k) => k.datoFaltante !== null)

  return (
    <div className="flex flex-col gap-6">
      {/* Tiles: solo lo que sale de esta lectura */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          etiqueta="Tasa de coherencia"
          valor={`${Math.round((coherentes / total) * 100)}%`}
          nota={`${coherentes} de ${equipos.length} equipos sin incoherencia`}
        />
        <Tile
          etiqueta="Excepciones activas"
          valor={String(excepciones)}
          nota="Equipos que no salieron coherentes"
          acento={excepciones > 0}
        />
        <Tile
          etiqueta="Identidad resuelta"
          valor={`${Math.round((identidadResuelta / total) * 100)}%`}
          nota={`${identidadResuelta} de ${equipos.length} cruzan con Startrack`}
        />
        <Tile
          etiqueta="Confianza media"
          valor={`${confianzaMedia}%`}
          nota={`${sinEvidencia} equipos sin evidencia suficiente`}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Distribución de veredictos */}
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-card">
          <div>
            <h2 className="font-heading text-base font-bold tracking-tight text-primary">
              Distribución de veredictos
            </h2>
            <p className="font-label text-xs text-muted-foreground">
              Toda la flota, en la lectura actual
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

        {/* Equipos por proyecto */}
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-card">
          <div>
            <h2 className="font-heading text-base font-bold tracking-tight text-primary">
              Equipos por proyecto
            </h2>
            <p className="font-label text-xs text-muted-foreground">
              Asignación según Prisma. Barras y no pastel: con más de cuatro categorías el pastel
              deja de leerse.
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

      {/* Excepciones por regla */}
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

      {/* Lo que hoy no se puede calcular */}
      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-card">
        <div>
          <h2 className="font-heading text-base font-bold tracking-tight text-primary">
            Indicadores que hoy no se pueden calcular
          </h2>
          <p className="font-label text-xs text-muted-foreground">
            Un hueco documentado vale más que un relleno. Cada uno dice qué dato falta.
          </p>
        </div>
        <ul className="flex flex-col divide-y divide-border">
          {sinCalcular.map((kpi) => (
            <li key={kpi.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
              <span className="font-label text-[13px] font-bold">{kpi.nombre}</span>
              <span className="font-label text-xs text-muted-foreground">{kpi.queMide}</span>
              <span className="font-label text-xs text-veredicto-atencion">
                Falta: {kpi.datoFaltante}
              </span>
            </li>
          ))}
          <li className="flex flex-col gap-1 py-3 last:pb-0">
            <span className="font-label text-[13px] font-bold">
              Estado operativo de la flota, últimos 30 días
            </span>
            <span className="font-label text-xs text-muted-foreground">
              La serie de tiempo del mockup necesita telemetría histórica.
            </span>
            <span className="font-label text-xs text-veredicto-atencion">
              Falta: histórico de 30 días. Los conectores leen el estado actual, no una serie.
            </span>
          </li>
        </ul>
      </section>
    </div>
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

function Tile({
  etiqueta,
  valor,
  nota,
  acento = false,
}: {
  etiqueta: string
  valor: string
  nota: string
  acento?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 shadow-card">
      <span className="font-label text-[11px] uppercase tracking-wide text-muted-foreground">
        {etiqueta}
      </span>
      <span
        className={cn(
          'font-heading text-3xl font-extrabold tracking-tight',
          acento ? 'text-veredicto-atencion' : 'text-primary',
        )}
      >
        {valor}
      </span>
      <span className="font-label text-[11px] text-muted-foreground">{nota}</span>
    </div>
  )
}

/**
 * Barra con su valor siempre escrito al lado: el número nunca depende del color
 * ni de medir la barra a ojo.
 */
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
