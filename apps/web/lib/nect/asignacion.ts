import type { AsignacionPersonas, EstadoOrigen, Linaje, PersonaAsignada } from '@/lib/tipos/canonico'

function texto(valor: unknown): string | null {
  if (typeof valor === 'string' && valor.trim() !== '') return valor.trim()
  if (typeof valor === 'number') return String(valor)
  return null
}

/** Extrae nombre/código de `assigned_personnel` sin volcar el objeto crudo. */
export function personalDesdePrisma(raw: unknown, linajeBase: Omit<Linaje, 'campo' | 'valorCrudo'>): PersonaAsignada | null {
  if (raw == null || raw === '') return null
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null
    return personalDesdePrisma(raw[0], linajeBase)
  }
  if (typeof raw === 'string') {
    return {
      etiqueta: raw.trim(),
      codigo: null,
      linaje: { ...linajeBase, campo: 'assigned_personnel', valorCrudo: raw },
    }
  }
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    const etiqueta =
      texto(r.nombre) ?? texto(r.name) ?? texto(r.personnel_name) ?? texto(r.full_name)
    const codigo = texto(r.cod_trabajador) ?? texto(r.code) ?? texto(r.id)
    if (!etiqueta && !codigo) return null
    return {
      etiqueta: etiqueta ?? 'Asignado',
      codigo,
      linaje: { ...linajeBase, campo: 'assigned_personnel', valorCrudo: codigo ?? etiqueta },
    }
  }
  return null
}

export function conductorDesdeStartrack(
  conductor: Record<string, unknown> | null,
  linajeBase: Omit<Linaje, 'campo' | 'valorCrudo'>,
): PersonaAsignada | null {
  if (!conductor) return null
  const fn = texto(conductor.fn)
  const ln = texto(conductor.ln)
  const codigo = texto(conductor.cd) ?? texto(conductor.i)
  const nombre = [fn, ln].filter(Boolean).join(' ')
  if (!nombre && !codigo) return null
  return {
    etiqueta: nombre || `Conductor ${codigo}`,
    codigo,
    linaje: { ...linajeBase, campo: 'driver_id', valorCrudo: texto(conductor.i) },
  }
}

export function lecturaAsignacion(asignacion: AsignacionPersonas | null | undefined): string {
  if (!asignacion) {
    return 'Esta lectura no trajo el conductor de la maquinaria.'
  }
  const startrack = asignacion.startrack
    ? `El conductor de la maquinaria es ${asignacion.startrack.etiqueta}.`
    : 'Startrack no nombra conductor para esta máquina.'
  const prisma = asignacion.prisma
    ? ` Prisma también nombra un operador: ${asignacion.prisma.etiqueta}. Es otro catálogo, no el mismo rol.`
    : ''
  return `${startrack}${prisma}`
}

/**
 * En qué estado está el conductor, en una línea.
 *
 * El `status` 0–9 del vehículo en Startrack describe a la **persona**, no al
 * recurso (lib/canonico/estados.ts), así que `equipo.vehiculo` ya trae la
 * palabra traducida y su linaje. Antes acá se explicaba esa distinción cada
 * vez; la explicación es documentación, no algo que el operador necesite leer
 * en cada tarjeta. El dato útil es el estado.
 *
 * Devuelve `null` cuando no hay nada que decir, para que la interfaz omita la
 * línea en vez de rellenarla.
 */
export function estadoDelConductor(
  asignacion: AsignacionPersonas | null | undefined,
  vehiculo: EstadoOrigen | null | undefined,
): string | null {
  if (!asignacion?.startrack) return null
  return vehiculo?.valor ?? null
}
