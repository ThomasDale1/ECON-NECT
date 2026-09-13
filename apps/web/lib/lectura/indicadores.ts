// Ensamblado del panel de indicadores (S-A3, `GET /api/indicadores`).
//
// No define ningún KPI nuevo: el catálogo y sus seis campos son de carril C
// (`lib/kpi/catalogo.ts`), y las fórmulas también (`lib/kpi/calculo.ts`). Acá
// solo se les da de comer la lectura viva y se adjunta **de qué endpoint salió
// cada cifra** (AGENTS.md §11.7: ninguna cifra aparece sin poder señalarlo).
//
// Tres estados posibles, nunca un número inventado:
// - `calculado` — hay valor y su fórmula se puede validar a mano.
// - `no_calculable` — el sandbox no expone el dato; `datoFaltante` dice cuál.
// - `requiere_optimizador` — el valor existe, pero nace de correr el
//   optimizador (`POST /api/optimizar`), no de la lectura de la flota.

import type { Kpi } from '@/lib/kpi/catalogo'
import { CATALOGO_KPI } from '@/lib/kpi/catalogo'
import {
  calcularCobertura,
  calcularLatencia,
  calcularTasaCoherencia,
  tiempoMuertoQuetzales,
} from '@/lib/kpi/calculo'
import { paresLatenciaAprobacionTraslado } from '@/lib/canonico/latencia'
import type { LecturaFlota } from './flota'

export type OrigenCifra = {
  plataforma: string
  endpoint: string
  campo: string
}

export type IndicadorCalculado = Kpi & {
  estado: 'calculado' | 'no_calculable' | 'requiere_optimizador'
  valor: number | null
  unidad: 'porcentaje' | 'horas' | 'usd' | null
  /** Cómo se llegó al número, o qué falta para llegar. Se muestra debajo de la
   * cifra: la fórmula tiene que poder validarse contra una muestra. */
  detalle: string
  origen: OrigenCifra[]
}

/** Los tres KPIs que nacen del optimizador (S-C4). No se calculan acá: los
 * devuelve `POST /api/optimizar` con la propuesta, porque dependen de la pila
 * de prioridades que el usuario arma en la pantalla de planeación. */
const IDS_DEL_OPTIMIZADOR = new Set([
  'ahorro-por-objetivo-optimizador',
  'lluvia-clases-sensibles-optimizador',
  'cobertura-plan-optimizador',
])

function porcentaje(valor: number | null): number | null {
  return valor === null ? null : Math.round(valor * 1000) / 10
}

export function construirIndicadores(lectura: LecturaFlota): IndicadorCalculado[] {
  const { equipos, datos } = lectura

  const coherencia = calcularTasaCoherencia(equipos)
  const cobertura = calcularCobertura(equipos)
  const latenciaFuente = paresLatenciaAprobacionTraslado(datos)
  const latencia = calcularLatencia(latenciaFuente.pares)
  const tiempoMuerto = tiempoMuertoQuetzales()

  const origenEquipos: OrigenCifra = {
    plataforma: datos.equipos.plataforma,
    endpoint: datos.equipos.endpoint,
    campo: 'estado, no_activo',
  }
  const origenVehiculos: OrigenCifra = {
    plataforma: datos.vehiculos.plataforma,
    endpoint: datos.vehiculos.endpoint,
    campo: 'description, status',
  }
  const origenSolicitudes: OrigenCifra = {
    plataforma: datos.solicitudes.plataforma,
    endpoint: datos.solicitudes.endpoint,
    campo: 'status, approved_at',
  }
  const origenTareas: OrigenCifra = {
    plataforma: datos.tareas.plataforma,
    endpoint: datos.tareas.endpoint,
    campo: 'remote_id, creation_date',
  }

  return CATALOGO_KPI.map((kpi): IndicadorCalculado => {
    if (IDS_DEL_OPTIMIZADOR.has(kpi.id)) {
      return {
        ...kpi,
        estado: 'requiere_optimizador',
        valor: null,
        unidad: null,
        detalle:
          'Se calcula al correr el optimizador (POST /api/optimizar): depende de la pila de prioridades que arma el planificador, no de la lectura de la flota.',
        origen: [],
      }
    }

    switch (kpi.id) {
      case 'tasa-coherencia':
        return {
          ...kpi,
          estado: 'calculado',
          valor: porcentaje(coherencia.valor),
          unidad: 'porcentaje',
          detalle: `${coherencia.numerador} de ${coherencia.denominador} equipos con identidad resuelta tienen veredicto COHERENTE.`,
          origen: [origenEquipos, origenVehiculos, origenTareas],
        }

      case 'cobertura-interpretacion':
        return {
          ...kpi,
          estado: 'calculado',
          valor: porcentaje(cobertura.valor),
          unidad: 'porcentaje',
          detalle: `${cobertura.resueltos} de ${cobertura.total} equipos observados resolvieron identidad contra Startrack.`,
          origen: [origenEquipos, origenVehiculos],
        }

      case 'latencia-solicitud-traslado':
        return {
          ...kpi,
          estado: latencia.valor === null ? 'no_calculable' : 'calculado',
          valor: latencia.valor === null ? null : Math.round(latencia.valor * 10) / 10,
          unidad: latencia.valor === null ? null : 'horas',
          detalle:
            latencia.valor === null
              ? `Ninguna de las ${latenciaFuente.aprobadasObservadas} solicitudes aprobadas observadas tiene una tarea enlazada por remote_id con fecha de creación legible. Es el hueco que P1 cierra.`
              : `Promedio sobre ${latenciaFuente.enlazadas} de ${latenciaFuente.aprobadasConFecha} solicitudes aprobadas enlazadas por remote_id. El resto espera que P1 llene remote_id sistemáticamente.`,
          origen: [origenSolicitudes, origenTareas],
        }

      case 'tiempo-muerto-quetzales':
        return {
          ...kpi,
          estado: 'no_calculable',
          valor: null,
          unidad: null,
          detalle: tiempoMuerto.datoFaltante,
          origen: [origenEquipos],
        }

      default:
        // Un KPI nuevo del catálogo de C que esta capa todavía no alimenta. Se
        // declara como hueco en vez de desaparecer de la pantalla.
        return {
          ...kpi,
          estado: 'no_calculable',
          valor: null,
          unidad: null,
          detalle:
            kpi.datoFaltante ??
            'El catálogo lo declara calculable, pero la lectura de la flota todavía no lo alimenta.',
          origen: [],
        }
    }
  })
}
