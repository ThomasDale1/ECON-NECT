'use client'

import { useState } from 'react'
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

/**
 * Propagación P1 — el botón que cierra el ciclo (S-A4, 01 D.6).
 *
 * Genera en Startrack la tarea de traslado de una solicitud ya aprobada en
 * Prisma, con el id de la solicitud en `remote_id` (01 E.5).
 *
 * Tres cosas que esta interfaz **no** hace:
 *
 * - No decide: el diálogo de confirmación es obligatorio y el botón nunca se
 *   dispara solo.
 * - No autoriza: el servidor vuelve a verificar sesión, rol y recurso propio.
 *   Esconder este botón no protegería nada, y mostrarlo no habilita nada.
 * - No inventa: lo que muestra en el diálogo (proyecto, fechas, si ya hay tarea
 *   enlazada) lo lee de `GET /api/equipos/[id]` en vivo al abrirse. Si algo
 *   falta, lo dice en vez de completarlo.
 *
 * Al terminar refresca la vista: la incoherencia que originó el botón
 * desaparece sola porque la tarea ya existe, no porque se haya ocultado.
 */
type SolicitudAprobada = {
  id: string
  status: string | null
  fechaInicio: string | null
  fechaFin: string | null
  aprobadaEn: string | null
  proyecto: string | null
  tieneTareaEnlazada: boolean
}

type Rastro = {
  endpoint: string
  escritoEn: string
  rol: string
  solicitudId: string
  tareaCreadaId: string | null
  camposEscritos: Record<string, unknown>
}

type Estado =
  | { fase: 'cerrado' }
  | { fase: 'cargando' }
  | { fase: 'listo'; solicitud: SolicitudAprobada }
  | { fase: 'escribiendo'; solicitud: SolicitudAprobada }
  | { fase: 'hecho'; rastro: Rastro }
  | { fase: 'error'; mensaje: string }

function Fecha({ valor }: { valor: string | null }) {
  if (!valor) return <span className="italic text-muted-foreground">sin fecha</span>
  return <>{valor}</>
}

export function PropagarTraslado({
  equipoId,
  codigoActivo,
}: {
  equipoId: string
  codigoActivo: string | null
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [estado, setEstado] = useState<Estado>({ fase: 'cerrado' })

  async function abrir() {
    setAbierto(true)
    setEstado({ fase: 'cargando' })

    try {
      const respuesta = await fetch(`/api/equipos/${encodeURIComponent(equipoId)}`)
      const cuerpo = await respuesta.json()

      if (!respuesta.ok) {
        setEstado({ fase: 'error', mensaje: cuerpo?.mensaje ?? 'No se pudo leer el equipo.' })
        return
      }

      const candidatas: SolicitudAprobada[] = cuerpo.solicitudesAprobadas ?? []
      const pendiente = candidatas.find((solicitud) => !solicitud.tieneTareaEnlazada)

      if (!pendiente) {
        setEstado({
          fase: 'error',
          mensaje:
            candidatas.length === 0
              ? 'Este equipo no tiene ninguna solicitud aprobada en Prisma ahora mismo.'
              : 'Todas las solicitudes aprobadas de este equipo ya tienen su tarea enlazada por remote_id.',
        })
        return
      }

      setEstado({ fase: 'listo', solicitud: pendiente })
    } catch {
      setEstado({ fase: 'error', mensaje: 'No se pudo contactar al servidor.' })
    }
  }

  async function confirmar(solicitud: SolicitudAprobada) {
    setEstado({ fase: 'escribiendo', solicitud })

    try {
      const respuesta = await fetch('/api/propagar/traslado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitudId: solicitud.id, confirmado: true }),
      })
      const cuerpo = await respuesta.json()

      if (!respuesta.ok) {
        setEstado({ fase: 'error', mensaje: cuerpo?.mensaje ?? 'La propagación fue rechazada.' })
        return
      }

      setEstado({ fase: 'hecho', rastro: cuerpo.rastro })
      router.refresh()
    } catch {
      setEstado({ fase: 'error', mensaje: 'No se pudo contactar al servidor.' })
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={abrir} className="whitespace-nowrap">
        Generar traslado
      </Button>

      <Dialog
        open={abierto}
        onOpenChange={(valor) => {
          setAbierto(valor)
          if (!valor) setEstado({ fase: 'cerrado' })
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">
              Generar la tarea de traslado en Startrack
            </DialogTitle>
            <DialogDescription>
              Escribe un registro nuevo en Startrack. No modifica ningún estado en Prisma y no se
              puede borrar: Startrack solo permite cancelar.
            </DialogDescription>
          </DialogHeader>

          {estado.fase === 'cargando' && (
            <p className="font-label text-sm text-muted-foreground">Leyendo la solicitud en vivo…</p>
          )}

          {estado.fase === 'error' && (
            <p role="alert" className="font-label text-sm text-veredicto-riesgo">
              {estado.mensaje}
            </p>
          )}

          {(estado.fase === 'listo' || estado.fase === 'escribiendo') && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-label text-[13px]">
              <dt className="text-muted-foreground">Equipo</dt>
              <dd>{codigoActivo ?? 'sin código de activo'}</dd>
              <dt className="text-muted-foreground">Solicitud (Prisma)</dt>
              <dd>
                {estado.solicitud.id} · {estado.solicitud.status}
              </dd>
              <dt className="text-muted-foreground">Proyecto</dt>
              <dd>{estado.solicitud.proyecto ?? 'sin proyecto declarado'}</dd>
              <dt className="text-muted-foreground">Desde</dt>
              <dd>
                <Fecha valor={estado.solicitud.fechaInicio} />
              </dd>
              <dt className="text-muted-foreground">Hasta</dt>
              <dd>
                <Fecha valor={estado.solicitud.fechaFin} />
              </dd>
              <dt className="text-muted-foreground">remote_id</dt>
              <dd className="font-mono">{estado.solicitud.id}</dd>
            </dl>
          )}

          {estado.fase === 'hecho' && (
            <div className="flex flex-col gap-2">
              <p className="font-label text-sm text-veredicto-coherente">
                Tarea creada{estado.rastro.tareaCreadaId ? ` · id ${estado.rastro.tareaCreadaId}` : ''}.
              </p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-label text-[12px] text-muted-foreground">
                <dt>Endpoint</dt>
                <dd className="font-mono">{estado.rastro.endpoint}</dd>
                <dt>Hora</dt>
                <dd className="font-mono">{estado.rastro.escritoEn}</dd>
                <dt>Rol</dt>
                <dd>{estado.rastro.rol}</dd>
                <dt>remote_id</dt>
                <dd className="font-mono">{estado.rastro.solicitudId}</dd>
              </dl>
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {estado.fase === 'hecho' ? 'Cerrar' : 'Cancelar'}
            </DialogClose>
            {(estado.fase === 'listo' || estado.fase === 'escribiendo') && (
              <Button
                onClick={() => confirmar(estado.solicitud)}
                disabled={estado.fase === 'escribiendo'}
              >
                {estado.fase === 'escribiendo' ? 'Escribiendo…' : 'Confirmar y escribir'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
