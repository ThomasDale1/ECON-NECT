import { describe, expect, it } from 'vitest'
import { paresDesdeCrudos } from './pares'

describe('paresDesdeCrudos', () => {
  it('enlaza solo APROBADA cuyo id coincide con remote_id', () => {
    const { pares, aprobadas } = paresDesdeCrudos(
      [
        { id: 'sol-1', status: 'APROBADA', approved_at: '2026-09-10T08:00:00.000Z' },
        { id: 'sol-2', status: 'APROBADA', approved_at: '2026-09-10T09:00:00.000Z' },
        { id: 'sol-3', status: 'PENDIENTE', approved_at: null },
      ],
      [
        { remote_id: 'sol-1', creation_date: '2026-09-10T12:00:00.000Z' },
        { remote_id: null, creation_date: '2026-09-10T13:00:00.000Z' },
      ],
    )
    expect(aprobadas).toBe(2)
    expect(pares).toEqual([{ approvedAt: '2026-09-10T08:00:00.000Z', taskCreatedAt: '2026-09-10T12:00:00.000Z' }])
  })
})
