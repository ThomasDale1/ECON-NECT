'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, Gauge, TriangleAlert } from 'lucide-react'
import { VerOrigen } from '@/components/nect/ver-origen'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ParametrosMantenimiento, PronosticoMantenimiento } from '@/lib/mantenimiento/tipos'
import { leerParametrosNavegador, serializarParametros } from './parametros-navegador'
import { PanelParametros } from './panel-parametros'
import { DialogoOrdenTaller } from './dialogo-orden-taller'

const ANCLA: Record<string, string> = {
  mantenimiento_fecha_fin: 'ultima salida de taller en Prisma',
  reporte_finalizado: 'ultimo reporte FINALIZADO',
  inicio_serie_gps: 'primer dia con datos del GPS',
}

const ESTADO: Record<PronosticoMantenimiento['estadoTaller'], string> = {
  operando: 'operando',
  en_taller: 'en taller',
  parada_por_falla: 'parada por falla',
}

function horas(valor: number | null): string {
  return valor === null ? 'Sin dato' : `${valor.toFixed(1)} h`
}

function porcentaje(valor: number | null): string {
  return valor === null ? 'Sin avance' : `${Math.round(valor * 100)} %`
}

function colorNivel(nivel: PronosticoMantenimiento['nivelAlerta']) {
  if (nivel === 'vencido') return 'text-veredicto-riesgo'
  if (nivel === 'urgente') return 'text-veredicto-riesgo'
  if (nivel === 'aviso') return 'text-veredicto-atencion'
  return 'text-primary'
}

function GaugeAvance({ pronostico }: { pronostico: PronosticoMantenimiento }) {
  const avance = pronostico.avance === null ? 0 : Math.min(1, Math.max(0, pronostico.avance))
  const grados = `${Math.round(avance * 360)}deg`
  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          'grid size-28 shrink-0 place-items-center rounded-full border border-border',
          pronostico.avance === null ? 'bg-muted' : 'bg-card',
        )}
        style={{
          background:
            pronostico.avance === null
              ? undefined
              : `conic-gradient(currentColor ${grados}, var(--muted) 0)`,
        }}
      >
        <div className="grid size-20 place-items-center rounded-full bg-card text-center">
          <span className={cn('font-heading text-xl font-bold', colorNivel(pronostico.nivelAlerta))}>
            {porcentaje(pronostico.avance)}
          </span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-label text-sm font-bold">
          <Gauge aria-hidden className="size-4 text-muted-foreground" />
          Avance al intervalo
          {pronostico.registros.length > 0 ? <VerOrigen linaje={pronostico.registros} etiqueta="ver registros" /> : null}
        </p>
        <p className="mt-1 font-label text-[12px] leading-snug text-muted-foreground">
          {pronostico.intervalo.horas === null
            ? pronostico.faltantes[0] ?? 'Sin intervalo vigente.'
            : `${horas(pronostico.horasDesdeAncla)} de ${pronostico.intervalo.horas} h · ${pronostico.intervalo.origen}`}
        </p>
      </div>
    </div>
  )
}

