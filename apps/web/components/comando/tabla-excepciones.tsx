import { BadgeVeredicto } from '@/components/nect/badge-veredicto'
import { BarraConfianza } from '@/components/nect/barra-confianza'
import { Button } from '@/components/ui/button'
import type { FilaExcepcion, ValorObservado } from '@/app/(nect)/command-center/datos-de-ejemplo'

/**
 * Excepciones prioritarias — ui-registry.md §3.4.
 *
 * No es una lista de errores: es una cola de trabajo, ordenada por severidad y
 * con el responsable de cada fila.
 *
 * Las dos columnas del medio son el corazón del Caso de Uso 02 de ECON: cada
 * valor lleva debajo la etiqueta de **qué objeto describe**. Un recurso ocupado
 * y una tarea completada pueden ser ambos correctos porque describen objetos
 * distintos; sin esa etiqueta la tabla no resuelve el caso.
 */
const OBJETO: Record<ValorObservado['objeto'], string> = {
  recurso: 'describe el recurso',
  tarea: 'describe la tarea',
  falla: 'describe la falla',
}

export function TablaExcepciones({ filas }: { filas: FilaExcepcion[] }) {
  return (
    <section className="flex flex-col gap-5 rounded-xl bg-card p-7 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-base font-bold tracking-tight text-primary">
            Excepciones prioritarias
          </h2>
          <p className="font-label text-xs text-muted-foreground">Cola de resolución de conflictos</p>
        </div>
        <Button size="sm">Resolver seleccionadas</Button>
      </div>

      {filas.length === 0 ? (
        <p className="py-8 text-center font-label text-sm text-muted-foreground">
          No hay incoherencias detectadas con la evidencia disponible.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[1060px] border-collapse text-left">
            <caption className="sr-only">
              Equipos con incoherencias entre Prisma y Startrack, ordenados por severidad.
            </caption>
            <thead>
              <tr className="border-y border-border font-label text-[11px] uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="w-[108px] py-2.5 pl-4 font-bold">Severidad</th>
                <th scope="col" className="w-[172px] py-2.5 pr-3 font-bold">Activo / clase</th>
                <th scope="col" className="w-[120px] py-2.5 pr-3 font-bold">Proyecto</th>
                <th scope="col" className="w-[144px] py-2.5 pr-3 font-bold">Prisma (esperado)</th>
                <th scope="col" className="w-[144px] py-2.5 pr-3 font-bold">Startrack (observado)</th>
                <th scope="col" className="w-[96px] py-2.5 pr-3 font-bold">Confianza</th>
                <th scope="col" className="w-[190px] py-2.5 pr-3 font-bold">Acción sugerida</th>
                <th scope="col" className="w-[112px] py-2.5 pr-4 font-bold">Responsable</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr
                  key={fila.id}
                  className="border-b border-muted transition-colors last:border-0 hover:bg-muted/60"
                >
                  <td className="py-3.5 pl-4 align-middle">
                    <BadgeVeredicto veredicto={fila.veredicto} />
                  </td>
                  <td className="py-3.5 align-middle">
                    <span className="block font-heading text-[13px] font-bold">
                      {fila.codigo} {fila.nombre}
                    </span>
                    <span className="block font-label text-[11px] text-muted-foreground">
                      {fila.modelo} · {fila.clase}
                    </span>
                  </td>
                  <td className="py-3.5 align-middle font-label text-[13px]">{fila.proyecto}</td>
                  <Celda valor={fila.prisma} />
                  <Celda valor={fila.startrack} />
                  <td className="py-3.5 align-middle">
                    <BarraConfianza porcentaje={fila.confianza} />
                  </td>
                  <td className="py-3.5 pr-4 align-middle font-label text-[13px] text-muted-foreground">
                    {fila.accionSugerida}
                  </td>
                  <td className="py-3.5 pr-4 align-middle font-label text-[13px]">{fila.responsable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/**
 * Un valor observado con su etiqueta de objeto.
 *
 * El dato ausente se escribe, no se omite: `Sin registro` en muted, nunca una
 * celda vacía ni un cero inventado (ui-registry §1.4).
 */
function Celda({ valor }: { valor: ValorObservado }) {
  return (
    <td className="py-3.5 pr-4 align-middle">
      {valor.valor === null ? (
        <span className="font-label text-[13px] italic text-muted-foreground">Sin registro</span>
      ) : (
        <span className="block font-label text-[13px]">{valor.valor}</span>
      )}
      <span className="block font-label text-[10px] text-muted-foreground">{OBJETO[valor.objeto]}</span>
    </td>
  )
}
