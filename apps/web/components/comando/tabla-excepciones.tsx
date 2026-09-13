import { BadgeVeredicto } from '@/components/nect/badge-veredicto'
import { PropagarTraslado } from '@/components/nect/propagar-traslado'
import { BarraConfianza } from '@/components/nect/barra-confianza'
import { Button } from '@/components/ui/button'
import type { EquipoUnificado, EstadoOrigen, ResultadoRegla, Rol } from '@/lib/tipos/canonico'

/**
 * Excepciones prioritarias — ui-registry.md §3.4.
 *
 * No es una lista de errores: es una cola de trabajo, ordenada por severidad y
 * con el responsable de cada fila.
 *
 * Consume `EquipoUnificado` directamente: el veredicto, la confianza y las
 * reglas vienen ya calculados. Acá no se reconcilia nada, solo se proyecta —
 * la UI solo muestra (S-B1).
 *
 * La última columna es la propagación P1 (S-A4): aparece solo en las filas
 * donde disparó R3 — solicitud aprobada en Prisma sin tarea de traslado en
 * Startrack. No es un botón decorativo: escribe la tarea real, con
 * confirmación, y al refrescarse la fila desaparece porque la incoherencia
 * dejó de existir. Que el botón se vea no autoriza nada: el servidor vuelve a
 * verificar sesión, rol y recurso propio.
 *
 * Las dos columnas del medio son el corazón del Caso de Uso 02 de ECON: cada
 * valor lleva debajo la etiqueta de **qué objeto describe**. Un recurso ocupado
 * y una tarea completada pueden ser ambos correctos porque describen objetos
 * distintos; sin esa etiqueta la tabla no resuelve el caso.
 */
const OBJETO: Record<EstadoOrigen['objeto'], string> = {
  recurso: 'describe el recurso',
  tarea: 'describe la tarea',
  falla: 'describe la falla',
}

const ROL: Record<Rol, string> = {
  PROYECTOS: 'Proyectos',
  LOGISTICA: 'Logística',
  MANTENIMIENTO: 'Mantenimiento',
  COSTOS: 'Control de costos',
  DIRECCION: 'Dirección',
}

/** Orden de la cola: primero lo que puede incumplirse, al final lo coherente. */
const PRIORIDAD: Record<EquipoUnificado['veredicto'], number> = {
  EN_RIESGO: 0,
  ATENCION: 1,
  SIN_EVIDENCIA: 2,
  COHERENTE: 3,
}

export function TablaExcepciones({ equipos }: { equipos: EquipoUnificado[] }) {
  const filas = [...equipos].sort(
    (a, b) => PRIORIDAD[a.veredicto] - PRIORIDAD[b.veredicto] || a.confianza - b.confianza,
  )

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
          <table className="w-full min-w-[1210px] border-collapse text-left">
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
                <th scope="col" className="w-[112px] py-2.5 pr-3 font-bold">Responsable</th>
                <th scope="col" className="w-[150px] py-2.5 pr-4 font-bold">Propagación</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((equipo) => {
                // La regla que produjo el veredicto es la primera que lo comparte.
                const regla: ResultadoRegla | undefined =
                  equipo.reglas.find((r) => r.veredicto === equipo.veredicto) ?? equipo.reglas[0]

                // R3 = "solicitud aprobada sin tarea de traslado": la única
                // incoherencia que P1 resuelve escribiendo (01 D.6).
                const puedePropagarse = equipo.reglas.some((r) => r.regla === 'R3')

                return (
                  <tr
                    key={equipo.id}
                    className="border-b border-muted transition-colors last:border-0 hover:bg-muted/60"
                  >
                    <td className="py-3.5 pl-4 align-middle">
                      <BadgeVeredicto veredicto={equipo.veredicto} />
                    </td>
                    <td className="py-3.5 pr-3 align-middle">
                      <span className="block font-heading text-[13px] font-bold">
                        {equipo.codigoActivo.valor ?? 'Sin código'}
                      </span>
                      <span className="block font-label text-[11px] text-muted-foreground">
                        {equipo.nombre.valor ?? 'Sin registro'}
                        {!equipo.identidadResuelta && ' · sin contraparte'}
                      </span>
                    </td>
                    <td className="py-3.5 pr-3 align-middle">
                      {equipo.ubicacion?.descripcion.valor ? (
                        <>
                          <span className="block font-label text-[13px]">
                            {equipo.ubicacion.descripcion.valor}
                          </span>
                          <span className="block font-label text-[10px] text-muted-foreground">
                            ubicación nivel {equipo.ubicacion.nivel} de 3
                          </span>
                        </>
                      ) : (
                        <SinRegistro />
                      )}
                    </td>
                    {/* Prisma describe el recurso; si hay falla activa, manda la falla. */}
                    <Celda estado={equipo.falla ?? equipo.solicitud ?? equipo.equipo} />
                    {/* Startrack describe la tarea de traslado; si no hay, el vehículo. */}
                    <Celda estado={equipo.tarea ?? equipo.vehiculo} />
                    <td className="py-3.5 pr-3 align-middle">
                      <BarraConfianza porcentaje={equipo.confianza} />
                    </td>
                    <td className="py-3.5 pr-3 align-middle font-label text-[13px] text-muted-foreground">
                      {regla ? regla.accionSugerida : <SinRegistro />}
                    </td>
                    <td className="py-3.5 pr-3 align-middle font-label text-[13px]">
                      {regla ? ROL[regla.rolResponsable] : <SinRegistro />}
                    </td>
                    <td className="py-3.5 pr-4 align-middle">
                      {puedePropagarse ? (
                        <PropagarTraslado
                          equipoId={equipo.id}
                          codigoActivo={equipo.codigoActivo.valor}
                        />
                      ) : (
                        <span className="font-label text-[12px] text-muted-foreground">
                          Sin escritura aplicable
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/**
 * Un estado de origen con su etiqueta de qué objeto describe.
 *
 * El dato ausente se escribe, no se omite: `Sin registro` en muted, nunca una
 * celda vacía ni un cero inventado (ui-registry §1.4).
 */
function Celda({ estado }: { estado: EstadoOrigen | null }) {
  return (
    <td className="py-3.5 pr-3 align-middle">
      {estado === null ? (
        <SinRegistro />
      ) : (
        <>
          <span className="block font-label text-[13px]">{estado.valor}</span>
          <span className="block font-label text-[10px] text-muted-foreground">
            {OBJETO[estado.objeto]}
          </span>
        </>
      )}
    </td>
  )
}

function SinRegistro() {
  return <span className="font-label text-[13px] italic text-muted-foreground">Sin registro</span>
}
