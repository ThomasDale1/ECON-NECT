// Pruebas puras de la orden de taller (S-A11 Paso 12): **el servidor** rechaza
// escribir sobre un recurso ajeno, sin confirmación y con un rol sin permiso.
// No alcanza con esconder el botón (AGENTS.md §9.4).
//
// Los identificadores son sintéticos a propósito (igual que en
// restriccion.test.ts): no son los del sandbox. Los conectores están
// simulados y **lanzan si se los llama**: ninguna de estas pruebas puede
// escribir en Prisma ni en Startrack.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/lectura/flota', () => ({
  leerFlota: vi.fn(async () => ({
    equipos: [],
    datos: {
      equipos: {
        plataforma: 'prisma',
        endpoint: '/api/maquinaria/equipos',
        leidoEn: '2026-09-13T12:00:00.000Z',
        datos: [
          {
            id: 'eq-sintetico-1',
            no_activo: 'EQ-SINTETICO-1',
            estado: 'DISPONIBLE',
            project_id: 'proy-sintetico-1',
            project_name: 'PROY-999 Proyecto sintético',
            clave: null,
            marca: null,
            modelo: null,
            active_failure_is_paro: null,
            active_failure_status: null,
          },
        ],
      },
      vehiculos: {
        plataforma: 'startrack',
        endpoint: 'ajax/vehicles.php?cmd=list',
        leidoEn: '2026-09-13T12:00:00.000Z',
        datos: [{ id: 'veh-sintetico-1', description: 'EQ-SINTETICO-1', make: null, model: null }],
      },
      tareas: { plataforma: 'startrack', endpoint: 'api/job', leidoEn: '2026-09-13T12:00:00.000Z', datos: [] },
      solicitudes: { plataforma: 'prisma', endpoint: '/api/maquinaria/requests', leidoEn: '', datos: [] },
      geocercas: { plataforma: 'startrack', endpoint: 'ajax/namedPlaces.php?cmd=list', leidoEn: '', datos: [] },
      tiposTarea: { plataforma: 'startrack', endpoint: 'api/job/type', leidoEn: '', datos: [] },
    },
    salud: [],
    degradacion: { degradado: false, plataformasCaidas: [], razones: [] },
    fallas: [],
    leidoEn: '2026-09-13T12:00:00.000Z',
  })),
}))

vi.mock('@/lib/lectura/mantenimiento', () => ({
  leerPronostico: vi.fn(async () => null),
}))

const escrituraPrisma = vi.fn(async () => {
  throw new Error('programarMantenimiento no debe llamarse en estas pruebas')
})
const escrituraStartrack = vi.fn(async () => {
  throw new Error('actualizarEstadoVehiculo no debe llamarse en estas pruebas')
})

vi.mock('@/lib/conectores/prisma', () => ({
  MAX_NOTAS_MANTENIMIENTO: 500,
  programarMantenimiento: (...args: unknown[]) => escrituraPrisma(...(args as [])),
}))

vi.mock('@/lib/conectores/startrack', () => ({
  actualizarEstadoVehiculo: (...args: unknown[]) => escrituraStartrack(...(args as [])),
  leerVehiculo: vi.fn(async () => ({ datos: { status: '0', campos: 55 }, linaje: {} })),
}))

import { abrirOrdenTaller, PropagacionRechazada, redactarNotas } from './taller'
import { POST } from '@/app/api/propagar/taller/route'
import { firmarSesion, NOMBRE_COOKIE, type RolSesion } from '@/lib/acceso/verificar'

const ENV_ORIGINAL = { ...process.env }

beforeEach(() => {
  // Claves de rol sintéticas: solo para firmar la cookie de prueba.
  process.env.NECT_CLAVE_LOGISTICA = 'clave-prueba-logistica'
  process.env.NECT_CLAVE_MANTENIMIENTO = 'clave-prueba-mantenimiento'
  process.env.NECT_CLAVE_ADMIN = 'clave-prueba-admin'
  delete process.env.NECT_EQUIPO_PROPIO
  delete process.env.NECT_PROYECTO_PROPIO
  escrituraPrisma.mockClear()
  escrituraStartrack.mockClear()
})

afterEach(() => {
  process.env = { ...ENV_ORIGINAL }
})

const peticionBase = {
  equipoId: 'eq-sintetico-1',
  fechaInicio: '2026-09-13',
  fechaFin: '2026-09-14',
  notas: '',
  rol: 'MANTENIMIENTO' as const,
}

