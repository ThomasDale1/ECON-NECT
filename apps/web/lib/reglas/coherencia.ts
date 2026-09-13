import 'server-only'
import { FALTANTE_EN_PALABRAS } from '@/components/nect/faltantes'
import type { EquipoUnificado, ResultadoRegla, Rol } from '@/lib/tipos/canonico'

/**
 * Reglas de coherencia. Funciones puras: entran datos canónicos, sale un
 * veredicto con su justificación. No conocen HTTP ni React.
 *
 * Dos principios que gobiernan todas:
 *
 * 1. `Prisma.estado !== Startrack.estado` **no es un error automáticamente**.
 *    Antes de concluir hay que preguntar qué objeto describe cada estado. Un
 *    recurso ocupado y una tarea completada son ambos correctos.
 * 2. Falta de evidencia no es riesgo. Si no se puede concluir, el veredicto es
 *    `SIN_EVIDENCIA` y se dice qué dato falta — nunca `EN_RIESGO`.
 */

type Entrada = Omit<EquipoUnificado, 'veredicto' | 'confianza' | 'reglas'>

/** Los estados de falla que dejan la unidad fuera de operación. */
const FALLA_BLOQUEANTE = new Set([
  'SIN_REVISAR',
  'PENDIENTE_INTERVENCION',
  'EN_PROCESO',
  'ESPERA_REPUESTOS',
  'TRASLADO_STD',
  'EN_PRUEBAS',
])

/**
 * R-IDENTIDAD — sin contraparte en Startrack no hay nada que reconciliar.
 *
 * Es el huérfano real del sandbox: el código de activo de Prisma no coincide con
 * la descripción de ningún vehículo. El sistema lo dice en vez de inventar.
 */
function reglaIdentidad(e: Entrada): ResultadoRegla | null {
  if (e.identidadResuelta) return null
  return {
    regla: 'R-IDENTIDAD',
    nombre: 'Sin contraparte en Startrack',
    veredicto: 'SIN_EVIDENCIA',
    severidad: 'media',
    confianza: 20,
    porque: [
      `El código de activo ${e.codigoActivo.valor ?? '(sin código)'} de Prisma no coincide con la descripción de ningún vehículo en Startrack.`,
      'Sin contraparte no hay estado observado que comparar con el planificado.',
    ],
    accionSugerida:
      'Escribir el código de activo en el campo remote_id del vehículo en Startrack, o corregir su descripción.',
    rolResponsable: 'LOGISTICA',
    camposFaltantes: ['startrack.vehiculo'],
  }
}

/**
 * R-MANTENIMIENTO — unidad no operativa con compromiso vigente.
 *
 * Cada dato es correcto por separado; juntos indican que lo planificado puede
 * incumplirse. Es el Caso de Uso 03 de ECON.
 */
function reglaMantenimiento(e: Entrada): ResultadoRegla | null {
  const falla = e.falla?.valor ?? null
  const bloqueada = falla !== null && FALLA_BLOQUEANTE.has(falla)
  if (!bloqueada) return null

  const solicitud = e.solicitud?.valor ?? null
  const comprometida = solicitud === 'APROBADA' || solicitud === 'PENDIENTE'
  if (!comprometida) return null

  return {
    regla: 'R-MANTENIMIENTO',
    nombre: 'Compromiso vigente sobre una unidad en mantenimiento',
    veredicto: 'EN_RIESGO',
    severidad: 'alta',
    confianza: 88,
    porque: [
      `Prisma reporta una falla activa en estado ${falla}.`,
      `La solicitud que compromete la unidad está en ${solicitud}.`,
      'Ambos datos son válidos por separado, pero juntos indican que la unidad puede no estar disponible.',
    ],
    accionSugerida: 'Validar la disponibilidad de la unidad antes de movilizarla, o reasignar otra.',
    rolResponsable: 'MANTENIMIENTO',
    camposFaltantes: [],
  }
}

