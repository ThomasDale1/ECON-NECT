// Cálculo del pronóstico de mantenimiento preventivo (S-A11 Paso 6). **Puro**:
// no conoce HTTP ni React; recibe datos ya leídos y devuelve un
// `PronosticoMantenimiento` con cada número acompañado de su `Linaje` en
// `registros`, o del texto de lo que faltó en `faltantes`.
//
// Es una heurística determinística y documentada. No es IA, no es una
// probabilidad entrenada y no se vende como tal. No toca `lib/canonico/` ni
// `lib/reglas/`: la alerta no altera veredicto, confianza ni la tasa de
// coherencia (línea roja, 01 H.3).
//
// Dos horómetros distintos, nunca comparados: el GPS de Startrack (contador y
// serie diaria) y el humano de Prisma (`hour_meter` de los reportes de falla).
// Cada cálculo usa deltas dentro de su propia fuente.

import type { EquipoUnificado, Linaje } from '@/lib/tipos/canonico'
import { restarDias, soloFecha, sumarDias } from './fechas'
import { buscarIntervaloOem, type FilaOem } from './intervalos-oem'
import { umbralesDe } from './parametros'
import type {
  FilaSerieDiaria,
  HorometroVivo,
  IntervaloResuelto,
  MantenimientoEquipoPrisma,
  NivelAlerta,
  ParametrosMantenimiento,
  PronosticoMantenimiento,
  ReporteFallaPrisma,
  TipoAncla,
} from './tipos'

export type MarcaModeloConLinaje = {
  marca: string | null
  modelo: string | null
  linaje: Linaje
}

export type EntradaPronostico = {
  equipo: EquipoUnificado
  /** Lo que `EquipoUnificado` no expone y el orquestador sí sabe. */
  vehiculoId: string | null
  clase: string | null
  paroActivo: boolean | null
  /** Startrack primero (`make`/`model`), Prisma después (`marca`/`modelo`). */
  marcaModelo: MarcaModeloConLinaje[]
  horometro: HorometroVivo | null
  /** Filas del vehículo, y el linaje del reporte del que salieron. */
  serie: FilaSerieDiaria[]
  linajeSerie: Linaje | null
  /** Reportes del equipo (ya filtrados por `maquinariaId`). */
  reportes: ReporteFallaPrisma[]
  mantenimiento: MantenimientoEquipoPrisma | null
  parametros: ParametrosMantenimiento
  hoy: string // AAAA-MM-DD, America/El_Salvador
  leidoEn: string
}

const SEGUNDOS_POR_HORA = 3600
const DIAS_RITMO = 7
/** Diferencia tolerada entre Σ serie y el contador (redondeo del reporte). */
const TOLERANCIA_CRUCE_H = 0.05

function redondear(valor: number, decimales = 2): number {
  const factor = 10 ** decimales
  return Math.round(valor * factor) / factor
}

function horasDeFila(fila: FilaSerieDiaria): number {
  return (fila.motorEncendidoSeg ?? 0) / SEGUNDOS_POR_HORA
}

// ── 1. Estado de taller ───────────────────────────────────────────────────────

export function resolverEstadoTaller(
  mantenimiento: MantenimientoEquipoPrisma | null,
  paroActivo: boolean | null,
  hoy: string,
): PronosticoMantenimiento['estadoTaller'] {
  const inicio = soloFecha(mantenimiento?.fechaInicio)
  const fin = soloFecha(mantenimiento?.fechaFin)
  if (inicio && fin && inicio <= hoy && hoy < fin) return 'en_taller'
  if (paroActivo === true) return 'parada_por_falla'
  return 'operando'
}

// ── 2. Ancla ──────────────────────────────────────────────────────────────────

export type Ancla = { tipo: TipoAncla; fecha: string; linaje: Linaje }

/** La fecha más reciente entre `mantenimiento_fecha_fin` (solo si ≤ hoy) y
 * `updated_at` del último reporte FINALIZADO. Sin ninguna → el primer día con
 * fila en la serie del GPS (`inicio_serie_gps`). Sin serie → `null`. */
