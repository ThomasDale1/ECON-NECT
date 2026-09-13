'use client'

import { useActionState } from 'react'
import { entrarConClave, type EstadoEntrar } from './acciones'

const inicial: EstadoEntrar = { error: null }

export function FormularioEntrar({ siguiente }: { siguiente: string }) {
  const [estado, accion, pendiente] = useActionState(entrarConClave, inicial)

  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="siguiente" value={siguiente} />
      <label className="flex flex-col gap-1.5">
        <span className="font-label text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Clave de acceso
        </span>
        <input
          type="password"
          name="clave"
          required
          autoComplete="current-password"
          className="h-10 rounded-lg border border-border bg-background px-3 font-label text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          placeholder="Pegá la clave de tu rol"
        />
      </label>

      {estado.error && (
        <p role="alert" className="font-label text-sm text-veredicto-riesgo">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="rounded-lg bg-primary px-4 py-2.5 font-label text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
      >
        {pendiente ? 'Verificando…' : 'Entrar'}
      </button>
    </form>
  )
}
