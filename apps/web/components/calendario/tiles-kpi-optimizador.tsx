import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { CATALOGO_KPI } from '@/lib/kpi/catalogo'
import type {
  IdSoftConstraint,
  KpiAhorroObjetivo,
  KpisOptimizador,
  RespuestaOptimizar,
} from '@/lib/optimizador/tipos'
import { SOFT_CONSTRAINTS } from '@/lib/optimizador/tipos'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { NOMBRE_OBJETIVO, formatearValor } from './objetivos'

/**
 * Fila de KPIs del optimizador — S-A10 Paso 10d, la primera sección de
 * contenido de /planeacion. Contrato de "stat tile" (skill `dataviz`):
 * etiqueta · cifra · línea de cobertura, sin delta ni sparkline porque no hay
 * serie histórica. Un KPI no es un veredicto: ningún color de ui-registry §1.1,
 * solo tokens de texto.
 *
 * Solo muestra lo que calculó `lib/kpi/optimizador.ts`. Si la cifra es `null`,
 * se escribe `datoFaltante` — nunca un 0 inventado (AGENTS.md §1.1).
 */
const ID_AHORRO = 'ahorro-por-objetivo-optimizador'
const ID_COBERTURA = 'cobertura-plan-optimizador'
const MAX_NO_CUBIERTAS_VISIBLES = 3

const SUFIJO_CIFRA: Record<IdSoftConstraint, string> = {
  tarifa: 'USD/h menos',
  distancia: 'km menos',
  ratingOperador: 'pts por asignación',
  horasOperador: 'h de motor menos (acumuladas)',
}

const REFERENCIA: Record<IdSoftConstraint, string> = {
  tarifa: 'vs. la peor opción válida',
  distancia: 'vs. la peor opción válida',
  ratingOperador: 'vs. el operador válido de menor rating',
  horasOperador: 'vs. el operador válido con más horas',
}

/** El orden de la fila: tarifa, distancia, rating, horas y cubiertas. */
const ORDEN_TILES: IdSoftConstraint[] = ['tarifa', 'distancia', 'ratingOperador', 'horasOperador']

function VerFormula({ id }: { id: string }) {
  const entrada = CATALOGO_KPI.find((k) => k.id === id)
  if (!entrada) return null

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon-xs" aria-label={`Ver fórmula: ${entrada.nombre}`} />}>
        <Info aria-hidden className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <dl className="flex flex-col gap-2 text-sm">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Indicador</dt>
            <dd className="font-medium">{entrada.nombre}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Fórmula</dt>
            <dd className="text-xs">{entrada.formula}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Referencia</dt>
            <dd className="text-xs">{entrada.referencia}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Acción que dispara</dt>
            <dd>{entrada.accionQueDispara}</dd>
          </div>
        </dl>
      </PopoverContent>
    </Popover>
  )
}

function Tile({ etiqueta, idKpi, children }: { etiqueta: string; idKpi: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-card dark:border-white/6">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-label text-xs font-semibold text-muted-foreground">{etiqueta}</h3>
        <VerFormula id={idKpi} />
      </div>
      {children}
    </div>
  )
}

function TileAhorro({ kpi }: { kpi: KpiAhorroObjetivo }) {
  const esRating = kpi.objetivo === 'ratingOperador'
  const cifra = esRating ? kpi.mejoraPromedio : kpi.mejoraTotal
  const cobertura =
    kpi.objetivo === 'tarifa'
      ? `${REFERENCIA.tarifa} · ${kpi.comparables} de ${kpi.asignaciones} asignaciones con dato · moneda inferida`
      : `${REFERENCIA[kpi.objetivo]} · ${kpi.comparables} de ${kpi.asignaciones}`

  return (
    <Tile etiqueta={NOMBRE_OBJETIVO[kpi.objetivo]} idKpi={ID_AHORRO}>
      {!kpi.enPila && (
        <span className="w-fit rounded-md border border-border px-1.5 py-0.5 font-label text-[10px] text-muted-foreground">
          no está en la pila: el plan no lo optimizó
        </span>
      )}
      {cifra === null ? (
        <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
          {(kpi.datoFaltante || 'Sin registro').split('\n').map((linea) => (
            <li key={linea}>{linea}</li>
          ))}
        </ul>
      ) : (
        <>
          <p className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="font-heading text-2xl font-semibold tracking-tight">
              {esRating ? '+' : ''}
              {formatearValor(kpi.objetivo, cifra)}
            </span>
            <span className="text-sm text-muted-foreground">{SUFIJO_CIFRA[kpi.objetivo]}</span>
          </p>
          <p className="text-xs text-muted-foreground">{cobertura}</p>
        </>
      )}
    </Tile>
  )
}