export function resolverAncla(entrada: {
  mantenimiento: MantenimientoEquipoPrisma | null
  reportes: ReporteFallaPrisma[]
  serie: FilaSerieDiaria[]
  linajeSerie: Linaje | null
  hoy: string
}): { ancla: Ancla | null; faltantes: string[] } {
  const { mantenimiento, reportes, serie, linajeSerie, hoy } = entrada
  const candidatas: Ancla[] = []

  const fin = soloFecha(mantenimiento?.fechaFin)
  if (mantenimiento && fin && fin <= hoy) {
    candidatas.push({ tipo: 'mantenimiento_fecha_fin', fecha: fin, linaje: mantenimiento.linaje })
  }

  const finalizados = reportes
    .filter((r) => (r.estado ?? '').toUpperCase() === 'FINALIZADO')
    .map((r) => ({ reporte: r, fecha: soloFecha(r.actualizadoEn) }))
    .filter((r): r is { reporte: ReporteFallaPrisma; fecha: string } => r.fecha !== null)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))
  if (finalizados.length > 0) {
    const ultimo = finalizados[0]
    candidatas.push({
      tipo: 'reporte_finalizado',
      fecha: ultimo.fecha,
      linaje: { ...ultimo.reporte.linaje, campo: 'updated_at', valorCrudo: ultimo.reporte.actualizadoEn },
    })
  }

  if (candidatas.length > 0) {
    candidatas.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))
    return { ancla: candidatas[0], faltantes: [] }
  }

  const primerDia = [...serie].map((f) => f.fecha).sort()[0]
  if (primerDia && linajeSerie) {
    return {
      ancla: {
        tipo: 'inicio_serie_gps',
        fecha: primerDia,
        linaje: { ...linajeSerie, campo: 'detail[].date', valorCrudo: primerDia },
      },
      faltantes: ['sin salida de taller registrada en Prisma: se cuenta desde el primer día con datos del GPS'],
    }
  }

  return { ancla: null, faltantes: ['sin serie diaria del GPS ni salida de taller en Prisma: no hay desde cuándo contar'] }
}

// ── 3. Horas desde el ancla ───────────────────────────────────────────────────

/** Σ `motorEncendidoSeg` ÷ 3600 de las filas posteriores al ancla. El día de
 * salida de taller **no** cuenta (`fecha > ancla`). Cuando el ancla es el
 * propio inicio de la serie no hay día de salida: ese primer día sí cuenta
 * (`fecha ≥ ancla`), y así Σ coincide con el contador del vehículo. */
export function horasDesde(serie: FilaSerieDiaria[], ancla: Ancla): { horas: number; filas: number } {
  const incluye = (fecha: string): boolean =>
    ancla.tipo === 'inicio_serie_gps' ? fecha >= ancla.fecha : fecha > ancla.fecha
  let segundos = 0
  let filas = 0
  for (const fila of serie) {
    if (!incluye(fila.fecha)) continue
    segundos += fila.motorEncendidoSeg ?? 0
    filas += 1
  }
  return { horas: redondear(segundos / SEGUNDOS_POR_HORA), filas }
}

// ── 4. Intervalo ──────────────────────────────────────────────────────────────

function mediana(valores: number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b)
  const medio = Math.floor(ordenados.length / 2)
  return ordenados.length % 2 === 1 ? ordenados[medio] : (ordenados[medio - 1] + ordenados[medio]) / 2
}

export type IntervaloAprendido = {
  horas: number
  reportes: number
  diferencias: number[]
  descartadas: number
  confianza: 'alta' | 'media' | 'baja'
  linajes: Linaje[]
}

/** Mediana de Δ`hour_meter` entre reportes FINALIZADO consecutivos (por
 * `creadoEn`). Se descartan las diferencias ≤ 0. Confianza: baja con 1–2
 * diferencias, media con 3–4, alta con ≥ 5. `null` sin diferencias válidas. */
export function intervaloAprendido(reportes: ReporteFallaPrisma[]): IntervaloAprendido | null {
  const conHorometro = reportes
    .filter((r) => (r.estado ?? '').toUpperCase() === 'FINALIZADO' && r.horometroHumano !== null)
    .filter((r) => r.creadoEn !== null)
    .sort((a, b) => ((a.creadoEn ?? '') < (b.creadoEn ?? '') ? -1 : 1))
  if (conHorometro.length < 2) return null

  const diferencias: number[] = []
  let descartadas = 0
  for (let i = 1; i < conHorometro.length; i++) {
    const delta = (conHorometro[i].horometroHumano ?? 0) - (conHorometro[i - 1].horometroHumano ?? 0)
    if (delta <= 0) {
      descartadas += 1
      continue
    }
    diferencias.push(delta)
  }
  if (diferencias.length === 0) return null

  const confianza = diferencias.length >= 5 ? 'alta' : diferencias.length >= 3 ? 'media' : 'baja'
  return {
    horas: redondear(mediana(diferencias)),
    reportes: conHorometro.length,
    diferencias,
    descartadas,
    confianza,
    linajes: conHorometro.map((r) => r.linaje),
  }
}

