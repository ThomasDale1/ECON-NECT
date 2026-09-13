// Catálogo OEM de intervalos del servicio menor (aceite de motor + filtros),
// por marca y modelo (S-A11 Paso 4). Puro: no conoce HTTP ni el sandbox.
//
// Investigado en línea el 13 de septiembre de 2026. Marca y modelo son
// atributos de catálogo (`make`/`model` en Startrack, `marca`/`modelo` en
// Prisma); el **número de motor no se usa** (AGENTS.md §1.2, y ningún
// fabricante publica intervalos por serie). Cada fila lleva su fuente y su
// confianza; **una fila sin fuente no entra.** Estos números son *parámetros
// declarados con origen externo*, y la pantalla siempre los rotula así —
// nunca como dato del sandbox.
//
// Regla de "severo": donde el fabricante no publica un valor distinto,
// severo = estándar ÷ 2 y la fila lo dice (`severoDeclaradoPorFabricante:
// false`). Es la regla general de Deere y JCB para condiciones duras; se
// rotula como regla, no como dato del fabricante.

export type FilaOem = {
  marca: string
  modelo: string
  alias: string[]
  clase: string
  estandarHoras: number
  severoHoras: number
  severoDeclaradoPorFabricante: boolean
  fuente: string
  confianza: 'alta' | 'media' | 'media-alta'
  nota: string
}

export const CATALOGO_OEM: FilaOem[] = [
  {
    marca: 'Caterpillar',
    modelo: '262D3',
    alias: [],
    clase: 'Minicargador',
    estandarHoras: 500,
    severoHoras: 250,
    severoDeclaradoPorFabricante: false,
    fuente: 'https://tractorgearbox.com/cat_262d3_skid_steer_maintenance.html',
    confianza: 'alta',
    nota: 'hidráulico 1 000 h, refrigerante 3 000 h; severo por regla ÷ 2',
  },
  {
    marca: 'Caterpillar',
    modelo: '252B3',
    alias: [],
    clase: 'Minicargador',
    estandarHoras: 500,
    severoHoras: 250,
    severoDeclaradoPorFabricante: false,
    fuente: 'https://skidsteerloaderspecs.com/cat_252b3_skid_steer_maintenance.html',
    confianza: 'alta',
    nota: 'hidráulico 1 000 h; severo por regla ÷ 2',
  },
  {
    marca: 'Caterpillar',
    modelo: '246',
    alias: [],
    clase: 'Minicargador',
    estandarHoras: 250,
    severoHoras: 250,
    severoDeclaradoPorFabricante: true,
    fuente: 'https://www.ebooklibonline.com/onlinepages/OM-CAT%20246%205SZ00001.pdf',
    confianza: 'media',
    nota: 'serie original (motor 3034, OMM SEBU7468); la vista previa pública no incluye la tabla; el 246D también es 250 h',
  },
  {
    marca: 'Caterpillar',
    modelo: '950H',
    alias: [],
    clase: 'Cargador frontal',
    estandarHoras: 500,
    severoHoras: 250,
    severoDeclaradoPorFabricante: false,
    fuente: 'https://www.scribd.com/document/459633628/PM2',
    confianza: 'alta',
    nota: 'PM2 = 500 h (filtros de motor, combustible e hidráulico); PM1 250 h es inspección; severo por regla ÷ 2',
  },
  {
    marca: 'Caterpillar',
    modelo: '950GC',
    alias: [],
    clase: 'Cargador frontal',
    estandarHoras: 500,
    severoHoras: 250,
    severoDeclaradoPorFabricante: false,
    fuente: 'https://heavyvehicleinspection.com/blog/post/caterpillar-maintenance-schedule-2026',
    confianza: 'media',
    nota: 'por familia Cat PM1–PM4 (250/500/1 000/2 000); severo por regla ÷ 2',
  },
  {
    marca: 'Volvo',
    modelo: 'EC300DL',
    alias: ['EC300D', 'EC300D L'],
    clase: 'Excavadora',
    estandarHoras: 500,
    severoHoras: 250,
    severoDeclaradoPorFabricante: false,
    fuente:
      'https://www.volvoce.com/united-states/en-us/about-us/news/2021/volvo-construction-equipment-extends-oil-change-intervals-to-1000-hours/',
    confianza: 'media-alta',
    nota: '1 000 h solo con aceite VDS-4.5 + filtro Volvo (no verificable en el sandbox: se usa 500 h); severo por regla ÷ 2',
  },
  {
    marca: 'Volvo',
    modelo: '60F',
    alias: ['L60F'],
    clase: 'Cargador frontal',
    estandarHoras: 500,
    severoHoras: 250,
    severoDeclaradoPorFabricante: false,
    fuente:
      'https://www.volvoce.com/united-states/en-us/about-us/news/2021/volvo-construction-equipment-extends-oil-change-intervals-to-1000-hours/',
    confianza: 'media',
    nota: 'misma fuente Volvo 2021; severo por regla ÷ 2',
  },
  {
    marca: 'John Deere',
    modelo: '310L',
    alias: ['310 L'],
    clase: 'Retroexcavadora',
    estandarHoras: 500,
    severoHoras: 250,
    severoDeclaradoPorFabricante: true,
    fuente: 'https://www.deere.com/assets/pdfs/common/qrg/310slhlf390996.pdf',
    confianza: 'alta',
    nota: 'guía Deere cubre 310L PIN F390996–; 250 h si > 1 829 m, B20+ o polvo; filtros hidráulico y transmisión 1 000 h',
  },
  {
    marca: 'John Deere',
    modelo: '770G',
    alias: ['770 G', '770GP'],
    clase: 'Motoniveladora',
    estandarHoras: 500,
    severoHoras: 250,
    severoDeclaradoPorFabricante: true,
    fuente: 'https://www.deere.com/assets/pdfs/common/qrg/770gf678818.pdf',
    confianza: 'alta',
    nota: 'guía Deere; 250 h por su regla general para condiciones duras',
  },
  {
    marca: 'Case',
    modelo: 'CX350B',
    alias: ['CX350 B'],
    clase: 'Excavadora',
    estandarHoras: 500,
    severoHoras: 250,
    severoDeclaradoPorFabricante: false,
    fuente: 'https://ironworksinsider.com/articles/excavator-maintenance-schedule/',
    confianza: 'media',
    nota: 'hidráulico 1 000 h; severo por regla ÷ 2',
  },
  {
    marca: 'JCB',
    modelo: '3CX',
    alias: ['JCB 3CX'],
    clase: 'Retroexcavadora',
    estandarHoras: 500,
    severoHoras: 250,
    severoDeclaradoPorFabricante: true,
    fuente: 'https://www.manualslib.com/manual/1639183/Jcb-3cx.html?page=50',
    confianza: 'media-alta',
    nota: '250 h filtro en condiciones duras',
  },
]

