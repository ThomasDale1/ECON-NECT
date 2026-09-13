'use client'

import { useMemo, useState } from 'react'
import { RotateCcw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UMBRALES_DEFECTO, umbralesDe } from '@/lib/mantenimiento/parametros'
import type { ParametrosMantenimiento, PronosticoMantenimiento } from '@/lib/mantenimiento/tipos'
import {
  guardarParametrosNavegador,
  leerParametrosNavegador,
  parametrosConEquipo,
} from './parametros-navegador'

export function PanelParametros({
  pronostico,
  puedeEditar,
  onGuardar,
}: {
  pronostico: PronosticoMantenimiento
  puedeEditar: boolean
  onGuardar: (parametros: ParametrosMantenimiento) => void
}) {
  const [parametros, setParametros] = useState<ParametrosMantenimiento>(() => leerParametrosNavegador())
  const actual = parametros.porEquipo[pronostico.equipoId] ?? {}
  const [intervalo, setIntervalo] = useState(actual.intervaloHoras?.toString() ?? '')
  const [severo, setSevero] = useState(actual.severo === true)
  const [umbrales, setUmbrales] = useState(umbralesDe(parametros))

  const severoTexto = useMemo(() => {
    if (pronostico.intervalo.oemHoras === null) return 'Sin fila OEM para este equipo.'
    const base = pronostico.intervalo.oemHoras
    return `OEM vigente: ${base} h. Al marcar condiciones severas se usa el valor severo del catalogo.`
  }, [pronostico.intervalo.oemHoras])

  function guardar(cambios: { limpiarIntervalo?: boolean } = {}) {
    const manual = Number(intervalo)
    let siguiente = parametrosConEquipo(parametros, pronostico.equipoId, {
      intervaloHoras:
        cambios.limpiarIntervalo || intervalo.trim() === ''
          ? null
          : Number.isInteger(manual) && manual >= 1 && manual <= 20_000
            ? manual
            : undefined,
      severo,
    })
    if (
      umbrales.aviso !== UMBRALES_DEFECTO.aviso ||
      umbrales.urgente !== UMBRALES_DEFECTO.urgente ||
      umbrales.vencido !== UMBRALES_DEFECTO.vencido
    ) {
      siguiente = { ...siguiente, umbrales }
    } else {
      siguiente = { version: siguiente.version, porEquipo: siguiente.porEquipo }
    }
    guardarParametrosNavegador(siguiente)
    setParametros(siguiente)
    if (cambios.limpiarIntervalo) setIntervalo('')
    onGuardar(siguiente)
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-col gap-1">
        <h4 className="font-heading text-sm font-bold tracking-tight text-primary">
          Parametros de este navegador
        </h4>
        <p className="font-label text-[12px] leading-snug text-muted-foreground">
          Estos parametros viven en este navegador; no se escriben en Prisma ni en Startrack.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 font-label text-sm">
          <input
            type="checkbox"
            checked={severo}
            disabled={!puedeEditar}
            onChange={(e) => setSevero(e.target.checked)}
            className="size-4 accent-primary"
          />
          <span className="flex flex-col gap-0.5">
            <span className="font-bold">Condiciones severas</span>
            <span className="text-[11px] text-muted-foreground">{severoTexto}</span>
          </span>
        </label>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`intervalo-${pronostico.equipoId}`}>Intervalo a mano (h)</Label>
          <div className="flex gap-2">
            <Input
              id={`intervalo-${pronostico.equipoId}`}
              inputMode="numeric"
              pattern="[0-9]*"
              value={intervalo}
              disabled={!puedeEditar}
              onChange={(e) => setIntervalo(e.target.value.replace(/[^\d]/g, ''))}
              placeholder={pronostico.intervalo.oemHoras ? String(pronostico.intervalo.oemHoras) : 'sin OEM'}
            />
            <Button type="button" variant="outline" size="icon" disabled={!puedeEditar} onClick={() => guardar({ limpiarIntervalo: true })}>
              <RotateCcw data-icon="inline-start" />
              <span className="sr-only">Volver al OEM</span>
            </Button>
          </div>
        </div>
      </div>

      <details className="rounded-lg border border-border p-3">
        <summary className="cursor-pointer font-label text-sm font-bold">Avanzado: umbrales</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(['aviso', 'urgente', 'vencido'] as const).map((clave) => (
            <div key={clave} className="flex flex-col gap-1.5">
              <Label htmlFor={`${clave}-${pronostico.equipoId}`}>{clave}</Label>
              <Input
                id={`${clave}-${pronostico.equipoId}`}
                value={umbrales[clave]}
                disabled={!puedeEditar}
                inputMode="numeric"
                onChange={(e) => setUmbrales((u) => ({ ...u, [clave]: Number(e.target.value) }))}
              />
            </div>
          ))}
        </div>
      </details>

      {puedeEditar ? (
        <Button type="button" className="w-fit" onClick={() => guardar()}>
          <Save data-icon="inline-start" />
          Guardar parametros
        </Button>
      ) : (
        <p className="font-label text-[12px] text-muted-foreground">
          Tu rol puede ver estos valores, pero solo Mantenimiento o admin los editan.
        </p>
      )}
    </section>
  )
}
