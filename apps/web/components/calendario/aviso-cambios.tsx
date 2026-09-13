import { ArrowRightLeft } from 'lucide-react'
import type { CambioPlan, LadoCambio } from '@/lib/optimizador/tipos'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

/**
 * Aviso de cambios del replan automático — S-A10 Paso 10f. El diff y cada
 * motivo los calcula el servidor (`lib/optimizador/ensamblar.ts`); acá solo se
 * listan. Neutro y con ícono: un cambio de plan no es un veredicto
 * (ui-registry §1.1).
 */
function textoLado(lado: LadoCambio | null, siNulo: string): string {
  if (!lado) return siNulo
  return `${lado.maquina.codigoActivo ?? 'Sin registro'} · ${lado.operador.codTrabajador ?? 'Sin registro'}`
}

export function AvisoCambios({
  cambios,
  hora,
  onEntendido,
}: {
  cambios: CambioPlan[]
  /** Hora de la respuesta que trajo los cambios, ya formateada. */
  hora: string
  onEntendido: () => void
}) {
  return (
    <Alert>
      <ArrowRightLeft aria-hidden />
      <AlertTitle>Plan rehecho por un cambio en el sandbox · {hora}</AlertTitle>
      <AlertDescription>
        <ul className="flex flex-col gap-1.5">
          {cambios.map((cambio) => (
            <li key={cambio.solicitudId}>
              <span className="font-mono text-xs text-foreground">
                {cambio.codigoProyecto ?? 'Sin registro'} — {textoLado(cambio.antes, 'sin asignar')} →{' '}
                {textoLado(cambio.ahora, 'sin asignación posible')}
              </span>{' '}
              — {cambio.motivo}
            </li>
          ))}
        </ul>
        <Button variant="outline" size="sm" className="mt-2" onClick={onEntendido}>
          Entendido
        </Button>
      </AlertDescription>
    </Alert>
  )
}
