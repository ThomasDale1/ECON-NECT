import { describe, it, expect, beforeEach, vi } from 'vitest'
import { conCache, limpiarCache } from './cache'

describe('conCache', () => {
  beforeEach(() => {
    limpiarCache()
  })

  it('devuelve el valor cacheado mientras no venza el TTL', async () => {
    const leer = vi.fn().mockResolvedValue('primero')

    const a = await conCache('clave', leer, 10_000)
    const b = await conCache('clave', leer, 10_000)

    expect(a).toBe('primero')
    expect(b).toBe('primero')
    expect(leer).toHaveBeenCalledTimes(1)
  })

  // Prueba obligatoria (S-A1 §"Pruebas obligatorias" #3): el caché NUNCA sirve
  // un valor vencido cuando la relectura falla. Servir un dato viejo como si
  // fuera vigente rompe el principio C.4.
  it('nunca sirve un valor vencido cuando la lectura falla', async () => {
    const leer = vi
      .fn()
      .mockResolvedValueOnce('valor-viejo')
      .mockRejectedValueOnce(new Error('sandbox caído'))

    const primero = await conCache('clave-2', leer, 10)
    expect(primero).toBe('valor-viejo')

    await new Promise((resolve) => setTimeout(resolve, 25)) // fuerza el vencimiento del TTL de 10ms

    await expect(conCache('clave-2', leer, 10)).rejects.toThrow('sandbox caído')
  })
})
