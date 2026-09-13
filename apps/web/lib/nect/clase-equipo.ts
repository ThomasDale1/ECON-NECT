import { CATALOGO_CLASE_EQUIPO, type ClaseEquipoCatalogo } from '@/lib/canonico/catalogos'

/** Extrae la clase del nombre Prisma ("Cargador frontal 03"). No inventa catálogo. */
export function claseDesdeNombre(nombre: string | null): ClaseEquipoCatalogo | null {
  if (!nombre) return null
  const texto = nombre.toLowerCase()
  return (
    [...CATALOGO_CLASE_EQUIPO]
      .sort((a, b) => b.length - a.length)
      .find((clase) => texto.includes(clase.toLowerCase())) ?? null
  )
}
