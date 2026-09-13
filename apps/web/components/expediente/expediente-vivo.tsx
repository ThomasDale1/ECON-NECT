'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Bot,
  ClipboardCheck,
  FileSearch,
  GitBranch,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserRoundCheck,
  type LucideIcon,
} from 'lucide-react'
import { BadgeVeredicto } from '@/components/nect/badge-veredicto'
import { PropagarTraslado } from '@/components/nect/propagar-traslado'
import { VerOrigen } from '@/components/nect/ver-origen'
import { lecturaRespaldo } from '@/components/nect/respaldo'
import { PASO_DE_REGLA, responsablePorRol } from '@/lib/gobernanza/responsabilidades'
import type { EquipoUnificado, EstadoOrigen, Linaje, ResultadoRegla, Rol, Veredicto } from '@/lib/tipos/canonico'
import { cn } from '@/lib/utils'

const PRIORIDAD: Record<Veredicto, number> = {
  EN_RIESGO: 0,
  ATENCION: 1,
  SIN_EVIDENCIA: 2,
  COHERENTE: 3,
}

const ROL: Record<Rol, string> = {
  PROYECTOS: 'Proyectos',
  LOGISTICA: 'Logistica',
  MANTENIMIENTO: 'Mantenimiento',
  COSTOS: 'Control de costos',
  DIRECCION: 'Direccion',
}

const OBJETO: Record<EstadoOrigen['objeto'], string> = {
  recurso: 'recurso',
  tarea: 'tarea',
  falla: 'falla',
}

type Paso = {
  titulo: string
  detalle: string
  estado: 'hecho' | 'actual' | 'pendiente'
}

