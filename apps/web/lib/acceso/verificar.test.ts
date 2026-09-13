// Pruebas puras de permisos por rol (S-A11 Paso 10a). No había pruebas de
// `verificar` antes; este archivo las inaugura con los dos permisos de
// escritura. Ningún dato de ECON: solo el vocabulario de roles.

import { describe, expect, it } from 'vitest'
import { puedeProgramarTaller, puedePropagar, ROLES_SESION } from './verificar'

describe('puedeProgramarTaller — RACI: la orden de taller la abre Mantenimiento', () => {
  it('MANTENIMIENTO y ADMIN pueden', () => {
    expect(puedeProgramarTaller('MANTENIMIENTO')).toBe(true)
    expect(puedeProgramarTaller('ADMIN')).toBe(true)
  })

  it.each(['PROYECTOS', 'LOGISTICA', 'COSTOS', 'DIRECCION'] as const)('%s no puede', (rol) => {
    expect(puedeProgramarTaller(rol)).toBe(false)
  })

  it('no cambia puedePropagar: el traslado sigue siendo de Logística (y ADMIN)', () => {
    const propagan = ROLES_SESION.filter(puedePropagar)
    expect(propagan).toEqual(['LOGISTICA', 'ADMIN'])
    expect(puedePropagar('MANTENIMIENTO')).toBe(false)
  })
})
