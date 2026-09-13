/** Deep link de la ficha de un equipo en Prisma. Estructura verificada:
 * `{host}/maquinaria/equipos/{id}` (ej. econ-key.maic.ai). */
export function urlFichaPrisma(base: string | null | undefined, equipoId: string | null | undefined): string | null {
  if (!base || !equipoId) return null
  return `${base.replace(/\/+$/, '')}/maquinaria/equipos/${encodeURIComponent(equipoId)}`
}
