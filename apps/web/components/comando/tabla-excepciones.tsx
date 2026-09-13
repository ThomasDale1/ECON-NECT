'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { BadgeVeredicto } from '@/components/nect/badge-veredicto'
import { DialogoAccion } from '@/components/nect/dialogo-accion'
import { useMantenimiento } from '@/components/mantenimiento/proveedor-mantenimiento'
import { PropagarTraslado } from '@/components/nect/propagar-traslado'
import type { PronosticoMantenimiento } from '@/lib/mantenimiento/tipos'
import type { RolSesion } from '@/lib/acceso/verificar'
import type { EquipoUnificado, EstadoOrigen, Plataforma, Rol } from '@/lib/tipos/canonico'
import { cn } from '@/lib/utils'

/**
 * Excepciones prioritarias — cola de trabajo, no lista de errores.
 *
 * El veredicto es la lectura. El respaldo dice si había datos suficientes
 * para afirmarla. No son lo mismo: EN_RIESGO con todos los campos es una
 * conclusión, no un hueco.
 *
 * La última columna es la propagación P1 (S-A4): aparece solo en las filas
 * donde disparó R3 — solicitud aprobada en Prisma sin tarea de traslado en
 * Startrack. Que el botón se vea no autoriza nada: el servidor vuelve a
 * verificar sesión, rol y recurso propio antes de escribir.
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

const PRIORIDAD_MANTENIMIENTO: Record<NonNullable<PronosticoMantenimiento['nivelAlerta']>, number> = {
  vencido: 0,
  urgente: 1,
  aviso: 2,
}

export function TablaExcepciones({ equipos, rolActual }: { equipos: EquipoUnificado[]; rolActual: RolSesion | null }) {
  const filas = [...equipos].sort(
    (a, b) => PRIORIDAD[a.veredicto] - PRIORIDAD[b.veredicto] || a.confianza - b.confianza,
  )
  const { resultado } = useMantenimiento()
  const alertasMantenimiento =
    rolActual === 'MANTENIMIENTO' || rolActual === 'ADMIN'
      ? [...(resultado?.alertas ?? [])].sort(
          (a, b) =>
            PRIORIDAD_MANTENIMIENTO[a.nivelAlerta as NonNullable<PronosticoMantenimiento['nivelAlerta']>] -
              PRIORIDAD_MANTENIMIENTO[b.nivelAlerta as NonNullable<PronosticoMantenimiento['nivelAlerta']>] ||
            (b.avance ?? 0) - (a.avance ?? 0),
        )
      : []

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

      {filas.length === 0 && alertasMantenimiento.length === 0 ? (
        <p className="py-8 text-center font-label text-sm tracking-normal text-muted-foreground">
          No hay incoherencias detectadas con la evidencia disponible.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[1130px] border-collapse text-left font-label tracking-normal">
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
                <th scope="col" className="w-[150px] py-2.5 pr-3 font-bold">
                  Responsable
                </th>
                <th scope="col" className="py-2.5 pr-4 font-bold">
                  Propagación
                </th>
              </tr>
            </thead>
            <tbody>
              {filas.map((equipo) => {
                const decisiva =
                  equipo.reglas.find((r) => r.veredicto === equipo.veredicto) ?? equipo.reglas[0]

                // R3 = "solicitud aprobada sin tarea de traslado": la única
                // incoherencia que P1 resuelve escribiendo (01 D.6).
                const puedePropagarse = equipo.reglas.some((r) => r.regla === 'R3')

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
                    <td className="py-3.5 pr-3 align-middle text-[13px]">
                      {decisiva ? ROL[decisiva.rolResponsable] : <SinRegistro />}
                    </td>
                    <td className="py-3.5 pr-4 align-middle">
                      {puedePropagarse ? (
                        <PropagarTraslado
                          equipoId={equipo.id}
                          codigoActivo={equipo.codigoActivo.valor}
                        />
                      ) : (
                        <span className="text-[12px] text-muted-foreground">
                          Sin escritura aplicable
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {alertasMantenimiento.length > 0 ? (
                <>
                  <tr className="border-y border-border bg-muted/50">
                    <th
                      scope="rowgroup"
                      colSpan={7}
                      className="px-4 py-2 text-left font-label text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
                    >
                      Mantenimiento preventivo por horómetro
                    </th>
                  </tr>
                  {alertasMantenimiento.map((alerta) => (
                    <FilaMantenimiento key={alerta.equipoId} alerta={alerta} />
                  ))}
                </>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function FilaMantenimiento({ alerta }: { alerta: PronosticoMantenimiento }) {
  const nivel = alerta.nivelAlerta ?? 'aviso'
  const etiqueta = nivel === 'vencido' ? 'Vencido' : nivel === 'urgente' ? 'Urgente' : 'Aviso'
  const avance = alerta.avance === null ? 'Sin avance' : `${Math.round(alerta.avance * 100)} %`
  const lectura =
    alerta.intervalo.horas === null
      ? 'Sin intervalo vigente'
      : `${horas(alerta.horasDesdeAncla)} de ${alerta.intervalo.horas} h (${avance})`
  const paso =
    nivel === 'vencido'
      ? 'Abrir orden de taller ahora'
      : nivel === 'urgente'
        ? 'Programar taller antes de vencer'
        : 'Preparar ventana de taller'

  return (
    <tr className="border-b border-muted transition-colors last:border-0 hover:bg-muted/60">
      <td className="py-3.5 pl-4 pr-3 align-middle">
        <Badge variant="outline" className={cn('font-label text-[10px] font-bold uppercase', colorMantenimiento(nivel))}>
          {etiqueta}
        </Badge>
      </td>
      <td className="py-3.5 pr-3 align-middle">
        <span className="block font-heading text-[13px] font-bold tracking-tight">
          {alerta.codigoActivo ?? 'Sin código'}
        </span>
        <span className="block text-[11px] text-muted-foreground">
          {alerta.clase ?? alerta.marcaModelo ?? 'Sin clase'}
        </span>
      </td>
      <td className="py-3.5 pr-3 align-middle">
        <div className="flex flex-col gap-1 text-[12px]">
          <span>
            <strong className="font-bold text-origen-prisma">Prisma:</strong>{' '}
            {alerta.ancla ? `${nombreAncla(alerta.ancla.tipo)} · ${alerta.ancla.fecha}` : 'sin ancla'}
          </span>
          <span>
            <strong className="font-bold text-origen-startrack">Startrack:</strong>{' '}
            {alerta.vehiculoId ? 'horómetro GPS y serie diaria' : 'sin vehículo unido'}
          </span>
        </div>
      </td>
      <td className="py-3.5 pr-3 align-middle">
        <span className="block text-[13px] leading-snug font-bold text-foreground">
          {lectura}
        </span>
        <span className="block text-[11px] text-muted-foreground">
          {alerta.intervalo.origen}
        </span>
      </td>
      <td className="py-3.5 pr-3 align-middle text-[12px] leading-snug">
        {alerta.fechaEstimadaVencido
          ? `Vence estimado: ${alerta.fechaEstimadaVencido}`
          : alerta.faltantes[0] ?? 'Sin fecha estimada'}
      </td>
      <td className="py-3.5 pr-3 align-middle text-[13px]">
        Mantenimiento
      </td>
      <td className="py-3.5 pr-4 align-middle">
        <Link
          href={`/equipo/${encodeURIComponent(alerta.equipoId)}`}
          className="inline-flex rounded-lg border border-border px-3 py-2 text-[12px] font-bold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {paso}
        </Link>
      </td>
    </tr>
  )
}

function horas(valor: number | null): string {
  return valor === null ? 'Sin dato' : `${valor.toFixed(1)} h`
}

function nombreAncla(tipo: NonNullable<PronosticoMantenimiento['ancla']>['tipo']): string {
  if (tipo === 'mantenimiento_fecha_fin') return 'salida de taller'
  if (tipo === 'reporte_finalizado') return 'reporte FINALIZADO'
  return 'inicio de serie GPS'
}

function colorMantenimiento(nivel: NonNullable<PronosticoMantenimiento['nivelAlerta']>): string {
  if (nivel === 'aviso') return 'text-veredicto-atencion'
  return 'text-veredicto-riesgo'
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
