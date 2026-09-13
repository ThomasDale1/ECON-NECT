// Equivalencia coherente entre el estado del recurso en Prisma y el estado de
// su tarea de traslado en Startrack, para resolver R2 (traslado sobre equipo
// que no puede operar). Pura: la usan el servidor (`coherencia.ts`) y la
// interfaz (el texto del diálogo), así los dos dicen lo mismo.
//
// Solo valores verificados en vivo el 13 de septiembre de 2026:
//
// - Catálogo de estado de tarea (`GET api/job/status`): 0 Pendiente ·
//   1 Completada · 2 Cancelada · 3 Parcial. **No existe "Suspendida"**: la
//   única forma de decir "este traslado no va" es Cancelada (2). **Es
//   definitiva**: un `PUT api/job/{id}` sobre una tarea cancelada responde 403
//   "no puede modificar una Tarea cancelada" (verificado el 13-sep-2026).
// - Catálogo de estado del recurso en Prisma: DISPONIBLE · OCUPADA · OBSOLETA.
//   Se escribe por `PATCH /api/maquinaria/equipos/{id}/estado` (OPTIONS lo
//   anuncia). Un traslado vivo significa que el equipo va a operar; el valor
//   que lo vuelve operable sin afirmar una asignación que Prisma no registra
//   es DISPONIBLE (OCUPADA sin proyecto dispararía R6).

export type LadoQueSeMantiene = 'prisma' | 'startrack'

/** Código de Startrack para Cancelada (`GET api/job/status`, id 2). */
export const STATUS_TAREA_CANCELADA = '2'
/** Etiqueta del mismo código en el catálogo de Startrack. */
export const ETIQUETA_TAREA_CANCELADA = 'Cancelada'
/** Estado de Prisma que vuelve operable al recurso. */
export const ESTADO_EQUIPO_OPERABLE = 'DISPONIBLE'

export type Equivalencia = {
  mantener: LadoQueSeMantiene
  /** Plataforma que se escribe. */
  destino: LadoQueSeMantiene
  /** Qué se conserva, en palabras. */
  seConserva: string
  /** Qué se escribe en la otra plataforma, en palabras. */
  seEscribe: string
  /** Por qué ese valor es el equivalente coherente. */
  porque: string
}

export function equivalenciaPara(mantener: LadoQueSeMantiene, estadoPrisma: string | null): Equivalencia {
  if (mantener === 'prisma') {
    return {
      mantener,
      destino: 'startrack',
      seConserva: `Prisma: el equipo sigue ${estadoPrisma ?? 'sin estado'}.`,
      seEscribe: `Startrack: la tarea de traslado pasa a ${ETIQUETA_TAREA_CANCELADA} (status ${STATUS_TAREA_CANCELADA}).`,
      porque:
        'Un equipo que no puede operar no se traslada. Startrack no tiene un estado "Suspendida": Cancelada es el único de su catálogo que saca la tarea de circulación sin borrarla. Es definitiva: Startrack no deja modificar una tarea cancelada; si el traslado vuelve a hacer falta, se crea una tarea nueva.',
    }
  }
  return {
    mantener,
    destino: 'prisma',
    seConserva: 'Startrack: la tarea de traslado sigue Pendiente.',
    seEscribe: `Prisma: el equipo pasa de ${estadoPrisma ?? 'sin estado'} a ${ESTADO_EQUIPO_OPERABLE}.`,
    porque:
      'Si el traslado va, el equipo tiene que poder operar. DISPONIBLE es el estado de Prisma que lo permite sin inventar un proyecto asignado.',
  }
}
