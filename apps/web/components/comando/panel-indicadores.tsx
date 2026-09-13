'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarRange,
  CircleDollarSign,
  GitCompare,
  LayoutDashboard,
  Link2,
  Timer,
  type LucideIcon,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BadgeVeredicto } from '@/components/nect/badge-veredicto'
import { TextoEnfasis } from '@/components/odin/texto-enfasis'
import { calcularCobertura, calcularLatencia, calcularTasaCoherencia, type ParLatencia } from '@/lib/kpi/calculo'
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

const ICONO: Record<string, LucideIcon> = {
  flota: LayoutDashboard,
  'tasa-coherencia': GitCompare,
  'cobertura-interpretacion': Link2,
  'latencia-solicitud-traslado': Timer,
  'tiempo-muerto-quetzales': CircleDollarSign,
  'estado-flota-30d': CalendarRange,
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
  const tasa = calcularTasaCoherencia(equipos)
  const cob = calcularCobertura(equipos)
  const lat = calcularLatencia(paresLatencia)

  const porVeredicto = (Object.keys(ETIQUETA_VEREDICTO) as Veredicto[]).map((v) => ({
    key: v,
    nombre: ETIQUETA_VEREDICTO[v],
    valor: equipos.filter((e) => e.veredicto === v).length,
    fill: COLOR_HEX[v],
  }))

  const porProyecto = agrupar(equipos, (e) => e.ubicacion?.descripcion.valor ?? 'Sin proyecto')
    .slice(0, 6)
    .map(([nombre, valor], i) => ({ nombre, valor, fill: CATEGORICA[i] }))

  const porRegla = agrupar(
    equipos.filter((e) => e.veredicto !== 'COHERENTE'),
    (e) => (e.reglas.find((r) => r.veredicto === e.veredicto) ?? e.reglas[0])?.nombre ?? 'Sin regla',
  ).map(([nombre, valor], i) => ({ nombre, valor, fill: CATEGORICA[i % CATEGORICA.length] }))

  const extra = {
    'tasa-coherencia': { parte: tasa.numerador, total: tasa.denominador, ratio: tasa.valor },
    'cobertura-interpretacion': { parte: cob.resueltos, total: cob.total, ratio: cob.valor },
    'latencia-solicitud-traslado': {
      parte: lat.muestras,
      total: Math.max(solicitudesAprobadas, lat.muestras),
      ratio: lat.muestras === 0 ? null : lat.muestras / Math.max(solicitudesAprobadas, lat.muestras),
    },
    'tiempo-muerto-quetzales': { parte: 0, total: 15, ratio: null as number | null },
    'estado-flota-30d': { parte: 0, total: 30, ratio: null as number | null },
    flota: {
      parte: lecturas.filter((l) => l.faltante === null).length,
      total: lecturas.length,
      ratio: lecturas.length === 0 ? null : lecturas.filter((l) => l.faltante === null).length / lecturas.length,
    },
  }

  return (
    <div className="flex flex-col gap-4">
      <Tarjeta
        lectura={flota}
        href="/command-center"
        compacta={false}
        extra={extra.flota}
        stacked={porVeredicto}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {lecturas.map((lectura) => (
          <Tarjeta
            key={lectura.id}
            lectura={lectura}
            href={
              lectura.id === 'tasa-coherencia' || lectura.id === 'cobertura-interpretacion'
                ? '/command-center'
                : '/flota'
            }
            compacta
            extra={extra[lectura.id as keyof typeof extra]}
          />
        ))}
      </section>

      <div className="grid gap-3 xl:grid-cols-2">
        <GraficoCard titulo="Veredictos de esta lectura" nota="Donut con recuento, no una tendencia">
          {equipos.length === 0 ? (
            <Hueco alto={180} etiqueta="Sin equipos en la lectura" />
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-[180px] w-[180px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={porVeredicto.filter((d) => d.valor > 0)}
                      dataKey="valor"
                      nameKey="nombre"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {porVeredicto.filter((d) => d.valor > 0).map((d) => (
                        <Cell key={d.key} fill={d.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
                {porVeredicto.map((d) => (
                  <li key={d.key} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="size-2 shrink-0 rounded-full" style={{ background: d.fill }} />
                      <span className="truncate">{d.nombre}</span>
                    </span>
                    <span className="font-mono font-bold">{d.valor}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </GraficoCard>

        <GraficoCard titulo="Equipos por proyecto" nota="Barras de Prisma, no pastel">
          {porProyecto.length === 0 ? (
            <Hueco alto={180} etiqueta="Sin proyecto en la lectura" />
          ) : (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porProyecto} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={110}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={12}>
                    {porProyecto.map((d) => (
                      <Cell key={d.nombre} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GraficoCard>
      </div>

      <GraficoCard titulo="Excepciones por regla" nota="Solo veredictos distintos de coherente">
        {porRegla.length === 0 ? (
          <p className="py-6 text-center font-label text-sm text-muted-foreground">
            No hay incoherencias detectadas con la evidencia disponible.
          </p>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porRegla} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  width={160}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={12}>
                  {porRegla.map((d) => (
                    <Cell key={d.nombre} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </GraficoCard>
    </div>
  )
}

function Tarjeta({
  lectura,
  href,
  compacta,
  extra,
  stacked,
}: {
  lectura: LecturaKpi
  href: string
  compacta: boolean
  extra: { parte: number; total: number; ratio: number | null }
  stacked?: { key: string; nombre: string; valor: number; fill: string }[]
}) {
  const Icono = ICONO[lectura.id] ?? LayoutDashboard
  const vacio = extra.ratio === null && lectura.faltante !== null

  return (
    <article
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-border bg-card shadow-card',
        compacta ? 'p-3' : 'p-4 sm:flex-row sm:items-center sm:gap-5',
      )}
    >
      <div className={cn('flex items-start gap-2', compacta ? '' : 'sm:min-w-[220px]')}>
        <span
          className={cn(
            'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
            lectura.veredicto === 'SIN_EVIDENCIA'
              ? 'bg-veredicto-sin-evidencia-fondo text-veredicto-sin-evidencia'
              : lectura.veredicto === 'EN_RIESGO'
                ? 'bg-veredicto-riesgo-fondo text-veredicto-riesgo'
                : lectura.veredicto === 'ATENCION'
                  ? 'bg-veredicto-atencion-fondo text-veredicto-atencion'
                  : 'bg-veredicto-coherente-fondo text-veredicto-coherente',
          )}
        >
          <Icono aria-hidden className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="truncate font-heading text-sm font-extrabold tracking-tight text-primary">
              {lectura.nombre}
            </h2>
            <BadgeVeredicto veredicto={lectura.veredicto} />
          </div>
          <p className="font-heading text-2xl font-extrabold tracking-tight leading-none mt-1">{lectura.valor}</p>
        </div>
      </div>

      <div className={cn('flex items-center gap-3', compacta ? '' : 'sm:w-56')}>
        {lectura.id === 'estado-flota-30d' ? (
          <SerieVacia />
        ) : stacked ? (
          <StackedBar segmentos={stacked} />
        ) : vacio ? (
          <Hueco alto={56} etiqueta="Sin dato" />
        ) : (
          <Anillo
            ratio={extra.ratio ?? 0}
            color={COLOR_HEX[lectura.veredicto]}
            etiqueta={`${extra.parte}/${extra.total}`}
          />
        )}
        {compacta ? null : (
          <p className="hidden text-[11px] text-muted-foreground sm:block">{lectura.cobertura}</p>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn('text-xs font-bold leading-snug', compacta ? 'line-clamp-2' : 'line-clamp-3')}>
          <TextoEnfasis texto={lectura.lectura} />
        </p>
        <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
          {lectura.paso} · {AGENTE[lectura.rol]}
        </p>
        {lectura.faltante && compacta ? (
          <p className="mt-1 line-clamp-1 font-label text-[11px] text-veredicto-sin-evidencia">Hueco declarado</p>
        ) : null}
        <Link
          href={href}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary"
        >
          {lectura.faltante ? 'Ver flota' : 'Ver excepciones'}
          <ArrowRight aria-hidden className="size-3" />
        </Link>
      </div>
    </article>
  )
}

function Anillo({ ratio, color, etiqueta }: { ratio: number; color: string; etiqueta: string }) {
  const r = 18
  const c = 2 * Math.PI * r
  const lleno = Math.max(0, Math.min(1, ratio))
  return (
    <svg viewBox="0 0 48 48" className="size-14 shrink-0" aria-hidden>
      <circle cx="24" cy="24" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={`${lleno * c} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
      />
      <text x="24" y="26" textAnchor="middle" className="fill-foreground" fontSize="7" fontWeight="700">
        {etiqueta}
      </text>
    </svg>
  )
}

function StackedBar({ segmentos }: { segmentos: { key: string; nombre: string; valor: number; fill: string }[] }) {
  const total = segmentos.reduce((s, d) => s + d.valor, 0) || 1
  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {segmentos.map((d) =>
          d.valor === 0 ? null : (
            <div
              key={d.key}
              title={`${d.nombre}: ${d.valor}`}
              style={{ width: `${(d.valor / total) * 100}%`, background: d.fill }}
            />
          ),
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">
        {segmentos.filter((d) => d.valor > 0).map((d) => `${d.nombre} ${d.valor}`).join(' · ')}
      </p>
    </div>
  )
}

function SerieVacia() {
  return (
    <svg viewBox="0 0 120 40" className="h-10 w-28 shrink-0" aria-hidden>
      <path d="M4 36 H116" stroke="#e5e7eb" strokeWidth="1" />
      <path
        d="M8 28 L24 22 L40 26 L56 18 L72 24 L88 16 L104 20"
        fill="none"
        stroke="#7c3aed"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
      <text x="60" y="14" textAnchor="middle" fill="#7c3aed" fontSize="7" fontWeight="700">
        sin serie
      </text>
    </svg>
  )
}

function Hueco({ alto, etiqueta }: { alto: number; etiqueta: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-veredicto-sin-evidencia/40 bg-veredicto-sin-evidencia-fondo text-[11px] font-bold text-veredicto-sin-evidencia"
      style={{ height: alto }}
    >
      {etiqueta}
    </div>
  )
}

function GraficoCard({ titulo, nota, children }: { titulo: string; nota: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-card">
      <div>
        <h2 className="font-heading text-sm font-bold tracking-tight text-primary">{titulo}</h2>
        <p className="font-label text-[11px] text-muted-foreground">{nota}</p>
      </div>
      {children}
    </section>
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
