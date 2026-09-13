'use client'

import { CATALOGO_CLASE_EQUIPO, type ClaseEquipoCatalogo } from '@/lib/canonico/catalogos'

/**
 * Clases sensibles a la lluvia — S-B4 §4. Criterio del planificador, no dato
 * de ECON: por eso arranca vacío y nadie lo presupone. La lista de clases sale
 * del catálogo verificado (S-A2) y no se escribe a mano.
 */
export function ClasesSensiblesLluvia({
  seleccionadas,
  onChange,
}: {
  seleccionadas: ClaseEquipoCatalogo[]
  onChange: (nuevas: ClaseEquipoCatalogo[]) => void
}) {
  function alternar(clase: ClaseEquipoCatalogo, marcada: boolean) {
    if (marcada) {
      onChange([...seleccionadas, clase])
    } else {
      onChange(seleccionadas.filter((c) => c !== clase))
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-base font-bold tracking-tight">Clases sensibles a la lluvia</h2>
        <p className="font-label text-xs font-semibold text-foreground">
          Criterio del planificador — no viene de Prisma ni Startrack.
        </p>
        <p className="text-xs text-muted-foreground">
          Día de lluvia: probabilidad máxima ≥ 50 % (Open-Meteo, 16 días).
        </p>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {CATALOGO_CLASE_EQUIPO.map((clase) => (
          <label key={clase} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={seleccionadas.includes(clase)}
              onChange={(e) => alternar(clase, e.target.checked)}
              aria-label={`Marcar ${clase} como sensible a la lluvia`}
              className="size-4 shrink-0 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            {clase}
          </label>
        ))}
      </div>
    </div>
  )
}