function TileCubiertas({ datos }: { datos: KpisOptimizador['solicitudesCubiertas'] }) {
  const accion = CATALOGO_KPI.find((k) => k.id === ID_COBERTURA)?.accionQueDispara
  const visibles = datos.noCubiertas.slice(0, MAX_NO_CUBIERTAS_VISIBLES)
  const restantes = datos.noCubiertas.length - visibles.length

  return (
    <Tile etiqueta="Solicitudes cubiertas" idKpi={ID_COBERTURA}>
      {datos.datoFaltante ? (
        <p className="text-sm text-muted-foreground">{datos.datoFaltante}</p>
      ) : (
        <p className="font-heading text-2xl font-semibold tracking-tight">
          {datos.cubiertas} de {datos.evaluadas}
        </p>
      )}

      {visibles.length > 0 && <p className="text-xs text-muted-foreground">No cubiertas, en orden de llegada:</p>}
      {visibles.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs">
          {visibles.map((s) => {
            const texto = `${s.codigoProyecto ?? 'Sin registro'} · ${s.clase ?? 'Sin registro'} · pedida ${s.creadaEn ?? 'Sin registro'} · ${s.motivo}`
            return (
              <li key={s.solicitudId} className="line-clamp-2" title={texto}>
                <span className="font-mono">{s.codigoProyecto ?? 'Sin registro'}</span> · {s.clase ?? 'Sin registro'} ·{' '}
                <span className="text-muted-foreground">{s.motivo}</span>
              </li>
            )
          })}
          {restantes > 0 && <li className="text-muted-foreground">y {restantes} más</li>}
        </ul>
      )}

      {datos.noCubiertas.length > 0 && accion && <p className="text-xs text-muted-foreground">{accion}</p>}

      {datos.excluidas > 0 && (
        <p className="text-xs text-muted-foreground">{datos.excluidas} excluidas (período vencido)</p>
      )}
    </Tile>
  )
}

function Grilla({ children }: { children: ReactNode }) {
  return (
    <section aria-label="Indicadores del plan" className="@container">
      <div className="grid gap-4 @xl:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-5">{children}</div>
    </section>
  )
}

export function TilesKpiSkeleton() {
  return (
    <Grilla>
      {Array.from({ length: SOFT_CONSTRAINTS.length + 1 }).map((_, i) => (
        <Skeleton key={i} className="h-36 rounded-xl" />
      ))}
    </Grilla>
  )
}

export function TilesKpiOptimizador({ respuesta }: { respuesta: RespuestaOptimizar }) {
  if (respuesta.kpis === null) {
    const motivo = respuesta.kpisPendientesMotivo ?? 'Cálculo de KPIs pendiente'
    return (
      <Grilla>
        {ORDEN_TILES.map((objetivo) => (
          <Tile key={objetivo} etiqueta={NOMBRE_OBJETIVO[objetivo]} idKpi={ID_AHORRO}>
            <p className="text-sm text-muted-foreground">{motivo}</p>
          </Tile>
        ))}
        <Tile etiqueta="Solicitudes cubiertas" idKpi={ID_COBERTURA}>
          <p className="text-sm text-muted-foreground">{motivo}</p>
        </Tile>
      </Grilla>
    )
  }

  const { kpis } = respuesta
  const ahorroPorObjetivo = new Map(kpis.ahorroPorObjetivo.map((k) => [k.objetivo, k]))

  return (
    <Grilla>
      {ORDEN_TILES.map((objetivo) => {
        const kpi = ahorroPorObjetivo.get(objetivo)
        return kpi ? <TileAhorro key={objetivo} kpi={kpi} /> : null
      })}
      <TileCubiertas datos={kpis.solicitudesCubiertas} />
    </Grilla>
  )
}
