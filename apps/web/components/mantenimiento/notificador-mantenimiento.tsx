'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useMantenimiento } from './proveedor-mantenimiento'

const CLAVE_NOTIFICADOS = 'nect.mantenimiento.notificados'

function leerNotificados(): Set<string> {
  try {
    const crudo = window.localStorage.getItem(CLAVE_NOTIFICADOS)
    const lista = crudo ? JSON.parse(crudo) : []
    return new Set(Array.isArray(lista) ? lista.filter((v): v is string => typeof v === 'string') : [])
  } catch {
    return new Set()
  }
}

function guardarNotificados(notificados: Set<string>): void {
  try {
    window.localStorage.setItem(CLAVE_NOTIFICADOS, JSON.stringify([...notificados]))
  } catch {
    // Si el navegador bloquea storage, los avisos simplemente no se recuerdan.
  }
}

export function NotificadorMantenimiento() {
  const { resultado } = useMantenimiento()
  const router = useRouter()
  const [permiso, setPermiso] = useState<NotificationPermission | 'no-api'>('no-api')

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPermiso('Notification' in window ? Notification.permission : 'no-api')
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (!resultado || permiso !== 'granted' || !('Notification' in window)) return
    const notificados = leerNotificados()
    let cambio = false
    for (const alerta of resultado.alertas) {
      if (!alerta.nivelAlerta) continue
      const clave = `${alerta.equipoId}:${alerta.nivelAlerta}`
      if (notificados.has(clave)) continue
      const porcentaje = alerta.avance === null ? 'sin avance' : `${Math.round(alerta.avance * 100)} %`
      const aviso = new Notification(`ECON NECT · ${alerta.codigoActivo ?? alerta.equipoId} al ${porcentaje} del intervalo`, {
        body: alerta.fechaEstimadaVencido
          ? `Vencimiento estimado: ${alerta.fechaEstimadaVencido}.`
          : 'Sin fecha estimada por falta de ritmo reciente.',
      })
      aviso.onclick = () => {
        window.focus()
        router.push(`/equipo/${encodeURIComponent(alerta.equipoId)}`)
      }
      notificados.add(clave)
      cambio = true
    }
    if (cambio) guardarNotificados(notificados)
  }, [resultado, permiso, router])

  const texto = useMemo(() => {
    if (permiso === 'granted') return 'Avisos activos'
    if (permiso === 'denied') return 'Avisos bloqueados'
    if (permiso === 'no-api') return 'Sin avisos'
    return 'Activar avisos'
  }, [permiso])

  async function activar() {
    if (!('Notification' in window)) {
      setPermiso('no-api')
      return
    }
    const nuevo = await Notification.requestPermission()
    setPermiso(nuevo)
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" size="sm" onClick={activar} />}>
          <Bell data-icon="inline-start" />
          {texto}
        </TooltipTrigger>
        <TooltipContent>
          Solo avisa mientras esta pestana este abierta; pide permiso al hacer clic.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
