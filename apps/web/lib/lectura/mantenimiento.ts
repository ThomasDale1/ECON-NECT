// Lectura viva del mantenimiento preventivo (S-A11 Paso 7). server-only:
// mismo papel que `flota.ts` — orquesta conectores y entrega el resultado ya
// calculado a las rutas, que solo lo serializan.
//
// Lo que agrega sobre `calcularPronostico` (puro):
// 1. Une cada equipo con su vehículo (identidad ya resuelta por `leerFlota`),
//    su horómetro y su serie por `vehiculoId`, sus reportes por `maquinariaId`
//    y su ventana de mantenimiento por `id`.
// 2. Degrada por fuente, no por corrida: si Startrack está caída, todos quedan
//    sin horómetro y la respuesta lo dice por `salud`/`degradacion`.
// 3. Un equipo sin contraparte en Startrack sale con `faltantes` — no se
//    inventa un vehículo (AGENTS.md §1.1).

import 'server-only'
import { resolverIdentidades } from '@/lib/canonico/identidad'
import { ErrorConector, SesionExpirada } from '@/lib/conectores/errores'
import * as prisma from '@/lib/conectores/prisma'
import * as startrack from '@/lib/conectores/startrack'
import { senalesMantenimiento } from '@/lib/inteligencia/contexto'
import { calcularPronostico, ordenarAlertas, type MarcaModeloConLinaje } from '@/lib/mantenimiento/calcular'
import { hoyElSalvador, restarDias } from '@/lib/mantenimiento/fechas'
import type {
  FilaSerieDiaria,
  HorometroVivo,
  MantenimientoEquipoPrisma,
  ParametrosMantenimiento,
  PronosticoMantenimiento,
  ReporteFallaPrisma,
  ResultadoMantenimiento,
} from '@/lib/mantenimiento/tipos'
import type { Linaje, Plataforma } from '@/lib/tipos/canonico'
import { leerFlota, type FallaFuente, type LecturaFlota } from './flota'

/** Ventana de la serie diaria: los 30 días que terminan hoy. Cubre el ritmo
 * de 7 días y cualquier ancla reciente; el GPS arrancó el 7 de septiembre de
 * 2026, así que hoy la serie entera cabe. */
export const DIAS_SERIE = 30

type Medido<T> = { valor: T | null; falla: FallaFuente | null }

async function medir<T>(plataforma: Plataforma, etiqueta: string, leer: () => Promise<T>): Promise<Medido<T>> {
  try {
    return { valor: await leer(), falla: null }
  } catch (error) {
    const endpoint = error instanceof ErrorConector || error instanceof SesionExpirada ? error.endpoint : etiqueta
    return { valor: null, falla: { plataforma, endpoint, mensaje: error instanceof Error ? error.message : String(error) } }
  }
}

function linajeDe(plataforma: Plataforma, endpoint: string, leidoEn: string, campo: string, valorCrudo: unknown): Linaje {
  return { plataforma, endpoint, campo, valorCrudo, leidoEn }
}

export type LecturaMantenimiento = ResultadoMantenimiento & {
  /** Advertencias de conector que no son de un equipo (p. ej. el reporte de
   * falla no expone el id del equipo). */
  advertencias: string[]
}

export async function leerMantenimiento(
  parametros: ParametrosMantenimiento,
  ahora: Date = new Date(),
): Promise<LecturaMantenimiento> {
  const hoy = hoyElSalvador(ahora)
  const flota = await leerFlota({ incluirPosicionEnVivo: false })
  return ensamblar(flota, parametros, hoy)
}

export async function leerPronostico(
  equipoId: string,
  parametros: ParametrosMantenimiento,
  ahora: Date = new Date(),
): Promise<PronosticoMantenimiento | null> {
  const resultado = await leerMantenimiento(parametros, ahora)
  return resultado.pronosticos.find((p) => p.equipoId === equipoId) ?? null
}

