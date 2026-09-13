'use server'

import { revalidatePath } from 'next/cache'
import { invalidarPorPrefijo } from '@/lib/conectores/cache'
import type { Plataforma } from '@/lib/tipos/canonico'

/**
 * Fuerza una relectura de una plataforma desde cualquier pantalla.
 *
 * El caché de conectores dura 45 s, así que sin invalidarlo un refresco
 * devolvería exactamente lo mismo y el botón mentiría. Acá se tira solo el
 * prefijo de esa plataforma: forzar Prisma no debe descartar lo de Startrack,
 * que es la fuente lenta.
 *
 * `revalidatePath` hace que Next vuelva a renderizar el árbol de servidor y
 * mande solo la parte cambiada. No hay recarga de página ni se pierde el estado
 * de cliente.
 */
export async function actualizarFuente(plataforma: Plataforma): Promise<void> {
  invalidarPorPrefijo(`${plataforma}:`)
  // Revalida todo el subárbol: el botón vive en el layout y sirve a cualquiera
  // de las pantallas, así que revalidar una ruta suelta dejaría a las otras con
  // el dato viejo.
  revalidatePath('/', 'layout')
}


/** Relectura de Prisma y Startrack en la misma acción. */
export async function actualizarFuentes(): Promise<void> {
  invalidarPorPrefijo('prisma:')
  invalidarPorPrefijo('startrack:')
  revalidatePath('/', 'layout')
}
