import { Box, Construction, Truck } from 'lucide-react'
import type { ClaseEquipoCatalogo } from '@/lib/canonico/catalogos'
import { cn } from '@/lib/utils'

const ICONO: Record<ClaseEquipoCatalogo, typeof Truck> = {
  'Cargador frontal': Truck,
  Excavadora: Construction,
  Minicargador: Box,
  Motoniveladora: Truck,
  Retroexcavadora: Construction,
}

/**
 * El mismo recuadro del command center (En curso): fondo Prisma suave +
 * icono de la clase. Si no hay clase verificada, el Box de la flota.
 */
export function IconoMaquinaria({
  clase,
  tamano = 'md',
}: {
  clase: ClaseEquipoCatalogo | null
  tamano?: 'sm' | 'md'
}) {
  const Icono = clase ? ICONO[clase] : Box
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-2xl bg-origen-prisma/10',
        tamano === 'md' ? 'size-14' : 'size-10',
      )}
      title={clase ?? 'Clase no identificada'}
    >
      <Icono
        aria-hidden
        className={cn('text-origen-prisma', tamano === 'md' ? 'size-8' : 'size-5')}
      />
      <span className="sr-only">{clase ?? 'Maquinaria'}</span>
    </span>
  )
}
