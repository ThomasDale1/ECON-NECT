'use client'

import { useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
import { equivalenciaPara, type LadoQueSeMantiene } from '@/lib/propagacion/equivalencias'
import { cn } from '@/lib/utils'

/**
 * Resolver R2 eligiendo qué estado se mantiene (expediente).
 *
 * Dos botones, uno por plataforma. Cada uno abre la confirmación con la
 * equivalencia que se escribirá en la otra; nada se escribe sin "Confirmar".
 * La interfaz no autoriza: el servidor vuelve a verificar sesión, rol y
 * recurso propio. Al terminar refresca la vista: el veredicto cambia porque
 * el dato cambió en la plataforma, no porque se oculte la alerta.
 */
type Paso = {
  plataforma: string
  endpoint: string
  metodo: string
  campo: string
  antes: string | null
  despues: string | null
  hora: string
  resultado: 'ok' | 'error'
  mensaje?: string
}

type Estado =
  | { fase: 'cerrado' }
  | { fase: 'listo'; mantener: LadoQueSeMantiene }
  | { fase: 'escribiendo'; mantener: LadoQueSeMantiene }
  | { fase: 'hecho'; pasos: Paso[]; parcial: boolean }
  | { fase: 'error'; mensaje: string }

export function ResolverCoherencia({
  equipoId,
  codigoActivo,
  estadoPrisma,
  estadoStartrack,
}: {
  equipoId: string
  codigoActivo: string | null
  estadoPrisma: string | null
  estadoStartrack: string | null
}) {
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>({ fase: 'cerrado' })

  async function confirmar(mantener: LadoQueSeMantiene) {
    setEstado({ fase: 'escribiendo', mantener })
    try {
      const respuesta = await fetch('/api/propagar/coherencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipoId, mantener, confirmado: true }),
      })
      const cuerpo = await respuesta.json()
      if (!respuesta.ok && respuesta.status !== 207) {
        setEstado({ fase: 'error', mensaje: cuerpo?.mensaje ?? 'La escritura fue rechazada.' })
        return
      }
      setEstado({ fase: 'hecho', pasos: cuerpo.rastro.pasos, parcial: cuerpo.rastro.parcial })
      router.refresh()
    } catch {
      setEstado({ fase: 'error', mensaje: 'No se pudo contactar al servidor.' })
    }
  }

  const eleccion = estado.fase === 'listo' || estado.fase === 'escribiendo' ? estado.mantener : null
  const equivalencia = eleccion ? equivalenciaPara(eleccion, estadoPrisma) : null

  return (
    <div className="rounded-lg border border-veredicto-en-riesgo/25 bg-card p-4">
      <p className="font-label text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        Decidir cual estado manda
      </p>
      <p className="mt-1 font-label text-[12px] leading-snug text-muted-foreground">
        Se conserva el estado elegido y la otra plataforma recibe su equivalente coherente.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Opcion
          plataforma="Prisma"
          valor={estadoPrisma}
          efecto="Startrack cancela el traslado"
          onClick={() => setEstado({ fase: 'listo', mantener: 'prisma' })}
        />
        <Opcion
          plataforma="Startrack"
          valor={estadoStartrack}
          efecto="Prisma pasa el equipo a DISPONIBLE"
          onClick={() => setEstado({ fase: 'listo', mantener: 'startrack' })}
        />
      </div>

      <Dialog
        open={estado.fase !== 'cerrado'}
        onOpenChange={(abierto) => {
          if (!abierto) setEstado({ fase: 'cerrado' })
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Poner {codigoActivo ?? 'el equipo'} en coherencia</DialogTitle>
            <DialogDescription>
              Escribe en una sola plataforma y deja rastro. Cancelar un traslado en Startrack es
              definitivo: la plataforma no deja modificar una tarea cancelada. El estado del equipo en
              Prisma sí se puede volver a cambiar.
            </DialogDescription>
          </DialogHeader>

          {equivalencia && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-label text-[13px]">
              <dt className="text-muted-foreground">Se mantiene</dt>
              <dd>{equivalencia.seConserva}</dd>
              <dt className="text-muted-foreground">Se escribe</dt>
              <dd className="font-bold">{equivalencia.seEscribe}</dd>
              <dt className="text-muted-foreground">Por que</dt>
              <dd className="text-muted-foreground">{equivalencia.porque}</dd>
            </dl>
          )}

          {estado.fase === 'error' && (
            <p role="alert" className="font-label text-sm text-destructive">
              {estado.mensaje}
            </p>
          )}

          {estado.fase === 'hecho' && (
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 font-label text-sm">
                <CircleCheck aria-hidden className="size-4 shrink-0" />
                {estado.parcial ? 'Escritura parcial: revisar el paso con error.' : 'Escrito y verificado en la plataforma.'}
              </p>
              {estado.pasos.map((paso, index) => (
                <dl
                  key={`${paso.endpoint}-${index}`}
                  className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border border-border p-2 font-label text-[12px] text-muted-foreground"
                >
                  <dt>Plataforma</dt>
                  <dd>{paso.plataforma}</dd>
                  <dt>Endpoint</dt>
                  <dd className="font-mono">
                    {paso.metodo} {paso.endpoint}
                  </dd>
                  <dt>{paso.campo}</dt>
                  <dd className="font-mono">
                    {paso.resultado === 'ok' ? `${paso.antes ?? 'null'} → ${paso.despues ?? 'null'}` : paso.mensaje}
                  </dd>
                  <dt>Hora</dt>
                  <dd className="font-mono">{paso.hora}</dd>
                </dl>
              ))}
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {estado.fase === 'hecho' ? 'Cerrar' : 'Cancelar'}
            </DialogClose>
            {eleccion && (
              <Button onClick={() => confirmar(eleccion)} disabled={estado.fase === 'escribiendo'}>
                {estado.fase === 'escribiendo' ? 'Escribiendo…' : 'Confirmar y escribir'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Opcion({
  plataforma,
  valor,
  efecto,
  onClick,
}: {
  plataforma: string
  valor: string | null
  efecto: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-0.5 rounded-lg border border-border bg-muted/40 p-3 text-left transition-colors',
        'hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      )}
    >
      <span className="font-label text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Mantener {plataforma}
      </span>
      <span className="font-label text-sm font-bold">{valor ?? 'Sin registro'}</span>
      <span className="font-label text-[11px] leading-snug text-muted-foreground">{efecto}</span>
    </button>
  )
}
