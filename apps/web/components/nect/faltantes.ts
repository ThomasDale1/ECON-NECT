/**
 * Qué significa, en lenguaje operativo, cada campo que faltó.
 *
 * Es lenguaje de interfaz, no lógica: por eso vive con los componentes y no en
 * el motor de reglas. La bandeja no dice
 * `camposFaltantes: ["startrack.posicion.vigencia"]`; dice qué está pasando. El
 * nombre técnico se guarda para el linaje, que está a un clic (ui-registry §3.5).
 *
 * Módulo plano a propósito: lo importan tanto componentes de cliente como el
 * motor de reglas, que es `server-only`.
 */
export const FALTANTE_EN_PALABRAS: Record<string, string> = {
  'startrack.vehiculo': 'Startrack no tiene contraparte para este equipo',
  'startrack.tarea': 'Startrack no publica la tarea de traslado',
  'startrack.posicion.vigencia':
    'La telemetría de Startrack está desconectada y la posición puede estar vieja',
  'startrack.geocerca.radio': 'Startrack no publica el radio de la geocerca',
  'prisma.proyecto': 'Prisma no tiene proyecto asignado',
  'prisma.estado': 'Prisma no reporta el estado del equipo',
}

/** Traduce un campo faltante; si no está en el diccionario, devuelve la clave. */
export function enPalabras(campo: string): string {
  return FALTANTE_EN_PALABRAS[campo] ?? campo
}
