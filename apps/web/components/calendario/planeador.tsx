'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Info, RefreshCw } from 'lucide-react'
import type { ClaseEquipoCatalogo } from '@/lib/canonico/catalogos'
import type { AsignacionPropuesta, ErrorOptimizar, PeticionOptimizar, RespuestaOptimizar } from '@/lib/optimizador/tipos'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BarraSuperior } from '@/components/comando/barra-superior'
import { PilaPrioridades, pilaAPeticion, pilaInicial, type ItemPila } from './pila-prioridades'
import { ClasesSensiblesLluvia } from './clases-sensibles-lluvia'
import { ResumenNiveles } from './resumen-niveles'
import { TimelineMaquinas } from './timeline-maquinas'
import { DetalleAsignacion } from './detalle-asignacion'
import { TilesKpiOptimizador } from './tiles-kpi-optimizador'

type EstadoDeCarga = 'cargando' | 'listo' | 'error'

function formatearHora(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-SV', {
      dateStyle: 'short',
      timeStyle: 'medium',
      timeZone: 'America/El_Salvador',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-48 shrink-0" />
          <Skeleton className="h-10 flex-1" />
        </div>
      ))}
    </div>
  )
}

export function Planeador() {
  const [pila, setPila] = useState<ItemPila[]>(pilaInicial)
  const [clasesSensiblesLluvia, setClasesSensiblesLluvia] = useState<ClaseEquipoCatalogo[]>([])
  const [respuesta, setRespuesta] = useState<RespuestaOptimizar | null>(null)
  const [ultimaPeticionEnviada, setUltimaPeticionEnviada] = useState<PeticionOptimizar | null>(null)
  const [estadoDeCarga, setEstadoDeCarga] = useState<EstadoDeCarga>('cargando')
  const [error, setError] = useState<ErrorOptimizar | null>(null)
  const [asignacionSeleccionada, setAsignacionSeleccionada] = useState<AsignacionPropuesta | null>(null)
  const [detalleAbierto, setDetalleAbierto] = useState(false)

  // Separado de `optimizar` para que el efecto de montaje no dispare un
  // setState síncrono en su propio cuerpo (react-hooks/set-state-in-effect):
  // acá el primer `await` corta la ejecución síncrona antes de tocar estado.
  const ejecutarPeticion = useCallback(async (peticion: PeticionOptimizar) => {
    try {
      const res = await fetch('/api/optimizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(peticion),
      })
      const cuerpo = await res.json()
      if (!res.ok) {
        setError(cuerpo as ErrorOptimizar)
        setEstadoDeCarga('error')
        return
      }
      setRespuesta(cuerpo as RespuestaOptimizar)
      setUltimaPeticionEnviada(peticion)
      setEstadoDeCarga('listo')
    } catch (e) {
      setError({
        error: 'fuente_no_disponible',
        mensaje: e instanceof Error ? e.message : String(e),
      })
      setEstadoDeCarga('error')
    }
  }, [])

  const optimizar = useCallback(
    (peticion: PeticionOptimizar) => {
      setEstadoDeCarga('cargando')
      setError(null)
      void ejecutarPeticion(peticion)
    },
    [ejecutarPeticion],
  )

  useEffect(() => {
    // El estado inicial ya es 'cargando'/null: el montaje no necesita
    // resetearlo, solo disparar la petición. Reordenar la pila o marcar
    // clases no dispara la llamada de nuevo. El lint de set-state-in-effect
    // no distingue que el único setState de `ejecutarPeticion` corre después
    // de `await fetch(...)`, no síncrono — es el patrón estándar de carga al
    // montar (no hay forma de leer /api/optimizar sin un efecto).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void ejecutarPeticion({ pila: pilaAPeticion(pilaInicial()), clasesSensiblesLluvia: [] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const peticionActual: PeticionOptimizar = { pila: pilaAPeticion(pila), clasesSensiblesLluvia }
  const hayCambiosSinAplicar =
    ultimaPeticionEnviada !== null &&
    (JSON.stringify(peticionActual.pila) !== JSON.stringify(ultimaPeticionEnviada.pila) ||
      JSON.stringify([...peticionActual.clasesSensiblesLluvia].sort()) !==
        JSON.stringify([...ultimaPeticionEnviada.clasesSensiblesLluvia].sort()))

  function abrirDetalle(a: AsignacionPropuesta) {
    setAsignacionSeleccionada(a)
    setDetalleAbierto(true)
  }

  const sinSolicitudesEvaluables =
    respuesta !== null &&
    respuesta.estado === 'infactible' &&
    respuesta.asignaciones.length === 0 &&
    respuesta.sinAsignacion.length === 0

  return (
    <>
      <BarraSuperior
        titulo="Planeación de maquinaria"
        ultimaLectura={respuesta ? formatearHora(respuesta.generadoEn) : 'Sin lectura todavía'}
        usuario={{ nombre: 'Logística', iniciales: 'LG' }}
      />

      <main className="flex flex-col gap-6 p-7">
        <Alert>
          <Info aria-hidden />
          <AlertTitle>Propuesta del optimizador</AlertTitle>
          <AlertDescription>No se escribe nada en Prisma ni Startrack.</AlertDescription>
        </Alert>

        <div className="grid gap-6 lg:grid-cols-2">
          <PilaPrioridades items={pila} onChange={setPila} />
          <ClasesSensiblesLluvia seleccionadas={clasesSensiblesLluvia} onChange={setClasesSensiblesLluvia} />
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => optimizar(peticionActual)} disabled={estadoDeCarga === 'cargando'}>
            <RefreshCw aria-hidden className={estadoDeCarga === 'cargando' ? 'animate-spin' : undefined} />
            Re-optimizar
          </Button>
          {hayCambiosSinAplicar && (
            <span className="font-label text-xs font-semibold text-veredicto-atencion">Hay cambios sin aplicar</span>
          )}
        </div>

        {estadoDeCarga === 'cargando' && <TimelineSkeleton />}

        {estadoDeCarga === 'error' && error && (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden />
            <AlertTitle>
              {error.error === 'solver_no_disponible' && 'El optimizador no responde'}
              {error.error === 'fuente_no_disponible' && 'Una fuente no responde'}
              {error.error === 'verificacion_fallida' && 'Verificación fallida'}
              {error.error === 'peticion_invalida' && 'Petición inválida'}
            </AlertTitle>
            <AlertDescription>
              {error.error === 'solver_no_disponible' &&
                'El optimizador no responde. No se propone nada hasta que vuelva.'}
              {error.error === 'fuente_no_disponible' &&
                `${error.fuente?.plataforma ?? 'una plataforma'} no respondió en ${error.fuente?.endpoint ?? 'su endpoint'}.`}
              {error.error === 'verificacion_fallida' &&
                'El optimizador devolvió una propuesta que rompía una restricción y se descartó.'}
              {error.error === 'peticion_invalida' && error.mensaje}
              <div className="mt-2">
                <Button variant="outline" size="sm" onClick={() => optimizar(peticionActual)}>
                  Reintentar
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {estadoDeCarga === 'listo' && respuesta && (
          <>
            <ResumenNiveles respuesta={respuesta} />

            {sinSolicitudesEvaluables ? (
              <Alert>
                <Info aria-hidden />
                <AlertTitle>No hay solicitudes evaluables</AlertTitle>
                <AlertDescription>
                  {respuesta.motivoInfactible}
                  {respuesta.excluidas.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1">
                      {respuesta.excluidas.map((e) => (
                        <li key={e.solicitud.id}>
                          {e.solicitud.codigoProyecto ?? e.solicitud.proyecto.valor ?? 'Sin registro'} — {e.motivo}
                        </li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <TimelineMaquinas respuesta={respuesta} onSeleccionarAsignacion={abrirDetalle} />
            )}

            <TilesKpiOptimizador respuesta={respuesta} />

            {respuesta.avisos.length > 0 && (
              <Alert>
                <Info aria-hidden />
                <AlertTitle>Avisos</AlertTitle>
                <AlertDescription>
                  <ul className="flex flex-col gap-1">
                    {respuesta.avisos.map((aviso, i) => (
                      <li key={i}>{aviso}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </main>

      <DetalleAsignacion
        asignacion={asignacionSeleccionada}
        abierto={detalleAbierto}
        onOpenChange={setDetalleAbierto}
      />
    </>
  )
}
