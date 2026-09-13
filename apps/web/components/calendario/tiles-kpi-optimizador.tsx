import { Info } from 'lucide-react'
import { CATALOGO_KPI } from '@/lib/kpi/catalogo'
import type { RespuestaOptimizar } from '@/lib/optimizador/tipos'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { NOMBRE_OBJETIVO } from './objetivos'

/**
 * Tiles de KPI del optimizador — S-B4 §8. Contrato de "stat tile" (skill
 * `dataviz`): label · value · soporte de cobertura, sin delta ni sparkline
 * porque no hay serie histórica todavía. El color de ui-registry §1 es
 * exclusivo del veredicto de reconciliación — estos tiles no lo usan.
 *
 * `respuesta.kpis` es `null` mientras S-C4 no calcule (`planear.ts` lo deja
 * así a propósito). El tile entonces muestra `kpisPendientesMotivo` — nunca
 * un número inventado (AGENTS.md §1.1).
 */
const IDS_TILE = [
  'ahorro-por-objetivo-optimizador',
  'lluvia-clases-sensibles-optimizador',
  'cobertura-plan-optimizador',
] as const

function TileKpi({
  id,
  children,
}: {
  id: (typeof IDS_TILE)[number]
  children: React.ReactNode
}) {
  const entrada = CATALOGO_KPI.find((k) => k.id === id)

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-label text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {entrada?.nombre ?? 'KPI pendiente de catálogo (S-C4)'}
        </h3>
        {entrada && (
          <Popover>
            <PopoverTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Ver fórmula" />}>
              <Info aria-hidden className="size-3.5" />
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <dl className="flex flex-col gap-2 text-sm">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Fórmula</dt>
                  <dd className="font-mono text-xs">{entrada.formula}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Acción que dispara</dt>
                  <dd>{entrada.accionQueDispara}</dd>
                </div>
              </dl>
            </PopoverContent>
          </Popover>
        )}
      </div>
      {children}
    </div>
  )
}

export function TilesKpiOptimizador({ respuesta }: { respuesta: RespuestaOptimizar }) {
  if (respuesta.kpis === null) {
    const motivo = respuesta.kpisPendientesMotivo ?? 'Cálculo de KPIs pendiente'
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {IDS_TILE.map((id) => (
          <TileKpi key={id} id={id}>
            <p className="text-sm text-muted-foreground">{motivo}</p>
          </TileKpi>
        ))}
      </div>
    )
  }

  const { kpis } = respuesta

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <TileKpi id="ahorro-por-objetivo-optimizador">
        {kpis.ahorroPorObjetivo.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin objetivos en la pila para comparar.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {kpis.ahorroPorObjetivo.map((k) => (
              <li key={k.objetivo} className="flex flex-col gap-0.5 border-t border-border pt-1.5 text-sm first:border-t-0 first:pt-0">
                <span className="font-medium">{NOMBRE_OBJETIVO[k.objetivo]}</span>
                {k.mejoraTotal === null ? (
                  <ul className="list-disc pl-4 text-xs text-muted-foreground">
                    {k.datoFaltante!.split('\n').map((linea) => (
                      <li key={linea}>{linea}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="font-mono text-xs">
                    {k.mejoraTotal} {k.unidad} · {k.comparables} de {k.totalAprobadas} aprobadas comparables
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </TileKpi>

      <TileKpi id="lluvia-clases-sensibles-optimizador">
        {kpis.lluviaClasesSensibles.datoFaltante ? (
          <p className="text-sm text-muted-foreground">{kpis.lluviaClasesSensibles.datoFaltante}</p>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="font-heading text-2xl font-bold tracking-tight">
              {kpis.lluviaClasesSensibles.asignacionesConLluvia}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              de {kpis.lluviaClasesSensibles.asignacionesSensibles} asignaciones sensibles
              {kpis.lluviaClasesSensibles.sinPronostico > 0 &&
                ` · ${kpis.lluviaClasesSensibles.sinPronostico} sin pronóstico`}
            </span>
          </div>
        )}
      </TileKpi>

      <TileKpi id="cobertura-plan-optimizador">
        {kpis.coberturaPlan.datoFaltante ? (
          <p className="text-sm text-muted-foreground">{kpis.coberturaPlan.datoFaltante}</p>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="font-heading text-2xl font-bold tracking-tight">
              {Math.round(kpis.coberturaPlan.valor! * 100)}%
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {kpis.coberturaPlan.asignadas} / {kpis.coberturaPlan.evaluadas} asignadas
              {kpis.coberturaPlan.excluidas > 0 && ` · ${kpis.coberturaPlan.excluidas} excluidas`}
            </span>
          </div>
        )}
      </TileKpi>
    </div>
  )
}
