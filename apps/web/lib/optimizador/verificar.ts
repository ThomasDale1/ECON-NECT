// El verificador (S-A7 Paso 4f). Puro: sin HTTP. Vuelve a comprobar TODO
// antes de que una respuesta salga — nunca se fuerza una asignación con una
// sola violación (AGENTS.md §9.6).
//
// `EntradaSolver.pares` y `.operadoresPorSolicitud` ya codifican H1∧H2 y H3
// respectivamente (lib/optimizador/adaptador.ts solo agrega a esas listas los
// pares/operadores que las pasaron) — por eso comprobar que la salida del
// solver se mantenga dentro de esas listas ES comprobar H1, H2 y H3 de nuevo,
// sin tener que releer los datos crudos.

import type { EntradaSolver, SalidaSolver } from './tipos'

function seEncimaDias(inicioA: number, finA: number, inicioB: number, finB: number): boolean {
  return inicioA <= finB && inicioB <= finA
}

export function verificar(entrada: EntradaSolver, salida: SalidaSolver): string[] {
  const violaciones: string[] = []

  const paresPermitidos = new Set(entrada.pares.map((p) => `${p.solicitudId}::${p.maquinaId}`))
  const operadoresPermitidosPorSolicitud = new Map<string, Set<string>>(
    entrada.operadoresPorSolicitud.map((o) => [o.solicitudId, new Set(o.operadorIds)]),
  )
  const diasPorSolicitud = new Map(entrada.solicitudes.map((s) => [s.id, { inicio: s.inicioDia, fin: s.finDia }]))

  // H1 ∧ H2 (par permitido) y H3 (operador permitido).
  for (const a of salida.asignaciones) {
    if (!paresPermitidos.has(`${a.solicitudId}::${a.maquinaId}`)) {
      violaciones.push(
        `par no permitido (H1/H2): la solicitud ${a.solicitudId} no tiene a la máquina ${a.maquinaId} entre sus pares candidatos`,
      )
    }
    const operadoresPermitidos = operadoresPermitidosPorSolicitud.get(a.solicitudId)
    if (!operadoresPermitidos || !operadoresPermitidos.has(a.operadorId)) {
      violaciones.push(
        `operador no permitido (H3): el operador ${a.operadorId} no está disponible para la solicitud ${a.solicitudId}`,
      )
    }
  }

  // Solicitud asignada dos veces.
  const porSolicitud = new Map<string, number>()
  for (const a of salida.asignaciones) {
    porSolicitud.set(a.solicitudId, (porSolicitud.get(a.solicitudId) ?? 0) + 1)
  }
  for (const [solicitudId, veces] of porSolicitud) {
    if (veces > 1) violaciones.push(`la solicitud ${solicitudId} quedó asignada ${veces} veces`)
  }

  // Choques entre propuestas: misma máquina u operador en solicitudes que se
  // encimen en fechas.
  for (let i = 0; i < salida.asignaciones.length; i++) {
    for (let j = i + 1; j < salida.asignaciones.length; j++) {
      const a = salida.asignaciones[i]
      const b = salida.asignaciones[j]
      if (a.solicitudId === b.solicitudId) continue

      const diasA = diasPorSolicitud.get(a.solicitudId)
      const diasB = diasPorSolicitud.get(b.solicitudId)
      if (!diasA || !diasB) continue
      if (!seEncimaDias(diasA.inicio, diasA.fin, diasB.inicio, diasB.fin)) continue

      if (a.maquinaId === b.maquinaId) {
        violaciones.push(
          `choque de máquina: ${a.maquinaId} quedó asignada a ${a.solicitudId} y ${b.solicitudId}, que se encima en fechas`,
        )
      }
      if (a.operadorId === b.operadorId) {
        violaciones.push(
          `choque de operador: ${a.operadorId} quedó asignado a ${a.solicitudId} y ${b.solicitudId}, que se encima en fechas`,
        )
      }
    }
  }

  return violaciones
}
