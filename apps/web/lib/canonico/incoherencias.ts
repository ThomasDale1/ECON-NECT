// Proyección de `EquipoUnificado[]` a la bandeja de excepciones (S-A3,
// `GET /api/incoherencias`). Función pura: no conoce HTTP ni React.
//
// Una fila por REGLA disparada, no por equipo: un mismo equipo puede tener dos
// problemas distintos con responsables distintos, y la bandeja es una cola de
// trabajo — si se colapsaran en una fila, uno de los dos responsables no vería
// el suyo.
//
// `COHERENTE` no entra: no hay nada que hacer con él. `SIN_EVIDENCIA` sí entra,
// al final de la cola, porque "la regla aplica pero le faltó un dato" también es
// trabajo — el de conseguir ese dato (principio C.1).

import type { Dato, Incoherencia, Severidad, Veredicto } from '@/lib/tipos/canonico'
import type { EquipoUnificado } from '@/lib/tipos/canonico'
import { crearLinaje } from './estados'
import type { DatosCrudos, EquipoPrismaCrudo } from './tipos-crudos'

const ORDEN_SEVERIDAD: Record<Severidad, number> = { alta: 0, media: 1, baja: 2 }

/** SIN_EVIDENCIA al final: no es una alarma, es un hueco declarado
 * (ui-registry §1.3 — "nunca rojo"). */
const ORDEN_VEREDICTO: Record<Veredicto, number> = {
  EN_RIESGO: 0,
  ATENCION: 1,
  SIN_EVIDENCIA: 2,
  COHERENTE: 3,
}

function proyectoDelEquipo(
  crudo: EquipoPrismaCrudo | undefined,
  datos: DatosCrudos,
): Dato<string> {
  return {
    valor: crudo?.project_name ?? null,
    linaje: crearLinaje(datos.equipos, 'project_name', crudo?.project_name ?? null),
  }
}

export function construirIncoherencias(
  equipos: EquipoUnificado[],
  datos: DatosCrudos,
): Incoherencia[] {
  const crudoPorId = new Map(datos.equipos.datos.map((equipo) => [String(equipo.id), equipo]))

  const filas: Incoherencia[] = []
  for (const equipo of equipos) {
    const proyecto = proyectoDelEquipo(crudoPorId.get(equipo.id), datos)

    for (const resultado of equipo.reglas) {
      if (resultado.veredicto === 'COHERENTE') continue
      filas.push({
        equipoId: equipo.id,
        codigoActivo: equipo.codigoActivo.valor ?? '(sin código de activo)',
        veredicto: resultado.veredicto,
        severidad: resultado.severidad,
        confianza: resultado.confianza,
        // Id y nombre juntos: la bandeja tiene que poder nombrar la regla sin
        // consultar otra fuente (S-B1: "el veredicto con su regla nombrada").
        regla: `${resultado.regla} — ${resultado.nombre}`,
        accionSugerida: resultado.accionSugerida,
        rolResponsable: resultado.rolResponsable,
        proyecto,
      })
    }
  }

  return filas.sort(
    (a, b) =>
      ORDEN_VEREDICTO[a.veredicto] - ORDEN_VEREDICTO[b.veredicto] ||
      ORDEN_SEVERIDAD[a.severidad] - ORDEN_SEVERIDAD[b.severidad] ||
      b.confianza - a.confianza,
  )
}
