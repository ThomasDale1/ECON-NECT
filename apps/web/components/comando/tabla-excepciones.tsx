import { BadgeVeredicto } from '@/components/nect/badge-veredicto'
import { DialogoAccion } from '@/components/nect/dialogo-accion'
import { Button } from '@/components/ui/button'
import type { EquipoUnificado, EstadoOrigen, Plataforma, Rol } from '@/lib/tipos/canonico'
import { cn } from '@/lib/utils'

/**
 * Excepciones prioritarias — ui-registry.md §3.4.
 *
 * No es una lista de errores: es una cola de trabajo, ordenada por severidad.
 *
 * **Seis columnas, no ocho.** Lo que se escanea de un vistazo se queda en la
 * tabla; lo que se lee con calma —por qué, qué falta, el siguiente paso y quién
 * lo ejecuta— vive en el diálogo de cada fila.
 *
 * Prisma y Startrack comparten columna porque se leen comparando, no por
 * separado. Cada valor conserva su punto de plataforma y su etiqueta de **qué
 * objeto describe**: eso es lo que resuelve el Caso de Uso 02 de ECON, donde un
 * recurso ocupado y una tarea completada pueden ser ambos correctos.
 */
const OBJETO: Record<EstadoOrigen['objeto'], string> = {
  recurso: 'describe el recurso',
  tarea: 'describe la tarea',
  falla: 'describe la falla',
}

const PUNTO_ORIGEN: Record<Plataforma, string> = {
  prisma: 'bg-origen-prisma',
  startrack: 'bg-origen-startrack',
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

      {/* Se declara una vez, no en cada fila: repetirlo en las 16 filas
          convertiría una propiedad del sistema en ruido de bandeja. */}
      <p className="rounded-lg border border-dashed border-border px-3 py-2 font-label text-[11px] leading-relaxed text-muted-foreground">
        <strong className="font-bold">Sin equivalencia directa:</strong> Startrack publica el centro
        de sus geocercas pero no el radio, así que la distancia al proyecto no se traduce a dentro o
        fuera.
      </p>

      {filas.length === 0 ? (
        <p className="py-8 text-center font-label text-sm text-muted-foreground">
          No hay incoherencias detectadas con la evidencia disponible.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[940px] border-collapse text-left">
            <caption className="sr-only">
              Equipos con incoherencias entre Prisma y Startrack, ordenados por severidad. Cada fila
              abre un diálogo con el detalle y el siguiente paso.
            </caption>
            <thead>
              <tr className="border-y border-border font-label text-[11px] uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="w-[118px] py-2.5 pl-4 pr-3 font-bold">Severidad</th>
                <th scope="col" className="w-[190px] py-2.5 pr-3 font-bold">Activo / clase</th>
                <th scope="col" className="w-[150px] py-2.5 pr-3 font-bold">Proyecto</th>
                <th scope="col" className="w-[250px] py-2.5 pr-3 font-bold">Prisma ↔ Startrack</th>
                <th scope="col" className="w-[190px] py-2.5 pr-3 font-bold">Evidencia</th>
                <th scope="col" className="py-2.5 pr-4 font-bold">Responsable</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((equipo) => {
                const decisiva =
                  equipo.reglas.find((r) => r.veredicto === equipo.veredicto) ?? equipo.reglas[0]

                return (
                  <tr
                    key={equipo.id}
                    className="border-b border-muted transition-colors last:border-0 hover:bg-muted/60"
                  >
                    <td className="py-3.5 pl-4 pr-3 align-middle">
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

                    {/* Las dos plataformas en una sola columna: se leen
                        comparando. El punto identifica el origen sin usar
                        relleno de color (§1.2). */}
                    <td className="py-3.5 pr-3 align-middle">
                      <div className="flex flex-col gap-1.5">
                        <Lado
                          plataforma="prisma"
                          estado={equipo.falla ?? equipo.solicitud ?? equipo.equipo}
                        />
                        <Lado plataforma="startrack" estado={equipo.tarea ?? equipo.vehiculo} />
                      </div>
                    </td>

                    <td className="py-3.5 pr-3 align-middle">
                      <DialogoAccion equipo={equipo} />
                    </td>
                    <td className="py-3.5 pr-4 align-middle font-label text-[13px]">
                      {decisiva ? ROL[decisiva.rolResponsable] : <SinRegistro />}
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
 * Un lado de la comparación: punto de plataforma, valor y qué objeto describe.
 *
 * El dato ausente se escribe, no se omite (ui-registry §1.4).
 */
function Lado({ plataforma, estado }: { plataforma: Plataforma; estado: EstadoOrigen | null }) {
  return (
    <span className="flex items-start gap-2">
      <span
        aria-hidden
        className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', PUNTO_ORIGEN[plataforma])}
      />
      <span className="min-w-0">
        <span className="sr-only">{plataforma === 'prisma' ? 'Prisma: ' : 'Startrack: '}</span>
        {estado === null ? (
          <SinRegistro />
        ) : (
          <>
            <span className="block font-label text-[13px] leading-tight">{estado.valor}</span>
            <span className="block font-label text-[10px] text-muted-foreground">
              {OBJETO[estado.objeto]}
            </span>
          </>
        )}
      </span>
    </span>
  )
}

function SinRegistro() {
  return <span className="font-label text-[13px] italic text-muted-foreground">Sin registro</span>
}
