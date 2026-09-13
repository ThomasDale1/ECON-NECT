import { Eye } from 'lucide-react'
import type { Linaje } from '@/lib/tipos/canonico'
import { BadgeOrigen } from '@/components/nect/badge-origen'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * "Ver origen" reutilizable — AGENTS.md §2.4 / ui-registry §1.5: todo dato
 * muestra su origen, auditable en un clic. No existía un componente genérico
 * para esto en `components/nect/` (S-B4 lo construye mínimo, según lo previsto
 * en el prompt).
 *
 * Recibe el/los `Linaje` que sustentan un valor y los lista: plataforma,
 * endpoint, campo, valor crudo y hora de lectura. Nunca decide nada — solo
 * proyecta lo que ya trae el contrato.
 */
function formatearValorCrudo(valor: unknown): string {
  if (valor === null || valor === undefined) return 'null'
  if (typeof valor === 'string') return valor
  try {
    return JSON.stringify(valor)
  } catch {
    return String(valor)
  }
}

function formatearHora(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-SV', {
      dateStyle: 'short',
      timeStyle: 'medium',
      timeZone: 'America/El_Salvador',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function VerOrigen({
  linaje,
  etiqueta = 'Ver origen',
  compacto = false,
}: {
  /** Uno o varios linajes. Se acepta el escalar porque la ficha del equipo
   * (S-B2) documenta campo por campo, mientras el calendario (S-B4) agrupa
   * varios en un solo popover. */
  linaje: Linaje | Linaje[]
  etiqueta?: string
  /** Solo el ícono, sin la etiqueta de texto — para espacios angostos (una
   * barra de un día en el timeline de S-B4). El popover completo se mantiene
   * igual; `title` cubre la accesibilidad que perdía el texto visible. */
  compacto?: boolean
}) {
  const linajes = Array.isArray(linaje) ? linaje : [linaje]
  if (linajes.length === 0) return null

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            title={etiqueta}
            className={cn(
              'h-6 gap-1 font-label text-[11px] text-muted-foreground',
              compacto ? 'w-6 shrink-0 px-0' : 'px-1.5',
            )}
          />
        }
      >
        <Eye aria-hidden className="size-3 shrink-0" />
        {!compacto && etiqueta}
        {compacto && <span className="sr-only">{etiqueta}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <p className="font-label text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Linaje del dato
        </p>
        <div className="flex flex-col gap-2.5">
          {linajes.map((l, i) => (
            <div key={i} className="flex flex-col gap-1 border-t border-border pt-2 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between gap-2">
                <BadgeOrigen plataforma={l.plataforma} corto />
                <time className="font-mono text-[10px] text-muted-foreground">{formatearHora(l.leidoEn)}</time>
              </div>
              <p className="font-mono text-[11px]">
                <span className="text-muted-foreground">{l.endpoint}</span> · {l.campo}
              </p>
              <p className="truncate font-mono text-[11px] text-foreground" title={formatearValorCrudo(l.valorCrudo)}>
                {formatearValorCrudo(l.valorCrudo)}
              </p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
