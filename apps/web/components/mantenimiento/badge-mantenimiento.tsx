'use client'

import { Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useMantenimiento } from './proveedor-mantenimiento'

export function BadgeMantenimientoPreventivo() {
  const { resultado } = useMantenimiento()
  const total = resultado?.resumen.enAlerta ?? 0
  if (total === 0) return null

  const porNivel = { vencido: 0, urgente: 0, aviso: 0 }
  for (const alerta of resultado?.alertas ?? []) {
    if (alerta.nivelAlerta) porNivel[alerta.nivelAlerta] += 1
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className="gap-1 rounded-full border-border bg-card font-label text-[11px]">
            <Wrench aria-hidden className="size-3" />
            {total}
            <span className="sr-only">equipos en alerta preventiva</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          Vencido: {porNivel.vencido} · urgente: {porNivel.urgente} · aviso: {porNivel.aviso}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

