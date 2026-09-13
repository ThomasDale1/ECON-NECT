// Adapta la envoltura de conector (`{ datos, linaje }`, lib/conectores/tipos.ts)
// a `FuenteCruda<T>` (S-A7 Paso 4c). Extraído de `scripts/reconciliar.ts` para
// que `lib/optimizador/insumos.ts` no lo duplique — ambos orquestadores arman
// `DatosCrudos`/insumos del optimizador a partir de lo que devuelven los
// conectores. Solo type-only del lado de conectores: no ejecuta HTTP.

import type { RespuestaConector } from '@/lib/conectores/tipos'
import type { FuenteCruda } from './tipos-crudos'

export function comoFuente<T>(respuesta: RespuestaConector<unknown[]>): FuenteCruda<T> {
  return {
    datos: respuesta.datos as T[],
    plataforma: respuesta.linaje.plataforma,
    endpoint: respuesta.linaje.endpoint,
    leidoEn: respuesta.linaje.leidoEn,
  }
}
