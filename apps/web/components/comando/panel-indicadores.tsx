'use client'

import type { ReactNode } from 'react'
import {
  Boxes,
  CalendarRange,
  CircleDollarSign,
  GitCompare,
  Link2,
  Timer,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BadgeVeredicto } from '@/components/nect/badge-veredicto'
import {
  calcularCobertura,
  calcularLatencia,
  calcularTasaCoherencia,
  type ParLatencia,
} from '@/lib/kpi/calculo'
import { interpretarFlota, interpretarKpis, type LecturaKpi } from '@/lib/kpi/interpretacion'
import type { EquipoUnificado, Rol, Veredicto } from '@/lib/tipos/canonico'
import { cn } from '@/lib/utils'

const COLOR_HEX: Record<Veredicto, string> = {
  COHERENTE: '#059669',
  ATENCION: '#d97706',
  EN_RIESGO: '#dc2626',
  SIN_EVIDENCIA: '#7c3aed',
}

const ETIQUETA_VEREDICTO: Record<Veredicto, string> = {
  COHERENTE: 'Coherente',
  ATENCION: 'Atención',
  EN_RIESGO: 'En riesgo',
  SIN_EVIDENCIA: 'Sin evidencia',
}

const CATEGORICA = ['#0891b2', '#db2777', '#65a30d', '#4f46e5', '#0d9488', '#c026d3']

const AGENTE: Record<Rol, string> = {
  PROYECTOS: 'Gerencia de Proyecto',
  LOGISTICA: 'Logística y Equipo',
  MANTENIMIENTO: 'Mantenimiento',
  COSTOS: 'Control de Costos',
  DIRECCION: 'Dirección',
}

const HERO_IDS = new Set(['tasa-coherencia', 'cobertura-interpretacion'])
const HUECO_IDS = new Set(['tiempo-muerto-quetzales', 'estado-flota-30d'])