/** R-ASIGNACION — solicitud aprobada que todavía no se tradujo en asignación. */
function reglaAsignacion(e: Entrada): ResultadoRegla | null {
  if (e.solicitud?.valor !== 'APROBADA') return null
  if (e.ubicacion?.descripcion.valor) return null

  return {
    regla: 'R-ASIGNACION',
    nombre: 'Solicitud aprobada sin proyecto asignado',
    veredicto: 'ATENCION',
    severidad: 'media',
    confianza: 75,
    porque: [
      'La solicitud está aprobada en Prisma.',
      'La unidad no tiene proyecto asignado, así que no hay destino contra el cual verificar dónde está.',
    ],
    accionSugerida: 'Asignar la unidad al proyecto de la solicitud y registrar las fechas de uso.',
    rolResponsable: 'LOGISTICA',
    camposFaltantes: ['prisma.proyecto'],
  }
}

/**
 * Las tareas de traslado **no existen en este sandbox de Startrack**, y eso es
 * estructural, no un hueco de una lectura:
 *
 *   `ajax/{tasks,task,jobs,job,workOrders,assignments}.php` → 404
 *   `ajax/trips.php` → 200 con `success:false` para todo parámetro, con la misma
 *   sesión con la que `vehicles.php` responde `success:true`
 *
 * Por eso no hay regla que lo reporte por equipo: repetir "falta la tarea" en
 * cada fila de la flota convierte un hecho del sistema en ruido de bandeja. Se
 * declara una vez, a nivel de pantalla y en la matriz de mapeo, como
 * **sin equivalencia directa**.
 */

/** R-COMPATIBLES — evidencia positiva: lo observado concuerda con lo planificado. */
function reglaCompatibles(e: Entrada): ResultadoRegla | null {
  if (!e.identidadResuelta) return null
  if (e.falla?.valor && FALLA_BLOQUEANTE.has(e.falla.valor)) return null
  if (e.equipo?.valor === 'OBSOLETA') return null

  const recurso = e.equipo?.valor ?? null
  const vehiculo = e.vehiculo?.valor ?? null
  if (recurso === null || vehiculo === null) return null

  return {
    regla: 'R-COMPATIBLES',
    nombre: 'Estados compatibles entre plataformas',
    veredicto: 'COHERENTE',
    severidad: 'baja',
    confianza: 90,
    porque: [
      `Prisma reporta el recurso en ${recurso}.`,
      `Startrack reporta el vehículo en ${vehiculo}.`,
      'Describen objetos distintos y no se contradicen: no hay falla activa que bloquee la unidad.',
    ],
    accionSugerida: 'Ninguna acción requerida.',
    rolResponsable: 'LOGISTICA',
    camposFaltantes: [],
  }
}

/**
 * R-TELEMETRIA — **nota de completitud.**
 *
 * Startrack reporta `disconnected` cuando perdió comunicación con la unidad. La
 * última posición conocida sigue ahí, pero puede ser vieja: no es lo mismo
 * "está en ese punto" que "la última vez que reportó estaba en ese punto".
 *
 * No fija el veredicto, baja la confianza y lo deja escrito.
 */
function notaTelemetria(e: Entrada): ResultadoRegla | null {
  const estadoVehiculo = e.vehiculo?.valor ?? null
  if (estadoVehiculo !== 'disconnected') return null

  return {
    regla: 'R-TELEMETRIA',
    nombre: 'Telemetría desconectada',
    veredicto: 'SIN_EVIDENCIA',
    severidad: 'baja',
    confianza: 55,
    porque: [
      'Startrack reporta la unidad como desconectada.',
      'La ubicación mostrada es la última conocida, no necesariamente la actual.',
    ],
    accionSugerida: 'Verificar la alimentación del equipo de rastreo en la unidad.',
    rolResponsable: 'LOGISTICA',
    camposFaltantes: ['startrack.posicion.vigencia'],
  }
}

/**
 * R-NO-OPERATIVA — unidad marcada fuera de catálogo pero con compromiso vivo.
 *
 * En Prisma la disponibilidad no es un campo: es el cruce de estado del equipo,
 * estado de la falla activa y bandera de paro (01 E.2). `OBSOLETA` es uno de los
 * tres valores del recurso, y una unidad obsoleta asignada a un proyecto o con
 * una solicitud abierta merece revisión.
 *
 * Va en `ATENCION` y no en `EN_RIESGO` a propósito: la asignación puede estar
 * vencida en vez de ser un riesgo real, y no hay evidencia para distinguirlo.
 */
