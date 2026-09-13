// ═══════════════════════════════════════════════════════════════════════════
// DATOS FABRICADOS — no provienen del sandbox de ECON.
//
// Contenido del mockup de Figma, escrito a mano para poder construir la pantalla
// antes de que existan los conectores. AGENTS.md §1.2 prohíbe versionar
// registros del sandbox: cuando el carril A entregue las rutas de API, este
// archivo se borra y la página lee del servidor.
// ═══════════════════════════════════════════════════════════════════════════

import type { ObjetoDescrito, Veredicto } from '@/lib/tipos/canonico'

/** Un estado de origen más la etiqueta de qué objeto describe (ui-registry §3.4). */
export type ValorObservado = {
  valor: string | null
  objeto: ObjetoDescrito
}

export type ActivoEnCurso = {
  id: string
  codigo: string
  nombre: string
  modelo: string
  clase: string
  origen: string
  destino: string
  estado: string
  etaMinutos: number
}

export type ViolacionGeocerca = {
  id: string
  codigo: string
  nombre: string
  modelo: string
  clase: string
  geocerca: string
  hora: string
  severidad: string
}

export type FilaExcepcion = {
  id: string
  veredicto: Veredicto
  codigo: string
  nombre: string
  modelo: string
  clase: string
  proyecto: string
  prisma: ValorObservado
  startrack: ValorObservado
  confianza: number
  accionSugerida: string
  /** TODO carril C — S-C3: sale de `lib/gobernanza/raci.ts`, no se escribe a mano. */
  responsable: string
}

export const ACTIVOS_EN_CURSO: ActivoEnCurso[] = [
  {
    id: 'RE-02',
    codigo: 'RE-02',
    nombre: 'Retroexcavadora',
    modelo: 'CAT 320D',
    clase: 'Maquinaria pesada',
    origen: 'Taller Central',
    destino: 'Proyecto Épsilon',
    estado: 'En curso',
    etaMinutos: 22,
  },
  {
    id: 'CF-07',
    codigo: 'CF-07',
    nombre: 'Cargador frontal',
    modelo: 'CAT 950M',
    clase: 'Maquinaria pesada',
    origen: 'Patio Norte',
    destino: 'Proyecto Delta',
    estado: 'En curso',
    etaMinutos: 48,
  },
  {
    id: 'MIX-12',
    codigo: 'MIX-12',
    nombre: 'Camión mezclador',
    modelo: 'Mack Granite',
    clase: 'Transporte',
    origen: 'Planta de concreto',
    destino: 'Proyecto Épsilon',
    estado: 'En curso',
    etaMinutos: 9,
  },
]

export const VIOLACIONES_GEOCERCA: ViolacionGeocerca[] = [
  {
    id: 'CAM-03',
    codigo: 'CAM-03',
    nombre: 'Camión volquete',
    modelo: 'Volvo FMX',
    clase: 'Transporte',
    geocerca: 'Proyecto Épsilon — La Libertad',
    hora: '14:29:04',
    severidad: 'Crítico',
  },
  {
    id: 'EXC-05',
    codigo: 'EXC-05',
    nombre: 'Excavadora',
    modelo: 'Komatsu PC210',
    clase: 'Maquinaria pesada',
    geocerca: 'Proyecto Delta — San Miguel',
    hora: '14:17:52',
    severidad: 'Crítico',
  },
  {
    id: 'MOT-005',
    codigo: 'MOT-005',
    nombre: 'Motoniveladora',
    modelo: 'John Deere 670G',
    clase: 'Flota',
    geocerca: 'Proyecto Delta — San Miguel',
    hora: '13:58:31',
    severidad: 'Crítico',
  },
]

export const EXCEPCIONES: FilaExcepcion[] = [
  {
    id: 'RE-02',
    veredicto: 'ATENCION',
    codigo: 'RE-02',
    nombre: 'Retroexcavadora',
    modelo: 'CAT 320D',
    clase: 'Maquinaria pesada',
    proyecto: 'Proyecto Épsilon',
    prisma: { valor: 'Solicitud aprobada', objeto: 'tarea' },
    startrack: { valor: 'Detenido, sin telemetría', objeto: 'recurso' },
    confianza: 90,
    accionSugerida: 'Confirmar con el operador si la unidad está en espera.',
    responsable: 'Logística',
  },
  {
    id: 'MOT-005',
    veredicto: 'EN_RIESGO',
    codigo: 'MOT-005',
    nombre: 'Motoniveladora',
    modelo: 'John Deere 670G',
    clase: 'Flota',
    proyecto: 'Proyecto Delta',
    prisma: { valor: 'Mantenimiento programado', objeto: 'falla' },
    startrack: { valor: 'Activa y en movimiento', objeto: 'tarea' },
    confianza: 98,
    accionSugerida: 'Detener la unidad y validar el permiso de seguridad.',
    responsable: 'Mantenimiento',
  },
  {
    id: 'MIX-12',
    veredicto: 'SIN_EVIDENCIA',
    codigo: 'MIX-12',
    nombre: 'Camión mezclador',
    modelo: 'Mack Granite',
    clase: 'Transporte',
    proyecto: 'Proyecto Épsilon',
    // `null` = no se pudo leer. La tabla lo escribe como "Sin registro" (§3.4).
    prisma: { valor: null, objeto: 'recurso' },
    startrack: { valor: 'GPS dentro de la geocerca', objeto: 'recurso' },
    confianza: 64,
    accionSugerida: 'Revisar el despliegue no registrado en Prisma.',
    responsable: 'Maquinaria y Equipo',
  },
]
