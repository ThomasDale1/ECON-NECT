import Image from 'next/image'
import { BadgeVeredicto } from '@/components/nect/badge-veredicto'
import { DialogoAccion } from '@/components/nect/dialogo-accion'
import type { EquipoUnificado, EstadoOrigen, Plataforma, Rol } from '@/lib/tipos/canonico'
import { cn } from '@/lib/utils'

/**
 * Excepciones prioritarias — cola de trabajo, no lista de errores.
 *
 * El veredicto es la lectura. El respaldo dice si había datos suficientes
 * para afirmarla. No son lo mismo: EN_RIESGO con todos los campos es una
 * conclusión, no un hueco.
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
      <div className="flex flex-col gap-0.5">
        <h2 className="font-heading text-base font-bold tracking-tight text-primary">
          Excepciones prioritarias
        </h2>
        <p className="font-label text-xs tracking-normal text-muted-foreground">
          Cola de resolución. El color es el veredicto; el respaldo dice si se
          pudo concluir.
        </p>
      </div>

      <p className="rounded-lg border border-dashed border-border px-3 py-2 font-label text-[11px] leading-relaxed tracking-normal text-muted-foreground">
        <strong className="font-bold">Cómo leer la bandeja:</strong> “Conclusión
        respaldada” significa que Prisma y Startrack respondieron lo que la
        regla necesita. Si el semáforo está en riesgo, el conflicto está en esos
        datos, no en un faltante. Startrack publica el centro de sus geocercas
        pero no el radio, así que la distancia al proyecto no se traduce a
        dentro o fuera.
      </p>

      {filas.length === 0 ? (
        <p className="py-8 text-center font-label text-sm tracking-normal text-muted-foreground">
          No hay incoherencias detectadas con la evidencia disponible.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[980px] border-collapse text-left font-label tracking-normal">
            <caption className="sr-only">
              Equipos con incoherencias entre Prisma y Startrack, ordenados por
              severidad. Cada fila abre la lectura, el respaldo y el siguiente paso.
            </caption>
            <thead>
              <tr className="border-y border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="w-[118px] py-2.5 pl-4 pr-3 font-bold">
                  Severidad
                </th>
                <th scope="col" className="w-[190px] py-2.5 pr-3 font-bold">
                  Activo / clase
                </th>
                <th scope="col" className="w-[250px] py-2.5 pr-3 font-bold">
                  Prisma ↔ Startrack
                </th>
                <th scope="col" className="w-[220px] py-2.5 pr-3 font-bold">
                  Lectura
                </th>
                <th scope="col" className="w-[260px] py-2.5 pr-3 font-bold">
                  Respaldo y paso
                </th>
                <th scope="col" className="py-2.5 pr-4 font-bold">
                  Responsable
                </th>
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
                      <span className="block font-heading text-[13px] font-bold tracking-tight">
                        {equipo.codigoActivo.valor ?? 'Sin código'}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {equipo.nombre.valor ?? 'Sin registro'}
                        {!equipo.identidadResuelta && ' · sin contraparte'}
                      </span>
                      {equipo.ubicacion?.descripcion.valor ? (
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {equipo.ubicacion.descripcion.valor}
                        </span>
                      ) : null}
                    </td>
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
                      {decisiva ? (
                        <span className="block text-[13px] leading-snug font-bold text-foreground">
                          {decisiva.nombre}
                        </span>
                      ) : (
                        <SinRegistro />
                      )}
                    </td>
                    <td className="py-3.5 pr-3 align-middle">
                      <DialogoAccion equipo={equipo} />
                    </td>
                    <td className="py-3.5 pr-4 align-middle text-[13px]">
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

const NOMBRE_PLATAFORMA: Record<Plataforma, string> = {
  prisma: 'Prisma',
  startrack: 'Startrack',
}

function Lado({ plataforma, estado }: { plataforma: Plataforma; estado: EstadoOrigen | null }) {
  return (
    <span className="flex items-start gap-2">
      <span
        aria-hidden
        className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', PUNTO_ORIGEN[plataforma])}
      />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {plataforma === 'prisma' ? (
            <Image src="/prisma.png" alt="" width={12} height={12} className="size-3 shrink-0" />
          ) : (
            <Image src="/startrack.png" alt="" width={52} height={11} className="h-[11px] w-auto shrink-0" />
          )}
          <span className={plataforma === 'startrack' ? 'sr-only' : undefined}>
            {NOMBRE_PLATAFORMA[plataforma]}
          </span>
        </span>
        {estado === null ? (
          <SinRegistro />
        ) : (
          <>
            <span className="block text-[13px] leading-tight">{estado.valor}</span>
            <span className="block text-[10px] text-muted-foreground">{OBJETO[estado.objeto]}</span>
          </>
        )}
      </span>
    </span>
  )
}

function SinRegistro() {
  return <span className="text-[13px] italic text-muted-foreground">Sin registro</span>
}
