'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ResultadoMantenimiento } from '@/lib/mantenimiento/tipos'
import {
  EVENTO_PARAMETROS_MANTENIMIENTO,
  leerParametrosNavegador,
  serializarParametros,
} from './parametros-navegador'

type EstadoMantenimiento = {
  resultado: ResultadoMantenimiento | null
  cargando: boolean
  error: string | null
  refrescar: () => void
}

const ContextoMantenimiento = createContext<EstadoMantenimiento | null>(null)

export function ProveedorMantenimiento({ children }: { children: React.ReactNode }) {
  const [resultado, setResultado] = useState<ResultadoMantenimiento | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const enCurso = useRef(false)

  const cargar = useCallback(async () => {
    if (enCurso.current) return
    if (typeof document !== 'undefined' && document.hidden) return
    enCurso.current = true
    setCargando((actual) => actual)
    try {
      const parametros = leerParametrosNavegador()
      const respuesta = await fetch(`/api/mantenimiento?parametros=${serializarParametros(parametros)}`, {
        cache: 'no-store',
      })
      const cuerpo = await respuesta.json().catch(() => null)
      if (!respuesta.ok) {
        setError(cuerpo?.mensaje ?? 'No se pudo leer mantenimiento preventivo.')
        return
      }
      setResultado(cuerpo as ResultadoMantenimiento)
      setError(null)
    } catch {
      setError('No se pudo contactar el pronostico de mantenimiento.')
    } finally {
      enCurso.current = false
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    const inicial = window.setTimeout(() => void cargar(), 0)
    const intervalo = window.setInterval(() => void cargar(), 60_000)
    const alVolver = () => {
      if (!document.hidden) void cargar()
    }
    const alParametro = () => void cargar()
    window.addEventListener('visibilitychange', alVolver)
    window.addEventListener(EVENTO_PARAMETROS_MANTENIMIENTO, alParametro)
    window.addEventListener('storage', alParametro)
    return () => {
      window.clearTimeout(inicial)
      window.clearInterval(intervalo)
      window.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener(EVENTO_PARAMETROS_MANTENIMIENTO, alParametro)
      window.removeEventListener('storage', alParametro)
    }
  }, [cargar])

  const valor = useMemo<EstadoMantenimiento>(
    () => ({ resultado, cargando, error, refrescar: () => void cargar() }),
    [resultado, cargando, error, cargar],
  )

  return <ContextoMantenimiento.Provider value={valor}>{children}</ContextoMantenimiento.Provider>
}

export function useMantenimiento(): EstadoMantenimiento {
  const valor = useContext(ContextoMantenimiento)
  if (!valor) {
    return { resultado: null, cargando: false, error: null, refrescar: () => undefined }
  }
  return valor
}
