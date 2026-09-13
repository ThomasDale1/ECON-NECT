// El motor de reconciliación (S-A2 §lib/canonico/reconciliacion.ts). Función
// pura: entran datos ya leídos por los conectores, sale `EquipoUnificado[]`
// con su veredicto. No conoce HTTP.

import { REGLAS, type ContextoReglas } from '@/lib/reglas'
import type { EquipoUnificado, ResultadoRegla, Veredicto } from '@/lib/tipos/canonico'
import { CATALOGO_CLASE_EQUIPO, CATALOGO_TIPO_TAREA } from './catalogos'
import { puedeOperar } from './estados'
import {
  resolverIdentidades,
  resolverTareaPrincipal,
  solicitudesDeEquipo,
  solicitudPrincipal,
  tareasDeVehiculo,
} from './identidad'
import { construirEquipoUnificado } from './modelo'
import type { DatosCrudos } from './tipos-crudos'

const PRECEDENCIA_VEREDICTO: Record<Veredicto, number> = {
  EN_RIESGO: 3,
  ATENCION: 2,
  COHERENTE: 1,
  SIN_EVIDENCIA: 0,
}

/** Agregación del veredicto (S-A2 §lib/canonico/reconciliacion.ts): heurística
 * determinística y documentada, no ML. Exportada (además de usarse en
 * `reconciliar`) para poder probar la prueba obligatoria #5 de agregación de
 * forma aislada. */
export function agregarVeredicto(
  identidadResuelta: boolean,
  resultados: ResultadoRegla[],
): { veredicto: Veredicto; confianza: number } {
  const concluidas = resultados.filter((r) => r.veredicto !== 'SIN_EVIDENCIA')
  const noConcluidas = resultados.filter((r) => r.veredicto === 'SIN_EVIDENCIA')

  let confianza = 100
  if (!identidadResuelta) confianza -= 60
  confianza -= 20 * noConcluidas.length
  confianza = Math.max(0, confianza)

  let veredicto: Veredicto =
    concluidas.length > 0
      ? concluidas.reduce<Veredicto>(
          (max, r) => (PRECEDENCIA_VEREDICTO[r.veredicto] > PRECEDENCIA_VEREDICTO[max] ? r.veredicto : max),
          concluidas[0].veredicto,
        )
      : 'SIN_EVIDENCIA'

  if (concluidas.length === 0) veredicto = 'SIN_EVIDENCIA'
  if (confianza < 45) veredicto = 'SIN_EVIDENCIA'

  return { veredicto, confianza }
}

export function reconciliar(datos: DatosCrudos): EquipoUnificado[] {
  const vinculos = resolverIdentidades(datos.equipos.datos, datos.vehiculos.datos, datos.tareas.datos)

  const nombreTipoTareaPorId: Record<string, string> = {}
  for (const tipo of datos.tiposTarea.datos) {
    if (tipo.name) nombreTipoTareaPorId[String(tipo.id)] = tipo.name
  }

  const crudoPorEquipoId: ContextoReglas['crudoPorEquipoId'] = {}
  const puedeOperarPorEquipoId: ContextoReglas['puedeOperarPorEquipoId'] = {}
  const tareasPorEquipoId: ContextoReglas['tareasPorEquipoId'] = {}
  const solicitudesPorEquipoId: ContextoReglas['solicitudesPorEquipoId'] = {}

  const equiposSinVeredicto = vinculos.map((vinculo) => {
    const id = String(vinculo.equipo.id)
    const solicitudes = solicitudesDeEquipo(vinculo.equipo, datos.solicitudes.datos)
    const solicitud = solicitudPrincipal(solicitudes)
    const resolucionTarea = resolverTareaPrincipal(vinculo, solicitud, datos.tareas.datos)

    crudoPorEquipoId[id] = vinculo.equipo
    puedeOperarPorEquipoId[id] = puedeOperar(vinculo.equipo)
    tareasPorEquipoId[id] = tareasDeVehiculo(vinculo.vehiculo, datos.tareas.datos)
    solicitudesPorEquipoId[id] = solicitudes

    return construirEquipoUnificado({
      vinculo,
      procedenciaEquipos: datos.equipos,
      procedenciaVehiculos: datos.vehiculos,
      solicitud,
      procedenciaSolicitudes: datos.solicitudes,
      resolucionTarea,
      procedenciaTareas: datos.tareas,
      geocercas: datos.geocercas.datos,
      procedenciaGeocercas: datos.geocercas,
      estadosVehiculoPorVehiculoId: datos.estadosVehiculoPorVehiculoId,
    })
  })

  const ctx: ContextoReglas = {
    crudoPorEquipoId,
    puedeOperarPorEquipoId,
    tareasPorEquipoId,
    solicitudesPorEquipoId,
    nombreTipoTareaPorId,
    catalogoClasesEquipo: CATALOGO_CLASE_EQUIPO,
    catalogoTiposTarea: CATALOGO_TIPO_TAREA,
  }

  return equiposSinVeredicto.map((equipoSinVeredicto) => {
    // Las reglas se tipan contra el contrato completo (lib/reglas/tipos.ts),
    // pero veredicto/confianza/reglas todavía no existen en este punto: se
    // arma un valor de relleno solo para satisfacer el tipo de entrada de
    // `evaluar` (ninguna regla lee estos tres campos de `eq`; los calculan).
    const placeholder: EquipoUnificado = {
      ...equipoSinVeredicto,
      veredicto: 'SIN_EVIDENCIA',
      confianza: 0,
      reglas: [],
    }

    const resultados = REGLAS.map((regla) => regla.evaluar(placeholder, ctx)).filter(
      (r): r is ResultadoRegla => r !== null,
    )

    const { veredicto, confianza } = agregarVeredicto(equipoSinVeredicto.identidadResuelta, resultados)

    return { ...equipoSinVeredicto, veredicto, confianza, reglas: resultados }
  })
}
