// Formas crudas de los datos ya leídos por los conectores, tal como se
// observaron contra la API real el 12 de septiembre de 2026 (S-A2, sección
// "Formas reales observadas"). Ningún campo de acá se inventó: donde el prompt
// no documentó una forma (fallas, proyectos), este archivo no la tipa — ver
// "desviaciones del plan" en el reporte final (AGENTS.md §1.1).
//
// Estos tipos son deliberadamente más laxos que un `unknown`: documentan la
// forma observada para que identidad.ts/estados.ts/modelo.ts no tengan que
// adivinar, pero cada campo de catálogo (estado, clase_equipo, status, tipo)
// se mantiene en `string`, nunca en la unión literal de catalogos.ts — así R8
// puede detectar un valor fuera de catálogo en vez de que el tipo lo prohíba.

import type { Plataforma } from '@/lib/tipos/canonico'

export type EquipoPrismaCrudo = {
  id: number | string
  empresa: string | null
  clave: string | null
  no_activo: string | null
  nombre: string | null
  clase_equipo: string | null
  marca: string | null
  modelo: string | null
  anio: number | null
  precio_x_hora: number | null
  minimum_usage_hours: number | null
  estado: string | null
  project_id: number | string | null
  project_name: string | null
  active_failure_id: number | string | null
  active_failure_status: string | null
  active_failure_is_paro: boolean | null
  fallas_count: number | null
  occupied_without_project?: boolean | null
}

export type SolicitudPrismaCruda = {
  id: number | string
  project_id: number | string | null
  tipo: string | null
  status: string | null
  approved_at: string | null
  approved_by_name: string | null
  maquinaria_id: number | string | null
  maquinaria_no_activo: string | null
  maquinaria_nombre: string | null
  maquinaria_clave: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  created_at: string | null
}

export type VehiculoStartrackCrudo = {
  id: number | string
  description: string | null
  veh_type: number | null
  make: string | null
  model: string | null
  status: string | null
  tags: string | null
  unit_id: number | string | null
  driver_id: number | string | null
  license_plate: string | null
}

export type GeocercaStartrackCruda = {
  id: number | string
  name: string | null
  address: string | null
  x: number | null
  y: number | null
  group_id: number | string | null
}

export type TareaStartrackCruda = {
  id: number | string
  status: string | null
  status_name: string | null
  job_type_id: number | string | null
  start_date: string | null
  end_datetime: string | null
  creation_date: string | null
  poi_id: number | string | null
  poi_name: string | null
  origin_poi_id: number | string | null
  origin_poi_name: string | null
  assigned_vehicle_id: number | string | null
  assigned_user_ids: (number | string)[] | null
  remote_id: string | null
  x: number | null
  y: number | null
  address: string | null
}

export type TipoTareaStartrackCrudo = {
  id: number | string
  name: string | null
}

/** Procedencia de una fuente completa (una lista), la misma forma que
 * `RespuestaConector.linaje` de lib/conectores/tipos.ts pero copiada acá en
 * vez de importada — lib/canonico no conoce HTTP ni la capa de conectores
 * (AGENTS.md §4.3); quien orquesta (scripts/reconciliar.ts) arma este objeto
 * a partir de lo que devuelve el conector. */
export type ProcedenciaFuente = {
  plataforma: Plataforma
  endpoint: string
  leidoEn: string
}

export type FuenteCruda<T> = ProcedenciaFuente & {
  datos: T[]
}

/** Lo que `reconciliar()` recibe. Deliberadamente no incluye `fallas` ni
 * `proyectos`: el prompt los menciona como fuente, pero su forma real no está
 * documentada en la sección "Formas reales observadas" de S-A2, y la
 * información que R4/R6/R7 necesitan (estado de la falla activa, proyecto
 * asignado) ya viene embebida en `EquipoPrismaCrudo` (`active_failure_*`,
 * `project_id`, `project_name`). Anotado como desviación del plan al final. */
export type DatosCrudos = {
  equipos: FuenteCruda<EquipoPrismaCrudo>
  solicitudes: FuenteCruda<SolicitudPrismaCruda>
  vehiculos: FuenteCruda<VehiculoStartrackCrudo>
  geocercas: FuenteCruda<GeocercaStartrackCruda>
  tareas: FuenteCruda<TareaStartrackCruda>
  tiposTarea: FuenteCruda<TipoTareaStartrackCrudo>
}