export function TarjetaMantenimiento({
  equipoId,
  puedeProgramar,
  equipoObsoleto,
}: {
  equipoId: string
  puedeProgramar: boolean
  equipoObsoleto: boolean
}) {
  const [pronostico, setPronostico] = useState<PronosticoMantenimiento | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const cargar = useCallback(async (parametros: ParametrosMantenimiento = leerParametrosNavegador()) => {
    setCargando(true)
    try {
      const respuesta = await fetch(`/api/mantenimiento/${encodeURIComponent(equipoId)}?parametros=${serializarParametros(parametros)}`, {
        cache: 'no-store',
      })
      const cuerpo = await respuesta.json().catch(() => null)
      if (!respuesta.ok) {
        setError(cuerpo?.mensaje ?? 'No se pudo leer el mantenimiento preventivo.')
        return
      }
      setPronostico(cuerpo as PronosticoMantenimiento)
      setError(null)
    } catch {
      setError('No se pudo contactar el mantenimiento preventivo.')
    } finally {
      setCargando(false)
    }
  }, [equipoId])

  useEffect(() => {
    const inicial = window.setTimeout(() => void cargar(), 0)
    return () => window.clearTimeout(inicial)
  }, [cargar, tick])

  const registros = pronostico?.registros ?? []

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-base font-bold tracking-tight text-primary">
          Mantenimiento preventivo
        </h3>
        <p className="font-label text-xs text-muted-foreground">
          Horometro GPS de Startrack contra intervalo vigente; no cambia el veredicto.
        </p>
      </div>

      {cargando ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : pronostico ? (
        <>
          <GaugeAvance pronostico={pronostico} />

          <dl className="grid gap-3 font-label text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <dt className="text-[11px] font-bold uppercase text-muted-foreground">Desde</dt>
              <dd className="mt-1">
                {pronostico.ancla ? (
                  <>
                    {horas(pronostico.horasDesdeAncla)} desde {ANCLA[pronostico.ancla.tipo]} ({pronostico.ancla.fecha})
                    <VerOrigen linaje={pronostico.ancla.linaje} etiqueta="ver ancla" />
                  </>
                ) : (
                  'Sin ancla'
                )}
              </dd>
            </div>
            <div className="rounded-lg border border-border p-3">
              <dt className="text-[11px] font-bold uppercase text-muted-foreground">Intervalo</dt>
              <dd className="mt-1">
                {pronostico.intervalo.horas === null ? 'Sin dato' : `${pronostico.intervalo.horas} h · ${pronostico.intervalo.origen}`}
                {pronostico.intervalo.nivel === 'sobreescrito' && (
                  <span className="mt-1 block text-[12px] text-veredicto-atencion">
                    fijado a mano en este navegador · OEM: {pronostico.intervalo.oemHoras ?? 'sin fila'} h
                  </span>
                )}
              </dd>
            </div>
            <div className="rounded-lg border border-border p-3">
              <dt className="text-[11px] font-bold uppercase text-muted-foreground">Ritmo</dt>
              <dd className="mt-1">
                {pronostico.ritmoHorasPorDia === null ? 'Sin dato' : `${pronostico.ritmoHorasPorDia.toFixed(2)} h/dia`} ({pronostico.diasConMotorUltimos7} de 7 dias con motor)
              </dd>
            </div>
            <div className="rounded-lg border border-border p-3">
              <dt className="text-[11px] font-bold uppercase text-muted-foreground">Fechas</dt>
              <dd className="mt-1">
                Al 80 %: {pronostico.fechaEstimadaAviso ?? 'sin fecha'} · Al 100 %: {pronostico.fechaEstimadaVencido ?? 'sin fecha'}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border px-2.5 py-1 font-label text-[11px] font-bold uppercase">
              {ESTADO[pronostico.estadoTaller]}
            </span>
            {pronostico.nivelAlerta ? (
              <span className={cn('rounded-full border border-border px-2.5 py-1 font-label text-[11px] font-bold uppercase', colorNivel(pronostico.nivelAlerta))}>
                {pronostico.nivelAlerta}
              </span>
            ) : null}
          </div>

          <details className="rounded-lg border border-border p-3">
            <summary className="flex cursor-pointer items-center gap-2 font-label text-sm font-bold">
              <ChevronDown aria-hidden className="size-4" />
              Registros usados ({registros.length})
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left font-label text-xs">
                <thead className="text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="p-2">Plataforma</th>
                    <th scope="col" className="p-2">Endpoint</th>
                    <th scope="col" className="p-2">Campo</th>
                    <th scope="col" className="p-2">Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r, i) => (
                    <tr key={`${r.endpoint}-${r.campo}-${i}`} className="border-t border-border">
                      <td className="p-2">{r.plataforma}</td>
                      <td className="p-2 font-mono">{r.endpoint}</td>
                      <td className="p-2 font-mono">{r.campo}</td>
                      <td className="p-2 font-mono">{r.leidoEn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          {(pronostico.advertencias.length > 0 || pronostico.faltantes.length > 0) && (
            <div className="grid gap-3 md:grid-cols-2">
              {pronostico.advertencias.length > 0 ? (
                <div className="rounded-lg border border-veredicto-atencion/30 bg-veredicto-atencion-fondo p-3 text-veredicto-atencion">
                  <p className="flex items-center gap-2 font-label text-[11px] font-bold uppercase">
                    <TriangleAlert aria-hidden className="size-3" />
                    Advertencias
                  </p>
                  <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 font-label text-[12px] leading-snug">
                    {pronostico.advertencias.map((a) => <li key={a}>{a}</li>)}
                  </ul>
                </div>
              ) : null}
              {pronostico.faltantes.length > 0 ? (
                <div className="rounded-lg border border-veredicto-sin-evidencia/25 bg-veredicto-sin-evidencia-fondo p-3 text-veredicto-sin-evidencia">
                  <p className="font-label text-[11px] font-bold uppercase">Que falta</p>
                  <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 font-label text-[12px] leading-snug">
                    {pronostico.faltantes.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          )}

          <PanelParametros
            pronostico={pronostico}
            puedeEditar={puedeProgramar}
            onGuardar={(parametros) => void cargar(parametros)}
          />

          <DialogoOrdenTaller
            pronostico={pronostico}
            puedeProgramar={puedeProgramar}
            equipoObsoleto={equipoObsoleto}
            onTerminar={() => setTick((v) => v + 1)}
          />
        </>
      ) : null}
    </section>
  )
}