function primeraFilaOem(marcaModelo: MarcaModeloConLinaje[]): { fila: FilaOem; origen: MarcaModeloConLinaje } | null {
  for (const origen of marcaModelo) {
    const fila = buscarIntervaloOem({ marca: origen.marca, modelo: origen.modelo })
    if (fila) return { fila, origen }
  }
  return null
}

export type IntervaloConRastro = {
  intervalo: IntervaloResuelto
  registros: Linaje[]
  parametrosAplicados: string[]
  faltantes: string[]
  advertencias: string[]
}

/** Precedencia fija: sobreescrito → aprendido → declarado (OEM) → sin_dato. */
export function resolverIntervalo(entrada: {
  equipoId: string
  marcaModelo: MarcaModeloConLinaje[]
  reportes: ReporteFallaPrisma[]
  parametros: ParametrosMantenimiento
}): IntervaloConRastro {
  const { equipoId, marcaModelo, reportes, parametros } = entrada
  const parametro = parametros.porEquipo[equipoId]
  const severo = parametro?.severo === true
  const regimen: 'estandar' | 'severo' = severo ? 'severo' : 'estandar'

  const oem = primeraFilaOem(marcaModelo)
  const oemHoras = oem ? (severo ? oem.fila.severoHoras : oem.fila.estandarHoras) : null
  const registros: Linaje[] = oem ? [oem.origen.linaje] : []
  const parametrosAplicados: string[] = []
  const advertencias: string[] = []
  if (severo && oem) {
    parametrosAplicados.push(
      `régimen severo: ${oem.fila.severoHoras} h${oem.fila.severoDeclaradoPorFabricante ? '' : ' (regla estándar ÷ 2, no dato del fabricante)'}`,
    )
  }

  // 4.1 sobreescrito
  if (parametro?.intervaloHoras !== undefined) {
    parametrosAplicados.unshift(`intervalo fijado a mano: ${parametro.intervaloHoras} h`)
    return {
      intervalo: {
        nivel: 'sobreescrito',
        horas: parametro.intervaloHoras,
        regimen: oem ? regimen : null,
        origen: 'fijado a mano en este navegador',
        fuente: 'navegador',
        confianza: null,
        oemHoras,
      },
      registros,
      parametrosAplicados,
      faltantes: [],
      advertencias,
    }
  }

  // 4.2 aprendido
  const aprendido = intervaloAprendido(reportes)
  if (aprendido) {
    if (aprendido.descartadas > 0) {
      advertencias.push(
        `${aprendido.descartadas} diferencia(s) de hour_meter ≤ 0 entre reportes FINALIZADO consecutivos se descartaron`,
      )
    }
    return {
      intervalo: {
        nivel: 'aprendido',
        horas: aprendido.horas,
        regimen: null,
        origen: `mediana de ${aprendido.reportes} reportes FINALIZADO`,
        fuente: aprendido.linajes[0]?.endpoint ?? null,
        confianza: aprendido.confianza,
        oemHoras,
      },
      registros: [...registros, ...aprendido.linajes],
      parametrosAplicados,
      faltantes: [],
      advertencias,
    }
  }

  // 4.3 declarado
  if (oem) {
    return {
      intervalo: {
        nivel: 'declarado',
        horas: oemHoras,
        regimen,
        origen: `OEM ${oem.fila.marca} ${oem.fila.modelo}, ${regimen === 'severo' ? 'severo' : 'estándar'}`,
        fuente: oem.fila.fuente,
        confianza: oem.fila.confianza === 'media-alta' ? 'media' : oem.fila.confianza,
        oemHoras,
      },
      registros,
      parametrosAplicados,
      faltantes: [],
      advertencias,
    }
  }

  // 4.4 sin dato
  const etiqueta =
    marcaModelo
      .map((m) => [m.marca, m.modelo].filter(Boolean).join(' '))
      .find((texto) => texto !== '') ?? 'marca y modelo desconocidos'
  return {
    intervalo: {
      nivel: 'sin_dato',
      horas: null,
      regimen: null,
      origen: 'sin intervalo',
      fuente: null,
      confianza: null,
      oemHoras: null,
    },
    registros,
    parametrosAplicados,
    faltantes: [`intervalo: sin fila OEM para ${etiqueta} y sin reportes FINALIZADO con horómetro`],
    advertencias,
  }
}

