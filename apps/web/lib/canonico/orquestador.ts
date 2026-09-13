import 'server-only'
import { cache } from 'react'
import { estaVigente } from '@/lib/conectores/cache'
import * as prisma from '@/lib/conectores/prisma'
import * as startrack from '@/lib/conectores/startrack'
import type { RespuestaConector } from '@/lib/conectores/tipos'
import type {
  EquipoUnificado,
  Geocerca,
  Linaje,
  SaludFuente,
  Ubicacion,
} from '@/lib/tipos/canonico'
import { distanciaEnMetros } from './identidad'
import { interpretarDesfases, reconciliar } from './reconciliacion'
import { paresDesdeCrudos } from '@/lib/kpi/pares'
import type { ParLatencia } from '@/lib/kpi/calculo'
import type {
  DatosCrudos,
  EquipoPrismaCrudo,
  FuenteCruda,
  GeocercaStartrackCruda,
  SolicitudPrismaCruda,
  TareaStartrackCruda,
  TipoTareaStartrackCrudo,
  VehiculoStartrackCrudo,
} from './tipos-crudos'

/**
 * Orquestador de lectura para la interfaz.
 *
 * **No reconcilia nada**: eso lo hace `reconciliar()`, el motor puro del carril
 * A. Acá solo se leen las fuentes, se arma `DatosCrudos` y se enriquece el
 * resultado con dos cosas que la interfaz necesita y el motor no produce:
 *
 * 1. La posición en vivo de `ajax/fsupdate.php`, que sube la ubicación al
 *    **nivel 1** de la cascada cuando hay coordenadas.
 * 2. La geocerca del proyecto con la **distancia** hasta esa posición.
 *
 * Mismo criterio que `scripts/reconciliar.ts`: el ensamblado vive en esta capa
 * porque `lib/canonico` no conoce HTTP (AGENTS.md §4.3).
 */
type Registro = Record<string, unknown>

const esRegistro = (v: unknown): v is Registro => typeof v === 'object' && v !== null

function comoFuente<T>(r: RespuestaConector<unknown[]>): FuenteCruda<T> {
  return {
    datos: r.datos as T[],
    plataforma: r.linaje.plataforma,
    endpoint: r.linaje.endpoint,
    leidoEn: r.linaje.leidoEn,
  }
}

function texto(registro: Registro, campo: string): string | null {
  const valor = registro[campo]
  if (typeof valor === 'string' && valor.trim() !== '') return valor.trim()
  if (typeof valor === 'number') return String(valor)
  return null
}

/** Código de activo al inicio de un texto: `CF-01 (CF-21010EC)` da `CF-01`. */
function codigoDe(valor: string | null): string | null {
  if (!valor) return null
  const token = valor.trim().split(/\s+/)[0] ?? ''
  const limpio = token.toUpperCase().replace(/[^A-Z0-9-]/g, '')
  return limpio === '' ? null : limpio
}

async function medir<T>(leer: () => Promise<T>) {
  const inicio = Date.now()
  const [res] = await Promise.allSettled([leer()])
  return { res, ms: Date.now() - inicio }
}

export type LecturaUnificada = {
  equipos: EquipoUnificado[]
  salud: SaludFuente[]
  urlStartrack: string | null
  /** Host de Prisma. La ficha de un equipo es `{urlPrisma}/maquinaria/equipos/{id}`. */
  urlPrisma: string | null
  leidoEn: string
  paresLatencia: ParLatencia[]
  solicitudesAprobadas: number
}

export const leerEquiposUnificados = cache(leerTodo)

