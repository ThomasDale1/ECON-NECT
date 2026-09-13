// Contrato del mantenimiento preventivo por horómetro (S-A11 Paso 1, carril A).
//
// Carpeta nueva `lib/mantenimiento/` con la misma justificación que
// `lib/optimizador/`: no cabe en conectores (que leen una plataforma) ni en
// canónico (que resuelve identidad y veredicto y **no se toca**: la alerta de
// mantenimiento no es una regla de coherencia — línea roja, 01 H.3).
//
// Todo tipo lleva su origen. Dos horómetros distintos conviven acá y **nunca
// se comparan**: el GPS de Startrack (arranca en 0 al instalar el equipo) y el
// humano de Prisma (`hour_meter` del reporte de falla, que teclea el operador).
// Todo cálculo usa deltas dentro de la misma fuente.

// Solo tipos: `flota.ts` es server-only, pero un `import type` se borra al
// compilar y no arrastra el módulo al cliente.
import type { Degradacion } from '@/lib/lectura/flota'
import type { Linaje, SaludFuente } from '@/lib/tipos/canonico'

/** Contador acumulado del vehículo. Fuente: `ajax/report.php?id=22`
 * (Estado de flota), verificado el 13 de septiembre de 2026: 14 filas,
 * `curOperatingHours` no nulo en 14/14 y > 0 en 13/14; coincide con
 * `ign_on_time` de `GET api/vehicle/{id}/status` en 14/14. */
export type HorometroVivo = {
  vehiculoId: string
  horasMotor: number | null // curOperatingHours (h)
  odometroKm: number | null // curOdometer (km, odom_units = 1 en 14/14)
  linaje: Linaje // startrack · ajax/report.php?id=22 · curOperatingHours
}

/** Una fila del Resumen Diario (`ajax/report.php?id=3`), por vehículo y día.
 * Puede haber más de una fila por vehículo y día (10 vehículos observados):
 * se suman en el cálculo, no acá. `driver` es un nombre y se descarta dentro
 * del conector (AGENTS.md §1.2). */
export type FilaSerieDiaria = {
  vehiculoId: string
  fecha: string // AAAA-MM-DD, zona del reporte
  motorEncendidoSeg: number | null // ignOnTime (segundos)
  enMovimientoSeg: number | null // timeInMotion
  ralentiSeg: number | null // idling
}

export type SerieDiaria = { desde: string; hasta: string; filas: FilaSerieDiaria[]; linaje: Linaje }

/** Proyección del reporte de falla de Prisma (`GET /api/maquinaria/fallas`).
 * Nunca `operator_name` ni `approver_name`, ni `descripcion`,
 * `observaciones` o `approver_comment` (texto libre de personal de ECON). */
export type ReporteFallaPrisma = {
  id: string
  /** Ver Paso 3: el nombre real del campo de enlace con el equipo no pudo
   * observarse (0 reportes en el sandbox). Se prueban `maquinaria_id` →
   * `equipo_id` → `machinery_id`; `null` si ninguno existe. */
  maquinariaId: string | null
  estado: string | null // catálogo de 8 valores (01 E.2)
  esParo: boolean | null
  horometroHumano: number | null // hour_meter — NUNCA se compara con horasMotor
  categoria: string | null
  creadoEn: string | null
  actualizadoEn: string | null
  linaje: Linaje
}

/** Ventana de mantenimiento programado del equipo en Prisma
 * (`GET /api/maquinaria/equipos/{id}`): existe en 17/17, vacía en 17/17 al
 * 13 de septiembre de 2026. NECT la escribe en P4. */
export type MantenimientoEquipoPrisma = {
  fechaInicio: string | null
  fechaFin: string | null
  notas: string | null
  linaje: Linaje
}

/** Parámetros que viven en `localStorage` del navegador y viajan en cada
 * consulta. El servidor no guarda nada: aplica, calcula y devuelve qué
 * parámetros aplicó. */
export type ParametrosMantenimiento = {
  version: 1
  porEquipo: Record<string, { intervaloHoras?: number; severo?: boolean }>
  umbrales?: { aviso: number; urgente: number; vencido: number } // porcentajes, defecto 80/90/100
}

export type NivelIntervalo = 'sobreescrito' | 'aprendido' | 'declarado' | 'sin_dato'
export type NivelAlerta = 'aviso' | 'urgente' | 'vencido' | null
export type TipoAncla = 'mantenimiento_fecha_fin' | 'reporte_finalizado' | 'inicio_serie_gps'

export type IntervaloResuelto = {
  nivel: NivelIntervalo
  horas: number | null
  regimen: 'estandar' | 'severo' | null
  /** Texto para pantalla: "OEM Caterpillar 262D3, estándar" · "mediana de 3
   * reportes FINALIZADO" · "fijado a mano en este navegador". */
  origen: string
  /** URL del catálogo, endpoint de Prisma, o "navegador". */
  fuente: string | null
  confianza: 'alta' | 'media' | 'baja' | null
  /** Lo que diría el catálogo aunque esté sobreescrito, para el rótulo. */
  oemHoras: number | null
}

export type PronosticoMantenimiento = {
  equipoId: string
  codigoActivo: string | null
  vehiculoId: string | null
  clase: string | null
  marcaModelo: string | null
  estadoTaller: 'operando' | 'en_taller' | 'parada_por_falla'
  ancla: { tipo: TipoAncla; fecha: string; linaje: Linaje } | null
  horasDesdeAncla: number | null
  horasMotorTotales: number | null
  intervalo: IntervaloResuelto
  avance: number | null // horasDesdeAncla / intervalo.horas
  nivelAlerta: NivelAlerta
  ritmoHorasPorDia: number | null
  diasConMotorUltimos7: number
  fechaEstimadaAviso: string | null
  fechaEstimadaVencido: string | null
  /** Todo número usado, con endpoint, campo y hora. */
  registros: Linaje[]
  /** "intervalo fijado a mano: 40 h", "régimen severo". */
  parametrosAplicados: string[]
  /** "intervalo: sin fila OEM para <marca modelo> y sin historial". */
  faltantes: string[]
  /** "la serie diaria y el contador difieren en 0.3 h". */
  advertencias: string[]
  leidoEn: string
}

export type ResultadoMantenimiento = {
  pronosticos: PronosticoMantenimiento[]
  /** `nivelAlerta !== null`, orden vencido > urgente > aviso, luego avance desc. */
  alertas: PronosticoMantenimiento[]
  resumen: { equipos: number; conHorometro: number; conIntervalo: number; enAlerta: number; enTaller: number }
  salud: SaludFuente[]
  degradacion: Degradacion
  leidoEn: string
}
