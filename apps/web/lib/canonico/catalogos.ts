// Catálogos verificados contra la API real el 12 de septiembre de 2026
// (S-A2, sección "Formas reales observadas"). Se tipan como uniones literales
// para poder documentar el catálogo declarado — nunca para forzar los datos
// crudos a esa forma: un valor fuera de catálogo (p. ej. "Retroexcavadoras" en
// plural) es exactamente lo que R8 tiene que detectar, así que los campos
// crudos correspondientes siguen tipados como `string` (ver tipos-crudos.ts).

export type EstadoEquipoCatalogo = 'DISPONIBLE' | 'OCUPADA' | 'OBSOLETA'
export const CATALOGO_ESTADO_EQUIPO: readonly EstadoEquipoCatalogo[] = [
  'DISPONIBLE',
  'OCUPADA',
  'OBSOLETA',
]

export type EstadoSolicitudCatalogo = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA'
export const CATALOGO_ESTADO_SOLICITUD: readonly EstadoSolicitudCatalogo[] = [
  'PENDIENTE',
  'APROBADA',
  'RECHAZADA',
]

export type EstadoFallaCatalogo =
  | 'SIN_REVISAR'
  | 'PENDIENTE_INTERVENCION'
  | 'EN_PROCESO'
  | 'ESPERA_REPUESTOS'
  | 'TRASLADO_STD'
  | 'EN_PRUEBAS'
  | 'FINALIZADO'
  | 'RECHAZADO'
export const CATALOGO_ESTADO_FALLA: readonly EstadoFallaCatalogo[] = [
  'SIN_REVISAR',
  'PENDIENTE_INTERVENCION',
  'EN_PROCESO',
  'ESPERA_REPUESTOS',
  'TRASLADO_STD',
  'EN_PRUEBAS',
  'FINALIZADO',
  'RECHAZADO',
]

export type ClaseEquipoCatalogo =
  | 'Cargador frontal'
  | 'Excavadora'
  | 'Minicargador'
  | 'Motoniveladora'
  | 'Retroexcavadora'
export const CATALOGO_CLASE_EQUIPO: readonly ClaseEquipoCatalogo[] = [
  'Cargador frontal',
  'Excavadora',
  'Minicargador',
  'Motoniveladora',
  'Retroexcavadora',
]

export type TipoTareaCatalogo = 'Traslado' | 'Pedido' | 'Visita' | 'ENTREGA DE AGREGADOS' | 'Nuevo'
export const CATALOGO_TIPO_TAREA: readonly TipoTareaCatalogo[] = [
  'Traslado',
  'Pedido',
  'Visita',
  'ENTREGA DE AGREGADOS',
  'Nuevo',
]

/** Estados de tarea que ya no cuentan como "viva" para R1/R2/R3 (dispatchados
 * contra el catálogo de Startrack — Pendiente/Completada/Cancelada/estados
 * personalizados, diccionario de datos hoja STARTRACK módulo Tareas fila 27).
 * Comparación insensible a mayúsculas porque el catálogo real observado en
 * `status_name` no se confirmó en una sola grafía. */
const ESTADOS_TAREA_FINALIZADA = ['completada', 'cancelada']

export function tareaFinalizada(valorEstadoTarea: string | null): boolean {
  if (!valorEstadoTarea) return false
  return ESTADOS_TAREA_FINALIZADA.includes(valorEstadoTarea.trim().toLowerCase())
}


/** Código `status` en el registro de vehículo de Startrack (`ajax/vehicles.php`).
 * Confirmado por operación el 13-sep-2026: describe el **estado del conductor**,
 * no el del recurso. 0 / vacío / null = Normal.
 * No se fusiona con DISPONIBLE / OCUPADA / OBSOLETA de Prisma. */
export const ESTADO_VEHICULO_STARTRACK = {
  '0': 'Normal',
  '1': 'Mantenimiento',
  '2': 'Fuera de servicio',
  '3': 'Dispositivo de rastreo en reparación',
  '4': 'Se usa de vez en cuando',
  '5': 'En línea',
  '6': 'Fuera de línea',
  '7': 'Almorzando',
  '8': 'Reunión',
  '9': 'Vacaciones',
} as const

export type CodigoEstadoVehiculoStartrack = keyof typeof ESTADO_VEHICULO_STARTRACK

export function interpretarEstadoVehiculoStartrack(
  status: string | number | null | undefined,
): { codigo: string | null; etiqueta: string; enCatalogo: boolean } {
  if (status == null || String(status).trim() === '') {
    return { codigo: null, etiqueta: 'Normal', enCatalogo: true }
  }
  const codigo = String(status).trim()
  const etiqueta = ESTADO_VEHICULO_STARTRACK[codigo as CodigoEstadoVehiculoStartrack]
  if (etiqueta) return { codigo, etiqueta, enCatalogo: true }
  return { codigo, etiqueta: codigo, enCatalogo: false }
}
