// El orquestador del optimizador (S-A7 Paso 4i). server-only. Orden fijo:
// insumos → adaptar → cliente → verificar → clima → ensamblar → KPIs →
// RespuestaOptimizar. Ninguna lógica de reconciliación/optimización vive acá
// — solo estitchea los módulos puros con las dos llamadas HTTP que le tocan
// (el solver y, para las clases marcadas como sensibles, Open-Meteo).

import 'server-only'
import { ErrorClima, leerPronosticoLluvia } from '@/lib/conectores/clima'
import { geocercaPorCodigoProyecto } from '@/lib/canonico/identidad'
import { calcularKpisOptimizador } from '@/lib/kpi/optimizador'
import { adaptar, type ResultadoAdaptador } from './adaptador'
import { ensamblar } from './ensamblar'
import { ErrorSolver, optimizarEnSolver } from './cliente'
import { leerInsumosOptimizador } from './insumos'
import type { AlertaClima, PeticionOptimizar, RespuestaOptimizar, SalidaSolver } from './tipos'
import { verificar } from './verificar'

export class ErrorVerificacion extends Error {
  constructor(public readonly violaciones: string[]) {
    super(`verificación fallida: ${violaciones.join('; ')}`)
    this.name = 'ErrorVerificacion'
  }
}

/** "Hoy" en America/El_Salvador, AAAA-MM-DD (Paso 0/decisiones: granularidad
 * día, zona horaria fija de la operación). */
export function hoyElSalvador(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' }).format(new Date())
}

function fechasEnVentana(desde: string, hasta: string): string[] {
  const [ay, am, ad] = desde.split('-').map(Number)
  const [by, bm, bd] = hasta.split('-').map(Number)
  const inicio = Date.UTC(ay, am - 1, ad)
  const fin = Date.UTC(by, bm - 1, bd)
  const fechas: string[] = []
  for (let t = inicio; t <= fin; t += 86_400_000) {
    fechas.push(new Date(t).toISOString().slice(0, 10))
  }
  return fechas
}

/** Paso 4h — resuelve la alerta de clima de una solicitud asignada. Solo se
 * llama para las clases marcadas como sensibles en la petición; nunca cambia
 * la asignación, solo informa. */
async function resolverClima(
  claseAsignada: string | null,
  peticion: PeticionOptimizar,
  destinoLat: number | null,
  destinoLon: number | null,
  inicioEfectivo: string,
  fin: string,
  avisos: string[],
): Promise<AlertaClima> {
  if (!claseAsignada || !(peticion.clasesSensiblesLluvia as string[]).includes(claseAsignada)) {
    return { estado: 'no_aplica', motivo: 'clase no marcada como sensible' }
  }
  if (destinoLat == null || destinoLon == null) {
    return { estado: 'sin_pronostico', motivo: 'la solicitud no resuelve geocerca de destino' }
  }

  let pronostico
  try {
    pronostico = await leerPronosticoLluvia(destinoLat, destinoLon)
  } catch (error) {
    const mensaje = error instanceof ErrorClima ? error.message : String(error)
    avisos.push(`clima no disponible: ${mensaje}`)
    return { estado: 'sin_pronostico', motivo: 'Open-Meteo no respondió' }
  }

  const probabilidadPorFecha = new Map(pronostico.dias.map((d) => [d.fecha, d.probabilidadMaxPct]))
  const fechasPeriodo = fechasEnVentana(inicioEfectivo, fin)

  let diasConLluvia = 0
  let diasEvaluados = 0
  for (const fecha of fechasPeriodo) {
    const probabilidad = probabilidadPorFecha.get(fecha)
    if (probabilidad == null) continue
    diasEvaluados++
    if (probabilidad >= 50) diasConLluvia++
  }

  if (diasEvaluados === 0) {
    return { estado: 'sin_pronostico', motivo: 'el período cae fuera de los 16 días de pronóstico' }
  }

  return {
    estado: 'evaluado',
    diasConLluvia,
    diasEvaluados,
    diasSinPronostico: fechasPeriodo.length - diasEvaluados,
    umbralProbabilidadPct: 50,
    fuente: {
      proveedor: 'open-meteo',
      endpoint: pronostico.endpoint,
      leidoEn: pronostico.leidoEn,
      decimalesCoordenada: 1,
    },
  }
}

async function resolverClimaPorAsignacion(
  resultado: ResultadoAdaptador,
  salida: SalidaSolver,
  peticion: PeticionOptimizar,
  geocercas: Parameters<typeof geocercaPorCodigoProyecto>[1],
): Promise<{ climaPorSolicitudId: Map<string, AlertaClima>; avisos: string[] }> {
  const avisos: string[] = []
  const climaPorSolicitudId = new Map<string, AlertaClima>()

  await Promise.all(
    salida.asignaciones.map(async (a) => {
      const maquina = resultado.filasMaquina.find((m) => m.id === a.maquinaId)
      const solicitud = resultado.solicitudesEvaluables.get(a.solicitudId)
      if (!maquina || !solicitud) return

      const destino = geocercaPorCodigoProyecto(solicitud.proyecto.valor, geocercas)
      const alerta = await resolverClima(
        maquina.clase.valor,
        peticion,
        destino?.y ?? null,
        destino?.x ?? null,
        solicitud.inicioEfectivo,
        solicitud.fin.valor!,
        avisos,
      )
      climaPorSolicitudId.set(a.solicitudId, alerta)
    }),
  )

  return { climaPorSolicitudId, avisos }
}

export async function planear(peticion: PeticionOptimizar): Promise<RespuestaOptimizar> {
  const hoy = hoyElSalvador()
  const generadoEn = new Date().toISOString()

  const insumos = await leerInsumosOptimizador()
  const resultado = adaptar(insumos, peticion, hoy)

  let salida: SalidaSolver
  try {
    salida = await optimizarEnSolver(resultado.entradaSolver)
  } catch (error) {
    if (error instanceof ErrorSolver) throw error
    throw new ErrorSolver('/optimizar', error instanceof Error ? error.message : String(error))
  }

  const violaciones = verificar(resultado.entradaSolver, salida)
  if (violaciones.length > 0) {
    throw new ErrorVerificacion(violaciones)
  }

  const { climaPorSolicitudId, avisos: avisosClima } = await resolverClimaPorAsignacion(
    resultado,
    salida,
    peticion,
    insumos.datos.geocercas.datos,
  )

  const respuestaSinKpis = ensamblar({
    peticion,
    generadoEn,
    hoy,
    resultado,
    salida,
    climaPorSolicitudId,
    avisosAdicionales: avisosClima,
  })

  return {
    ...respuestaSinKpis,
    kpis: calcularKpisOptimizador(respuestaSinKpis),
    kpisPendientesMotivo: null,
  }
}
