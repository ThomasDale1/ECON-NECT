// Lectura viva de la flota (S-A3). server-only: orquesta los conectores —
// la única puerta al mundo exterior (AGENTS.md §4.3) — y entrega el resultado
// ya reconciliado a las rutas de API, que solo lo serializan.
//
// Carril A. Carpeta nueva respecto de AGENTS.md §4.2: no cabe en
// `lib/conectores/` (que es un lector por plataforma, no un orquestador) ni en
// `lib/canonico/` (que por regla de capa no conoce HTTP). Mismo papel que
// `lib/optimizador/insumos.ts` cumple para el optimizador.
//
// Lo que esta capa agrega sobre `reconciliar()`:
//
// 1. **Degradación por fuente, no por corrida.** Si Startrack no responde, la
//    respuesta no queda en blanco: declara la salud de cada plataforma y baja
//    el veredicto a SIN_EVIDENCIA con su razón (S-A3, "manejo de errores").
// 2. **No convierte una caída en una incoherencia.** Si Startrack está caída,
//    sus listas llegan vacías — y una lista vacía es indistinguible de "no hay
//    tarea de traslado". Dejar correr R1–R5 ahí inventaría incoherencias que no
//    existen, que es justo lo que AGENTS.md §1.1 prohíbe. Por eso las reglas
//    que dependen de la plataforma caída se descartan y el veredicto se vuelve
//    a agregar sin ellas.

import 'server-only'
import { comoFuente } from '@/lib/canonico/fuentes'
import { agregarVeredicto, reconciliar } from '@/lib/canonico/reconciliacion'
import type {
  DatosCrudos,
  EquipoPrismaCrudo,
  EstadoVehiculoConProcedencia,
  EstadoVehiculoStartrackCrudo,
  FuenteCruda,
  GeocercaStartrackCruda,
  SolicitudPrismaCruda,
  TareaStartrackCruda,
  TipoTareaStartrackCrudo,
  VehiculoStartrackCrudo,
} from '@/lib/canonico/tipos-crudos'
import { ErrorConector, SesionExpirada } from '@/lib/conectores/errores'
import * as prisma from '@/lib/conectores/prisma'
import * as startrack from '@/lib/conectores/startrack'
import type { RespuestaConector } from '@/lib/conectores/tipos'
import { REGLAS } from '@/lib/reglas'
import type { EquipoUnificado, Plataforma, SaludFuente } from '@/lib/tipos/canonico'

/** Arriba de esta latencia una fuente se reporta `lenta` en vez de `ok`.
 * Heurística declarada, no medida contra un SLA: el sandbox lo comparten 13
 * equipos y no hay histórico. Se documenta acá para que no quede como número
 * mágico (01 Parte D.4). */
export const UMBRAL_LENTA_MS = 3_000

export type FallaFuente = {
  plataforma: Plataforma
  endpoint: string
  mensaje: string
}

export type Degradacion = {
  degradado: boolean
  plataformasCaidas: Plataforma[]
  razones: string[]
}

export type LecturaFlota = {
  equipos: EquipoUnificado[]
  /** Los datos crudos de esta misma corrida, para que quien derive
   * incoherencias o KPIs no tenga que volver a leer las plataformas. */
  datos: DatosCrudos
  salud: SaludFuente[]
  degradacion: Degradacion
  fallas: FallaFuente[]
  leidoEn: string
}

/** Última lectura buena por plataforma. Volátil en memoria de proceso, igual
 * que la caché de conectores: no persiste ningún dato de ECON (principio C.2). */
const ultimaLecturaBuena = new Map<Plataforma, string>()

type Medicion<T> = {
  ok: boolean
  valor: T | null
  ms: number
  falla: FallaFuente | null
}

/** Corre un lector y lo mide sin dejar que su error tumbe la corrida entera.
 * `etiquetaEndpoint` solo se usa si el error no es uno de los nuestros (los
 * nuestros ya traen su endpoint). */
async function medir<T>(
  plataforma: Plataforma,
  etiquetaEndpoint: string,
  leer: () => Promise<T>,
): Promise<Medicion<T>> {
  const inicio = Date.now()
  try {
    const valor = await leer()
    const ms = Date.now() - inicio
    ultimaLecturaBuena.set(plataforma, new Date().toISOString())
    return { ok: true, valor, ms, falla: null }
  } catch (error) {
    const ms = Date.now() - inicio
    const endpoint =
      error instanceof ErrorConector || error instanceof SesionExpirada ? error.endpoint : etiquetaEndpoint
    const mensaje = error instanceof Error ? error.message : String(error)
    return { ok: false, valor: null, ms, falla: { plataforma, endpoint, mensaje } }
  }
}