export function PanelIndicadores({
  equipos,
  paresLatencia = [],
  solicitudesAprobadas = 0,
}: {
  equipos: EquipoUnificado[]
  paresLatencia?: ParLatencia[]
  solicitudesAprobadas?: number
}) {
  const lecturas = interpretarKpis(equipos, paresLatencia, solicitudesAprobadas)
  const flota = interpretarFlota(lecturas, equipos)
  calcularTasaCoherencia(equipos)
  calcularCobertura(equipos)
  calcularLatencia(paresLatencia)

  const lecturaTasa = lecturas.find((l) => l.id === 'tasa-coherencia')
  const lecturaCob = lecturas.find((l) => l.id === 'cobertura-interpretacion')
  const lecturaMuerto = lecturas.find((l) => l.id === 'tiempo-muerto-quetzales')
  const lecturaSerie = lecturas.find((l) => l.id === 'estado-flota-30d')
  const restantes = lecturas.filter((l) => !HERO_IDS.has(l.id) && !HUECO_IDS.has(l.id))

  const excepciones = equipos.filter((e) => e.veredicto !== 'COHERENTE').length
  const peorExcepcion: Veredicto | null =
    equipos.some((e) => e.veredicto === 'EN_RIESGO')
      ? 'EN_RIESGO'
      : equipos.some((e) => e.veredicto === 'ATENCION')
        ? 'ATENCION'
        : equipos.some((e) => e.veredicto === 'SIN_EVIDENCIA')
          ? 'SIN_EVIDENCIA'
          : null

  const porVeredicto = (Object.keys(ETIQUETA_VEREDICTO) as Veredicto[])
    .map((v) => ({
      key: v,
      nombre: ETIQUETA_VEREDICTO[v],
      valor: equipos.filter((e) => e.veredicto === v).length,
      fill: COLOR_HEX[v],
    }))
    .filter((d) => d.valor > 0)

  const porProyecto = agrupar(equipos, (e) => e.ubicacion?.descripcion.valor ?? 'Sin proyecto')
    .slice(0, 6)
    .map(([nombre, valor], i) => ({ nombre, valor, fill: CATEGORICA[i] }))

  const porRegla = agrupar(
    equipos.filter((e) => e.veredicto !== 'COHERENTE'),
    (e) => (e.reglas.find((r) => r.veredicto === e.veredicto) ?? e.reglas[0])?.nombre ?? 'Sin regla',
  )

  return (
    <div className="flex flex-col gap-5">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HeroTile
          icono={Boxes}
          valor={String(equipos.length)}
          etiqueta="Equipos en esta lectura"
          estado={
            equipos.length === 0 ? (
              <span className="font-label text-[11px] text-veredicto-sin-evidencia">Hueco declarado</span>
            ) : (
              <BadgeVeredicto veredicto={flota.veredicto} />
            )
          }
          tono={equipos.length === 0 ? 'hueco' : 'ok'}
        />
        <HeroTile
          icono={GitCompare}
          valor={lecturaTasa?.valor ?? 'No disponible'}
          etiqueta="Tasa de coherencia"
          estado={estadoLectura(lecturaTasa)}
          tono={tonoLectura(lecturaTasa)}
        />
        <HeroTile
          icono={Link2}
          valor={lecturaCob?.valor ?? 'No disponible'}
          etiqueta="Cobertura"
          estado={estadoLectura(lecturaCob)}
          tono={tonoLectura(lecturaCob)}
        />
        <HeroTile
          icono={TriangleAlert}
          valor={String(excepciones)}
          etiqueta="Excepciones"
          estado={
            excepciones === 0 ? (
              <BadgeVeredicto veredicto="COHERENTE" />
            ) : peorExcepcion ? (
              <BadgeVeredicto veredicto={peorExcepcion} />
            ) : (
              <span className="font-label text-[11px] text-muted-foreground">En esta lectura</span>
            )
          }
          tono={excepciones === 0 ? 'ok' : 'alerta'}
        />
      </section>

      <p className="rounded-xl border border-border bg-card px-4 py-2.5 font-label text-[12px] leading-snug text-muted-foreground shadow-card">
        <span className="font-heading font-bold text-primary">Lectura de flota. </span>
        {flota.lectura}
      </p>

      <div className="grid gap-4 xl:grid-cols-3">
        <CardBlock
          className="xl:col-span-2"
          titulo="Veredictos de esta lectura"
          nota="Recuento de esta lectura, no una tendencia"
        >
          {porVeredicto.length === 0 ? (
            <Hueco alto={220} etiqueta="Sin equipos en la lectura" />
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porVeredicto} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="nombre"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(20, 79, 129, 0.04)' }}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]} barSize={36} name="Equipos">
                    {porVeredicto.map((d) => (
                      <Cell key={d.key} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBlock>

        <CardBlock titulo="Qué atender" nota="Reglas que no salieron COHERENTE">
          {porRegla.length === 0 ? (
            <p className="py-8 text-center font-label text-sm text-muted-foreground">
              No hay incoherencias detectadas con la evidencia disponible.
            </p>
          ) : (
            <ul className="flex flex-col">
              {porRegla.map(([nombre, cuenta], i) => (
                <li
                  key={nombre}
                  className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: CATEGORICA[i % CATEGORICA.length] }}
                    />
                    <span className="truncate font-label text-[13px]" title={nombre}>
                      {nombre}
                    </span>
                  </span>
                  <span className="shrink-0 font-heading text-sm font-extrabold">{cuenta}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBlock>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <CardBlock titulo="Equipos por proyecto" nota="Asignación según Prisma, en esta lectura">
          {porProyecto.length === 0 ? (
            <Hueco alto={200} etiqueta="Sin proyecto en la lectura" />
          ) : (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={porProyecto}
                  layout="vertical"
                  margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={110}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={12} name="Equipos">
                    {porProyecto.map((d) => (
                      <Cell key={d.nombre} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBlock>

        <CardBlock titulo="Huecos declarados" nota="Sin cifra. No se dibuja tendencia.">
          <div className="grid gap-3 sm:grid-cols-2">
            <HuecoKpi
              icono={CircleDollarSign}
              nombre={lecturaMuerto?.nombre ?? 'Tiempo muerto en quetzales'}
              etiqueta="Sin dato"
            />
            <HuecoKpi
              icono={CalendarRange}
              nombre={lecturaSerie?.nombre ?? 'Estado operativo de la flota, últimos 30 días'}
              etiqueta="sin serie"
            />
          </div>
        </CardBlock>
      </div>

      {restantes.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {restantes.map((lectura) => (
            <article
              key={lectura.id}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-card"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                  <Timer aria-hidden className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-sm font-extrabold tracking-tight text-primary">
                      {lectura.nombre}
                    </h2>
                    {lectura.faltante ? (
                      <span className="font-label text-[11px] text-veredicto-sin-evidencia">
                        Hueco declarado
                      </span>
                    ) : (
                      <BadgeVeredicto veredicto={lectura.veredicto} />
                    )}
                  </div>
                  <p className="mt-1 font-heading text-2xl font-extrabold tracking-tight">
                    {lectura.valor}
                  </p>
                </div>
              </div>
              <p className="line-clamp-2 font-label text-xs leading-snug text-foreground">
                {lectura.lectura}
              </p>
              <p className="line-clamp-1 font-label text-[11px] text-muted-foreground">
                {lectura.paso} · {AGENTE[lectura.rol]}
              </p>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  )
}

function estadoLectura(lectura: LecturaKpi | undefined) {
  if (!lectura || lectura.faltante) {
    return <span className="font-label text-[11px] text-veredicto-sin-evidencia">Hueco declarado</span>
  }
  return <BadgeVeredicto veredicto={lectura.veredicto} />
}

function tonoLectura(lectura: LecturaKpi | undefined): 'ok' | 'alerta' | 'hueco' {
  if (!lectura || lectura.faltante || lectura.veredicto === 'SIN_EVIDENCIA') return 'hueco'
  if (lectura.veredicto === 'COHERENTE') return 'ok'
  return 'alerta'
}

function HeroTile({
  icono: Icono,
  valor,
  etiqueta,
  estado,
  tono,
}: {
  icono: LucideIcon
  valor: string
  etiqueta: string
  estado: ReactNode
  tono: 'ok' | 'alerta' | 'hueco'
}) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card">
      <span
        className={cn(
          'flex size-9 items-center justify-center rounded-full',
          tono === 'ok' && 'bg-veredicto-coherente-fondo text-veredicto-coherente',
          tono === 'alerta' && 'bg-veredicto-atencion-fondo text-veredicto-atencion',
          tono === 'hueco' && 'bg-veredicto-sin-evidencia-fondo text-veredicto-sin-evidencia',
        )}
      >
        <Icono aria-hidden className="size-4" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-heading text-3xl font-extrabold tracking-tight text-foreground">{valor}</p>
        <p className="font-label text-[12px] text-muted-foreground">{etiqueta}</p>
        <div className="pt-0.5">{estado}</div>
      </div>
    </article>
  )
}

function CardBlock({
  titulo,
  nota,
  children,
  className,
}: {
  titulo: string
  nota: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card', className)}>
      <div>
        <h2 className="font-heading text-sm font-bold tracking-tight text-primary">{titulo}</h2>
        <p className="font-label text-[11px] text-muted-foreground">{nota}</p>
      </div>
      {children}
    </section>
  )
}

function Hueco({ alto, etiqueta }: { alto: number; etiqueta: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-veredicto-sin-evidencia/40 bg-veredicto-sin-evidencia-fondo font-label text-[11px] font-bold text-veredicto-sin-evidencia"
      style={{ height: alto }}
    >
      {etiqueta}
    </div>
  )
}

function HuecoKpi({ icono: Icono, nombre, etiqueta }: { icono: LucideIcon; nombre: string; etiqueta: string }) {
  return (
    <div className="flex min-h-[168px] flex-col gap-3 rounded-lg border border-dashed border-veredicto-sin-evidencia/40 bg-veredicto-sin-evidencia-fondo/60 p-4">
      <span className="flex size-9 items-center justify-center rounded-full bg-veredicto-sin-evidencia-fondo text-veredicto-sin-evidencia">
        <Icono aria-hidden className="size-4" />
      </span>
      <p className="line-clamp-2 font-label text-[12px] leading-snug text-foreground">{nombre}</p>
      <p className="font-heading text-lg font-extrabold text-veredicto-sin-evidencia">{etiqueta}</p>
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