function reglaNoOperativa(e: Entrada): ResultadoRegla | null {
  if (e.equipo?.valor !== 'OBSOLETA') return null

  const proyecto = e.ubicacion?.descripcion.valor ?? null
  const solicitud = e.solicitud?.valor ?? null
  const comprometida = proyecto !== null || solicitud === 'APROBADA' || solicitud === 'PENDIENTE'
  if (!comprometida) return null

  return {
    regla: 'R-NO-OPERATIVA',
    nombre: 'Unidad obsoleta con compromiso vigente',
    veredicto: 'ATENCION',
    severidad: 'media',
    confianza: 70,
    porque: [
      'Prisma marca el recurso como OBSOLETA.',
      proyecto !== null ? `Sigue asignada a ${proyecto}.` : `Tiene una solicitud en ${solicitud}.`,
      'Puede ser una asignación vencida o una unidad que no debería movilizarse; la evidencia no distingue.',
    ],
    accionSugerida: 'Confirmar si la unidad sigue operativa o cerrar la asignación.',
    rolResponsable: 'MANTENIMIENTO',
    camposFaltantes: [],
  }
}

/**
 * R-DISTANCIA — el equipo está lejos del proyecto que lo tiene asignado.
 *
 * ⚠ **Esto no es una violación de geocerca y no se presenta como tal.**
 * `ajax/namedPlaces.php` publica el centro de la geocerca pero no su radio, así
 * que no se puede afirmar "dentro" ni "fuera". Lo único afirmable es la
 * distancia entre la posición reportada y ese centro.
 *
 * El umbral de 5 km es una **heurística declarada**, no un dato de ECON: ninguna
 * geocerca de obra tiene ese radio, así que por encima de esa distancia el
 * equipo está en otro lado. Se elige alto a propósito para no producir falsos
 * positivos mientras el radio siga sin publicarse.
 */
const UMBRAL_LEJOS_METROS = 5_000

function reglaDistancia(e: Entrada): ResultadoRegla | null {
  const geocerca = e.geocercaProyecto
  const distancia = geocerca?.distanciaMetros ?? null
  if (distancia === null || distancia <= UMBRAL_LEJOS_METROS) return null

  const km = (distancia / 1000).toFixed(1)
  return {
    regla: 'R-DISTANCIA',
    nombre: 'Equipo lejos del proyecto asignado',
    veredicto: 'ATENCION',
    severidad: 'media',
    confianza: 72,
    porque: [
      `La posición reportada está a ${km} km del centro de ${geocerca?.nombre.valor ?? 'la geocerca del proyecto'}.`,
      'Prisma lo tiene asignado a ese proyecto.',
      'Startrack no publica el radio de la geocerca, así que esto es una distancia, no una violación de geocerca confirmada.',
    ],
    accionSugerida: 'Confirmar si el equipo fue movido a otro frente de trabajo.',
    rolResponsable: 'LOGISTICA',
    camposFaltantes: [],
  }
}

/** A quién se recurre, en palabras, por rol de la RACI. */
const A_QUIEN: Record<Rol, string> = {
  PROYECTOS: 'Comunicarse con Gerencia Técnica de Proyectos.',
  LOGISTICA: 'Comunicarse con el equipo de Logística.',
  MANTENIMIENTO: 'Comunicarse con el equipo de Mantenimiento.',
  COSTOS: 'Comunicarse con Control de Costos.',
  DIRECCION: 'Escalar a Dirección.',
}

/**
 * Umbral de revisión humana — plan maestro §3.5.
 *
 * Por debajo de esto el motor **no** emite un veredicto con un porcentaje al
 * lado para que alguien decida si lo revisa. Marca revisión humana y dice qué
 * falta. Un 54% no es "algo cierto a medias": es evidencia insuficiente.
 */
const UMBRAL_REVISION = 60

/** Reglas que sí concluyen: fijan el veredicto. */
const REGLAS_DE_VEREDICTO = [
  reglaIdentidad,
  reglaMantenimiento,
  reglaNoOperativa,
  reglaDistancia,
  reglaAsignacion,
  reglaCompatibles,
]

