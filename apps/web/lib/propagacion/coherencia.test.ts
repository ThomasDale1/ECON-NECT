// Pruebas puras de la coherencia de estado (R2 desde el expediente): **el
// servidor** rechaza escribir sobre un recurso ajeno, sin confirmación y con
// un rol sin permiso (AGENTS.md §9.4).
//
// Identificadores sintéticos a propósito, no los del sandbox. Los conectores
// están simulados: ninguna de estas pruebas escribe en Prisma ni en Startrack.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const fixture = vi.hoisted(() => ({
  estado: 'OBSOLETA' as string,
  paro: null as boolean | null,
  statusTarea: 'Pending' as string,
}))

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
            estado: fixture.estado,
            project_id: null,
            project_name: null,
            clave: null,
            marca: null,
            modelo: null,
            active_failure_is_paro: fixture.paro,
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
      tareas: {
        plataforma: 'startrack',
        endpoint: 'api/job',
        leidoEn: '2026-09-13T12:00:00.000Z',
        datos: [
          {
            id: 'tarea-sintetica-1',
            status: '0',
            status_name: fixture.statusTarea,
            job_type_id: 'tipo-traslado',
            assigned_vehicle_id: 'veh-sintetico-1',
            poi_id: 'geo-sintetica-1',
            poi_name: null,
            remote_id: null,
          },
        ],
      },
      solicitudes: { plataforma: 'prisma', endpoint: '/api/maquinaria/requests', leidoEn: '', datos: [] },
      geocercas: {
        plataforma: 'startrack',
        endpoint: 'ajax/namedPlaces.php?cmd=list',
        leidoEn: '',
        datos: [{ id: 'geo-sintetica-1', name: 'PROY-999 Geocerca sintética' }],
      },
      tiposTarea: { plataforma: 'startrack', endpoint: 'api/job/type', leidoEn: '', datos: [{ id: 'tipo-traslado', name: 'Traslado' }] },
    },
    salud: [],
    degradacion: { degradado: false, plataformasCaidas: [], razones: [] },
    fallas: [],
    leidoEn: '2026-09-13T12:00:00.000Z',
  })),
}))

const escrituraPrisma = vi.fn(async (id: string, estado: string) => ({
  antes: 'OBSOLETA',
  despues: estado,
  endpoint: `/api/maquinaria/equipos/${id}/estado`,
  metodo: 'PATCH' as const,
  hora: '2026-09-13T12:00:01.000Z',
}))
const escrituraStartrack = vi.fn(async (tareaId: string, status: string) => ({
  tareaId,
  antes: '0',
  despues: status,
  endpoint: `api/job/${tareaId}`,
  metodo: 'PUT' as const,
  hora: '2026-09-13T12:00:01.000Z',
}))

vi.mock('@/lib/conectores/prisma', () => ({
  actualizarEstadoEquipo: (...args: [string, string]) => escrituraPrisma(...args),
}))
vi.mock('@/lib/conectores/startrack', () => ({
  actualizarEstadoTarea: (...args: [string, string]) => escrituraStartrack(...args),
}))

import { resolverCoherenciaEstado } from './coherencia'
import { equivalenciaPara } from './equivalencias'
import { tareaFinalizada } from '@/lib/canonico/catalogos'
import { POST } from '@/app/api/propagar/coherencia/route'
import { firmarSesion, NOMBRE_COOKIE, type RolSesion } from '@/lib/acceso/verificar'

const ENV_ORIGINAL = { ...process.env }

beforeEach(() => {
  process.env.NECT_CLAVE_LOGISTICA = 'clave-prueba-logistica'
  process.env.NECT_CLAVE_MANTENIMIENTO = 'clave-prueba-mantenimiento'
  process.env.NECT_CLAVE_ADMIN = 'clave-prueba-admin'
  delete process.env.NECT_EQUIPO_PROPIO
  delete process.env.NECT_PROYECTO_PROPIO
  fixture.estado = 'OBSOLETA'
  fixture.paro = null
  fixture.statusTarea = 'Pending'
  escrituraPrisma.mockClear()
  escrituraStartrack.mockClear()
})

afterEach(() => {
  process.env = { ...ENV_ORIGINAL }
})

function declararPropio() {
  process.env.NECT_EQUIPO_PROPIO = 'EQ-SINTETICO-1'
  process.env.NECT_PROYECTO_PROPIO = 'PROY-999'
}

describe('resolverCoherenciaEstado — restricción de recurso propio (servidor)', () => {
  it.each(['prisma', 'startrack'] as const)('mantener %s sin recursos declarados → recurso_ajeno, sin escribir', async (mantener) => {
    await expect(resolverCoherenciaEstado({ equipoId: 'eq-sintetico-1', mantener, rol: 'LOGISTICA' })).rejects.toMatchObject({
      motivo: 'recurso_ajeno',
    })
    expect(escrituraPrisma).not.toHaveBeenCalled()
    expect(escrituraStartrack).not.toHaveBeenCalled()
  })

  it('recurso de otro participante → recurso_ajeno', async () => {
    process.env.NECT_EQUIPO_PROPIO = 'EQ-DE-OTRO'
    process.env.NECT_PROYECTO_PROPIO = 'PROY-999'
    await expect(
      resolverCoherenciaEstado({ equipoId: 'eq-sintetico-1', mantener: 'prisma', rol: 'LOGISTICA' }),
    ).rejects.toMatchObject({ motivo: 'recurso_ajeno' })
    expect(escrituraStartrack).not.toHaveBeenCalled()
  })
})

