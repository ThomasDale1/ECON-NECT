// Errores etiquetados de los conectores. Un conector nunca falla en silencio:
// toda falla lleva la plataforma y el endpoint que la produjo, para que
// scripts/leer.ts y, más adelante, lib/canonico puedan degradar a
// SIN_EVIDENCIA sin adivinar de dónde vino el problema (AGENTS.md §3.3).

import type { Plataforma } from '@/lib/tipos/canonico'

/** La sesión de la plataforma expiró. Se detecta por el cuerpo de la
 * respuesta, nunca por el código HTTP (AGENTS.md §7.1, 01 E.7). */
export class SesionExpirada extends Error {
  constructor(
    public readonly plataforma: Plataforma,
    public readonly endpoint: string,
  ) {
    super(`Sesión expirada en ${plataforma}: ${endpoint}`)
    this.name = 'SesionExpirada'
  }
}

/** Cualquier otra falla de un conector: red caída, sandbox lento, respuesta
 * con forma inesperada. Lleva plataforma y endpoint para el "error etiquetado"
 * que pide AGENTS.md §3.3 en vez de un stack trace genérico. */
export class ErrorConector extends Error {
  constructor(
    public readonly plataforma: Plataforma,
    public readonly endpoint: string,
    causa: string,
  ) {
    super(`Error leyendo ${plataforma} (${endpoint}): ${causa}`)
    this.name = 'ErrorConector'
  }
}

/** La plataforma rechazó una ESCRITURA. Separado de `SesionExpirada` a
 * propósito: la superficie de Startrack contesta `success:false` tanto para una
 * sesión vencida como para un rechazo de validación, y ante esa ambigüedad una
 * escritura NUNCA se reintenta sola — un reintento a ciegas puede duplicar una
 * tarea que en realidad sí se creó. El mensaje de la plataforma viaja tal cual
 * para que lo lea una persona (S-A4). */
export class ErrorEscritura extends Error {
  constructor(
    public readonly plataforma: Plataforma,
    public readonly endpoint: string,
    public readonly detalle: string,
  ) {
    super(`La escritura en ${plataforma} (${endpoint}) fue rechazada: ${detalle}`)
    this.name = 'ErrorEscritura'
  }
}
