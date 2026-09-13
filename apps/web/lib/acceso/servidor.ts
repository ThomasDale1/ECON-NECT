// Guardia de sesión para rutas de API y componentes de servidor — S-C3.
//
// Separado de `verificar.ts` porque esto sí es `server-only`: carga el
// `.env.local` de la raíz del repositorio (que Next no lee solo, ver
// lib/conectores/entorno.ts) antes de verificar nada. `proxy.ts` no puede
// importar este archivo; importa `verificar.ts`.
//
// Regla de la capa: **ninguna ruta devuelve un dato de ECON antes de pasar por
// acá.** La cookie de sesión es la única autorización, y su firma se verifica
// en cada request — no se confía en que el proxy ya haya mirado.

import 'server-only'
import { NextResponse } from 'next/server'
import { asegurarEntornoCargado } from '@/lib/conectores/entorno'
import { hayAccesoConfigurado, puedePropagar, sesionDeRequest, type Sesion } from './verificar'

export async function sesionActual(request: Request): Promise<Sesion | null> {
  asegurarEntornoCargado()
  return sesionDeRequest(request)
}

export function accesoConfigurado(): boolean {
  asegurarEntornoCargado()
  return hayAccesoConfigurado()
}

export type FalloDeAcceso = { respuesta: NextResponse; sesion: null }
export type AccesoConcedido = { respuesta: null; sesion: Sesion }

/**
 * Exige una sesión válida. Devuelve la respuesta 401 ya armada, o la sesión.
 *
 * El mensaje distingue los dos casos porque no son el mismo problema: "no hay
 * ninguna clave configurada en el servidor" es un error de despliegue nuestro,
 * y "tu sesión no es válida" es del usuario.
 */
export async function exigirSesion(request: Request): Promise<FalloDeAcceso | AccesoConcedido> {
  const sesion = await sesionActual(request)
  if (sesion) return { respuesta: null, sesion }

  const mensaje = accesoConfigurado()
    ? 'Sesión ausente, vencida o inválida. Entrá de nuevo en /entrar.'
    : 'No hay ninguna clave de rol configurada en el servidor (NECT_CLAVE_*). Nadie puede entrar hasta que existan.'

  return {
    respuesta: NextResponse.json({ error: 'no_autorizado', mensaje }, { status: 401 }),
    sesion: null,
  }
}

/** Exige además permiso de escritura (RACI: paso "Programar el traslado"). */
export async function exigirSesionQuePuedaPropagar(
  request: Request,
): Promise<FalloDeAcceso | AccesoConcedido> {
  const resultado = await exigirSesion(request)
  if (resultado.respuesta) return resultado

  if (!puedePropagar(resultado.sesion.rol)) {
    return {
      respuesta: NextResponse.json(
        {
          error: 'rol_sin_permiso',
          mensaje: `El rol ${resultado.sesion.rol} no propaga cambios a otra plataforma. Según la RACI, el paso "Programar el traslado" lo aprueba la Gerencia de Logística y Equipo.`,
        },
        { status: 403 },
      ),
      sesion: null,
    }
  }

  return resultado
}