// ── 5. Nivel por avance ───────────────────────────────────────────────────────

export function nivelPorAvance(
  avance: number | null,
  umbrales: { aviso: number; urgente: number; vencido: number },
): NivelAlerta {
  if (avance === null) return null
  if (avance >= umbrales.vencido / 100) return 'vencido'
  if (avance >= umbrales.urgente / 100) return 'urgente'
  if (avance >= umbrales.aviso / 100) return 'aviso'
  return null
}

// ── 6. Ritmo de los últimos 7 días ────────────────────────────────────────────

/** Σ horas de las filas con `hoy − 6 ≤ fecha ≤ hoy` ÷ 7 (un día sin fila
 * cuenta 0 h). `dias` = días distintos con Σ > 0. */
export function ritmo7d(serie: FilaSerieDiaria[], hoy: string): { ritmo: number; dias: number; horas: number } {
  const desde = restarDias(hoy, DIAS_RITMO - 1)
  const porDia = new Map<string, number>()
  for (const fila of serie) {
    if (fila.fecha < desde || fila.fecha > hoy) continue
    porDia.set(fila.fecha, (porDia.get(fila.fecha) ?? 0) + horasDeFila(fila))
  }
  let horas = 0
  let dias = 0
  for (const h of porDia.values()) {
    horas += h
    if (h > 0) dias += 1
  }
  return { ritmo: redondear(horas / DIAS_RITMO, 3), dias, horas: redondear(horas) }
}

// ── 7. Fechas estimadas ───────────────────────────────────────────────────────

function fechaEstimada(
  hoy: string,
  umbralPct: number,
  intervalo: number,
  horasDesdeAncla: number,
  ritmo: number,
): string | null {
  if (ritmo <= 0) return null
  const faltan = (umbralPct / 100) * intervalo - horasDesdeAncla
  if (faltan <= 0) return hoy
  return sumarDias(hoy, Math.ceil(faltan / ritmo))
}

// ── Todo junto ────────────────────────────────────────────────────────────────

