import 'server-only'
import { cache } from 'react'
import * as prisma from '@/lib/conectores/prisma'
import * as startrack from '@/lib/conectores/startrack'
import type {
  Dato,
  EquipoUnificado,
  EstadoOrigen,
  Linaje,
  ObjetoDescrito,
  Plataforma,
  SaludFuente,
  Geocerca,
  Ubicacion,
} from '@/lib/tipos/canonico'
import { estaVigente } from '@/lib/conectores/cache'
import { evaluar } from '@/lib/reglas/coherencia'
import {
  distanciaEnMetros,
  extraerCodigo,
  extraerCodigoProyecto,
  indexarPorCodigo,
} from './identidad'

/**
 * Normalización antes de interpretación.
 *
 * Esta capa no conoce HTTP: recibe lo que los conectores ya leyeron y devuelve
 * el modelo unificado. Nunca sobreescribe un estado de origen — conserva el
 * valor crudo y le agrega la etiqueta de **qué objeto describe**, que es lo que
 * permite que dos estados distintos sean ambos correctos.
 */

type Registro = Record<string, unknown>

const esRegistro = (v: unknown): v is Registro => typeof v === 'object' && v !== null

function texto(registro: Registro, campo: string): string | null {
  const valor = registro[campo]
  if (typeof valor === 'string' && valor.trim() !== '') return valor.trim()
  if (typeof valor === 'number') return String(valor)
  return null
}

function linaje(
  plataforma: Plataforma,
  endpoint: string,
  campo: string,
  valorCrudo: unknown,
  leidoEn: string,
): Linaje {
  return { plataforma, endpoint, campo, valorCrudo, leidoEn }
}

function dato<T>(valor: T | null, l: Linaje): Dato<T> {
  return { valor, linaje: l }
}

function estado(
  valor: string | null,
  objeto: ObjetoDescrito,
  l: Linaje,
): EstadoOrigen | null {
  return valor === null ? null : { valor, objeto, linaje: l }
}

/**
 * La ubicación se resuelve en cascada y siempre se declara qué nivel se usó
 * (01 E.10). El nivel 1 —telemetría en vivo— no se obtiene por REST, así que
 * hoy solo se alcanzan el 2 y el 3.
 */
function resolverUbicacion(
  proyecto: string | null,
  geocercas: Registro[],
  l: Linaje,
): Ubicacion | null {
  if (proyecto === null) return null

  // Nivel 3: geocerca del proyecto asignado en Prisma. El cruce es por nombre y
  // por eso se marca como tal: `lib/mapeo` documenta que unir por nombre es
  // frágil, y aquí solo decide una etiqueta, nunca la identidad del activo.
  const normalizar = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const objetivo = normalizar(proyecto)
  const geocerca = geocercas.find((g) => {
    const nombre = texto(g, 'name')
    return nombre !== null && normalizar(nombre).includes(objetivo.slice(0, 12))
  })

  if (!geocerca) {
    return {
      nivel: 3,
      descripcion: dato(proyecto, l),
      lat: dato<number>(null, l),
      lon: dato<number>(null, l),
    }
  }

  const lat = Number(geocerca.y)
  const lon = Number(geocerca.x)
  const lg = linaje('startrack', 'ajax/namedPlaces.php?cmd=list', 'y/x', { y: geocerca.y, x: geocerca.x }, l.leidoEn)

  return {
    nivel: 3,
    descripcion: dato(texto(geocerca, 'name') ?? proyecto, lg),
    lat: dato(Number.isFinite(lat) ? lat : null, lg),
    lon: dato(Number.isFinite(lon) ? lon : null, lg),
  }
}

/**
 * Nivel 1 de la cascada: posición reportada por telemetría.
 *
 * Es el nivel que 01 E.10 daba por no alcanzable ("la posición GPS instantánea
 * no se obtuvo por REST"). `ajax/fsupdate.php` sí la expone, así que cuando hay
 * coordenadas se usa este nivel y se dice que es telemetría.
 */