async function ensamblar(flota: LecturaFlota, parametros: ParametrosMantenimiento, hoy: string): Promise<LecturaMantenimiento> {
  const { datos } = flota
  const startrackCaida = flota.degradacion.plataformasCaidas.includes('startrack')
  const prismaCaida = flota.degradacion.plataformasCaidas.includes('prisma')

  const vinculos = resolverIdentidades(datos.equipos.datos, datos.vehiculos.datos, datos.tareas.datos)

  const [horometros, serie, reportes] = await Promise.all([
    startrackCaida
      ? Promise.resolve<Medido<Awaited<ReturnType<typeof startrack.leerHorometrosFlota>>>>({ valor: null, falla: null })
      : medir('startrack', `ajax/report.php?id=${startrack.ID_REPORTE_FLOTA}`, startrack.leerHorometrosFlota),
    startrackCaida
      ? Promise.resolve<Medido<Awaited<ReturnType<typeof startrack.leerResumenDiario>>>>({ valor: null, falla: null })
      : medir('startrack', `ajax/report.php?id=${startrack.ID_REPORTE_RESUMEN_DIARIO}`, () =>
          startrack.leerResumenDiario(restarDias(hoy, DIAS_SERIE - 1), hoy),
        ),
    prismaCaida
      ? Promise.resolve<Medido<Awaited<ReturnType<typeof prisma.leerReportesFalla>>>>({ valor: null, falla: null })
      : medir('prisma', '/api/maquinaria/fallas', prisma.leerReportesFalla),
  ])

  // Ventana de mantenimiento por equipo con contraparte (cacheado por S-A7).
  const mantenimientoPorEquipo = new Map<string, MantenimientoEquipoPrisma>()
  if (!prismaCaida) {
    await Promise.all(
      vinculos
        .filter((v) => v.vehiculo !== null)
        .map(async (v) => {
          const id = String(v.equipo.id)
          try {
            const r = await prisma.leerMantenimientoEquipo(id)
            mantenimientoPorEquipo.set(id, r.datos)
          } catch {
            // Sin detalle para este equipo: se calcula sin ventana, y el
            // ancla cae al reporte FINALIZADO o al inicio de la serie.
          }
        }),
    )
  }

  const fallas: FallaFuente[] = [...flota.fallas]
  for (const m of [horometros, serie, reportes]) if (m.falla) fallas.push(m.falla)

  const horometroPorVehiculo = new Map<string, HorometroVivo>()
  for (const h of horometros.valor?.datos ?? []) horometroPorVehiculo.set(h.vehiculoId, h)

  const seriePorVehiculo = new Map<string, FilaSerieDiaria[]>()
  for (const fila of serie.valor?.datos.filas ?? []) {
    const lista = seriePorVehiculo.get(fila.vehiculoId) ?? []
    lista.push(fila)
    seriePorVehiculo.set(fila.vehiculoId, lista)
  }
  const linajeSerie = serie.valor?.datos.linaje ?? null

  const reportesPorEquipo = new Map<string, ReporteFallaPrisma[]>()
  for (const r of reportes.valor?.datos.reportes ?? []) {
    if (r.maquinariaId === null) continue
    const lista = reportesPorEquipo.get(r.maquinariaId) ?? []
    lista.push(r)
    reportesPorEquipo.set(r.maquinariaId, lista)
  }

  const leidoEn = new Date().toISOString()
  const pronosticos: PronosticoMantenimiento[] = []

  for (const equipo of flota.equipos) {
    const vinculo = vinculos.find((v) => String(v.equipo.id) === equipo.id)
    if (!vinculo) continue
    const crudo = vinculo.equipo
    const vehiculo = vinculo.vehiculo
    const vehiculoId = vehiculo ? String(vehiculo.id) : null

    const marcaModelo: MarcaModeloConLinaje[] = []
    if (vehiculo) {
      marcaModelo.push({
        marca: vehiculo.make,
        modelo: vehiculo.model,
        linaje: linajeDe('startrack', datos.vehiculos.endpoint, datos.vehiculos.leidoEn, 'make · model', {
          make: vehiculo.make,
          model: vehiculo.model,
        }),
      })
    }
    marcaModelo.push({
      marca: crudo.marca,
      modelo: crudo.modelo,
      linaje: linajeDe('prisma', datos.equipos.endpoint, datos.equipos.leidoEn, 'marca · modelo', {
        marca: crudo.marca,
        modelo: crudo.modelo,
      }),
    })

    const pronostico = calcularPronostico({
      equipo,
      vehiculoId,
      clase: crudo.clase_equipo,
      paroActivo: crudo.active_failure_is_paro,
      marcaModelo,
      horometro: vehiculoId ? (horometroPorVehiculo.get(vehiculoId) ?? null) : null,
      serie: vehiculoId ? (seriePorVehiculo.get(vehiculoId) ?? []) : [],
      linajeSerie,
      reportes: reportesPorEquipo.get(equipo.id) ?? [],
      mantenimiento: mantenimientoPorEquipo.get(equipo.id) ?? null,
      parametros,
      hoy,
      leidoEn,
    })

    if (startrackCaida) {
      pronostico.faltantes.push('Startrack no respondió en esta lectura: sin horómetro ni serie diaria')
    }
    pronosticos.push(pronostico)
  }

  const alertas = ordenarAlertas(pronosticos)
  const plataformasCaidas = [...new Set(fallas.map((f) => f.plataforma))]

  return {
    pronosticos,
    alertas,
    resumen: {
      equipos: pronosticos.length,
      conHorometro: pronosticos.filter((p) => p.horasMotorTotales !== null).length,
      conIntervalo: pronosticos.filter((p) => p.intervalo.horas !== null).length,
      enAlerta: alertas.length,
      enTaller: pronosticos.filter((p) => p.estadoTaller === 'en_taller').length,
    },
    salud: flota.salud,
    degradacion: {
      degradado: fallas.length > 0,
      plataformasCaidas,
      razones: fallas.map((f) => `${f.plataforma} no respondió en ${f.endpoint}: ${f.mensaje}.`),
    },
    advertencias: reportes.valor?.datos.advertencias ?? [],
    leidoEn,
  }
}

// ── Señales para O.D.I.N. (S-A11 Paso 8) ────────────────────────────────────

export type SenalesOdin = {
  pronostico: PronosticoMantenimiento
  senales: ReturnType<typeof senalesMantenimiento>
}

/** El pronóstico del equipo y sus `maintenance_signals`, listos para
 * `crearContextoOdin`. `recent_failures` cuenta reportes del equipo de los
 * últimos 30 días (0 real si Prisma respondió con lista vacía; `null` si no
 * respondió). */
export async function leerSenalesOdin(
  equipoId: string,
  parametros: ParametrosMantenimiento,
  ahora: Date = new Date(),
): Promise<SenalesOdin | null> {
  const hoy = hoyElSalvador(ahora)
  const [resultado, reportes] = await Promise.all([
    leerMantenimiento(parametros, ahora),
    medir('prisma', '/api/maquinaria/fallas', prisma.leerReportesFalla),
  ])
  const pronostico = resultado.pronosticos.find((p) => p.equipoId === equipoId)
  if (!pronostico) return null

  const delEquipo =
    reportes.valor === null ? null : reportes.valor.datos.reportes.filter((r) => r.maquinariaId === equipoId)

  return {
    pronostico,
    senales: senalesMantenimiento({
      pronostico,
      reportes: delEquipo,
      parametros,
      hoy,
      horasUltimos7d: pronostico.ritmoHorasPorDia === null ? null : pronostico.ritmoHorasPorDia * 7,
    }),
  }
}
