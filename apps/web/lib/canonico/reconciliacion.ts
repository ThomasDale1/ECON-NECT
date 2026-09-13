// El motor de reconciliación (S-A2 §lib/canonico/reconciliacion.ts). Función
// pura: entran datos ya leídos por los conectores, sale `EquipoUnificado[]`
// con su veredicto. No conoce HTTP.

import { REGLAS, type ContextoReglas } from '@/lib/reglas'
import type { EquipoUnificado, NivelResolucionIdentidad, ResultadoRegla, Veredicto } from '@/lib/tipos/canonico'
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
import type { DatosCrudos, SolicitudPrismaCruda, TareaStartrackCruda } from './tipos-crudos'

const PRECEDENCIA_VEREDICTO: Record<Veredicto, number> = {
  EN_RIESGO: 3,
  ATENCION: 2,
  COHERENTE: 1,
  SIN_EVIDENCIA: 0,
}

const CINCO_MINUTOS_MS = 5 * 60 * 1000

/**
 * Sugerencia en español cuando Startrack va por delante de Prisma ≤ 5 minutos.
 * Es una sugerencia para revisión humana, no un hecho ni un veredicto nuevo.
 */
const SUGERENCIA_DESFASE =
  'Startrack muestra una marca de tiempo más reciente que Prisma (desfase de hasta 5 minutos). Es posible que Prisma aún no se haya actualizado; conviene revisar ambas plataformas antes de concluir.'

function parseFecha(valor: string | null | undefined): number | null {
  if (!valor) return null
  const t = Date.parse(valor)
  return Number.isFinite(t) ? t : null
}

/**
 * Si la fecha de Startrack es posterior a la de Prisma por ≤ 5 minutos,
 * sugiere (no afirma) que Prisma puede no haberse actualizado aún.
 * Sin fechas en cualquiera de los dos lados → `null`. Nunca inventa timestamps.
 */
export function interpretarDesfase(
  fechaPrisma: string | null | undefined,
  fechaStartrack: string | null | undefined,
): string | null {
  const prismaMs = parseFecha(fechaPrisma)
  const startrackMs = parseFecha(fechaStartrack)
  if (prismaMs === null || startrackMs === null) return null
  const delta = startrackMs - prismaMs
  if (delta > 0 && delta <= CINCO_MINUTOS_MS) return SUGERENCIA_DESFASE
  return null
}

/** Fecha de Prisma para el par solicitud↔tarea: solo campos ya tipados. */
function fechaPrismaSolicitud(solicitud: SolicitudPrismaCruda): string | null {
  return solicitud.approved_at ?? solicitud.fecha_inicio ?? solicitud.created_at
}

/**
 * Combina el desfase solicitud↔tarea con el desfase equipo↔vehículo.
 * Preferir `vehicle_status_changed_date` (fsupdate) sobre `last_contact_date`.
 */
export function interpretarDesfases(args: {
  solicitud: SolicitudPrismaCruda | null
  tarea: TareaStartrackCruda | null
  equipoUpdatedAt: string | null | undefined
  startrackVehiculoFecha: string | null | undefined
}): string | null {
  const porSolicitud =
    args.solicitud && args.tarea
      ? interpretarDesfase(fechaPrismaSolicitud(args.solicitud), args.tarea.start_date)
      : null
  const porEquipo = interpretarDesfase(args.equipoUpdatedAt, args.startrackVehiculoFecha)
  return porSolicitud ?? porEquipo
}

/** Agregación del veredicto (S-A2 §lib/canonico/reconciliacion.ts): heurística
 * determinística y documentada, no ML. Exportada (además de usarse en
 * `reconciliar`) para poder probar la prueba obligatoria #5 de agregación de
 * forma aislada.
 *
 * Penalización por identidad (heurística, NO certeza):
 * - sin resolver: −60
 * - nivel 1 (remote_id): sin penalización extra
 * - nivel 2 (código de activo): −10
 * - nivel 3 (clave): −25
 * El umbral `confianza < 45` → SIN_EVIDENCIA es el de ui-registry.md §1.3. */
export function agregarVeredicto(
  identidadResuelta: boolean,
  resultados: ResultadoRegla[],
  nivelResolucionIdentidad: NivelResolucionIdentidad | null = null,
): { veredicto: Veredicto; confianza: number } {
  const concluidas = resultados.filter((r) => r.veredicto !== 'SIN_EVIDENCIA')
  const noConcluidas = resultados.filter((r) => r.veredicto === 'SIN_EVIDENCIA')

  let confianza = 100
  if (!identidadResuelta) {
    confianza -= 60
  } else if (nivelResolucionIdentidad === 2) {
    confianza -= 10
  } else if (nivelResolucionIdentidad === 3) {
    confianza -= 25
  }
  // nivel 1: sin penalización extra — el enlace por remote_id es el más directo,
  // pero sigue siendo heurística, no certeza medida.
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
  // Heurística elegida de ui-registry.md §1.3 — no es una constante medida.
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

    const base = construirEquipoUnificado({
      vinculo,
      procedenciaEquipos: datos.equipos,
      procedenciaVehiculos: datos.vehiculos,
      solicitud,
      procedenciaSolicitudes: datos.solicitudes,
      resolucionTarea,
      procedenciaTareas: datos.tareas,
      geocercas: datos.geocercas.datos,
      procedenciaGeocercas: datos.geocercas,
    })

    // Desfase con fechas reales tipadas. Preferencia Startrack vehículo:
    // last_contact_date aquí; orquestador puede sustituir por
    // vehicle_status_changed_date de fsupdate cuando exista.
    const interpretacionDesfase = interpretarDesfases({
      solicitud,
      tarea: resolucionTarea?.tarea ?? null,
      equipoUpdatedAt: vinculo.equipo.updated_at,
      startrackVehiculoFecha: vinculo.vehiculo?.last_contact_date ?? null,
    })

    return { ...base, interpretacionDesfase }
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

    const { veredicto, confianza } = agregarVeredicto(
      equipoSinVeredicto.identidadResuelta,
      resultados,
      equipoSinVeredicto.nivelResolucionIdentidad,
    )

    return { ...equipoSinVeredicto, veredicto, confianza, reglas: resultados }
  })
}
