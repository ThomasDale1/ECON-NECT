// Lecturas de KPI al estilo O.D.I.N.: veredicto, por qué, siguiente paso.
// Heurísticas de umbral (como confianza < 45): documentadas, no medidas ni ML.
// Ningún número se inventa. Si falta el insumo, el valor es "No disponible".

import type { EquipoUnificado, Rol, Veredicto } from '@/lib/tipos/canonico'
import {
  calcularCobertura,
  calcularLatencia,
  calcularTasaCoherencia,
  tiempoMuertoQuetzales,
  type ParLatencia,
} from './calculo'
import { CATALOGO_KPI } from './catalogo'

export type LecturaKpi = {
  id: string
  nombre: string
  queMide: string
  valor: string
  veredicto: Veredicto
  lectura: string
  paso: string
  rol: Rol
  faltante: string | null
  cobertura: string | null
}

function porCiento(valor: number): string {
  return `${Math.round(valor * 100)} %`
}

function horas(valor: number): string {
  const redondeado = Math.round(valor * 10) / 10
  const texto = Number.isInteger(redondeado) ? String(redondeado) : redondeado.toFixed(1).replace('.', ',')
  return `${texto} h`
}

function kpi(id: string) {
  const encontrado = CATALOGO_KPI.find((item) => item.id === id)
  if (!encontrado) throw new Error(`KPI no encontrado: ${id}`)
  return encontrado
}

function tasaCoherencia(equipos: EquipoUnificado[]): LecturaKpi {
  const catalogo = kpi('tasa-coherencia')
  const { valor, numerador, denominador } = calcularTasaCoherencia(equipos)
  const enRiesgo = equipos.filter((e) => e.identidadResuelta && e.veredicto === 'EN_RIESGO').length
  const atencion = equipos.filter((e) => e.identidadResuelta && e.veredicto === 'ATENCION').length

  if (valor === null) {
    return {
      id: catalogo.id,
      nombre: catalogo.nombre,
      queMide: catalogo.queMide,
      valor: 'No disponible',
      veredicto: 'SIN_EVIDENCIA',
      lectura: 'Nadie cruzó Prisma con Startrack en esta lectura. Sin identidad resuelta no hay tasa que defender.',
      paso: 'Resolver los huérfanos en la bandeja, empezando por el equipo que Prisma ve y Startrack no.',
      rol: 'LOGISTICA',
      faltante: 'Al menos un equipo con identidadResuelta = true.',
      cobertura: `0 de ${equipos.length} equipos cruzados`,
    }
  }

  const veredicto: Veredicto = valor === 1 ? 'COHERENTE' : valor >= 0.7 ? 'ATENCION' : 'EN_RIESGO'
  const lectura =
    valor === 1
      ? `Los ${denominador} equipos cruzados salieron COHERENTE. La integración, en esta lectura, no tiene excepciones.`
      : `${numerador} de ${denominador} equipos cruzados están COHERENTE. ${enRiesgo} EN_RIESGO y ${atencion} ATENCION. El denominador es solo identidad resuelta, no la flota total.`

  return {
    id: catalogo.id,
    nombre: catalogo.nombre,
    queMide: catalogo.queMide,
    valor: porCiento(valor),
    veredicto,
    lectura,
    paso: catalogo.accionQueDispara,
    rol: 'DIRECCION',
    faltante: null,
    cobertura: `${numerador} coherentes / ${denominador} cruzados`,
  }
}

function cobertura(equipos: EquipoUnificado[]): LecturaKpi {
  const catalogo = kpi('cobertura-interpretacion')
  const { valor, resueltos, total } = calcularCobertura(equipos)
  const huerfanos = total - resueltos

  if (valor === null) {
    return {
      id: catalogo.id,
      nombre: catalogo.nombre,
      queMide: catalogo.queMide,
      valor: 'No disponible',
      veredicto: 'SIN_EVIDENCIA',
      lectura: 'Esta lectura no trajo equipos. No hay cobertura que calcular.',
      paso: 'Releer Prisma y Startrack y volver a abrir indicadores.',
      rol: 'DIRECCION',
      faltante: 'Al menos un equipo observado.',
      cobertura: '0 equipos en la lectura',
    }
  }

  const veredicto: Veredicto = valor === 1 ? 'COHERENTE' : valor >= 0.8 ? 'ATENCION' : 'EN_RIESGO'
  const lectura =
    huerfanos === 0
      ? `Los ${total} equipos de esta lectura tienen contraparte. Prisma y Startrack se pudieron cruzar.`
      : `${resueltos} de ${total} equipos cruzaron. ${huerfanos} quedaron huérfanos: una plataforma los ve y la otra no.`

  return {
    id: catalogo.id,
    nombre: catalogo.nombre,
    queMide: catalogo.queMide,
    valor: porCiento(valor),
    veredicto,
    lectura,
    paso: catalogo.accionQueDispara,
    rol: 'LOGISTICA',
    faltante: null,
    cobertura: `${resueltos} de ${total} con identidad resuelta`,
  }
}

