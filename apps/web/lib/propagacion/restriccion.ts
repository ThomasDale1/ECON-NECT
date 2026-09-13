// Restricción de escritura — S-A4 (01 D.6, restricción obligatoria 1).
//
// **Falla cerrada.** Si `NECT_EQUIPO_PROPIO` o `NECT_PROYECTO_PROPIO` no están
// configuradas, no se escribe nada. El sandbox lo comparten 13 equipos: una
// escritura sobre un recurso ajeno le rompe la demo a otro equipo y nos
// descalifica (AGENTS.md §1.3). Ante la duda, no escribir.
//
// Es una función pura y se prueba sola (`restriccion.test.ts`): la rúbrica pide
// que rechace **el servidor**, no que la interfaz esconda el botón.
//
// Se compara contra varias formas del mismo recurso (código de activo, id de
// Prisma, id de vehículo de Startrack, código de proyecto) porque el
// identificador que nos asignen puede venir en cualquiera de ellas. Eso no
// afloja la regla: el valor tiene que coincidir **exactamente** con uno de los
// declarados, salvo espacios y mayúsculas.

/** Lo que se declara en `.env.local`. Lista separada por comas: puede ser más
 * de un recurso si el hackathon nos asignó varios. */
export type RecursosPropios = {
  equipo: string | undefined
  proyecto: string | undefined
}

/** Las formas en las que el recurso a escribir se puede identificar. Cualquiera
 * que coincida con lo declarado alcanza; ninguna coincidencia = rechazo. */
export type RecursoAEscribir = {
  /** `no_activo` de Prisma. */
  codigoActivo: string | null
  /** `id` del equipo en Prisma. */
  equipoId: string | null
  /** `id` del vehículo en Startrack, que es lo que la tarea referencia. */
  vehiculoId: string | null
  /** Código `PROY-###` del proyecto, o su nombre completo. */
  codigoProyecto: string | null
  /** `project_id` de Prisma. */
  proyectoId: string | null
}

export type ResultadoRestriccion = {
  permitido: boolean
  /** Por qué sí o por qué no, en lenguaje que se pueda mostrar y registrar. */
  motivo: string
}

function tokens(valor: string | undefined): string[] {
  if (!valor) return []
  return valor
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0)
}

function coincide(declarados: string[], candidatos: (string | null)[]): boolean {
  const normalizados = candidatos
    .filter((candidato): candidato is string => Boolean(candidato))
    .map((candidato) => candidato.trim().toLowerCase())
  return normalizados.some((candidato) => declarados.includes(candidato))
}

export function verificarRecursoPropio(
  recurso: RecursoAEscribir,
  propios: RecursosPropios,
): ResultadoRestriccion {
  const equiposDeclarados = tokens(propios.equipo)
  const proyectosDeclarados = tokens(propios.proyecto)

  if (equiposDeclarados.length === 0 || proyectosDeclarados.length === 0) {
    return {
      permitido: false,
      motivo:
        'El servidor no tiene declarados los recursos propios (NECT_EQUIPO_PROPIO y NECT_PROYECTO_PROPIO). Sin esa declaración no se escribe sobre un sandbox compartido con otros equipos.',
    }
  }

  if (!coincide(equiposDeclarados, [recurso.codigoActivo, recurso.equipoId, recurso.vehiculoId])) {
    return {
      permitido: false,
      motivo: `El equipo ${recurso.codigoActivo ?? recurso.equipoId ?? '(sin identificar)'} no está entre los recursos asignados a este equipo del hackathon. No se escribe sobre recursos de otro participante.`,
    }
  }

  if (!coincide(proyectosDeclarados, [recurso.codigoProyecto, recurso.proyectoId])) {
    return {
      permitido: false,
      motivo: `El proyecto ${recurso.codigoProyecto ?? recurso.proyectoId ?? '(sin identificar)'} no está entre los proyectos asignados a este equipo del hackathon.`,
    }
  }

  return {
    permitido: true,
    motivo: 'El equipo y el proyecto están entre los recursos declarados como propios.',
  }
}

/** Lee la declaración del entorno. Separada de la verificación para que la
 * prueba no dependa de variables de entorno. */
export function recursosPropiosDelEntorno(): RecursosPropios {
  return {
    equipo: process.env.NECT_EQUIPO_PROPIO,
    proyecto: process.env.NECT_PROYECTO_PROPIO,
  }
}
