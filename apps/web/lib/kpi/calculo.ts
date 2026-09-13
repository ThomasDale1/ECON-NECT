// Cálculo de KPIs — ECON NECT (S-C2, carril C).
//
// Funciones puras: no conocen HTTP. Reciben datos ya leídos (o ya enlazados,
// en el caso de la latencia) y devuelven el número o el hueco declarado.
// Las alimenta después una ruta o `scripts/reconciliar.ts`.

import { CATALOGO_KPI } from './catalogo'
import type { EquipoUnificado } from '@/lib/tipos/canonico'

/** `calcularTasaCoherencia` — COHERENTE ÷ identidad resuelta (01 Parte D.7). */
export function calcularTasaCoherencia(equipos: EquipoUnificado[]): {
  valor: number | null
  numerador: number
  denominador: number
} {
  const denominador = equipos.filter((eq) => eq.identidadResuelta).length
  const numerador = equipos.filter((eq) => eq.identidadResuelta && eq.veredicto === 'COHERENTE').length
  return {
    valor: denominador === 0 ? null : numerador / denominador,
    numerador,
    denominador,
  }
}

/** `calcularCobertura` — identidad resuelta ÷ total observado. */
export function calcularCobertura(equipos: EquipoUnificado[]): {
  valor: number | null
  resueltos: number
  total: number
} {
  const total = equipos.length
  const resueltos = equipos.filter((eq) => eq.identidadResuelta).length
  return {
    valor: total === 0 ? null : resueltos / total,
    resueltos,
    total,
  }
}

/** Un par ya enlazado por `remote_id` (lo arma quien llame, no esta función:
 * requiere cruzar la bitácora de solicitudes de Prisma con las tareas de
 * Startrack, algo que esta capa no lee). */
export type ParLatencia = {
  approvedAt: string
  taskCreatedAt: string
}

/** `calcularLatencia` — horas entre `solicitud.approved_at` (Prisma) y
 * `tarea.creation_date` (Startrack), promediadas sobre los pares que sí
 * enlazaron por `remote_id`. Esta función no conoce cuántas solicitudes
 * aprobadas existen en total — solo ve los pares ya enlazados — así que
 * `cobertura` y `muestras` reflejan la misma cuenta; la fracción sobre el
 * total de aprobadas (hoy 1 de 5) la documenta `catalogo.ts` en `referencia`,
 * donde sí se conoce el universo completo. */
export function calcularLatencia(pares: ParLatencia[]): {
  valor: number | null
  cobertura: number
  muestras: number
} {
  if (pares.length === 0) return { valor: null, cobertura: 0, muestras: 0 }

  const horasPorPar = pares.map(
    (par) => (new Date(par.taskCreatedAt).getTime() - new Date(par.approvedAt).getTime()) / (1000 * 60 * 60),
  )
  const promedio = horasPorPar.reduce((suma, horas) => suma + horas, 0) / horasPorPar.length

  return { valor: promedio, cobertura: pares.length, muestras: pares.length }
}

/** `tiempoMuertoQuetzales` — no calculable hoy (AGENTS.md §1.1, 01 Parte D.7):
 * el sandbox no expone horas reales de uso por ningún endpoint. Devuelve el
 * hueco declarado en `catalogo.ts` — nunca un número inventado — para que el
 * dato faltante no se duplique en dos lugares que puedan desalinearse. */
export function tiempoMuertoQuetzales(): { valor: null; datoFaltante: string } {
  const kpi = CATALOGO_KPI.find((k) => k.id === 'tiempo-muerto-quetzales')
  return {
    valor: null,
    datoFaltante: kpi?.datoFaltante ?? 'Horas reales de uso no expuestas por el sandbox.',
  }
}
