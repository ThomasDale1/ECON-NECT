import { cookies } from 'next/headers'
import { Box, ExternalLink, MapPin } from 'lucide-react'
import { TarjetaMantenimiento } from '@/components/mantenimiento/tarjeta-mantenimiento'
import { BadgeVeredicto } from '@/components/nect/badge-veredicto'
import { BadgeOrigen } from '@/components/nect/badge-origen'
import { PasosVerificacion } from '@/components/nect/pasos-verificacion'
import { VerOrigen } from '@/components/nect/ver-origen'
<<<<<<< Updated upstream
import { PASO_DE_REGLA, responsablePorRol } from '@/lib/gobernanza/responsabilidades'
=======
import { NOMBRE_COOKIE, puedeProgramarTaller, verificarCookie } from '@/lib/acceso/verificar'
import { agenteResponsablePorRol } from '@/lib/gobernanza/raci'
>>>>>>> Stashed changes
import { FALTANTE_EN_PALABRAS } from '@/components/nect/faltantes'
import type { EquipoUnificado, EstadoOrigen, PersonaAsignada } from '@/lib/tipos/canonico'
import { urlFichaPrisma } from '@/lib/nect/enlaces'
import { lecturaAsignacion, pasoAsignacion } from '@/lib/nect/asignacion'
import { cn } from '@/lib/utils'

/**
 * Ficha unificada — S-B1 §3. El orden importa: el veredicto se ve antes que los
 * campos crudos.
 *
 * Las dos columnas del medio son lo que resuelve el Caso de Uso 02 de ECON: cada
 * estado lleva la etiqueta de **qué objeto describe**, porque un recurso ocupado
 * y una tarea completada pueden ser ambos correctos.
 *
 * Cada dato lleva su `VerOrigen`. Es lo que hace auditable la afirmación de que
 * no inventamos nada.
 */
const OBJETO: Record<EstadoOrigen['objeto'], string> = {
  recurso: 'describe el recurso',
  tarea: 'describe la tarea',
  falla: 'describe la falla',
}

/**
 * Qué fuente resolvió la ubicación en cada nivel de la cascada (01 E.10).
 * Decir "derivada de la geocerca" cuando en realidad vino de la telemetría
 * sería etiquetar mal el origen del dato.
 */
const ORIGEN_UBICACION: Record<1 | 2 | 3, string> = {
  1: 'Posición reportada por la telemetría del equipo',
  2: 'Geocerca de destino de la tarea de traslado',
  3: 'Geocerca del proyecto asignado en Prisma',
}

type Dimension = {
  nombre: string
  prisma: EstadoOrigen | null
  startrack: EstadoOrigen | null
  compatible: 'si' | 'atencion' | 'sin-evidencia' | 'sin-equivalencia'
  nota: string
  leyendaPrisma?: string
  leyendaStartrack?: string
}

const NIVEL_IDENTIDAD: Record<1 | 2 | 3, string> = {
  1: 'enlace por remote_id',
  2: 'enlace por código de activo',
  3: 'enlace por clave',
}

