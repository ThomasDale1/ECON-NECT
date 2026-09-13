'use client'

import { FormEvent, useState } from 'react'
import { Bot, CircleAlert, Database, LoaderCircle, Send, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { RespuestaOdin } from '@/lib/inteligencia/tipos'


type EquipoOdin = {
  id: string
  codigo: string
  nombre: string
}

const CONSULTAS_RAPIDAS = [
  '¿Cuál es el estado operativo del equipo?',
  'Explica la incoherencia detectada.',
  'Explica el riesgo de mantenimiento.',
]

const NOMBRE_INTENCION: Record<RespuestaOdin['intent'], string> = {
  QUERY_ASSET_STATUS: 'Estado operativo',
  EXPLAIN_INCONSISTENCY: 'Explicación de incoherencia',
  EXPLAIN_MAINTENANCE_RISK: 'Riesgo de mantenimiento',
  OUT_OF_SCOPE: 'Fuera de alcance',
}

export function ConsolaOdin({ equipos }: { equipos: EquipoOdin[] }) {
  const [assetId, setAssetId] = useState(equipos[0]?.id ?? '')
  const [message, setMessage] = useState(CONSULTAS_RAPIDAS[0])
  const [response, setResponse] = useState<RespuestaOdin | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!assetId || !message.trim() || loading) return

    setLoading(true)
    setError(null)

    try {
      const result = await fetch('/api/odin/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assetId, message }),
      })
      const body = await result.json()

      if (!result.ok) {
        setResponse(null)
        setError(body.error ?? 'No fue posible consultar O.D.I.N.')
        return
      }

      setResponse(body as RespuestaOdin)
    } catch {
      setResponse(null)
      setError('No fue posible conectar con O.D.I.N. El resto de ECON NECT sigue disponible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <Card className="border border-border shadow-card">
        <CardHeader className="border-b border-border">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl text-primary">
                <Bot aria-hidden className="size-5" />
                O.D.I.N. Web
              </CardTitle>
              <CardDescription className="mt-1">
                Operador de Datos e Inteligencia de Negocios · solo lectura
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1.5">
              <ShieldCheck aria-hidden /> Sin herramientas de escritura
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-5 pt-2">
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="font-label text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Alcance del MVP
            </p>
            <p className="mt-1 text-sm">
              Consulta estados, explica incoherencias y explica el índice de mantenimiento. O.D.I.N.
              no aprueba ni modifica operaciones.
            </p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={submit}>
            {equipos.length === 0 ? (
              <div
                role="status"
                className="rounded-lg bg-veredicto-sin-evidencia-fondo px-3 py-2 text-sm text-veredicto-sin-evidencia"
              >
                No hay equipos disponibles en las fuentes conectadas. Revise el estado de Prisma y
                Startrack.
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="equipo-odin" className="font-label text-sm font-bold">
                Equipo
              </label>
              <Select value={assetId} onValueChange={(value) => setAssetId(value ?? '')}>
                <SelectTrigger id="equipo-odin" className="w-full">
                  <SelectValue placeholder="Seleccione un equipo" />
                </SelectTrigger>
                <SelectContent>
                  {equipos.map((equipo) => (
                    <SelectItem key={equipo.id} value={equipo.id}>
                      <span className="font-mono text-xs">{equipo.codigo}</span>
                      <span>{equipo.nombre}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="consulta-odin" className="font-label text-sm font-bold">
                Consulta
              </label>
              <Textarea
                id="consulta-odin"
                value={message}
                maxLength={2_000}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Pregunte por el estado, una incoherencia o el riesgo de mantenimiento…"
                className="min-h-28 resize-y"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {CONSULTAS_RAPIDAS.map((query) => (
                <Button key={query} type="button" variant="outline" size="sm" onClick={() => setMessage(query)}>
                  {query}
                </Button>
              ))}
            </div>

            <Button type="submit" className="self-end" disabled={loading || !assetId || !message.trim()}>
              {loading ? (
                <LoaderCircle aria-hidden className="animate-spin" />
              ) : (
                <Send aria-hidden />
              )}
              {loading ? 'Consultando…' : 'Consultar O.D.I.N.'}
            </Button>
          </form>

          {error ? (
            <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {response ? (
            <section aria-live="polite" className="flex flex-col gap-4 rounded-xl border border-border p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{NOMBRE_INTENCION[response.intent]}</Badge>
                <Badge variant="outline">
                  {response.response_mode === 'local_qwen' ? 'Qwen local' : 'Fallback determinístico'}
                </Badge>
                {response.confidence === null ? null : (
                  <span className="font-mono text-xs text-muted-foreground">
                    Respaldo de evidencia: {response.confidence}
                  </span>
                )}
              </div>

              <p className="text-base leading-7">{response.answer}</p>

              {response.missing_data.length > 0 ? (
                <div className="flex gap-2 rounded-lg bg-veredicto-sin-evidencia-fondo px-3 py-2 text-sm text-veredicto-sin-evidencia">
                  <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <span>Datos faltantes: {response.missing_data.join(', ')}</span>
                </div>
              ) : null}

              {response.suggested_action ? (
                <div>
                  <p className="font-label text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Acción sugerida
                  </p>
                  <p className="mt-1 text-sm">{response.suggested_action}</p>
                </div>
              ) : null}
            </section>
          ) : null}
        </CardContent>
      </Card>

      <aside className="flex flex-col gap-4">
        <Card className="border border-border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database aria-hidden className="size-4" /> Evidencia
            </CardTitle>
            <CardDescription>Fuentes utilizadas en la última respuesta</CardDescription>
          </CardHeader>
          <CardContent>
            {!response || response.sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no hay una consulta con evidencia.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {response.evidence.map((item) => (
                  <li key={`${item.platform}-${item.endpoint}-${item.field}`} className="rounded-lg bg-muted/50 p-3">
                    <p className="font-label text-xs font-bold uppercase">{item.platform}</p>
                    <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                      {item.endpoint} · {item.field}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">{item.as_of}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
          <p className="font-label font-bold text-primary">Datos canónicos</p>
          <p className="mt-1 text-muted-foreground">
            El navegador envía solo el identificador. El servidor relee y minimiza el estado
            unificado de Prisma y Startrack.
          </p>
        </div>
      </aside>
    </div>
  )
}