describe('resolverCoherenciaEstado — equivalencias', () => {
  it('mantener Prisma cancela el traslado vivo (status 2) y no toca Prisma', async () => {
    declararPropio()
    const rastro = await resolverCoherenciaEstado({ equipoId: 'eq-sintetico-1', mantener: 'prisma', rol: 'LOGISTICA' })
    expect(escrituraStartrack).toHaveBeenCalledWith('tarea-sintetica-1', '2')
    expect(escrituraPrisma).not.toHaveBeenCalled()
    expect(rastro.parcial).toBe(false)
    expect(rastro.pasos[0]).toMatchObject({ plataforma: 'startrack', antes: '0', despues: '2' })
  })

  it('mantener Startrack pasa el equipo a DISPONIBLE y no toca la tarea', async () => {
    declararPropio()
    const rastro = await resolverCoherenciaEstado({ equipoId: 'eq-sintetico-1', mantener: 'startrack', rol: 'ADMIN' })
    expect(escrituraPrisma).toHaveBeenCalledWith('eq-sintetico-1', 'DISPONIBLE')
    expect(escrituraStartrack).not.toHaveBeenCalled()
    expect(rastro.pasos[0]).toMatchObject({ plataforma: 'prisma', despues: 'DISPONIBLE' })
  })

  it('con paro activo, mantener Startrack se rechaza: el estado no lo vuelve operable', async () => {
    declararPropio()
    fixture.paro = true
    await expect(
      resolverCoherenciaEstado({ equipoId: 'eq-sintetico-1', mantener: 'startrack', rol: 'LOGISTICA' }),
    ).rejects.toMatchObject({ motivo: 'impedimento_de_falla' })
    expect(escrituraPrisma).not.toHaveBeenCalled()
  })

  it('sin R2 (tarea ya Canceled) → sin_incoherencia, sin escribir', async () => {
    declararPropio()
    fixture.statusTarea = 'Canceled'
    await expect(
      resolverCoherenciaEstado({ equipoId: 'eq-sintetico-1', mantener: 'prisma', rol: 'LOGISTICA' }),
    ).rejects.toMatchObject({ motivo: 'sin_incoherencia' })
    expect(escrituraStartrack).not.toHaveBeenCalled()
  })

  it('la equivalencia de Startrack es Cancelada: no inventa un estado "Suspendida"', () => {
    const texto = JSON.stringify(equivalenciaPara('prisma', 'OBSOLETA'))
    expect(texto).toContain('Cancelada (status 2)')
    expect(equivalenciaPara('prisma', 'OBSOLETA').seEscribe).not.toMatch(/suspend/i)
  })

  it('tareaFinalizada reconoce la grafía inglesa observada en la API', () => {
    expect(tareaFinalizada('Canceled')).toBe(true)
    expect(tareaFinalizada('Pending')).toBe(false)
  })
})

async function peticion(rol: RolSesion | null, cuerpo: unknown): Promise<Response> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (rol) headers.cookie = `${NOMBRE_COOKIE}=${await firmarSesion(rol)}`
  return POST(
    new NextRequest('http://localhost/api/propagar/coherencia', { method: 'POST', headers, body: JSON.stringify(cuerpo) }),
  )
}

describe('POST /api/propagar/coherencia — guardas en orden', () => {
  it('sin sesión → 401', async () => {
    const r = await peticion(null, { equipoId: 'eq-sintetico-1', mantener: 'prisma', confirmado: true })
    expect(r.status).toBe(401)
  })

  it('rol MANTENIMIENTO → 403 rol_sin_permiso (R2 es de Logística)', async () => {
    const r = await peticion('MANTENIMIENTO', { equipoId: 'eq-sintetico-1', mantener: 'prisma', confirmado: true })
    expect(r.status).toBe(403)
    expect((await r.json()).error).toBe('rol_sin_permiso')
  })

  it('sin confirmado: true → 400 y no escribe', async () => {
    declararPropio()
    const r = await peticion('LOGISTICA', { equipoId: 'eq-sintetico-1', mantener: 'prisma', confirmado: 'true' })
    expect(r.status).toBe(400)
    expect(escrituraStartrack).not.toHaveBeenCalled()
  })

  it('LOGISTICA confirmado sobre recurso ajeno → 403 recurso_ajeno desde el servidor', async () => {
    const r = await peticion('LOGISTICA', { equipoId: 'eq-sintetico-1', mantener: 'startrack', confirmado: true })
    expect(r.status).toBe(403)
    expect((await r.json()).error).toBe('recurso_ajeno')
    expect(escrituraPrisma).not.toHaveBeenCalled()
  })
})
