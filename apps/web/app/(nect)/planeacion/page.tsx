import type { Metadata } from 'next'
import { Planeador } from '@/components/calendario/planeador'

export const metadata: Metadata = {
  title: 'Planeación de maquinaria · ECON NECT',
  description: 'Propuesta del optimizador sobre las máquinas reales — solo lectura, no escribe en Prisma ni Startrack.',
}

/**
 * Planeación de maquinaria — S-B4.
 *
 * Toda la lógica de cliente (fetch a `/api/optimizar`, estado de carga,
 * selección de detalle) vive en `<Planeador />` porque la hora de lectura que
 * muestra `BarraSuperior` sale de `respuesta.generadoEn`, que solo existe
 * después de la llamada — nunca una hora fija.
 */
export default function PaginaPlaneacion() {
  return <Planeador />
}
