'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, Info, RefreshCw } from 'lucide-react'
import type {
  AsignacionPropuesta,
  CambioPlan,
  ErrorOptimizar,
  IdPrioridad,
  PeticionOptimizar,
  RespuestaOptimizar,
} from '@/lib/optimizador/tipos'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BarraSuperior } from '@/components/comando/barra-superior'
import { cn } from '@/lib/utils'
import { AvisoCambios } from './aviso-cambios'
import { DetalleAsignacion } from './detalle-asignacion'
import { clampFecha, semanaQueContiene } from './fechas'
import { PilaPrioridades, pilaAPeticion, pilaInicial, type ItemPila } from './pila-prioridades'
import { ResumenNiveles } from './resumen-niveles'
import { TilesKpiOptimizador, TilesKpiSkeleton } from './tiles-kpi-optimizador'
import { TimelineMaquinas } from './timeline-maquinas'
import { VistaDia } from './vista-dia'

/** Cada cuánto se rehace el plan solo (S-A10 Paso 10f). */
const INTERVALO_REPLAN_MS = 60_000

type EstadoDeCarga = 'cargando' | 'listo' | 'error'
type Vista = { tipo: 'semana' } | { tipo: 'dia'; fecha: string }
type ResultadoPeticion = { ok: true; respuesta: RespuestaOptimizar } | { ok: false; error: ErrorOptimizar }