/** Fuente vacía con procedencia declarada, para cuando una lectura falló. El
 * `endpoint` conserva cuál se intentó: quien lea la respuesta puede señalar de
 * dónde venía el dato que falta (principio C.4). */
function fuenteVacia<T>(plataforma: Plataforma, endpoint: string): FuenteCruda<T> {
  return { datos: [], plataforma, endpoint, leidoEn: new Date().toISOString() }
}

function comoFuenteODegradar<T>(
  medicion: Medicion<RespuestaConector<unknown[]>>,
  plataforma: Plataforma,
  etiquetaEndpoint: string,
): FuenteCruda<T> {
  if (medicion.ok && medicion.valor) return comoFuente<T>(medicion.valor)
  return fuenteVacia<T>(plataforma, etiquetaEndpoint)
}

/** Qué plataformas necesita cada regla para poder concluir, derivado de su
 * `camposEntrada` declarado (lib/reglas/tipos.ts). `identidadResuelta` depende
 * de las dos: es el cruce mismo. */
const PLATAFORMAS_POR_PREFIJO: { prefijo: string; plataformas: Plataforma[] }[] = [
  { prefijo: 'tarea.', plataformas: ['startrack'] },
  { prefijo: 'vehiculo.', plataformas: ['startrack'] },
  { prefijo: 'geocerca.', plataformas: ['startrack'] },
  { prefijo: 'identidadResuelta', plataformas: ['prisma', 'startrack'] },
]

const SOLO_PRISMA: Plataforma[] = ['prisma']

export function plataformasQueNecesitaLaRegla(camposEntrada: string[]): Plataforma[] {
  const plataformas = new Set<Plataforma>()
  for (const campo of camposEntrada) {
    const coincidencia = PLATAFORMAS_POR_PREFIJO.find((p) => campo.startsWith(p.prefijo))
    for (const plataforma of coincidencia?.plataformas ?? SOLO_PRISMA) {
      plataformas.add(plataforma)
    }
  }
  return [...plataformas]
}

const PLATAFORMAS_POR_REGLA: Record<string, Plataforma[]> = Object.fromEntries(
  REGLAS.map((regla) => [regla.id, plataformasQueNecesitaLaRegla(regla.camposEntrada)]),
)

/** Descarta los resultados de reglas que dependen de una plataforma caída y
 * vuelve a agregar el veredicto sin ellas. Una lista vacía por caída no es
 * evidencia de ausencia. */
export function degradarPorFuentesCaidas(
  equipos: EquipoUnificado[],
  plataformasCaidas: Plataforma[],
): EquipoUnificado[] {
  if (plataformasCaidas.length === 0) return equipos

  const caidas = new Set(plataformasCaidas)
  const identidadConfiable = !caidas.has('prisma') && !caidas.has('startrack')

  return equipos.map((equipo) => {
    const reglas = equipo.reglas.filter((resultado) => {
      const necesita = PLATAFORMAS_POR_REGLA[resultado.regla] ?? ['prisma', 'startrack']
      return !necesita.some((plataforma) => caidas.has(plataforma))
    })

    const identidadResuelta = equipo.identidadResuelta && identidadConfiable
    const { veredicto, confianza } = agregarVeredicto(identidadResuelta, reglas)
    return { ...equipo, reglas, veredicto, confianza }
  })
}

function construirSalud(
  fallas: FallaFuente[],
  latenciaPorPlataforma: Map<Plataforma, number>,
): SaludFuente[] {
  const plataformas: Plataforma[] = ['prisma', 'startrack']
  return plataformas.map((plataforma) => {
    const caida = fallas.some((falla) => falla.plataforma === plataforma)
    const latenciaMs = latenciaPorPlataforma.get(plataforma) ?? null
    const estado: SaludFuente['estado'] = caida
      ? 'caida'
      : latenciaMs !== null && latenciaMs > UMBRAL_LENTA_MS
        ? 'lenta'
        : 'ok'
    return {
      plataforma,
      estado,
      ultimaLecturaBuena: ultimaLecturaBuena.get(plataforma) ?? null,
      latenciaMs,
    }
  })
}

export type OpcionesLectura = {
  /** Nivel 1 de la cascada de ubicación (01 E.10): una llamada por vehículo.
   * `/api/salud` no lo necesita y se ahorra esas peticiones. */
  incluirPosicionEnVivo?: boolean
}