export function ExpedienteVivo({ equipos }: { equipos: EquipoUnificado[] }) {
  const ordenados = useMemo(
    () =>
      [...equipos].sort(
        (a, b) => PRIORIDAD[a.veredicto] - PRIORIDAD[b.veredicto] || a.confianza - b.confianza,
      ),
    [equipos],
  )
  const [seleccionado, setSeleccionado] = useState(ordenados[0]?.id ?? '')
  const [busqueda, setBusqueda] = useState('')

  const equipo = ordenados.find((item) => item.id === seleccionado) ?? ordenados[0] ?? null
  const filtrados = ordenados.filter((item) => {
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return true
    return [item.codigoActivo.valor, item.nombre.valor, item.ubicacion?.descripcion.valor, item.veredicto].some(
      (valor) => typeof valor === 'string' && valor.toLowerCase().includes(texto),
    )
  })

  if (!equipo) {
    return (
      <section className="rounded-xl border border-border bg-card p-8 shadow-card">
        <h2 className="font-heading text-lg font-bold tracking-tight text-primary">Sin lectura de flota</h2>
        <p className="mt-2 font-label text-sm text-muted-foreground">
          Las fuentes no devolvieron equipos para armar un expediente.
        </p>
      </section>
    )
  }

  const decisiva = reglaDecisiva(equipo)
  const faltantes = [...new Set(equipo.reglas.flatMap((regla) => regla.camposFaltantes))]
  const respaldo = lecturaRespaldo(equipo)
  const puedePropagarse = equipo.reglas.some((regla) => regla.regla === 'R3')
  const responsable = decisiva ? responsablePorRol(decisiva.rolResponsable) : null
  const pasoProceso = decisiva ? PASO_DE_REGLA[decisiva.regla] : null
  const linajes = linajesClave(equipo)

  return (
    <div className="grid gap-6 xl:grid-cols-[330px_1fr]">
      <aside className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-card">
        <div>
          <p className="font-label text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Modo demo ejecutivo
          </p>
          <h2 className="mt-1 font-heading text-xl font-extrabold tracking-tight text-primary">
            Expediente vivo
          </h2>
          <p className="mt-1 font-label text-xs leading-snug text-muted-foreground">
            Un equipo, una decision, su evidencia y el siguiente paso.
          </p>
        </div>

        <label className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
          <Search aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar equipo..."
            aria-label="Buscar equipo para expediente"
            className="min-w-0 flex-1 bg-transparent font-label text-xs outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="flex max-h-[calc(100vh-260px)] flex-col gap-2 overflow-y-auto pr-1">
          {filtrados.map((item) => {
            const activo = item.id === equipo.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSeleccionado(item.id)}
                className={cn(
                  'rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  activo ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate font-heading text-sm font-bold">
                      {item.codigoActivo.valor ?? item.id}
                    </span>
                    <span className="block truncate font-label text-[11px] text-muted-foreground">
                      {item.nombre.valor ?? 'Sin nombre'}
                    </span>
                  </span>
                  <BadgeVeredicto veredicto={item.veredicto} />
                </span>
              </button>
            )
          })}
        </div>
      </aside>

      <main className="flex min-w-0 flex-col gap-6">
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="flex flex-col gap-5 p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-label text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Caso seleccionado
                  </p>
                  <h2 className="mt-1 flex flex-wrap items-center gap-2 font-heading text-3xl font-extrabold tracking-tight text-primary">
                    {equipo.codigoActivo.valor ?? 'Sin codigo'}
                    <VerOrigen linaje={equipo.codigoActivo.linaje} etiqueta="codigo de activo" />
                  </h2>
                  <p className="mt-1 font-label text-sm text-muted-foreground">
                    {equipo.nombre.valor ?? 'Sin nombre'} · {equipo.ubicacion?.descripcion.valor ?? 'Sin ubicacion'}
                  </p>
                </div>
                <BadgeVeredicto veredicto={equipo.veredicto} />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MiniDato titulo="Prisma" estado={equipo.falla ?? equipo.solicitud ?? equipo.equipo} />
                <MiniDato titulo="Startrack" estado={equipo.tarea ?? equipo.vehiculo} />
                <div className="rounded-lg border border-border bg-muted/50 p-3">
                  <p className="font-label text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Respaldo
                  </p>
                  <p className="mt-1 font-label text-sm font-bold">{respaldo.etiqueta}</p>
                  <p className="mt-1 font-label text-[11px] leading-snug text-muted-foreground">
                    {respaldo.puedeConcluir
                      ? 'La conclusion viene de datos leidos en vivo.'
                      : `Faltan ${faltantes.length || 1} datos para cerrar la conclusion.`}
                  </p>
                </div>
              </div>

              {decisiva ? (
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="font-label text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Lectura operativa
                  </p>
                  <p className="mt-1 font-heading text-lg font-bold tracking-tight">{decisiva.nombre}</p>
                  <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 font-label text-sm leading-snug text-muted-foreground">
                    {decisiva.porque.slice(0, 3).map((razon) => (
                      <li key={razon}>{razon}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-lg border border-veredicto-sin-evidencia/30 bg-veredicto-sin-evidencia-fondo p-4 font-label text-sm text-veredicto-sin-evidencia">
                  Ninguna regla pudo explicar este equipo con la lectura actual.
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between gap-5 border-t border-border bg-muted/35 p-7 lg:border-l lg:border-t-0">
              <div className="grid gap-3">
                <Impacto
                  icono={TriangleAlert}
                  titulo="Impacto"
                  valor={impactoDe(equipo, faltantes)}
                  nota="Sin inventar dinero: si falta tarifa, horas o timestamp, se declara."
                />
                <Impacto
                  icono={UserRoundCheck}
                  titulo="Responsable"
                  valor={responsable ?? (decisiva ? ROL[decisiva.rolResponsable] : 'Sin asignar')}
                  nota={pasoProceso ?? 'Sin paso RACI asociado'}
                />
                <Impacto
                  icono={ShieldCheck}
                  titulo="Permiso de escritura"
                  valor={puedePropagarse ? 'Disponible para P1' : 'Solo lectura'}
                  nota={
                    puedePropagarse
                      ? 'La escritura se confirma y el servidor vuelve a autorizar.'
                      : 'O.D.I.N. y este expediente no escriben.'
                  }
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/equipo/${encodeURIComponent(equipo.id)}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 font-label text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Abrir ficha
                  <ArrowRight aria-hidden className="size-3.5" />
                </Link>
                <Link
                  href="/odin"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 font-label text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Preguntar a O.D.I.N.
                  <Bot aria-hidden className="size-3.5" />
                </Link>
                {puedePropagarse ? (
                  <PropagarTraslado equipoId={equipo.id} codigoActivo={equipo.codigoActivo.valor} />
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 2xl:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-6">
            <Card titulo="Cadena de decision" icono={GitBranch}>
              <ol className="grid gap-3 md:grid-cols-4">
                {pasosDecision(equipo, decisiva, puedePropagarse).map((paso, index) => (
                  <li key={paso.titulo} className="rounded-lg border border-border bg-card p-4">
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary font-mono text-xs font-bold text-primary-foreground">
                      {index + 1}
                    </span>
                    <p className="mt-3 font-label text-sm font-bold">{paso.titulo}</p>
                    <p className="mt-1 font-label text-[12px] leading-snug text-muted-foreground">{paso.detalle}</p>
                    <span
                      className={cn(
                        'mt-3 inline-flex rounded-full px-2 py-1 font-label text-[10px] font-bold uppercase',
                        paso.estado === 'hecho' && 'bg-veredicto-coherente-fondo text-veredicto-coherente',
                        paso.estado === 'actual' && 'bg-veredicto-atencion-fondo text-veredicto-atencion',
                        paso.estado === 'pendiente' && 'bg-muted text-muted-foreground',
                      )}
                    >
                      {paso.estado === 'hecho' ? 'Listo' : paso.estado === 'actual' ? 'Ahora' : 'Pendiente'}
                    </span>
                  </li>
                ))}
              </ol>
            </Card>

            <Card titulo="Antes y despues" icono={ClipboardCheck}>
              <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
                <EstadoComparado
                  titulo="Antes"
                  texto={antesDe(equipo, decisiva)}
                  tono={equipo.veredicto === 'COHERENTE' ? 'ok' : 'alerta'}
                />
                <div className="hidden items-center justify-center text-muted-foreground md:flex">
                  <ArrowRight aria-hidden className="size-5" />
                </div>
                <EstadoComparado
                  titulo="Despues de confirmar"
                  texto={despuesDe(equipo, decisiva, puedePropagarse)}
                  tono={puedePropagarse ? 'ok' : 'neutro'}
                />
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card titulo="Evidencia auditada" icono={FileSearch}>
              {linajes.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {linajes.map((linaje, index) => (
                    <div key={`${linaje.endpoint}-${linaje.campo}-${index}`} className="rounded-lg border border-border bg-muted/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-label text-[11px] font-bold uppercase tracking-wide">
                          {linaje.plataforma}
                        </span>
                        <VerOrigen linaje={linaje} etiqueta="ver dato" compacto />
                      </div>
                      <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground" title={`${linaje.endpoint} · ${linaje.campo}`}>
                        {linaje.endpoint} · {linaje.campo}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-label text-sm text-muted-foreground">Sin linajes disponibles en este expediente.</p>
              )}
            </Card>

            <Card titulo="Guion para O.D.I.N." icono={Sparkles}>
              <p className="rounded-lg border border-border bg-muted p-4 font-label text-sm leading-relaxed">
                {preguntaOdin(equipo, decisiva)}
              </p>
              <p className="font-label text-[11px] leading-snug text-muted-foreground">
                O.D.I.N. puede explicar con herramientas de solo lectura. No aprueba, no crea y no propaga.
              </p>
            </Card>
          </div>
        </section>
      </main>
    </div>
  )
}

function reglaDecisiva(equipo: EquipoUnificado): ResultadoRegla | undefined {
  return equipo.reglas.find((regla) => regla.veredicto === equipo.veredicto) ?? equipo.reglas[0]
}

function MiniDato({ titulo, estado }: { titulo: string; estado: EstadoOrigen | null }) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3">
      <p className="font-label text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{titulo}</p>
      {estado ? (
        <>
          <p className="mt-1 flex items-center gap-1 font-label text-sm font-bold">
            {estado.valor}
            <VerOrigen linaje={estado.linaje} etiqueta={`origen ${titulo}`} compacto />
          </p>
          <p className="mt-1 font-label text-[11px] text-muted-foreground">Describe {OBJETO[estado.objeto]}</p>
        </>
      ) : (
        <p className="mt-1 font-label text-sm italic text-muted-foreground">Sin registro</p>
      )}
    </div>
  )
}

function Impacto({
  icono: Icono,
  titulo,
  valor,
  nota,
}: {
  icono: LucideIcon
  titulo: string
  valor: string
  nota: string
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icono aria-hidden className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="font-label text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{titulo}</p>
          <p className="mt-1 font-heading text-lg font-extrabold tracking-tight">{valor}</p>
          <p className="mt-1 font-label text-[11px] leading-snug text-muted-foreground">{nota}</p>
        </div>
      </div>
    </article>
  )
}

function Card({
  titulo,
  icono: Icono,
  children,
}: {
  titulo: string
  icono: LucideIcon
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-muted text-primary">
          <Icono aria-hidden className="size-4" />
        </span>
        <h2 className="font-heading text-base font-bold tracking-tight text-primary">{titulo}</h2>
      </div>
      {children}
    </section>
  )
}

function EstadoComparado({ titulo, texto, tono }: { titulo: string; texto: string; tono: 'ok' | 'alerta' | 'neutro' }) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        tono === 'ok' && 'border-veredicto-coherente/25 bg-veredicto-coherente-fondo',
        tono === 'alerta' && 'border-veredicto-atencion/25 bg-veredicto-atencion-fondo',
        tono === 'neutro' && 'border-border bg-muted/50',
      )}
    >
      <p className="font-label text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className="mt-2 font-label text-sm leading-relaxed">{texto}</p>
    </div>
  )
}

function impactoDe(equipo: EquipoUnificado, faltantes: string[]): string {
  if (equipo.veredicto === 'COHERENTE') return 'Operacion consistente'
  if (equipo.veredicto === 'SIN_EVIDENCIA') return `Faltan ${faltantes.length || 1} datos`
  if (equipo.veredicto === 'EN_RIESGO') return 'Riesgo operativo vivo'
  return 'Atencion requerida'
}

function pasosDecision(equipo: EquipoUnificado, regla: ResultadoRegla | undefined, puedePropagarse: boolean): Paso[] {
  return [
    {
      titulo: 'Leer',
      detalle: 'Prisma y Startrack se consultan en vivo desde el servidor.',
      estado: 'hecho',
    },
    {
      titulo: 'Interpretar',
      detalle: regla ? `${regla.regla}: ${regla.nombre}` : 'No hay regla decisiva en esta lectura.',
      estado: 'hecho',
    },
    {
      titulo: 'Decidir',
      detalle:
        equipo.veredicto === 'COHERENTE'
          ? 'No hay excepcion que escalar.'
          : regla?.accionSugerida ?? 'Una persona debe revisar la evidencia.',
      estado: equipo.veredicto === 'COHERENTE' ? 'hecho' : 'actual',
    },
    {
      titulo: 'Cerrar ciclo',
      detalle: puedePropagarse
        ? 'P1 puede crear la tarea en Startrack con remote_id, siempre confirmada.'
        : 'Este caso queda como consulta, explicacion o seguimiento sin escritura.',
      estado: puedePropagarse ? 'actual' : 'pendiente',
    },
  ]
}

function antesDe(equipo: EquipoUnificado, regla: ResultadoRegla | undefined): string {
  if (!regla) return 'El equipo aparece sin una lectura decisiva del motor.'
  if (equipo.veredicto === 'COHERENTE') return 'Las fuentes no muestran una incoherencia accionable con la evidencia disponible.'
  return regla.porque[0] ?? regla.nombre
}

function despuesDe(equipo: EquipoUnificado, regla: ResultadoRegla | undefined, puedePropagarse: boolean): string {
  if (puedePropagarse) {
    return 'Se crea una tarea nueva en Startrack, enlazada por remote_id. La excepcion desaparece al releer porque el hecho ya existe.'
  }
  if (equipo.veredicto === 'SIN_EVIDENCIA') {
    return 'No se fuerza una conclusion: el expediente deja la lista de datos faltantes para validacion humana.'
  }
  return regla?.accionSugerida ?? 'La accion queda documentada para la gerencia responsable.'
}

function preguntaOdin(equipo: EquipoUnificado, regla: ResultadoRegla | undefined): string {
  const codigo = equipo.codigoActivo.valor ?? equipo.id
  if (regla) return `O.D.I.N., explica el caso ${codigo}: ${regla.nombre}. Dame conclusion, evidencia, fuente y siguiente accion.`
  return `O.D.I.N., revisa el estado operativo de ${codigo} y dime que evidencia falta para decidir.`
}

function linajesClave(equipo: EquipoUnificado): Linaje[] {
  return [
    equipo.codigoActivo.linaje,
    equipo.nombre.linaje,
    equipo.equipo?.linaje,
    equipo.solicitud?.linaje,
    equipo.falla?.linaje,
    equipo.vehiculo?.linaje,
    equipo.tarea?.linaje,
    equipo.ubicacion?.descripcion.linaje,
  ]
    .filter((linaje): linaje is Linaje => Boolean(linaje))
    .slice(0, 8)
}