function ubicacionDeTelemetria(
  vehiculo: Registro | null,
  endpoint: string,
  leidoEn: string,
): Ubicacion | null {
  if (!vehiculo) return null
  const lat = Number(vehiculo.y)
  const lon = Number(vehiculo.x)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

  // `rpn` es el sitio nombrado más cercano; `p` la dirección geocodificada.
  const descripcion = texto(vehiculo, 'rpn') ?? texto(vehiculo, 'p')
  const l = (campo: string) => linaje('startrack', endpoint, campo, vehiculo[campo], leidoEn)

  return {
    nivel: 1,
    descripcion: dato(descripcion, l(texto(vehiculo, 'rpn') ? 'rpn' : 'p')),
    lat: dato(lat, l('y')),
    lon: dato(lon, l('x')),
  }
}

/**
 * Geocerca del proyecto asignado, cruzada **por código** (`PROY-005`), no por
 * nombre, y con la distancia a la posición reportada.
 *
 * `radioMetros` va en `null` porque Startrack no lo publica: se puede decir a
 * qué distancia está el equipo, no si está dentro o fuera.
 */
function resolverGeocercaProyecto(
  proyecto: string | null,
  geocercas: Registro[],
  posicion: Ubicacion | null,
  leidoEn: string,
): Geocerca | null {
  const codigo = extraerCodigoProyecto(proyecto)
  if (codigo === null) return null

  const geocerca = geocercas.find((g) => extraerCodigoProyecto(texto(g, 'name')) === codigo)
  if (!geocerca) return null

  const lat = Number(geocerca.y)
  const lon = Number(geocerca.x)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

  const ep = 'ajax/namedPlaces.php?cmd=list'
  const l = (campo: string) => linaje('startrack', ep, campo, geocerca[campo], leidoEn)

  const latEquipo = posicion?.lat.valor ?? null
  const lonEquipo = posicion?.lon.valor ?? null
  const distanciaMetros =
    latEquipo !== null && lonEquipo !== null
      ? distanciaEnMetros(latEquipo, lonEquipo, lat, lon)
      : null

  return {
    nombre: dato(texto(geocerca, 'name'), l('name')),
    lat: dato(lat, l('y')),
    lon: dato(lon, l('x')),
    distanciaMetros,
    radioMetros: null,
  }
}

export type LecturaUnificada = {
  equipos: EquipoUnificado[]
  salud: SaludFuente[]
  /** Enlace al tracker de Startrack, o `null` si no hay host configurado. */
  urlStartrack: string | null
  leidoEn: string
}

/**
 * Lee ambas plataformas en vivo y devuelve el modelo unificado.
 *
 * Si una fuente falla, la otra se conserva y el veredicto degrada a
 * `SIN_EVIDENCIA`: un error de integración no puede romper la pantalla, se
 * muestra como dato no disponible.
 */
export const leerEquiposUnificados = cache(_leerEquiposUnificados)

/**
 * `cache()` la memoiza por petición: el layout la llama para la salud de las
 * fuentes y la página para los equipos, pero solo se lee una vez.
 */
