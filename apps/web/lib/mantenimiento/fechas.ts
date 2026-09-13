// Aritmética de fechas `AAAA-MM-DD` en `America/El_Salvador` (S-A11). Puro.
//
// Prisma no registra hora en ninguna fecha y el reporte diario de Startrack
// viene por día calendario, así que todo el módulo trabaja con cadenas
// `AAAA-MM-DD` y las compara como texto (el formato ISO ordena solo). Nada
// de `new Date()` sin zona: el único punto donde entra el reloj del sistema
// es `hoyElSalvador`, que ya lo proyecta a la zona de la operación.
// `date-fns` no está en `package.json` y agregar una dependencia se pide, no
// se instala (AGENTS.md §4.2): alcanza con `Intl` y UTC.

const DIA_MS = 86_400_000

/** Hoy en `America/El_Salvador` como AAAA-MM-DD (`en-CA` produce ese orden). */
export function hoyElSalvador(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' }).format(ahora)
}

export function esFechaIso(valor: unknown): valor is string {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)
}

/** Recorta un `AAAA-MM-DD…` (con hora o sin ella) a la fecha; `null` si no
 * empieza por una fecha reconocible. */
export function soloFecha(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const fecha = valor.slice(0, 10)
  return esFechaIso(fecha) ? fecha : null
}

export function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia) + dias * DIA_MS).toISOString().slice(0, 10)
}

export function restarDias(fecha: string, dias: number): string {
  return sumarDias(fecha, -dias)
}
