// ═══════════════════════════════════════════════════════════════════════════
// DATOS FABRICADOS — no provienen del sandbox de ECON.
//
// Contenido del mockup de O.D.I.N., escrito a mano. **Nada de esto lo calcula el
// sistema**: no hay modelo de predicción, no hay integración de mensajería y no
// hay motor de recomendación. Es la maqueta de un feature propuesto.
//
// Dos avisos que conviene resolver antes de enseñarlo al jurado:
//
// 1. AGENTS.md §6 prohíbe vender heurística como IA: "La confianza es una
//    heurística determinística y documentada. Venderla como IA nos hunde en el
//    criterio de honestidad que usamos como diferenciador." Los rótulos
//    "O.D.I.N." y "Predicción Preventiva" van justo en contra.
// 2. WhatsApp está retirado del proyecto (§5 y §6). Acá es solo una lista
//    pintada: no se instaló Twilio ni ningún cliente de mensajería, y nada se
//    envía a nadie.
// ═══════════════════════════════════════════════════════════════════════════

export type Prediccion = {
  activo: string
  resumen: string
  detalle: string
  confianza: number
}

export type AlertaEnviada = {
  id: string
  destinatario: string
  area: string
  hace: string
  mensaje: string
}

export type ConflictoDisponibilidad = {
  titulo: string
  situacion: string
  recomendacion: string
}

export const PREDICCION: Prediccion = {
  activo: 'RE-02',
  resumen: 'requiere mantenimiento preventivo en ~120 hrs de uso.',
  detalle: 'Temperatura de culata 12% sobre línea base.',
  confianza: 87,
}

export const ALERTAS: AlertaEnviada[] = [
  {
    id: 'al-1',
    destinatario: 'Carlos Méndez',
    area: 'Logística',
    hace: 'hace 15m',
    mensaje: 'RE-02 fuera de geocerca Épsilon. Reporte automático enviado.',
  },
  {
    id: 'al-2',
    destinatario: 'Ana Portillo',
    area: 'Mantenimiento',
    hace: 'hace 1h',
    mensaje: 'MOT-005 requiere cambio de filtro (preventivo programado).',
  },
]

export const CONFLICTO: ConflictoDisponibilidad = {
  titulo: 'Conflicto de disponibilidad',
  situacion: 'RE-02 solicitada simultáneamente en Proyectos Épsilon y Delta.',
  recomendacion:
    'Asignar a Épsilon (proximidad 8 km, combustible −23%, técnica ✓). Reemplazo sugerido para Delta: MOT-007 disponible.',
}

export const CONSULTAS_RAPIDAS = ['Interpretar estado', 'Pronóstico de flota', 'Enviar alerta']
