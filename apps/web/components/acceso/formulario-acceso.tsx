'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SaludFuente } from '@/lib/tipos/canonico'

/**
 * Pantalla de acceso por rol — S-C3 (01 Parte D.5).
 *
 * Una sola caja de texto: la clave dice el rol. No hay lista de roles para
 * elegir porque eso confirmaría cuáles existen, y el servidor responde lo mismo
 * ante cualquier clave equivocada.
 *
 * La clave viaja en el cuerpo de un POST y nunca se guarda en el navegador: lo
 * que vuelve es una cookie `HttpOnly` firmada que solo contiene el rol.
 *
 * Abajo, el estado de las dos plataformas (`GET /api/salud`, la única ruta que
 * responde sin sesión): si el sandbox está caído a las 3 de la mañana, se ve
 * antes de escribir la clave y no parece un problema del login.
 */
const COLOR_ESTADO: Record<SaludFuente['estado'], string> = {
  ok: 'bg-veredicto-coherente',
  lenta: 'bg-veredicto-atencion',
  caida: 'bg-veredicto-riesgo',
}

const TEXTO_ESTADO: Record<SaludFuente['estado'], string> = {
  ok: 'responde',
  lenta: 'lenta',
  caida: 'no responde',
}

type Props = {
  /** A dónde volver después de entrar, si el proxy interrumpió una navegación. */
  desde: string | null
  /** Si el servidor no tiene ninguna clave configurada, no hay nada que probar. */
  hayClavesConfiguradas: boolean
}

export function FormularioAcceso({ desde, hayClavesConfiguradas }: Props) {
  const router = useRouter()
  const [clave, setClave] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [salud, setSalud] = useState<SaludFuente[] | null>(null)

  useEffect(() => {
    let vigente = true
    fetch('/api/salud')
      .then((respuesta) => respuesta.json())
      .then((cuerpo) => {
        if (vigente && Array.isArray(cuerpo?.salud)) setSalud(cuerpo.salud as SaludFuente[])
      })
      .catch(() => {
        // El estado de las plataformas es informativo: si no se puede leer, la
        // pantalla de acceso sigue siendo usable.
      })
    return () => {
      vigente = false
    }
  }, [])

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setError(null)

    try {
      const respuesta = await fetch('/api/acceso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave }),
      })
      const cuerpo = await respuesta.json()

      if (!respuesta.ok) {
        setError(cuerpo?.mensaje ?? 'No se pudo entrar.')
        setEnviando(false)
        return
      }

      setClave('')
      router.push(desde ?? cuerpo.vistaInicial ?? '/command-center')
      router.refresh()
    } catch {
      setError('No se pudo contactar al servidor.')
      setEnviando(false)
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl bg-card p-8 shadow-card">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-xl font-bold tracking-tight text-primary">ECON NECT</h1>
        <p className="font-label text-sm text-muted-foreground">
          Entrá con la clave de tu gerencia. Cada rol abre su propia vista.
        </p>
      </div>

      {!hayClavesConfiguradas ? (
        <p
          role="alert"
          className="rounded-lg border border-veredicto-atencion/40 bg-veredicto-atencion-fondo p-3 font-label text-[13px] text-veredicto-atencion"
        >
          El servidor no tiene ninguna clave de rol configurada. Definí las variables
          <code className="mx-1 font-mono">NECT_CLAVE_*</code>
          en <code className="font-mono">.env.local</code> y recargá.
        </p>
      ) : (
        <form onSubmit={entrar} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clave" className="font-label text-xs uppercase tracking-wide">
              Clave de rol
            </Label>
            <Input
              id="clave"
              name="clave"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={clave}
              onChange={(evento) => setClave(evento.target.value)}
              aria-invalid={error !== null}
              aria-describedby={error ? 'error-acceso' : undefined}
              className="h-10"
            />
          </div>

          {error && (
            <p
              id="error-acceso"
              role="alert"
              className="font-label text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <Button type="submit" disabled={enviando || clave.length === 0} className="h-10">
            {enviando ? 'Verificando…' : 'Entrar'}
          </Button>
        </form>
      )}

      <div className="flex flex-col gap-1.5 border-t border-border pt-4">
        <span className="font-label text-[11px] uppercase tracking-wide text-muted-foreground">
          Estado de las plataformas
        </span>
        {salud === null ? (
          <span className="font-label text-[13px] text-muted-foreground">Consultando…</span>
        ) : (
          <ul className="flex flex-col gap-1">
            {salud.map((fuente) => (
              <li key={fuente.plataforma} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`size-2 rounded-full ${COLOR_ESTADO[fuente.estado]}`}
                />
                <span className="font-label text-[13px] capitalize">{fuente.plataforma}</span>
                <span className="font-label text-[13px] text-muted-foreground">
                  {TEXTO_ESTADO[fuente.estado]}
                  {fuente.latenciaMs !== null && ` · ${fuente.latenciaMs} ms`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