async function leerTodo(): Promise<LecturaUnificada> {
  const leidoEn = new Date().toISOString()

  // Se consulta el caché ANTES de leer: si la respuesta sale de memoria, el
  // tiempo medido es del caché y no de la plataforma, y reportarlo como latencia
  // mentiría sobre lo rápido que responde el sandbox.
  const prismaDesdeCache = estaVigente('prisma:equipos')
  const startrackDesdeCache = estaVigente('startrack:ajax/vehicles.php?cmd=list')

  const [equipos_, solicitudes_, vehiculos_, geocercas_, tareas_, tipos_, flota_] =
    await Promise.all([
      medir(prisma.leerEquipos),
      medir(prisma.leerSolicitudes),
      medir(startrack.leerVehiculos),
      medir(startrack.leerGeocercas),
      medir(startrack.leerTareas),
      medir(startrack.leerTiposTarea),
      medir(startrack.leerEstadoFlota),
    ])

  const vacia = (
    plataforma: 'prisma' | 'startrack',
    endpoint: string,
  ): RespuestaConector<unknown[]> => ({
    datos: [],
    linaje: { plataforma, endpoint, leidoEn },
  })

  // Si una fuente falla se sigue con lo que sí se leyó: un error de integración
  // degrada a dato no disponible, nunca rompe la pantalla (principio 7.1).
  const ok = <T,>(r: PromiseSettledResult<T>, respaldo: T): T =>
    r.status === 'fulfilled' ? r.value : respaldo

  const prismaOk = equipos_.res.status === 'fulfilled'
  const startrackOk = vehiculos_.res.status === 'fulfilled'

  const datos: DatosCrudos = {
    equipos: comoFuente<EquipoPrismaCrudo>(
      ok(equipos_.res, vacia('prisma', '/api/maquinaria/equipos')),
    ),
    solicitudes: comoFuente<SolicitudPrismaCruda>(
      ok(solicitudes_.res, vacia('prisma', '/api/maquinaria/requests')),
    ),
    vehiculos: comoFuente<VehiculoStartrackCrudo>(
      ok(vehiculos_.res, vacia('startrack', 'ajax/vehicles.php?cmd=list')),
    ),
    geocercas: comoFuente<GeocercaStartrackCruda>(
      ok(geocercas_.res, vacia('startrack', 'ajax/namedPlaces.php?cmd=list')),
    ),
    tareas: comoFuente<TareaStartrackCruda>(ok(tareas_.res, vacia('startrack', 'api/job'))),
    tiposTarea: comoFuente<TipoTareaStartrackCrudo>(
      ok(tipos_.res, vacia('startrack', 'api/job/type')),
    ),
  }

  const reconciliados = reconciliar(datos)

  // Enriquecimiento de interfaz: telemetría en vivo y distancia a la geocerca.
  const flota = ok(flota_.res, vacia('startrack', 'ajax/fsupdate.php')).datos.filter(esRegistro)
  const porCodigo = new Map<string, Registro>()
  for (const v of flota) {
    const codigo = codigoDe(texto(v, 'de'))
    if (codigo) porCodigo.set(codigo, v)
  }

  const equipos = reconciliados.map((eq) => {
    const codigo = eq.codigoActivo.valor
    const vivo = codigo ? (porCodigo.get(codigo) ?? null) : null
    const crudo = datos.equipos.datos.find((e) => String(e.id) === eq.id) ?? null

    // Preferir vehicle_status_changed_date de fsupdate sobre last_contact_date
    // (ya usado en reconciliar). Si fsupdate no trae la fecha, se deja lo de reconciliar.
    const changed = vivo ? texto(vivo, 'vehicle_status_changed_date') : null
    const desfaseFlota =
      changed != null
        ? interpretarDesfases({
            solicitud: null,
            tarea: null,
            equipoUpdatedAt: crudo?.updated_at ?? null,
            startrackVehiculoFecha: changed,
          })
        : null
    const interpretacionDesfase = desfaseFlota ?? eq.interpretacionDesfase

    const enVivo = ubicacionEnVivo(vivo, leidoEn)
    if (!enVivo) {
      return interpretacionDesfase === eq.interpretacionDesfase
        ? eq
        : { ...eq, interpretacionDesfase }
    }

    // La ubicación que resolvió el motor pasa a ser la referencia del proyecto;
    // la posición en vivo la reemplaza como ubicación actual.
    return {
      ...eq,
      interpretacionDesfase,
      ubicacion: enVivo,
      geocercaProyecto: eq.ubicacion ? geocercaConDistancia(eq.ubicacion, enVivo) : null,
    }
  })

  const hostStartrack = process.env.STARTRACK_BASE_URL?.replace(/\/+$/, '') ?? null
  const hostPrisma = process.env.PRISMA_BASE_URL?.replace(/\/+$/, '') ?? null

  const { pares, aprobadas } = paresDesdeCrudos(datos.solicitudes.datos, datos.tareas.datos)

  return {
    equipos,
    paresLatencia: pares,
    solicitudesAprobadas: aprobadas,
    salud: [
      {
        plataforma: 'prisma',
        estado: prismaOk ? 'ok' : 'caida',
        ultimaLecturaBuena: prismaOk ? leidoEn : null,
        latenciaMs: prismaOk && !prismaDesdeCache ? equipos_.ms : null,
      },
      {
        plataforma: 'startrack',
        estado: startrackOk ? 'ok' : 'caida',
        ultimaLecturaBuena: startrackOk ? leidoEn : null,
        latenciaMs: startrackOk && !startrackDesdeCache ? vehiculos_.ms : null,
      },
    ],
    urlStartrack: hostStartrack ? `${hostStartrack}/members-new.php` : null,
    urlPrisma: hostPrisma,
    leidoEn,
  }
}

/**
 * Nivel 1 de la cascada: posición reportada por telemetría.
 *
 * `01` E.10 daba este nivel por no alcanzable —"la posición GPS instantánea no
 * se obtuvo por REST"— y `ajax/fsupdate.php` sí la expone: la página de rastreo
 * la consulta cada 60 s.
 */
function ubicacionEnVivo(vehiculo: Registro | null, leidoEn: string): Ubicacion | null {
  if (!vehiculo) return null
  const lat = Number(vehiculo.y)
  const lon = Number(vehiculo.x)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

  const endpoint = 'ajax/fsupdate.php'
  const l = (campo: string): Linaje => ({
    plataforma: 'startrack',
    endpoint,
    campo,
    valorCrudo: vehiculo[campo],
    leidoEn,
  })

  // `rpn` es el sitio nombrado más cercano; `p` la dirección geocodificada.
  const descripcion = texto(vehiculo, 'rpn') ?? texto(vehiculo, 'p')

  return {
    nivel: 1,
    descripcion: { valor: descripcion, linaje: l(texto(vehiculo, 'rpn') ? 'rpn' : 'p') },
    lat: { valor: lat, linaje: l('y') },
    lon: { valor: lon, linaje: l('x') },
  }
}

/**
 * La geocerca que resolvió el motor, más la distancia hasta la posición en vivo.
 *
 * `radioMetros` va en `null` porque `ajax/namedPlaces.php` publica el centro y
 * el nombre, no el radio: se puede decir a qué distancia está el equipo, no si
 * está dentro o fuera.
 */
function geocercaConDistancia(geocerca: Ubicacion, posicion: Ubicacion): Geocerca | null {
  const latG = geocerca.lat.valor
  const lonG = geocerca.lon.valor
  if (latG === null || lonG === null) return null

  const latP = posicion.lat.valor
  const lonP = posicion.lon.valor

  return {
    nombre: geocerca.descripcion,
    lat: geocerca.lat,
    lon: geocerca.lon,
    distanciaMetros:
      latP !== null && lonP !== null ? distanciaEnMetros(latP, lonP, latG, lonG) : null,
    radioMetros: null,
  }
}