/**
 * Notas de completitud: señalan un hueco de datos sin fijar el veredicto.
 *
 * Que falte una dimensión no invalida lo que sí se pudo concluir sobre las
 * otras. Si una nota mandara sobre el veredicto, toda la flota saldría
 * `SIN_EVIDENCIA` por no tener lector de tareas, y la pantalla no diría nada.
 * Bajan la confianza y se muestran como evidencia.
 */
const NOTAS = [notaTelemetria]

/** El veredicto final es el más severo de los disparados. */
const ORDEN = ['COHERENTE', 'ATENCION', 'SIN_EVIDENCIA', 'EN_RIESGO'] as const

/**
 * Evalúa todas las reglas y devuelve el veredicto con su confianza.
 *
 * La confianza es una **heurística determinística y documentada**, no un modelo:
 * parte de la confianza de la regla que produjo el veredicto y descuenta por
 * cada campo crítico ausente.
 */
export function evaluar(entrada: Entrada): Pick<EquipoUnificado, 'veredicto' | 'confianza' | 'reglas'> {
  const concluyentes = REGLAS_DE_VEREDICTO.map((r) => r(entrada)).filter(
    (r): r is ResultadoRegla => r !== null,
  )
  const notas = NOTAS.map((r) => r(entrada)).filter((r): r is ResultadoRegla => r !== null)
  const reglas = [...concluyentes, ...notas]

  if (concluyentes.length === 0) {
    return {
      veredicto: 'SIN_EVIDENCIA',
      confianza: 10,
      reglas: [
        {
          regla: 'R-SIN-EVIDENCIA',
          nombre: 'Evidencia insuficiente',
          veredicto: 'SIN_EVIDENCIA',
          severidad: 'media',
          confianza: 10,
          porque: ['Ninguna regla pudo evaluarse con los datos disponibles.'],
          accionSugerida: 'Revisar manualmente el registro en ambas plataformas.',
          rolResponsable: 'LOGISTICA',
          camposFaltantes: ['prisma.estado', 'startrack.vehiculo'],
        },
      ],
    }
  }

  const veredicto = concluyentes.reduce<EquipoUnificado['veredicto']>(
    (peor, r) => (ORDEN.indexOf(r.veredicto) > ORDEN.indexOf(peor) ? r.veredicto : peor),
    'COHERENTE',
  )

  const decisiva = concluyentes.find((r) => r.veredicto === veredicto) ?? concluyentes[0]
  // Todos los huecos se muestran como contexto, pero **solo los que la regla
  // decisiva declaró** bajan la confianza. Que Startrack no publique el radio de
  // una geocerca no debilita la afirmación "Prisma marca esta unidad OBSOLETA y
  // sigue asignada": esa se sostiene sola con datos de Prisma.
  const faltantes = [...new Set(reglas.flatMap((r) => r.camposFaltantes))]
  const confianza = Math.max(
    0,
    Math.min(100, decisiva.confianza - decisiva.camposFaltantes.length * 8),
  )

  // La regla decisiva primero; el resto queda como evidencia de apoyo.
  const ordenadas = [decisiva, ...reglas.filter((r) => r !== decisiva)]

  // Por debajo del umbral no se emite un veredicto "a medias": se marca revisión
  // humana y se dice qué falta y a quién llamar (plan maestro §3.5).
  if (confianza < UMBRAL_REVISION && veredicto !== 'SIN_EVIDENCIA') {
    const revision: ResultadoRegla = {
      regla: 'R-REVISION',
      nombre: 'Requiere revisión humana',
      veredicto: 'SIN_EVIDENCIA',
      severidad: decisiva.severidad,
      confianza,
      porque: [
        `La evidencia no alcanza para sostener "${decisiva.nombre}".`,
        ...faltantes.map((f) => FALTANTE_EN_PALABRAS[f] ?? `Falta ${f}.`),
      ],
      accionSugerida: A_QUIEN[decisiva.rolResponsable],
      rolResponsable: decisiva.rolResponsable,
      camposFaltantes: faltantes,
    }
    return { veredicto: 'SIN_EVIDENCIA', confianza, reglas: [revision, ...ordenadas] }
  }

  return { veredicto, confianza, reglas: ordenadas }
}