function formatearHora(iso: string, conFecha = true): string {
  try {
    return new Intl.DateTimeFormat('es-SV', {
      ...(conFecha ? { dateStyle: 'short' as const } : {}),
      timeStyle: 'medium',
      timeZone: 'America/El_Salvador',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

async function pedirPlan(peticion: PeticionOptimizar): Promise<ResultadoPeticion> {
  try {
    const res = await fetch('/api/optimizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(peticion),
    })
    const cuerpo = await res.json()
    if (!res.ok) return { ok: false, error: cuerpo as ErrorOptimizar }
    return { ok: true, respuesta: cuerpo as RespuestaOptimizar }
  } catch (e) {
    return { ok: false, error: { error: 'fuente_no_disponible', mensaje: e instanceof Error ? e.message : String(e) } }
  }
}

/** Solo ids: lo único que el servidor necesita para calcular los cambios. */
function idsDelPlan(respuesta: RespuestaOptimizar): PeticionOptimizar['planAnterior'] {
  return respuesta.asignaciones.map((a) => ({
    solicitudId: a.solicitud.id,
    maquinaId: a.maquina.id,
    operadorId: a.operador.id,
  }))
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

function ExcluidasPlegables({ excluidas }: { excluidas: RespuestaOptimizar['excluidas'] }) {
  const [abiertas, setAbiertas] = useState(false)
  if (excluidas.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setAbiertas((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-expanded={abiertas}
      >
        {abiertas ? <ChevronDown aria-hidden className="size-4" /> : <ChevronRight aria-hidden className="size-4" />}
        {excluidas.length} solicitud(es) excluida(s) (período vencido)
      </button>
      {abiertas && (
        <ul className="flex flex-col gap-1.5 border-t border-border px-4 py-3">
          {excluidas.map((e) => (
            <li key={e.solicitud.id} className="text-sm text-muted-foreground">
              {e.solicitud.codigoProyecto ?? e.solicitud.proyecto.valor ?? 'Sin registro'} — {e.motivo}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SelectorVista({ vista, onSemana, onDia }: { vista: Vista; onSemana: () => void; onDia: () => void }) {
  const opciones = [
    { tipo: 'semana' as const, texto: 'Semana', onClick: onSemana },
    { tipo: 'dia' as const, texto: 'Día', onClick: onDia },
  ]
  return (
    <div role="group" aria-label="Vista del calendario" className="inline-flex w-fit rounded-lg bg-muted p-0.75">
      {opciones.map((opcion) => (
        <button
          key={opcion.tipo}
          type="button"
          aria-pressed={vista.tipo === opcion.tipo}
          onClick={opcion.onClick}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            vista.tipo === opcion.tipo ? 'bg-background text-foreground shadow-sm' : 'text-foreground/60 hover:text-foreground',
          )}
        >
          {opcion.texto}
        </button>
      ))}
    </div>
  )
}

/**
 * Planeación de maquinaria — S-B4, reordenado en S-A10 Paso 10c. La UI solo
 * muestra: el plan, los KPIs y el diff de cambios llegan calculados de
 * `POST /api/optimizar`.
 *
 * Replan automático (Paso 10f): cada 60 s, solo con la pestaña visible y sin
 * corridas superpuestas, con la última pila aplicada y los ids del plan en
 * pantalla. No muestra skeleton ni resetea la vista; si falla, conserva el
 * plan y avisa sin bloquear.
 */
export function Planeador() {
  const [pila, setPila] = useState<ItemPila[]>(pilaInicial)
  const [pilaAplicada, setPilaAplicada] = useState<IdPrioridad[]>(() => pilaAPeticion(pilaInicial()))
  const [respuesta, setRespuesta] = useState<RespuestaOptimizar | null>(null)
  const [estadoDeCarga, setEstadoDeCarga] = useState<EstadoDeCarga>('cargando')
  const [error, setError] = useState<ErrorOptimizar | null>(null)
  const [errorAutomatico, setErrorAutomatico] = useState<string | null>(null)
  const [avisoCambios, setAvisoCambios] = useState<{ cambios: CambioPlan[]; generadoEn: string } | null>(null)
  const [asignacionSeleccionada, setAsignacionSeleccionada] = useState<AsignacionPropuesta | null>(null)
  const [detalleAbierto, setDetalleAbierto] = useState(false)
  const [vista, setVista] = useState<Vista>({ tipo: 'semana' })
  const [inicioSemana, setInicioSemana] = useState<string | null>(null)

  // El intervalo lee estos valores sin reiniciarse en cada render.
  const secuencia = useRef(0)
  const enCurso = useRef(false)
  const respuestaRef = useRef<RespuestaOptimizar | null>(null)
  const pilaAplicadaRef = useRef<IdPrioridad[]>(pilaAplicada)
  useEffect(() => {
    respuestaRef.current = respuesta
  }, [respuesta])
  useEffect(() => {
    pilaAplicadaRef.current = pilaAplicada
  }, [pilaAplicada])

  // Carga inicial y "Re-optimizar": sin plan anterior. Una petición manual
  // invalida cualquier automática en curso (su respuesta se descarta).
  const ejecutarManual = useCallback(async (pilaPedida: IdPrioridad[]) => {
    const id = ++secuencia.current
    enCurso.current = true
    const resultado = await pedirPlan({ pila: pilaPedida, planAnterior: null })
    if (id !== secuencia.current) return
    enCurso.current = false

    if (!resultado.ok) {
      setError(resultado.error)
      setEstadoDeCarga('error')
      return
    }
    setRespuesta(resultado.respuesta)
    setErrorAutomatico(null)
    setEstadoDeCarga('listo')
  }, [])

  const ejecutarAutomatico = useCallback(async () => {
    const anterior = respuestaRef.current
    const id = ++secuencia.current
    enCurso.current = true
    const resultado = await pedirPlan({
      pila: pilaAplicadaRef.current,
      planAnterior: anterior ? idsDelPlan(anterior) : null,
    })
    if (id !== secuencia.current) return
    enCurso.current = false

    if (!resultado.ok) {
      setErrorAutomatico(resultado.error.mensaje)
      return
    }
    const nueva = resultado.respuesta
    setRespuesta(nueva)
    setError(null)
    setErrorAutomatico(null)
    setEstadoDeCarga('listo')
    if (nueva.cambios.length > 0) setAvisoCambios({ cambios: nueva.cambios, generadoEn: nueva.generadoEn })
    // El detalle abierto sigue abierto, con los datos de la lectura nueva.
    setAsignacionSeleccionada((actual) =>
      actual ? (nueva.asignaciones.find((a) => a.solicitud.id === actual.solicitud.id) ?? actual) : actual,
    )
  }, [])

  const optimizar = useCallback(
    (pilaPedida: IdPrioridad[]) => {
      setEstadoDeCarga('cargando')
      setError(null)
      setPilaAplicada(pilaPedida)
      void ejecutarManual(pilaPedida)
    },
    [ejecutarManual],
  )

  useEffect(() => {
    // El estado inicial ya es 'cargando'/null: el montaje solo dispara la
    // petición. El único setState de `ejecutarManual` corre después de
    // `await fetch(...)`, no síncrono — es el patrón estándar de carga al
    // montar (no hay forma de leer /api/optimizar sin un efecto).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void ejecutarManual(pilaAPeticion(pilaInicial()))
  }, [ejecutarManual])

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      if (enCurso.current) return
      void ejecutarAutomatico()
    }, INTERVALO_REPLAN_MS)
    return () => window.clearInterval(intervalo)
  }, [ejecutarAutomatico])

  const pilaEditada = pilaAPeticion(pila)
  const hayCambiosSinAplicar = JSON.stringify(pilaEditada) !== JSON.stringify(pilaAplicada)

  function abrirDetalle(a: AsignacionPropuesta) {
    setAsignacionSeleccionada(a)
    setDetalleAbierto(true)
  }

  const sinSolicitudesEvaluables =
    respuesta !== null &&
    respuesta.estado === 'infactible' &&
    respuesta.asignaciones.length === 0 &&
    respuesta.sinAsignacion.length === 0

  const listo = estadoDeCarga === 'listo' && respuesta !== null

  return (
    <>
      <BarraSuperior
        titulo="Planeación de maquinaria"
        ultimaLectura={
          respuesta ? `${formatearHora(respuesta.generadoEn)} · se actualiza cada 60 s` : 'Sin lectura todavía'
        }
        datoViejo={listo && errorAutomatico !== null}
        usuario={{ nombre: 'Logística', iniciales: 'LG' }}
      />

      <main className="flex flex-col gap-6 p-7">
        {/* 2. Aviso compacto */}
        <Alert>
          <Info aria-hidden />
          <AlertTitle className="font-normal">
            Propuesta del optimizador — no se escribe nada en Prisma ni Startrack.
          </AlertTitle>
        </Alert>

        {listo && errorAutomatico && (
          <Alert>
            <AlertTriangle aria-hidden />
            <AlertTitle className="font-normal">
              La actualización automática falló: {errorAutomatico}. Se reintenta en 60 s.
            </AlertTitle>
          </Alert>
        )}

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
                <Button variant="outline" size="sm" onClick={() => optimizar(pilaEditada)}>
                  Reintentar
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 3. Fila de KPIs */}
        {estadoDeCarga === 'cargando' && <TilesKpiSkeleton />}
        {listo && <TilesKpiOptimizador respuesta={respuesta} />}

        {/* 4. Aviso de cambios */}
        {listo && avisoCambios && (
          <AvisoCambios
            cambios={avisoCambios.cambios}
            hora={formatearHora(avisoCambios.generadoEn, false)}
            onEntendido={() => setAvisoCambios(null)}
          />
        )}

        {/* 5. Pila + resumen de niveles, con Re-optimizar */}
        <div className="grid gap-6 lg:grid-cols-2">
          <PilaPrioridades items={pila} onChange={setPila} cobertura={respuesta?.coberturaOperadores ?? null} />
          {listo && <ResumenNiveles respuesta={respuesta} />}
          {estadoDeCarga === 'cargando' && <Skeleton className="h-48 rounded-xl" />}
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => optimizar(pilaEditada)} disabled={estadoDeCarga === 'cargando'}>
            <RefreshCw aria-hidden className={estadoDeCarga === 'cargando' ? 'animate-spin' : undefined} />
            Re-optimizar
          </Button>
          {hayCambiosSinAplicar && (
            <span className="font-label text-xs font-semibold text-veredicto-atencion">Hay cambios sin aplicar</span>
          )}
        </div>

        {/* 6. Calendario */}
        {estadoDeCarga === 'cargando' && <TimelineSkeleton />}

        {listo &&
          (sinSolicitudesEvaluables ? (
            <Alert>
              <Info aria-hidden />
              <AlertTitle>No hay solicitudes evaluables</AlertTitle>
              <AlertDescription>{respuesta.motivoInfactible}</AlertDescription>
            </Alert>
          ) : (
            <section aria-label="Calendario" className="flex flex-col gap-3">
              <SelectorVista
                vista={vista}
                onSemana={() => setVista({ tipo: 'semana' })}
                onDia={() =>
                  setVista({
                    tipo: 'dia',
                    fecha: clampFecha(respuesta.hoy, respuesta.horizonte.desde, respuesta.horizonte.hasta),
                  })
                }
              />
              {vista.tipo === 'semana' ? (
                <TimelineMaquinas
                  respuesta={respuesta}
                  inicioSemana={inicioSemana ?? respuesta.horizonte.desde}
                  onCambiarInicioSemana={setInicioSemana}
                  onSeleccionarAsignacion={abrirDetalle}
                  onSeleccionarDia={(fecha) => setVista({ tipo: 'dia', fecha })}
                />
              ) : (
                <VistaDia
                  respuesta={respuesta}
                  fecha={clampFecha(vista.fecha, respuesta.horizonte.desde, respuesta.horizonte.hasta)}
                  onCambiarFecha={(fecha) => setVista({ tipo: 'dia', fecha })}
                  onVolverASemana={() => {
                    setInicioSemana(
                      semanaQueContiene(vista.fecha, inicioSemana ?? respuesta.horizonte.desde, respuesta.horizonte),
                    )
                    setVista({ tipo: 'semana' })
                  }}
                  onSeleccionarAsignacion={abrirDetalle}
                />
              )}
            </section>
          ))}

        {/* 7. Excluidas y avisos */}
        {listo && <ExcluidasPlegables excluidas={respuesta.excluidas} />}

        {listo && respuesta.avisos.length > 0 && (
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
      </main>

      <DetalleAsignacion
        asignacion={asignacionSeleccionada}
        abierto={detalleAbierto}
        onOpenChange={setDetalleAbierto}
      />
    </>
  )
}