function latencia(pares: ParLatencia[], solicitudesAprobadas: number): LecturaKpi {
  const catalogo = kpi('latencia-solicitud-traslado')
  const { valor, muestras } = calcularLatencia(pares)
  const universo = Math.max(solicitudesAprobadas, muestras)

  if (valor === null) {
    return {
      id: catalogo.id,
      nombre: catalogo.nombre,
      queMide: catalogo.queMide,
      valor: 'No disponible',
      veredicto: 'SIN_EVIDENCIA',
      lectura:
        universo === 0
          ? 'No hay solicitudes APROBADA en Prisma en esta lectura. Sin aprobación no nace el puente hacia Startrack.'
          : `Hay ${universo} solicitud(es) APROBADA y ninguna enlazó por remote_id con una tarea. El dato existe; falta el cruce que hoy hace una persona.`,
      paso: catalogo.accionQueDispara,
      rol: 'LOGISTICA',
      faltante: universo === 0 ? 'Solicitudes APROBADA con approved_at.' : 'remote_id que enlace la tarea de Startrack con la solicitud de Prisma.',
      cobertura: `0 de ${universo} aprobadas enlazadas`,
    }
  }

  const veredicto: Veredicto = muestras < universo ? 'ATENCION' : 'COHERENTE'
  return {
    id: catalogo.id,
    nombre: catalogo.nombre,
    queMide: catalogo.queMide,
    valor: horas(valor),
    veredicto,
    lectura:
      muestras < universo
        ? `Promedio ${horas(valor)} entre approved_at y creation_date, sobre ${muestras} de ${universo} aprobadas. El resto espera que P1 llene remote_id. No hay umbral de mentor: se reporta el cruce, no un juicio de retraso.`
        : `Promedio ${horas(valor)} entre la aprobación en Prisma y el alta de la tarea en Startrack (${muestras} pares). No hay umbral de mentor declarado; el número es la lectura, no un juicio de lentitud.`,
    paso: catalogo.accionQueDispara,
    rol: 'LOGISTICA',
    faltante: null,
    cobertura: `${muestras} de ${universo} aprobadas enlazadas por remote_id`,
  }
}

function tiempoMuerto(): LecturaKpi {
  const catalogo = kpi('tiempo-muerto-quetzales')
  const hueco = tiempoMuertoQuetzales()
  return {
    id: catalogo.id,
    nombre: catalogo.nombre,
    queMide: catalogo.queMide,
    valor: 'No disponible',
    veredicto: 'SIN_EVIDENCIA',
    lectura:
      'La fórmula es real: (mínimo contratado − horas de uso) × tarifa. En este sandbox no hay horas reales de uso, y precio_x_hora / minimum_usage_hours vienen vacíos en casi toda la flota. Por eso no hay quetzales que mostrar.',
    paso: catalogo.accionQueDispara,
    rol: 'COSTOS',
    faltante: hueco.datoFaltante,
    cobertura: '0 de 15 equipos con horas reales en el sandbox observado',
  }
}

function serie30d(): LecturaKpi {
  const catalogo = kpi('estado-flota-30d')
  return {
    id: catalogo.id,
    nombre: catalogo.nombre,
    queMide: catalogo.queMide,
    valor: 'No disponible',
    veredicto: 'SIN_EVIDENCIA',
    lectura:
      'Prisma y Startrack se leen en el instante actual. No hay serie de 30 días en los conectores, así que no se dibuja una curva ni se inventa tendencia.',
    paso: catalogo.accionQueDispara,
    rol: 'DIRECCION',
    faltante: catalogo.datoFaltante,
    cobertura: 'Solo estado actual; 0 días de histórico',
  }
}

export function interpretarKpis(
  equipos: EquipoUnificado[],
  pares: ParLatencia[],
  solicitudesAprobadas: number,
): LecturaKpi[] {
  return [tasaCoherencia(equipos), cobertura(equipos), latencia(pares, solicitudesAprobadas), tiempoMuerto(), serie30d()]
}

export function interpretarFlota(lecturas: LecturaKpi[], equipos: EquipoUnificado[]): LecturaKpi {
  const peor = lecturas.reduce<Veredicto>((acc, item) => {
    const orden: Veredicto[] = ['COHERENTE', 'ATENCION', 'EN_RIESGO', 'SIN_EVIDENCIA']
    return orden.indexOf(item.veredicto) > orden.indexOf(acc) ? item.veredicto : acc
  }, 'COHERENTE')

  const excepciones = equipos.filter((e) => e.veredicto !== 'COHERENTE').length
  const huerfanos = equipos.filter((e) => !e.identidadResuelta).length
  const disponibles = lecturas.filter((l) => l.faltante === null)
  const huecos = lecturas.filter((l) => l.faltante !== null)

  return {
    id: 'flota',
    nombre: 'Lectura de la flota',
    queMide: 'Qué se puede concluir con esta lectura, y qué queda como hueco honesto.',
    valor: `${disponibles.length} de ${lecturas.length} KPIs con cifra`,
    veredicto: peor === 'SIN_EVIDENCIA' && disponibles.length > 0 ? 'ATENCION' : peor,
    lectura: `${excepciones} equipos no salieron COHERENTE. ${huerfanos} no cruzaron de plataforma. ${huecos.length} KPIs declaran dato faltante (horas, histórico) y no se rellenan.`,
    paso: 'Abrir el centro de comando por EN_RIESGO. Los huecos de horas y de 30 días se dejan visibles, no se estiman.',
    rol: 'DIRECCION',
    faltante: huecos.length > 0 ? huecos.map((h) => h.nombre).join(' · ') : null,
    cobertura: `${equipos.length} equipos en la lectura`,
  }
}