export function calcularPronostico(entrada: EntradaPronostico): PronosticoMantenimiento {
  const { equipo, vehiculoId, clase, paroActivo, marcaModelo, horometro, serie, linajeSerie, reportes } = entrada
  const { mantenimiento, parametros, hoy, leidoEn } = entrada
  const umbrales = umbralesDe(parametros)

  const registros: Linaje[] = []
  const faltantes: string[] = []
  const advertencias: string[] = []
  const parametrosAplicados: string[] = []

  // 1. estado de taller
  const estadoTaller = resolverEstadoTaller(mantenimiento, paroActivo, hoy)
  if (estadoTaller === 'en_taller' && mantenimiento) {
    registros.push(mantenimiento.linaje)
    advertencias.push(`en taller hasta ${soloFecha(mantenimiento.fechaFin) ?? mantenimiento.fechaFin}`)
  }
  if (estadoTaller === 'parada_por_falla' && equipo.falla) {
    registros.push(equipo.falla.linaje)
    advertencias.push('parada por falla con paro activo en Prisma: sin alerta preventiva mientras dure')
  }

  // horómetro vivo (contador)
  const horasMotorTotales = horometro?.horasMotor ?? null
  if (horometro) {
    registros.push(horometro.linaje)
  } else if (vehiculoId === null) {
    faltantes.push('sin vehículo unido en Startrack: no hay horómetro GPS')
  } else {
    faltantes.push('horómetro GPS: el reporte de flota de Startrack no trae este vehículo')
  }
  if (linajeSerie && serie.length > 0) {
    registros.push({
      ...linajeSerie,
      valorCrudo: { ...(linajeSerie.valorCrudo as Record<string, unknown>), filas: serie.length },
    })
  } else if (vehiculoId !== null) {
    faltantes.push('serie diaria del GPS: sin filas para este vehículo en la ventana leída')
  }

  // 2. ancla
  const resueltaAncla = resolverAncla({ mantenimiento, reportes, serie, linajeSerie, hoy })
  faltantes.push(...resueltaAncla.faltantes)
  const ancla = resueltaAncla.ancla
  if (ancla && ancla.tipo !== 'inicio_serie_gps') registros.push(ancla.linaje)

  // 3. horas desde el ancla
  let horasDesdeAncla: number | null = null
  if (ancla && serie.length > 0) {
    const { horas } = horasDesde(serie, ancla)
    horasDesdeAncla = horas
    const primerDia = [...serie].map((f) => f.fecha).sort()[0]
    if (ancla.tipo !== 'inicio_serie_gps' && primerDia > ancla.fecha) {
      advertencias.push(
        `la serie diaria empieza el ${primerDia}, después de la salida de taller (${ancla.fecha}): se cuenta solo lo disponible`,
      )
    }
    if (ancla.tipo !== 'inicio_serie_gps') {
      advertencias.push(`el día de salida de taller (${ancla.fecha}) no se cuenta`)
    }
    if (ancla.tipo === 'inicio_serie_gps' && horasMotorTotales !== null) {
      const diferencia = Math.abs(horas - horasMotorTotales)
      if (diferencia > TOLERANCIA_CRUCE_H) {
        advertencias.push(`la serie diaria y el contador difieren en ${redondear(diferencia)} h (se sigue con la serie)`)
      }
    }
  }

  // 4. intervalo
  const resueltoIntervalo = resolverIntervalo({ equipoId: equipo.id, marcaModelo, reportes, parametros })
  registros.push(...resueltoIntervalo.registros)
  faltantes.push(...resueltoIntervalo.faltantes)
  advertencias.push(...resueltoIntervalo.advertencias)
  parametrosAplicados.push(...resueltoIntervalo.parametrosAplicados)
  const intervalo = resueltoIntervalo.intervalo

  // 5. avance y nivel
  const avance =
    horasDesdeAncla !== null && intervalo.horas !== null && intervalo.horas > 0
      ? redondear(horasDesdeAncla / intervalo.horas, 4)
      : null
  const nivelAlerta = estadoTaller === 'operando' ? nivelPorAvance(avance, umbrales) : null
  if (parametros.umbrales) {
    parametrosAplicados.push(`umbrales ${umbrales.aviso}/${umbrales.urgente}/${umbrales.vencido} %`)
  }

  // 6. ritmo
  const ritmo = ritmo7d(serie, hoy)
  const ritmoHorasPorDia = serie.length > 0 ? ritmo.ritmo : null

  // 7. fechas estimadas
  let fechaEstimadaAviso: string | null = null
  let fechaEstimadaVencido: string | null = null
  if (horasDesdeAncla !== null && intervalo.horas !== null) {
    if (ritmoHorasPorDia !== null && ritmoHorasPorDia > 0) {
      fechaEstimadaAviso = fechaEstimada(hoy, umbrales.aviso, intervalo.horas, horasDesdeAncla, ritmoHorasPorDia)
      fechaEstimadaVencido = fechaEstimada(hoy, umbrales.vencido, intervalo.horas, horasDesdeAncla, ritmoHorasPorDia)
    } else {
      faltantes.push('ritmo 0 h/día en los últimos 7 días: sin fecha estimada')
    }
  }

  const marcaModeloTexto =
    marcaModelo.map((m) => [m.marca, m.modelo].filter(Boolean).join(' ')).find((t) => t !== '') ?? null

  return {
    equipoId: equipo.id,
    codigoActivo: equipo.codigoActivo.valor,
    vehiculoId,
    clase,
    marcaModelo: marcaModeloTexto,
    estadoTaller,
    ancla,
    horasDesdeAncla,
    horasMotorTotales,
    intervalo,
    avance,
    nivelAlerta,
    ritmoHorasPorDia,
    diasConMotorUltimos7: ritmo.dias,
    fechaEstimadaAviso,
    fechaEstimadaVencido,
    registros,
    parametrosAplicados,
    faltantes,
    advertencias,
    leidoEn,
  }
}

/** Orden de la bandeja: vencido > urgente > aviso, luego avance desc. */
const PESO_NIVEL: Record<Exclude<NivelAlerta, null>, number> = { vencido: 0, urgente: 1, aviso: 2 }

export function ordenarAlertas(pronosticos: PronosticoMantenimiento[]): PronosticoMantenimiento[] {
  return pronosticos
    .filter((p) => p.nivelAlerta !== null)
    .sort(
      (a, b) =>
        PESO_NIVEL[a.nivelAlerta as Exclude<NivelAlerta, null>] - PESO_NIVEL[b.nivelAlerta as Exclude<NivelAlerta, null>] ||
        (b.avance ?? 0) - (a.avance ?? 0),
    )
}
