'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Bot, CircleAlert, LoaderCircle, Send } from 'lucide-react'
import { BadgeVeredicto } from '@/components/nect/badge-veredicto'
import { BadgeOrigen } from '@/components/nect/badge-origen'
import { IconoMaquinaria } from '@/components/nect/icono-maquinaria'
import { TextoEnfasis } from '@/components/odin/texto-enfasis'
import type { ClaseEquipoCatalogo } from '@/lib/canonico/catalogos'
import type { RespuestaOdin } from '@/lib/inteligencia/tipos'
import { urlFichaPrisma } from '@/lib/nect/enlaces'
import type { Veredicto } from '@/lib/tipos/canonico'

type EquipoOdin = {
  id: string
  codigo: string
  nombre: string
  veredicto: Veredicto
  lectura: string | null
  paso: string | null
  clase: ClaseEquipoCatalogo | null
}

const CONSULTAS = [
  { label: 'Estado', message: '¿Cuál es el estado operativo del equipo?' },
  { label: 'Identidad', message: '¿Prisma y Startrack apuntan al mismo equipo?' },
  { label: 'Ubicación', message: '¿Dónde está el equipo y qué proyecto tiene?' },
  { label: 'Incoherencia', message: 'Explica la incoherencia detectada.' },
  { label: 'Qué falta', message: '¿Qué datos faltan para concluir?' },
  { label: 'Siguiente paso', message: '¿Cuál es el siguiente paso y quién lo ejecuta?' },
  { label: 'Falla', message: '¿Hay una falla o paro activo en Prisma?' },
  { label: 'Mantenimiento', message: 'Explica el riesgo de mantenimiento.' },
] as const

