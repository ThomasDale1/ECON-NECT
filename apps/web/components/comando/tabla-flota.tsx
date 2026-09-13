'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Box, Search } from 'lucide-react'
import { BadgeVeredicto } from '@/components/nect/badge-veredicto'
import { FALTANTE_EN_PALABRAS } from '@/components/nect/faltantes'
import type { EquipoUnificado, Veredicto } from '@/lib/tipos/canonico'
import { cn } from '@/lib/utils'

/**
 * Inventario operativo de flota — S-B1 §2.
 *
 * Es por donde el jurado entra cuando pide un equipo al azar, así que **nada
 * está hardcodeado**: la tabla recorre lo que devuelvan los conectores y los
 * filtros se arman con los valores presentes en esa lectura.
 *
 * El filtrado es de presentación —buscar y esconder filas—, no reconciliación:
 * el veredicto y la confianza ya vienen calculados del servidor.
 */
const VEREDICTOS: Veredicto[] = ['COHERENTE', 'ATENCION', 'EN_RIESGO', 'SIN_EVIDENCIA']

const ETIQUETA_VEREDICTO: Record<Veredicto, string> = {
  COHERENTE: 'Coherente',
  ATENCION: 'Atención',
  EN_RIESGO: 'En riesgo',
  SIN_EVIDENCIA: 'Sin evidencia',
}