/** Minúsculas, sin espacios ni signos: `"John Deere" + "770 G"` →
 * `johndeere770g`; `"Case" + "CX350 B"` → `casecx350b`; `"Volvo" + "60F"` →
 * `volvo60f`. */
export function claveOem(marca: string | null | undefined, modelo: string | null | undefined): string {
  return `${marca ?? ''}${modelo ?? ''}`.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Prueba, en orden: marca+modelo, marca+alias, y **solo modelo** como
 * último recurso (para la fila de Prisma con la marca mal escrita: modelo
 * `JCB 3CX` → `jcb3cx`). Devuelve la fila o `null`; nunca "la más parecida". */
export function buscarIntervaloOem(entrada: {
  marca: string | null | undefined
  modelo: string | null | undefined
}): FilaOem | null {
  const clave = claveOem(entrada.marca, entrada.modelo)
  if (clave === '') return null

  for (const fila of CATALOGO_OEM) {
    if (claveOem(fila.marca, fila.modelo) === clave) return fila
  }
  for (const fila of CATALOGO_OEM) {
    if (fila.alias.some((alias) => claveOem(fila.marca, alias) === clave)) return fila
  }

  const soloModelo = claveOem(null, entrada.modelo)
  if (soloModelo === '') return null
  for (const fila of CATALOGO_OEM) {
    if (claveOem(fila.marca, fila.modelo) === soloModelo) return fila
    if (fila.alias.some((alias) => claveOem(fila.marca, alias) === soloModelo)) return fila
  }
  return null
}