export function ConsolaOdin({
  equipos,
  urlPrisma,
  urlStartrack,
}: {
  equipos: EquipoOdin[]
  urlPrisma: string | null
  urlStartrack: string | null
}) {
  const [assetId, setAssetId] = useState(equipos[0]?.id ?? '')
  const [pregunta, setPregunta] = useState('')
  const [message, setMessage] = useState<string>(CONSULTAS[0].message)
  const [response, setResponse] = useState<RespuestaOdin | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Arranca en 'warming': el efecto de abajo dispara el calentamiento en el
  // primer montaje, así que ese es el estado real desde el primer render.
  // Ponerlo con un setState dentro del efecto encadenaría un render de más.
  const [warm, setWarm] = useState<'warming' | 'ready' | 'cold'>('warming')

  const seleccionado = useMemo(
    () => equipos.find((e) => e.id === assetId) ?? equipos[0] ?? null,
    [assetId, equipos],
  )

  useEffect(() => {
    let cancelado = false
    fetch('/api/odin/warmup', { method: 'POST' })
      .then((r) => {
        if (!cancelado) setWarm(r.ok ? 'ready' : 'cold')
      })
      .catch(() => {
        if (!cancelado) setWarm('cold')
      })
    return () => {
      cancelado = true
    }
  }, [])

  async function consultar(texto: string) {
    const limpia = texto.trim()
    if (!seleccionado || loading || !limpia) return
    setMessage(limpia)
    setPregunta(limpia)
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const result = await fetch('/api/odin/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assetId: seleccionado.id, message: limpia }),
      })
      const body = await result.json()
      if (!result.ok) {
        setError(body.error ?? 'No fue posible consultar O.D.I.N.')
        return
      }
      setResponse(body as RespuestaOdin)
    } catch {
      setError('No fue posible conectar con O.D.I.N. El resto de ECON NECT sigue disponible.')
    } finally {
      setLoading(false)
    }
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void consultar(pregunta)
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 font-sans font-label tracking-normal">
      <header className="flex flex-col gap-1">
        <p className="flex items-center gap-2 font-heading text-lg font-extrabold tracking-tight text-primary">
          <Bot aria-hidden className="size-5" />
          O.D.I.N.
        </p>
        <p className="text-sm text-muted-foreground">
          La lectura de abajo ya es la source of truth. Qwen solo la redacta.
        </p>
      </header>

      {equipos.length === 0 ? (
        <p className="rounded-lg bg-veredicto-sin-evidencia-fondo px-3 py-2 text-sm text-veredicto-sin-evidencia">
          No hay equipos en la lectura actual.
        </p>
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold">Equipo</span>
          <select
            value={assetId}
            onChange={(e) => {
              setAssetId(e.target.value)
              setResponse(null)
              setError(null)
            }}
            className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm tracking-normal outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {equipos.map((equipo) => (
              <option key={equipo.id} value={equipo.id}>
                {equipo.codigo} · {equipo.nombre}
              </option>
            ))}
          </select>
        </label>
      )}

      {seleccionado ? (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-start gap-4">
            <IconoMaquinaria clase={seleccionado.clase} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-heading text-base font-extrabold tracking-tight text-primary">
                  {seleccionado.codigo}
                </span>
                <BadgeVeredicto veredicto={seleccionado.veredicto} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{seleccionado.nombre}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-origen-prisma">
                {seleccionado.clase ?? 'Clase no identificada'}
              </p>
            </div>
          </div>
          {seleccionado.lectura ? (
            <p className="text-sm font-bold">{seleccionado.lectura}</p>
          ) : null}
          {seleccionado.paso ? (
            <p className="text-sm leading-snug">{seleccionado.paso}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href={`/equipo/${encodeURIComponent(seleccionado.id)}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[13px] font-bold text-primary-foreground"
            >
              Abrir ficha
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
            <BadgeOrigen
              plataforma="prisma"
              corto
              href={urlFichaPrisma(urlPrisma, seleccionado.id)}
              equipo={seleccionado.codigo}
            />
            <BadgeOrigen
              plataforma="startrack"
              corto
              href={urlStartrack}
              equipo={seleccionado.codigo}
            />
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {CONSULTAS.map((c) => (
            <button
              key={c.label}
              type="button"
              disabled={!seleccionado || loading}
              onClick={() => {
                setPregunta(c.message)
                void consultar(c.message)
              }}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold tracking-normal transition-colors hover:bg-muted disabled:opacity-50"
            >
              {c.label}
            </button>
          ))}
        </div>

        <p className="text-[11px] leading-snug text-muted-foreground">
          También identidad, ubicación, falla, siguiente paso o qué falta. Horómetro y km no vienen en esta lectura.
        </p>

        <form onSubmit={enviar} className="flex items-end gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Pregunta para O.D.I.N.</span>
            <textarea
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void consultar(pregunta)
                }
              }}
              rows={2}
              maxLength={2000}
              placeholder="Pregunta libre sobre este equipo…"
              disabled={!seleccionado || loading}
              className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm tracking-normal outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            />
          </label>
          <button
            type="submit"
            disabled={!seleccionado || loading || pregunta.trim().length === 0}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            <Send aria-hidden className="size-3.5" />
            Preguntar
          </button>
        </form>
      </div>

      {warm === 'warming' && !loading ? (
        <p className="text-xs text-muted-foreground">Preparando Qwen para la primera consulta…</p>
      ) : null}

      {loading ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-4"
        >
          <LoaderCircle aria-hidden className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-bold">Qwen está redactando</p>
            <p className="text-xs leading-snug text-muted-foreground">
              El veredicto de arriba no espera. La prosa local tarda unos 15 s en CPU.
            </p>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {response ? (
        <section aria-live="polite" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
              Siguiente paso
            </p>
            <p className="mt-1 text-base font-bold leading-snug tracking-normal">
              <TextoEnfasis texto={response.suggested_action ?? seleccionado?.paso ?? 'Sin paso sugerido'} />
            </p>
          </div>
          {response.missing_data.length > 0 ? (
            <p className="flex gap-2 rounded-lg bg-veredicto-sin-evidencia-fondo px-3 py-2 text-sm text-veredicto-sin-evidencia">
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              Faltan datos para esa pregunta. El veredicto de arriba sigue valiendo.
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {response.response_mode === 'local_qwen'
                ? 'Por qué'
                : response.response_mode === 'policy_rejection'
                  ? 'Fuera de alcance'
                  : 'Por qué (respaldo)'}
            </p>
            <p className="text-sm leading-7">
              <TextoEnfasis texto={response.answer} />
            </p>
          </div>
        </section>
      ) : null}

      <p className="sr-only">Consulta enviada: {message}</p>
    </div>
  )
}