/** Lee ambas plataformas en vivo, reconcilia y devuelve el resultado con la
 * salud de cada fuente. Nunca lanza por una fuente caída: degrada y lo declara. */
export async function leerFlota(opciones: OpcionesLectura = {}): Promise<LecturaFlota> {
  const { incluirPosicionEnVivo = true } = opciones

  const [equipos, solicitudes, vehiculos, geocercas, tareas, tiposTarea] = await Promise.all([
    medir('prisma', '/api/maquinaria/equipos', prisma.leerEquipos),
    medir('prisma', '/api/maquinaria/requests', prisma.leerSolicitudes),
    medir('startrack', 'ajax/vehicles.php?cmd=list', startrack.leerVehiculos),
    medir('startrack', 'ajax/namedPlaces.php?cmd=list', startrack.leerGeocercas),
    medir('startrack', 'api/job', startrack.leerTareas),
    medir('startrack', 'api/job/type', startrack.leerTiposTarea),
  ])

  const mediciones = [equipos, solicitudes, vehiculos, geocercas, tareas, tiposTarea]
  const fallas = mediciones.map((m) => m.falla).filter((f): f is FallaFuente => f !== null)

  const latenciaPorPlataforma = new Map<Plataforma, number>()
  latenciaPorPlataforma.set('prisma', Math.max(equipos.ms, solicitudes.ms))
  latenciaPorPlataforma.set(
    'startrack',
    Math.max(vehiculos.ms, geocercas.ms, tareas.ms, tiposTarea.ms),
  )

  // Nivel 1 de ubicación: se degrada por vehículo, no por corrida — si uno
  // falla, ese equipo cae a nivel 2/3 en vez de tumbar la petición.
  const listaVehiculos = (vehiculos.valor?.datos ?? []) as VehiculoStartrackCrudo[]
  const estadosVehiculoPorVehiculoId: Record<string, EstadoVehiculoConProcedencia> = {}
  if (incluirPosicionEnVivo) {
    await Promise.all(
      listaVehiculos.map(async (vehiculo) => {
        const id = String(vehiculo.id)
        try {
          const respuesta = await startrack.leerEstadoVehiculo(id)
          estadosVehiculoPorVehiculoId[id] = {
            datos: respuesta.datos as EstadoVehiculoStartrackCrudo,
            procedencia: {
              plataforma: respuesta.linaje.plataforma,
              endpoint: respuesta.linaje.endpoint,
              leidoEn: respuesta.linaje.leidoEn,
            },
          }
        } catch {
          // Sin posición en vivo para este vehículo: cae a nivel 2/3.
        }
      }),
    )
  }

  const datos: DatosCrudos = {
    equipos: comoFuenteODegradar<EquipoPrismaCrudo>(equipos, 'prisma', '/api/maquinaria/equipos'),
    solicitudes: comoFuenteODegradar<SolicitudPrismaCruda>(
      solicitudes,
      'prisma',
      '/api/maquinaria/requests',
    ),
    vehiculos: comoFuenteODegradar<VehiculoStartrackCrudo>(
      vehiculos,
      'startrack',
      'ajax/vehicles.php?cmd=list',
    ),
    geocercas: comoFuenteODegradar<GeocercaStartrackCruda>(
      geocercas,
      'startrack',
      'ajax/namedPlaces.php?cmd=list',
    ),
    tareas: comoFuenteODegradar<TareaStartrackCruda>(tareas, 'startrack', 'api/job'),
    tiposTarea: comoFuenteODegradar<TipoTareaStartrackCrudo>(tiposTarea, 'startrack', 'api/job/type'),
    estadosVehiculoPorVehiculoId,
  }

  const plataformasCaidas = [...new Set(fallas.map((falla) => falla.plataforma))]
  const equiposUnificados = degradarPorFuentesCaidas(reconciliar(datos), plataformasCaidas)

  return {
    equipos: equiposUnificados,
    datos,
    salud: construirSalud(fallas, latenciaPorPlataforma),
    degradacion: {
      degradado: fallas.length > 0,
      plataformasCaidas,
      razones: fallas.map(
        (falla) =>
          `${falla.plataforma} no respondió en ${falla.endpoint}: ${falla.mensaje}. Las reglas que dependen de esa plataforma se descartaron y el veredicto queda SIN_EVIDENCIA.`,
      ),
    },
    fallas,
    leidoEn: new Date().toISOString(),
  }
}