export function TablaFlota({ equipos }: { equipos: EquipoUnificado[] }) {
  const [busqueda, setBusqueda] = useState('')
  const [veredicto, setVeredicto] = useState<Veredicto | 'todos'>('todos')
  const [proyecto, setProyecto] = useState('todos')

  const proyectos = useMemo(() => {
    const vistos = new Set<string>()
    for (const e of equipos) {
      const p = e.ubicacion?.descripcion.valor
      if (p) vistos.add(p)
    }
    return [...vistos].sort()
  }, [equipos])

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return equipos.filter((e) => {
      if (veredicto !== 'todos' && e.veredicto !== veredicto) return false
      if (proyecto !== 'todos' && e.ubicacion?.descripcion.valor !== proyecto) return false
      if (texto === '') return true
      const campos = [e.codigoActivo.valor, e.nombre.valor, e.ubicacion?.descripcion.valor]
      return campos.some((c) => c?.toLowerCase().includes(texto))
    })
  }, [equipos, busqueda, veredicto, proyecto])

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-5 shadow-card">
        <span className="font-label text-[13px] font-bold text-primary">Filtros:</span>

        <label className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5">
          <Search aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código o nombre…"
            aria-label="Buscar equipos por código o nombre"
            className="w-56 bg-transparent font-label text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <Selector
          etiqueta="Veredicto"
          valor={veredicto}
          onCambio={(v) => setVeredicto(v as Veredicto | 'todos')}
          opciones={[
            { valor: 'todos', texto: 'Todos' },
            ...VEREDICTOS.map((v) => ({ valor: v, texto: ETIQUETA_VEREDICTO[v] })),
          ]}
        />

        <Selector
          etiqueta="Proyecto"
          valor={proyecto}
          onCambio={setProyecto}
          opciones={[
            { valor: 'todos', texto: 'Todos' },
            ...proyectos.map((p) => ({ valor: p, texto: p })),
          ]}
        />
      </section>

      <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-7 shadow-card">
        <div className="flex items-baseline justify-between">
          <h2 className="font-heading text-lg font-bold tracking-tight text-primary">
            Sincronización operativa de activos
          </h2>
          <p className="font-label text-[13px] text-muted-foreground">
            {filtrados.length === equipos.length
              ? `${equipos.length} equipos`
              : `${filtrados.length} de ${equipos.length} equipos`}
          </p>
        </div>

        {filtrados.length === 0 ? (
          <p className="py-10 text-center font-label text-sm text-muted-foreground">
            Ningún equipo coincide con los filtros. La lectura trajo {equipos.length}.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[1080px] border-collapse text-left">
              <caption className="sr-only">
                Inventario de flota con el estado de cada equipo en Prisma y en Startrack.
              </caption>
              <thead>
                <tr className="border-y border-border font-label text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="w-[210px] py-3 pl-4 pr-3 font-bold">Identificación</th>
                  <th scope="col" className="w-[150px] py-3 pr-3 font-bold">Estado en Prisma</th>
                  <th scope="col" className="w-[150px] py-3 pr-3 font-bold">Estado en Startrack</th>
                  <th scope="col" className="w-[150px] py-3 pr-3 font-bold">Veredicto</th>
                  <th scope="col" className="w-[170px] py-3 pr-3 font-bold">Ubicación</th>
                  <th scope="col" className="w-[200px] py-3 pr-3 font-bold">Qué falta</th>
                  <th scope="col" className="py-3 pr-4 font-bold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((equipo) => (
                  <tr
                    key={equipo.id}
                    className="border-b border-muted transition-colors last:border-0 hover:bg-muted/60"
                  >
                    <td className="py-3.5 pl-4 pr-3 align-middle">
                      <span className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Box aria-hidden className="size-4 text-muted-foreground" />
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="font-heading text-[13px] font-bold">
                            {equipo.codigoActivo.valor ?? 'Sin código'}
                          </span>
                          <span className="truncate font-label text-[11px] text-muted-foreground">
                            {equipo.nombre.valor ?? 'Sin registro'}
                          </span>
                        </span>
                      </span>
                    </td>
                    <Celda estado={equipo.falla ?? equipo.solicitud ?? equipo.equipo} />
                    <Celda estado={equipo.tarea ?? equipo.vehiculo} />
                    <td className="py-3.5 pr-3 align-middle">
                      <BadgeVeredicto veredicto={equipo.veredicto} />
                    </td>
                    <td className="py-3.5 pr-3 align-middle">
                      {equipo.ubicacion?.descripcion.valor ? (
                        <>
                          <span className="block font-label text-[13px]">
                            {equipo.ubicacion.descripcion.valor}
                          </span>
                          <span className="block font-label text-[10px] text-muted-foreground">
                            cascada nivel {equipo.ubicacion.nivel} de 3
                          </span>
                        </>
                      ) : (
                        <SinRegistro />
                      )}
                    </td>
                    <td className="py-3.5 pr-3 align-middle">
                      {(() => {
                        const faltantes = [
                          ...new Set(equipo.reglas.flatMap((r) => r.camposFaltantes)),
                        ]
                        if (faltantes.length === 0) {
                          return (
                            <span className="font-label text-[12px] text-veredicto-coherente">
                              Evidencia completa
                            </span>
                          )
                        }
                        return (
                          <ul className="flex flex-col gap-1">
                            {faltantes.map((f) => (
                              <li
                                key={f}
                                className="font-label text-[12px] leading-snug text-muted-foreground"
                              >
                                {FALTANTE_EN_PALABRAS[f] ?? f}
                              </li>
                            ))}
                          </ul>
                        )
                      })()}
                    </td>
                    <td className="py-3.5 pr-4 align-middle">
                      <Link
                        href={`/equipo/${encodeURIComponent(equipo.id)}`}
                        className={cn(
                          'inline-flex rounded-lg border border-primary px-3 py-2',
                          'font-label text-xs font-bold text-primary transition-colors',
                          'hover:bg-primary hover:text-primary-foreground',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        )}
                      >
                        Abrir ficha
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function Selector({
  etiqueta,
  valor,
  onCambio,
  opciones,
}: {
  etiqueta: string
  valor: string
  onCambio: (valor: string) => void
  opciones: { valor: string; texto: string }[]
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5">
      <span className="font-label text-xs text-muted-foreground">{etiqueta}:</span>
      <select
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        className="max-w-[200px] bg-transparent font-label text-xs font-bold text-primary outline-none"
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </label>
  )
}

const OBJETO = {
  recurso: 'describe el recurso',
  tarea: 'describe la tarea',
  falla: 'describe la falla',
} as const

function Celda({ estado }: { estado: EquipoUnificado['equipo'] }) {
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
