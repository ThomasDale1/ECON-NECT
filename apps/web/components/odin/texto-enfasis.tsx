import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Marca veredictos, estados de catálogo y plataformas dentro de un texto
 * libre. No interpreta: solo resalta tokens que el motor ya usa.
 */
const TOKEN =
  /SIN_EVIDENCIA|EN_RIESGO|COHERENTE|ATENCION|OBSOLETA|DISPONIBLE|OCUPADA|APROBADA|CANCELED|Canceled|CORRECTIVO_EN_PROCESO|EN_RUTA|Startrack|Prisma/g

const ESTILO: Record<string, string> = {
  EN_RIESGO: 'bg-veredicto-riesgo-fondo text-veredicto-riesgo',
  SIN_EVIDENCIA: 'bg-veredicto-sin-evidencia-fondo text-veredicto-sin-evidencia',
  COHERENTE: 'bg-veredicto-coherente-fondo text-veredicto-coherente',
  ATENCION: 'bg-veredicto-atencion-fondo text-veredicto-atencion',
  OBSOLETA: 'bg-veredicto-riesgo-fondo text-veredicto-riesgo',
  DISPONIBLE: 'bg-veredicto-atencion-fondo text-veredicto-atencion',
  OCUPADA: 'bg-muted text-foreground',
  APROBADA: 'bg-muted text-foreground',
  CANCELED: 'bg-muted text-muted-foreground',
  Canceled: 'bg-muted text-muted-foreground',
  CORRECTIVO_EN_PROCESO: 'bg-veredicto-atencion-fondo text-veredicto-atencion',
  EN_RUTA: 'bg-muted text-foreground',
  Prisma: 'bg-origen-prisma/10 text-origen-prisma',
  Startrack: 'bg-origen-startrack/10 text-origen-startrack',
}

export function TextoEnfasis({ texto, className }: { texto: string; className?: string }) {
  const partes: ReactNode[] = []
  let ultimo = 0
  let match: RegExpExecArray | null
  const re = new RegExp(TOKEN.source, 'g')

  while ((match = re.exec(texto)) !== null) {
    if (match.index > ultimo) {
      partes.push(texto.slice(ultimo, match.index))
    }
    const token = match[0]
    partes.push(
      <span
        key={`${token}-${match.index}`}
        className={cn(
          'mx-0.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-bold tracking-normal',
          ESTILO[token] ?? 'bg-muted text-foreground',
        )}
      >
        {token.replaceAll('_', ' ')}
      </span>,
    )
    ultimo = match.index + token.length
  }

  if (ultimo < texto.length) partes.push(texto.slice(ultimo))

  return <span className={cn('tracking-normal [word-spacing:0.08em]', className)}>{partes}</span>
}
