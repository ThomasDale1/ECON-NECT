'use client'

import { useMemo, useState } from 'react'
import { CircleCheck, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ParametrosMantenimiento, PronosticoMantenimiento } from '@/lib/mantenimiento/tipos'
import { sumarDias } from '@/lib/mantenimiento/fechas'
import { leerParametrosNavegador } from './parametros-navegador'

type PasoRastro = {
  plataforma: string
  endpoint: string
  metodo: string
  campos: string[]
  hora: string
  resultado: 'ok' | 'error'
  mensaje?: string
}

type Rastro = {
  accion: 'abrir' | 'cerrar'
  pasos: PasoRastro[]
  parcial: boolean
  leidoEn: string
}

type Estado =
  | { fase: 'listo' }
  | { fase: 'escribiendo' }
  | { fase: 'hecho'; rastro: Rastro }
  | { fase: 'error'; mensaje: string }

function hoyLocal(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' }).format(new Date())
}

export function DialogoOrdenTaller({
  pronostico,
  puedeProgramar,
  equipoObsoleto,
  onTerminar,
}: {
  pronostico: PronosticoMantenimiento
  puedeProgramar: boolean
  equipoObsoleto: boolean
  onTerminar: () => void
}) {
  const hoy = useMemo(() => hoyLocal(), [])
  const [abierto, setAbierto] = useState(false)
  const [estado, setEstado] = useState<Estado>({ fase: 'listo' })
  const [fechaInicio, setFechaInicio] = useState(hoy)
  const [fechaFin, setFechaFin] = useState(() => sumarDias(hoy, 1))
  const [notas, setNotas] = useState('')
  const [confirmado, setConfirmado] = useState(false)

  const motivoDeshabilitado =
    !puedeProgramar
      ? 'Segun la RACI, la orden de taller la abre Mantenimiento.'
      : equipoObsoleto
        ? 'El equipo esta OBSOLETA en Prisma.'
        : pronostico.estadoTaller !== 'operando'
          ? 'El equipo ya esta en taller o parado por falla.'
          : null

  async function enviar(accion: 'abrir' | 'cerrar') {
    setEstado({ fase: 'escribiendo' })
    const parametros: ParametrosMantenimiento = leerParametrosNavegador()
    try {
      const respuesta = await fetch('/api/propagar/taller', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          accion,
          equipoId: pronostico.equipoId,
          fechaInicio: accion === 'abrir' ? fechaInicio : undefined,
          fechaFin: accion === 'abrir' ? fechaFin : undefined,
          notas: accion === 'abrir' ? notas : undefined,
          parametros,
          confirmado: true,
        }),
      })
      const cuerpo = await respuesta.json().catch(() => null)
      if (!respuesta.ok && respuesta.status !== 207) {
        setEstado({ fase: 'error', mensaje: cuerpo?.mensaje ?? 'La orden fue rechazada por el servidor.' })
        return
      }
      setEstado({ fase: 'hecho', rastro: cuerpo.rastro })
      onTerminar()
    } catch {
      setEstado({ fase: 'error', mensaje: 'No se pudo contactar al servidor.' })
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={<Button variant="default" disabled={Boolean(motivoDeshabilitado)} onClick={() => setAbierto(true)} />}>
              <Wrench data-icon="inline-start" />
              Crear orden de taller
            </TooltipTrigger>
            {motivoDeshabilitado ? <TooltipContent>{motivoDeshabilitado}</TooltipContent> : null}
          </Tooltip>
        </TooltipProvider>
        {pronostico.estadoTaller === 'en_taller' && puedeProgramar ? (
          <Button variant="outline" onClick={() => { setAbierto(true); setConfirmado(true); void enviar('cerrar') }}>
            Cerrar orden
          </Button>
        ) : null}
      </div>

      <Dialog
        open={abierto}
        onOpenChange={(valor) => {
          setAbierto(valor)
          if (!valor) {
            setEstado({ fase: 'listo' })
            setConfirmado(false)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear orden de taller preventiva</DialogTitle>
            <DialogDescription>
              Escribe una ventana de mantenimiento en Prisma y pone el vehiculo en Mantenimiento en Startrack.
            </DialogDescription>
          </DialogHeader>

          {estado.fase === 'listo' || estado.fase === 'escribiendo' ? (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-sm font-bold">Fecha inicio</span>
                  <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-sm font-bold">Fecha fin</span>
                  <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="font-label text-sm font-bold">Notas</span>
                <Textarea value={notas} maxLength={300} onChange={(e) => setNotas(e.target.value)} />
                <span className="font-mono text-[11px] text-muted-foreground">{notas.length}/300</span>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-muted p-3">
                  <p className="font-label text-[11px] font-bold uppercase text-muted-foreground">Prisma</p>
                  <p className="mt-1 font-mono text-xs">PATCH /api/maquinaria/equipos/{pronostico.equipoId}</p>
                  <p className="mt-1 text-xs">mantenimiento_fecha_inicio, mantenimiento_fecha_fin, mantenimiento_notas</p>
                </div>
                <div className="rounded-lg border border-border bg-muted p-3">
                  <p className="font-label text-[11px] font-bold uppercase text-muted-foreground">Startrack</p>
                  <p className="mt-1 font-mono text-xs">PUT api/vehicle/{pronostico.vehiculoId ?? 'sin-vehiculo'}</p>
                  <p className="mt-1 text-xs">status → Mantenimiento</p>
                </div>
              </div>

              <label className="flex items-center gap-2 font-label text-sm">
                <input
                  type="checkbox"
                  checked={confirmado}
                  onChange={(e) => setConfirmado(e.target.checked)}
                  className="size-4 accent-primary"
                />
                Confirmo que quiero escribir la orden sobre el recurso propio del equipo.
              </label>
            </div>
          ) : null}

          {estado.fase === 'error' ? (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {estado.mensaje}
            </p>
          ) : null}

          {estado.fase === 'hecho' ? (
            <div className="flex flex-col gap-3">
              <p className="flex items-center gap-2 font-label text-sm font-bold">
                <CircleCheck aria-hidden className="size-4" />
                Orden procesada{estado.rastro.parcial ? ' con resultado parcial' : ''}.
              </p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[560px] text-left font-label text-xs">
                  <thead className="text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th scope="col" className="p-2">Plataforma</th>
                      <th scope="col" className="p-2">Metodo</th>
                      <th scope="col" className="p-2">Campos</th>
                      <th scope="col" className="p-2">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estado.rastro.pasos.map((paso, i) => (
                      <tr key={`${paso.endpoint}-${i}`} className="border-t border-border">
                        <td className="p-2">{paso.plataforma}</td>
                        <td className="p-2 font-mono">{paso.metodo}</td>
                        <td className="p-2 font-mono">{paso.campos.join(', ')}</td>
                        <td className="p-2">{paso.resultado}{paso.mensaje ? ` · ${paso.mensaje}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cerrar</DialogClose>
            {(estado.fase === 'listo' || estado.fase === 'escribiendo') && (
              <Button disabled={!confirmado || estado.fase === 'escribiendo'} onClick={() => void enviar('abrir')}>
                {estado.fase === 'escribiendo' ? 'Escribiendo...' : 'Confirmar y escribir'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

