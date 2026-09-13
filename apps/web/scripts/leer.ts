// `npm run leer` — el criterio de terminado de S-A1. Lee ambas plataformas
// EN VIVO e imprime conteos, nombres de campo y tiempos.
//
// ⚠ NUNCA imprime valores. Un volcado del endpoint de conductores de
// Startrack contiene correos, teléfonos y respuestas de seguridad de
// personal real de ECON (AGENTS.md §1.2). Si necesitás depurar un valor
// puntual, hacelo en tu propia terminal, nunca en un commit ni en este script.

import { asegurarEntornoCargado } from '../lib/conectores/entorno'

asegurarEntornoCargado()

import * as prisma from '../lib/conectores/prisma'
import * as startrack from '../lib/conectores/startrack'
import type { RespuestaConector } from '../lib/conectores/tipos'

type ResultadoLectura = {
  plataforma: string
  nombre: string
  endpoint: string
  estado: 'ok' | 'error'
  cantidad?: number
  campos: string[]
  ms: number
  error?: string
}

function camposDe(valor: unknown): string[] {
  const objetivo = Array.isArray(valor) ? valor[0] : valor
  if (objetivo && typeof objetivo === 'object') {
    return Object.keys(objetivo as Record<string, unknown>)
  }
  return []
}

async function medir(
  plataforma: string,
  nombre: string,
  leer: () => Promise<RespuestaConector<unknown>>,
): Promise<ResultadoLectura> {
  const inicio = Date.now()
  try {
    const { datos, linaje } = await leer()
    const ms = Date.now() - inicio
    return {
      plataforma,
      nombre,
      endpoint: linaje.endpoint,
      estado: 'ok',
      cantidad: Array.isArray(datos) ? datos.length : undefined,
      campos: camposDe(datos),
      ms,
    }
  } catch (error) {
    const ms = Date.now() - inicio
    return {
      plataforma,
      nombre,
      endpoint: '(sin resolver)',
      estado: 'error',
      campos: [],
      ms,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function main() {
  console.log('ECON NECT — inventario en vivo (sin valores, solo forma y conteos)\n')

  const lecturas: ResultadoLectura[] = []

  lecturas.push(await medir('prisma', 'equipos', prisma.leerEquipos))
  lecturas.push(await medir('prisma', 'solicitudes', prisma.leerSolicitudes))
  lecturas.push(await medir('prisma', 'fallas', prisma.leerFallas))
  lecturas.push(await medir('prisma', 'proyectos', prisma.leerProyectos))
  lecturas.push(await medir('prisma', 'operadores', prisma.leerOperadores))

  lecturas.push(await medir('startrack', 'vehiculos', startrack.leerVehiculos))
  lecturas.push(await medir('startrack', 'geocercas', startrack.leerGeocercas))
  lecturas.push(await medir('startrack', 'conductores', startrack.leerConductores))
  lecturas.push(await medir('startrack', 'tareas', startrack.leerTareas))
  lecturas.push(await medir('startrack', 'tipos_tarea', startrack.leerTiposTarea))

  for (const l of lecturas) {
    if (l.estado === 'ok') {
      const cantidad = l.cantidad === undefined ? '—' : String(l.cantidad)
      console.log(
        `[OK]    ${l.plataforma.padEnd(10)} ${l.nombre.padEnd(13)} ${l.endpoint.padEnd(32)} ${cantidad.padStart(5)} registros  ${l.ms}ms`,
      )
      if (l.campos.length > 0) {
        console.log(`        campos observados: ${l.campos.join(', ')}`)
      }
    } else {
      console.log(`[ERROR] ${l.plataforma.padEnd(10)} ${l.nombre.padEnd(13)} ${l.ms}ms  ${l.error}`)
    }
  }

  const fallidas = lecturas.filter((l) => l.estado === 'error')
  console.log(`\n${lecturas.length - fallidas.length}/${lecturas.length} lecturas exitosas.`)
  process.exitCode = fallidas.length > 0 ? 1 : 0
}

main()