export async function FichaEquipo({
  equipo,
  urlStartrack,
  urlPrisma,
}: {
  equipo: EquipoUnificado
  urlStartrack: string | null
  urlPrisma: string | null
}) {
  const decisiva = equipo.reglas.find((r) => r.veredicto === equipo.veredicto) ?? equipo.reglas[0]
  const agente = decisiva ? responsablePorRol(decisiva.rolResponsable) : null
  // El paso del proceso en el que se resuelve esta incoherencia. Sin él, la
  // ficha dice quién responde pero no en qué momento del proceso actúa.
  const pasoProceso = decisiva ? (PASO_DE_REGLA[decisiva.regla] ?? null) : null
  const faltantes = [...new Set(equipo.reglas.flatMap((r) => r.camposFaltantes))]
  const sesion = await verificarCookie((await cookies()).get(NOMBRE_COOKIE)?.value)
  const puedeProgramar = sesion ? puedeProgramarTaller(sesion.rol) : false
  const equipoObsoleto = (equipo.equipo?.valor ?? '').toUpperCase() === 'OBSOLETA'

  const dimensiones: Dimension[] = [
    {
      nombre: 'Estado del recurso',
      prisma: equipo.equipo,
      startrack: null,
      compatible: 'sin-equivalencia',
      nota: 'Prisma describe el recurso (DISPONIBLE / OCUPADA / OBSOLETA). Startrack no publica un estado de recurso equivalente.',
      leyendaPrisma: 'describe el recurso',
    },
    {
      nombre: 'Estado del conductor',
      prisma: null,
      startrack: equipo.vehiculo,
      compatible: 'sin-equivalencia',
      nota: 'Solo Startrack. El status 0–9 del vehículo es el estado del conductor, no el del recurso.',
      leyendaStartrack: 'describe al conductor',
    },
    {
      nombre: 'Compromiso y traslado',
      prisma: equipo.solicitud,
      startrack: equipo.tarea,
      compatible: equipo.tarea === null ? 'sin-evidencia' : 'si',
      nota:
        equipo.tarea === null
          ? 'Startrack no tiene ninguna tarea vinculada a esta unidad en esta lectura.'
          : 'La tarea describe el traslado, no el recurso.',
    },
    {
      nombre: 'Mantenimiento',
      prisma: equipo.falla,
      startrack: null,
      compatible: equipo.falla === null ? 'si' : 'atencion',
      nota:
        equipo.falla === null
          ? 'Sin falla activa registrada en Prisma.'
          : 'La falla vive en su propia máquina de estados, aparte del recurso.',
    },
    {
      nombre: 'Personas asignadas',
      prisma: personaAEstado(equipo.asignacion?.prisma ?? null),
      startrack: personaAEstado(equipo.asignacion?.startrack ?? null),
      compatible: 'sin-equivalencia',
      nota: 'Solo Startrack nombra al conductor de la maquinaria. El operador de Prisma, si aparece, es otro catálogo.',
      leyendaPrisma: 'operador en Prisma',
      leyendaStartrack: 'conductor de la maquinaria',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Identidad */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-7 shadow-card">
        <div className="flex items-center gap-5">
          <span className="flex size-15 shrink-0 items-center justify-center rounded-xl bg-primary p-4">
            <Box aria-hidden className="size-8 text-primary-foreground" />
          </span>
          <div className="flex flex-col gap-1.5">
            <h2 className="flex flex-wrap items-center gap-3 font-heading text-[22px] font-extrabold tracking-tight text-primary">
              {equipo.codigoActivo.valor ?? 'Sin código'}
              <span className="font-label text-base font-normal text-foreground">
                {equipo.nombre.valor ?? 'Sin registro'}
              </span>
              <VerOrigen linaje={equipo.codigoActivo.linaje} etiqueta="el código de activo" />
            </h2>
            <p className="flex flex-wrap items-center gap-2 font-label text-[13px] text-muted-foreground">
              {equipo.ubicacion?.descripcion.valor ?? 'Sin proyecto asignado'}
              <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase">
                {equipo.nivelResolucionIdentidad
                  ? NIVEL_IDENTIDAD[equipo.nivelResolucionIdentidad]
                  : 'sin contraparte'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="font-label text-[11px] uppercase tracking-wide text-muted-foreground">
            Estado operativo integrado
          </span>
          <BadgeVeredicto veredicto={equipo.veredicto} />
          {equipo.veredicto === 'SIN_EVIDENCIA' && (
            <span className="font-label text-[11px] font-bold text-veredicto-sin-evidencia">
              Requiere revisión humana
            </span>
          )}
        </div>
      </section>

      {equipo.interpretacionDesfase && (
        <p
          role="status"
          className="rounded-xl border border-veredicto-atencion/30 bg-veredicto-atencion-fondo px-4 py-3 font-label text-sm text-veredicto-atencion"
        >
          {equipo.interpretacionDesfase}
        </p>
      )}

      <PasosVerificacion
        equipo={equipo}
        urlPrisma={urlPrisma}
        urlStartrack={urlStartrack}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* 2. Prisma esperado vs Startrack observado */}
          <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-7 shadow-card">
            <h3 className="font-heading text-base font-bold tracking-tight text-primary">
              Sincronización entre plataformas
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <thead>
                  <tr className="font-label text-[11px] uppercase tracking-wide">
                    <th scope="col" className="w-[180px] pb-3 pr-3 text-muted-foreground">Dimensión</th>
                    <th scope="col" className="w-[200px] pb-3 pr-3 text-origen-prisma">Prisma (esperado)</th>
                    <th scope="col" className="w-[200px] pb-3 pr-3 text-origen-startrack">Startrack (observado)</th>
                    <th scope="col" className="pb-3 text-muted-foreground">Compatibilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {dimensiones.map((d) => (
                    <tr key={d.nombre} className="border-t border-border align-top">
                      <td className="py-3 pr-3 font-label text-[13px] font-bold">{d.nombre}</td>
                      <Celda estado={d.prisma} leyenda={d.leyendaPrisma} />
                      <Celda estado={d.startrack} leyenda={d.leyendaStartrack} />
                      <td className="py-3 font-label text-xs">
                        <span className={cn('flex items-center gap-1.5 font-bold', COLOR[d.compatible])}>
                          <span aria-hidden className={cn('size-2 rounded-full', FONDO[d.compatible])} />
                          {ETIQUETA[d.compatible]}
                        </span>
                        <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                          {d.nota}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <TarjetaMantenimiento
            equipoId={equipo.id}
            puedeProgramar={puedeProgramar}
            equipoObsoleto={equipoObsoleto}
          />

          {/* 3. Interpretación del motor */}
          <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-7 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-heading text-base font-bold tracking-tight text-primary">
                Interpretación del motor de reglas
              </h3>
              {/* Sin porcentaje: lo accionable es qué evidencia falta, no un
                  número que invita a decidir a ojo si vale la pena revisar. */}
              {faltantes.length === 0 ? (
                <span className="rounded bg-veredicto-coherente-fondo px-2.5 py-1 font-label text-[11px] font-bold text-veredicto-coherente">
                  Evidencia completa
                </span>
              ) : (
                <span className="rounded bg-veredicto-sin-evidencia-fondo px-2.5 py-1 font-label text-[11px] font-bold text-veredicto-sin-evidencia">
                  Evidencia incompleta
                </span>
              )}
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="font-label text-[11px] font-bold uppercase tracking-wide text-primary">Conductor de la maquinaria</p>
              <p className="mt-1 font-label text-sm leading-relaxed">{lecturaAsignacion(equipo.asignacion)}</p>
              <p className="mt-2 font-label text-[13px] font-bold">{pasoAsignacion(equipo.asignacion)}</p>
            </div>

            {decisiva ? (
              <>
                <p className="font-label text-sm text-foreground">
                  <strong className="font-bold">{decisiva.nombre}</strong>
                </p>
                <ul className="flex list-disc flex-col gap-1.5 pl-5 font-label text-sm leading-relaxed text-muted-foreground">
                  {decisiva.porque.map((razon) => (
                    <li key={razon}>{razon}</li>
                  ))}
                </ul>
                {faltantes.length > 0 && (
                  <div className="flex flex-col gap-2 rounded-lg border border-veredicto-sin-evidencia/25 bg-veredicto-sin-evidencia-fondo p-4">
                    <p className="font-label text-[11px] font-bold uppercase tracking-wide text-veredicto-sin-evidencia">
                      Qué falta para poder concluir
                    </p>
                    <ul className="flex list-disc flex-col gap-1 pl-5 font-label text-[13px] leading-snug">
                      {faltantes.map((f) => (
                        <li key={f}>{FALTANTE_EN_PALABRAS[f] ?? f}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {equipo.reglas.length > 1 && (
                  <div className="flex flex-col gap-2 border-t border-border pt-4">
                    <p className="font-label text-[11px] uppercase tracking-wide text-muted-foreground">
                      Otras observaciones
                    </p>
                    {equipo.reglas
                      .filter((r) => r !== decisiva)
                      .map((r) => (
                        <p key={r.regla} className="font-label text-[13px] text-muted-foreground">
                          <strong className="font-bold">{r.nombre}.</strong> {r.porque[0]}
                        </p>
                      ))}
                  </div>
                )}
              </>
            ) : (
              <p className="font-label text-sm text-muted-foreground">
                Ninguna regla pudo evaluarse con los datos disponibles.
              </p>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          {/* 4. Ubicación, declarando el nivel de cascada */}
          <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="font-heading text-sm font-bold tracking-tight text-primary">Ubicación</h3>
            {equipo.ubicacion ? (
              <>
                <p className="flex items-center gap-2 font-label text-sm">
                  <MapPin aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  {equipo.ubicacion.descripcion.valor ?? 'Sin registro'}
                  <VerOrigen linaje={equipo.ubicacion.descripcion.linaje} etiqueta="la ubicación" />
                </p>
                <p className="font-label text-xs text-muted-foreground">
                  {ORIGEN_UBICACION[equipo.ubicacion.nivel]} — <strong>nivel{' '}
                  {equipo.ubicacion.nivel} de 3</strong> de la cascada.
                </p>
                {equipo.ubicacion.lat.valor !== null && equipo.ubicacion.lon.valor !== null ? (
                  <>
                    <p className="font-mono text-xs text-muted-foreground">
                      {equipo.ubicacion.lat.valor.toFixed(5)}, {equipo.ubicacion.lon.valor.toFixed(5)}
                    </p>
                    {/* Enlace plano con las coordenadas reales de la telemetría.
                        Startrack no acepta ningún parámetro de URL para abrir una
                        unidad o una geocerca —su bundle solo lee `jobStatus`— así
                        que un enlace a su mapa no podría centrarse en el punto.
                        Este sí, y no necesita extensión ni sesión. */}
                    <a
                      href={`https://www.google.com/maps?q=${equipo.ubicacion.lat.valor},${equipo.ubicacion.lon.valor}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'inline-flex w-fit items-center gap-1.5 rounded-lg border border-border px-3 py-2',
                        'font-label text-xs font-bold text-primary transition-colors hover:bg-muted',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      )}
                    >
                      <MapPin aria-hidden className="size-3.5" />
                      Ver el punto en el mapa
                      <ExternalLink aria-hidden className="size-2.5 opacity-60" />
                    </a>
                  </>
                ) : (
                  <p className="font-label text-xs italic text-muted-foreground">
                    Sin coordenadas: ni la telemetría ni la geocerca del proyecto se pudieron
                    resolver.
                  </p>
                )}
              </>
            ) : (
              <p className="font-label text-sm italic text-muted-foreground">
                Sin ubicación: el equipo no tiene proyecto asignado en Prisma y Startrack no aportó
                posición.
              </p>
            )}

            {equipo.geocercaProyecto && (
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <p className="font-label text-[11px] uppercase tracking-wide text-muted-foreground">
                  Geocerca del proyecto
                </p>
                <p className="flex items-start gap-2 font-label text-[13px]">
                  <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0 text-origen-startrack" />
                  <span className="min-w-0">
                    {equipo.geocercaProyecto.nombre.valor ?? 'Sin nombre'}
                  </span>
                  <VerOrigen
                    linaje={equipo.geocercaProyecto.nombre.linaje}
                    etiqueta="la geocerca del proyecto"
                  />
                </p>

                {equipo.geocercaProyecto.distanciaMetros === null ? (
                  <p className="font-label text-xs italic text-muted-foreground">
                    Sin distancia: falta la posición del equipo.
                  </p>
                ) : (
                  <>
                    <p className="font-mono text-sm font-bold">
                      {formatearDistancia(equipo.geocercaProyecto.distanciaMetros)}
                    </p>
                    {/* El radio no se publica, así que no se afirma dentro/fuera.
                        Decirlo es parte del producto: un hueco documentado vale
                        más que un relleno. */}
                    <p className="font-label text-[11px] leading-snug text-muted-foreground">
                      Distancia al centro de la geocerca. Startrack no publica su radio, así que no
                      se puede afirmar si está dentro o fuera.
                    </p>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${equipo.ubicacion?.lat.valor},${equipo.ubicacion?.lon.valor}&destination=${equipo.geocercaProyecto.lat.valor},${equipo.geocercaProyecto.lon.valor}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'inline-flex w-fit items-center gap-1.5 rounded-lg border border-border px-3 py-2',
                        'font-label text-xs font-bold text-primary transition-colors hover:bg-muted',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      )}
                    >
                      Ver equipo y geocerca en el mapa
                      <ExternalLink aria-hidden className="size-2.5 opacity-60" />
                    </a>
                  </>
                )}
              </div>
            )}
          </section>

          {/* 5. Acción sugerida + matriz de responsabilidades */}
          <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="font-heading text-base font-bold tracking-tight text-primary">
              Acción sugerida
            </h3>
            <p className="rounded-lg border border-border bg-muted p-4 font-label text-[13px] leading-relaxed">
              {decisiva?.accionSugerida ?? 'Sin acción determinada.'}
            </p>
            <p className="font-label text-[12px] leading-relaxed text-muted-foreground">
              {pasoAsignacion(equipo.asignacion)}
            </p>
            <div className="flex flex-col gap-2">
              <p className="font-label text-xs uppercase tracking-wide text-muted-foreground">
                Unidad responsable según la matriz
              </p>
              <div className="flex items-center justify-between gap-3 font-label text-[13px]">
                <span className="text-muted-foreground">Responsable</span>
                <span className="text-right font-bold">{agente ?? 'Sin asignar'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 font-label text-[13px]">
                <span className="text-muted-foreground">Paso del proceso</span>
                <span className="text-right font-bold">{pasoProceso ?? 'Sin paso asociado'}</span>
              </div>
              <p className="font-label text-[11px] text-muted-foreground">
                Sale de <code className="font-mono">lib/gobernanza/responsabilidades.ts</code>, no se
                escribe a mano.
              </p>
            </div>
          </section>

          {/* 6. Procedencia */}
          <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="font-label text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Origen de los datos
            </h3>
            <div className="flex flex-wrap gap-2">
              <BadgeOrigen
                plataforma="prisma"
                href={urlFichaPrisma(urlPrisma, equipo.id)}
                equipo={equipo.codigoActivo.valor ?? undefined}
              />
              <BadgeOrigen
                plataforma="startrack"
                href={urlStartrack}
                equipo={equipo.codigoActivo.valor ?? undefined}
              />
            </div>
            <p className="font-label text-[11px] text-muted-foreground">
              El veredicto y la confianza los deriva el motor de reglas de ECON NECT; los estados
              son de sus plataformas y no se sobreescriben.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

const ETIQUETA = {
  si: 'Compatible',
  atencion: 'Atención',
  'sin-evidencia': 'Sin evidencia',
  'sin-equivalencia': 'Sin equivalencia directa',
} as const
const COLOR = {
  si: 'text-veredicto-coherente',
  atencion: 'text-veredicto-atencion',
  'sin-evidencia': 'text-veredicto-sin-evidencia',
  // Sin equivalencia no es una alarma ni un hueco: es una propiedad del sistema.
  'sin-equivalencia': 'text-muted-foreground',
} as const
const FONDO = {
  si: 'bg-veredicto-coherente',
  atencion: 'bg-veredicto-atencion',
  'sin-evidencia': 'bg-veredicto-sin-evidencia',
  'sin-equivalencia': 'bg-muted-foreground',
} as const

/** Metros por debajo de 1 km; kilómetros con un decimal por encima. */
function formatearDistancia(metros: number): string {
  return metros < 1000 ? `${metros} m` : `${(metros / 1000).toFixed(1)} km`
}

function Celda({ estado, leyenda }: { estado: EstadoOrigen | null; leyenda?: string }) {
  return (
    <td className="py-3 pr-3">
      {estado === null ? (
        <span className="font-label text-[13px] italic text-muted-foreground">Sin registro</span>
      ) : (
        <>
          <span className="flex items-center gap-1.5 font-label text-[13px]">
            {estado.valor}
            <VerOrigen linaje={estado.linaje} etiqueta={estado.valor} />
          </span>
          <span className="block font-label text-[10px] text-muted-foreground">
            {leyenda ?? OBJETO[estado.objeto]}
          </span>
        </>
      )}
    </td>
  )
}


function personaAEstado(persona: PersonaAsignada | null): EstadoOrigen | null {
  if (!persona) return null
  return {
    valor: persona.codigo ? `${persona.etiqueta} · ${persona.codigo}` : persona.etiqueta,
    objeto: 'recurso',
    linaje: persona.linaje,
  }
}