describe('abrirOrdenTaller — restricción de recurso propio (servidor)', () => {
  it('rechaza recurso_ajeno con NECT_EQUIPO_PROPIO vacío (falla cerrada)', async () => {
    await expect(abrirOrdenTaller(peticionBase)).rejects.toMatchObject({ motivo: 'recurso_ajeno' })
    expect(escrituraPrisma).not.toHaveBeenCalled()
    expect(escrituraStartrack).not.toHaveBeenCalled()
  })

  it('rechaza recurso_ajeno con NECT_EQUIPO_PROPIO distinto', async () => {
    process.env.NECT_EQUIPO_PROPIO = 'EQ-DE-OTRO'
    process.env.NECT_PROYECTO_PROPIO = 'PROY-999'
    await expect(abrirOrdenTaller(peticionBase)).rejects.toMatchObject({ motivo: 'recurso_ajeno' })
    expect(escrituraPrisma).not.toHaveBeenCalled()
  })

  it('con el equipo propio declarado pasa la guarda y recién entonces intenta P4', async () => {
    process.env.NECT_EQUIPO_PROPIO = 'EQ-SINTETICO-1'
    process.env.NECT_PROYECTO_PROPIO = 'PROY-999'
    await expect(abrirOrdenTaller(peticionBase)).rejects.toThrow(/programarMantenimiento no debe llamarse/)
    expect(escrituraPrisma).toHaveBeenCalledTimes(1)
    expect(escrituraStartrack).not.toHaveBeenCalled()
  })

  it('rechaza fechas inválidas antes de la restricción', async () => {
    await expect(abrirOrdenTaller({ ...peticionBase, fechaInicio: '2026-09-15' })).rejects.toMatchObject({
      motivo: 'fechas_invalidas',
    })
  })

  it('PropagacionRechazada lleva el motivo tipado', () => {
    const e = new PropagacionRechazada('orden_ya_abierta', 'x')
    expect(e.motivo).toBe('orden_ya_abierta')
  })
})

describe('redactarNotas', () => {
  it('sin pronóstico deja el encabezado y las notas del usuario, ≤ 500', () => {
    const texto = redactarNotas(null, 'x'.repeat(600))
    expect(texto.startsWith('[ECON NECT] Orden de taller preventiva.')).toBe(true)
    expect(texto.length).toBeLessThanOrEqual(500)
  })
})

async function peticion(rol: RolSesion | null, cuerpo: unknown): Promise<Response> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (rol) headers.cookie = `${NOMBRE_COOKIE}=${await firmarSesion(rol)}`
  return POST(
    new NextRequest('http://localhost/api/propagar/taller', {
      method: 'POST',
      headers,
      body: JSON.stringify(cuerpo),
    }),
  )
}

describe('POST /api/propagar/taller — guardas en orden', () => {
  it('sin sesión → 401', async () => {
    const r = await peticion(null, { accion: 'abrir', equipoId: 'x', confirmado: true })
    expect(r.status).toBe(401)
  })

  it('rol LOGISTICA → 403 rol_sin_permiso (la orden de taller es de Mantenimiento)', async () => {
    const r = await peticion('LOGISTICA', {
      accion: 'abrir',
      equipoId: 'eq-sintetico-1',
      fechaInicio: '2026-09-13',
      fechaFin: '2026-09-14',
      confirmado: true,
    })
    expect(r.status).toBe(403)
    expect((await r.json()).error).toBe('rol_sin_permiso')
  })

  it('sin confirmado: true → 400 y no escribe', async () => {
    const r = await peticion('MANTENIMIENTO', {
      accion: 'abrir',
      equipoId: 'eq-sintetico-1',
      fechaInicio: '2026-09-13',
      fechaFin: '2026-09-14',
      confirmado: 'true',
    })
    expect(r.status).toBe(400)
    expect(escrituraPrisma).not.toHaveBeenCalled()
  })

  it('MANTENIMIENTO confirmado sobre recurso ajeno → 403 recurso_ajeno desde el servidor', async () => {
    const r = await peticion('MANTENIMIENTO', {
      accion: 'abrir',
      equipoId: 'eq-sintetico-1',
      fechaInicio: '2026-09-13',
      fechaFin: '2026-09-14',
      confirmado: true,
    })
    expect(r.status).toBe(403)
    expect((await r.json()).error).toBe('recurso_ajeno')
    expect(escrituraPrisma).not.toHaveBeenCalled()
  })

  it('cerrar sobre recurso ajeno → 403 recurso_ajeno', async () => {
    const r = await peticion('ADMIN', { accion: 'cerrar', equipoId: 'eq-sintetico-1', confirmado: true })
    expect(r.status).toBe(403)
    expect(escrituraStartrack).not.toHaveBeenCalled()
  })
})
