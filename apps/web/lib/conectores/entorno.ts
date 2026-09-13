// Carga `.env.local` desde la raíz del repositorio.
//
// AGENTS.md §8 dice que los valores reales viven en `.env.local`, y ese
// archivo está en la raíz del repo (junto a AGENTS.md), no dentro de
// `apps/web`. Next.js solo carga `.env.local` de su propio Root Directory
// (`apps/web` — AGENTS.md §4.2), así que sin este paso las credenciales de
// servidor nunca llegan a `process.env` al correr `npm run dev` o
// `npm run leer` en local. En Vercel las variables se configuran en el
// dashboard del proyecto: esto solo importa para desarrollo local.
//
// No se agregó `dotenv` al `package.json` para esto (AGENTS.md §4.2: agregar
// una dependencia se pide, no se instala por cuenta propia) — es un parser
// mínimo de `KEY=VALOR` por línea, suficiente para el formato de `.env.example`.

import 'server-only'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

let cargado = false

function buscarEnvLocal(desde: string): string | null {
  let actual = desde
  for (let i = 0; i < 8; i++) {
    const candidato = join(actual, '.env.local')
    if (existsSync(candidato)) return candidato
    const padre = dirname(actual)
    if (padre === actual) break
    actual = padre
  }
  return null
}

function parsearLinea(linea: string): [string, string] | null {
  const sinComentario = linea.trim()
  if (!sinComentario || sinComentario.startsWith('#')) return null
  const igual = sinComentario.indexOf('=')
  if (igual === -1) return null
  const clave = sinComentario.slice(0, igual).trim()
  let valor = sinComentario.slice(igual + 1).trim()
  if (
    (valor.startsWith('"') && valor.endsWith('"')) ||
    (valor.startsWith("'") && valor.endsWith("'"))
  ) {
    valor = valor.slice(1, -1)
  }
  return [clave, valor]
}

/** Idempotente: solo llena las variables que `process.env` no tenga ya, para
 * no pisar lo que Vercel inyecte en producción. */
export function asegurarEntornoCargado(): void {
  if (cargado) return
  cargado = true

  const ruta = buscarEnvLocal(process.cwd())
  if (!ruta) return

  const contenido = readFileSync(ruta, 'utf-8')
  for (const linea of contenido.split('\n')) {
    const par = parsearLinea(linea)
    if (!par) continue
    const [clave, valor] = par
    if (process.env[clave] === undefined || process.env[clave] === '') {
      process.env[clave] = valor
    }
  }
}
