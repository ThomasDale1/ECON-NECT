// ═══════════════════════════════════════════════════════════════════════════
// DATOS FABRICADOS — no provienen del sandbox de ECON.
//
// Contenido del mockup de Figma, escrito a mano para poder construir la pantalla
// antes de que existan los conectores. AGENTS.md §1.2 prohíbe versionar
// registros del sandbox: cuando el carril A entregue las rutas de API, este
// archivo se borra y la página lee del servidor.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Enlace al registro del equipo en Startrack.
 *
 * TODO: falta la URL. El conector solo conoce la superficie `ajax/*.php`, que es
 * la API, no la pantalla. Para construirlo hacen falta dos cosas que hoy no
 * tenemos: el host real (`STARTRACK_BASE_URL` vive en `.env.local`, que no
 * existe) y la ruta de la ficha del vehículo en la interfaz.
 *
 * Mientras sea `null` el badge se dibuja sin enlace, que es lo correcto: mandar
 * a alguien a una URL inventada es peor que no enlazar.
 */
type EnlaceStartrack = string | null

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
  urlStartrack: EnlaceStartrack
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
  urlStartrack: EnlaceStartrack
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
    urlStartrack: null,
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
    urlStartrack: null,
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
    urlStartrack: null,
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
    urlStartrack: null,
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
    urlStartrack: null,
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
    urlStartrack: null,
  },
]