async function _leerEquiposUnificados(): Promise<LecturaUnificada> {
  const leidoEn = new Date().toISOString()

  // Se consulta el caché ANTES de leer: si la respuesta sale de memoria, el
  // tiempo medido es del caché y no de la plataforma, y reportarlo como latencia
  // sería mentir sobre lo rápido que responde el sandbox.
  const prismaDesdeCache = estaVigente('prisma:equipos')
  const startrackDesdeCache = estaVigente('startrack:ajax/fsupdate.php')

  async function medir<T>(leer: () => Promise<T>): Promise<{ res: PromiseSettledResult<T>; ms: number }> {
    const inicio = Date.now()
    const [res] = await Promise.allSettled([leer()])
    return { res, ms: Date.now() - inicio }
  }

  const [equipos_, solicitudes_, flota_, geocercas_] = await Promise.all([
    medir(prisma.leerEquipos),
    medir(prisma.leerSolicitudes),
    // `fsupdate` reemplaza a `vehicles.php` como fuente del lado Startrack: trae
    // lo mismo y además posición, dirección, sitio cercano y conductor.
    medir(startrack.leerEstadoFlota),
    medir(startrack.leerGeocercas),
  ])

  const equiposRes = equipos_.res
  const solicitudesRes = solicitudes_.res
  const vehiculosRes = flota_.res
  const geocercasRes = geocercas_.res

  const lista = (r: PromiseSettledResult<{ datos: unknown[] }>): Registro[] =>
    r.status === 'fulfilled' ? r.value.datos.filter(esRegistro) : []

  const equipos = lista(equiposRes)
  const solicitudes = lista(solicitudesRes)
  const vehiculos = lista(vehiculosRes)
  const geocercas = lista(geocercasRes)

  const prismaOk = equiposRes.status === 'fulfilled'
  const startrackOk = vehiculosRes.status === 'fulfilled'

  // `latenciaMs` solo se llena cuando hubo lectura real contra la plataforma.
  // Si vino de caché queda en null: no hay medición nueva que reportar.
  const salud: SaludFuente[] = [
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
      latenciaMs: startrackOk && !startrackDesdeCache ? flota_.ms : null,
    },
  ]

  // La llave de unión verificada: código de activo contra descripción del vehículo.
  const porCodigo = indexarPorCodigo(vehiculos, (v) => texto(v, 'de') ?? texto(v, 'description'))

  const unificados = equipos.map((eq): EquipoUnificado => {
    const noActivo = texto(eq, 'no_activo')
    const codigo = extraerCodigo(noActivo)
    const idPrisma = texto(eq, 'id') ?? ''
    const epEquipos = '/api/maquinaria/equipos'
    const lp = (campo: string) => linaje('prisma', epEquipos, campo, eq[campo], leidoEn)

    const vehiculo = codigo !== null ? (porCodigo.get(codigo) ?? null) : null
    const epFlota = 'ajax/fsupdate.php'
    const lv = (campo: string) => linaje('startrack', epFlota, campo, vehiculo?.[campo], leidoEn)

    // La solicitud más reciente que compromete a esta unidad.
    const solicitud = solicitudes
      .filter((s) => texto(s, 'maquinaria_id') === idPrisma)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]
    const epSolicitudes = '/api/maquinaria/requests'

    const posicion =
      ubicacionDeTelemetria(vehiculo, epFlota, leidoEn) ??
      resolverUbicacion(texto(eq, 'project_name'), geocercas, lp('project_name'))

    const base = {
      id: idPrisma || (codigo ?? crypto.randomUUID()),
      codigoActivo: dato(codigo, lp('no_activo')),
      nombre: dato(texto(eq, 'nombre'), lp('nombre')),
      identidadResuelta: vehiculo !== null,
      equipo: estado(texto(eq, 'estado'), 'recurso', lp('estado')),
      solicitud: solicitud
        ? estado(
            texto(solicitud, 'status'),
            'tarea',
            linaje('prisma', epSolicitudes, 'status', solicitud.status, leidoEn),
          )
        : null,
      falla: estado(texto(eq, 'active_failure_status'), 'falla', lp('active_failure_status')),
      // `moving_status` es texto legible (power-off, idle, moving, disconnected),
      // no el código numérico que devuelve `vehicles.php`.
      vehiculo: vehiculo
        ? estado(texto(vehiculo, 'moving_status'), 'recurso', lv('moving_status'))
        : null,
      // El lector de tareas de Startrack no está resuelto: se declara ausente,
      // no se asume que no hay traslado.
      tarea: null,
      ubicacion: posicion,
      geocercaProyecto: resolverGeocercaProyecto(
        texto(eq, 'project_name'),
        geocercas,
        posicion,
        leidoEn,
      ),
      leidoEn,
    }

    return { ...base, ...evaluar(base) }
  })

  const host = process.env.STARTRACK_BASE_URL?.replace(/\/+$/, '') ?? null

  return {
    equipos: unificados,
    salud,
    // Lleva a la pantalla de Startrack. No es un enlace por vehículo: falta el
    // parámetro de la ficha, y adivinarlo mandaría al usuario a otro registro.
    urlStartrack: host ? `${host}/members-new.php` : null,
    leidoEn,
  }
}
