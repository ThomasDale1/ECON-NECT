'use client'

// Pantalla mínima para el Checkpoint 1: matriz de mapeo, RACI y catálogo de
// KPIs, tal como los produce el carril C (lib/mapeo, lib/gobernanza, lib/kpi).
//
// Nota de propiedad de directorio (AGENTS.md §4.2): `app/(nect)/` es
// territorio del carril B. Esta página cruza esa línea por pedido explícito
// del usuario en la sesión de implementación de S-C1/S-C2, para que la matriz
// y la RACI se puedan enseñar en el CP1 sin esperar a B. Es un cruce
// autorizado puntualmente, no una apropiación del directorio: B puede
// moverla, integrarla a su navegación, o reemplazarla sin pedir permiso.

import { useMemo, useState } from 'react'
import {
  MATRIZ_MAPEO,
  TERMINOS_NUEVOS,
  matrizACsv,
  type TipoRelacion,
} from '@/lib/mapeo/matriz'
import { AGENTES, RACI_PROCESO, raciACsv } from '@/lib/gobernanza/raci'
import { CATALOGO_KPI, catalogoKpiACsv } from '@/lib/kpi/catalogo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const TIPOS_RELACION: (TipoRelacion | 'todas')[] = [
  'todas',
  'exacta',
  'con transformación',
  'requiere parseo',
  'mismo nombre, distinto significado',
  'solo en Prisma',
  'solo en Startrack',
  'sin equivalencia directa',
]

function descargarCsv(nombreArchivo: string, contenido: string) {
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  enlace.click()
  URL.revokeObjectURL(url)
}

export function ContenidoMapeo() {
  const [filtro, setFiltro] = useState<TipoRelacion | 'todas'>('todas')

  const filasFiltradas = useMemo(
    () =>
      filtro === 'todas'
        ? MATRIZ_MAPEO
        : MATRIZ_MAPEO.filter((fila) => fila.tipoRelacion === filtro),
    [filtro]
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          Entregables 1, 2 y 3 del brief — estructura tipada en{' '}
          <code className="font-mono text-xs">lib/mapeo</code>,{' '}
          <code className="font-mono text-xs">lib/gobernanza</code> y{' '}
          <code className="font-mono text-xs">lib/kpi</code>, renderizada acá
          para que documento y prototipo sean el mismo objeto (01 Parte C.5).
        </p>
      </div>

      <Tabs defaultValue="matriz">
        <TabsList>
          <TabsTrigger value="matriz">Matriz de mapeo</TabsTrigger>
          <TabsTrigger value="raci">RACI</TabsTrigger>
          <TabsTrigger value="kpi">Catálogo de KPIs</TabsTrigger>
        </TabsList>

        {/* ── Matriz de mapeo ─────────────────────────────────────────── */}
        <TabsContent value="matriz" className="flex flex-col gap-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {TIPOS_RELACION.map((tipo) => (
                <Button
                  key={tipo}
                  size="sm"
                  variant={filtro === tipo ? 'default' : 'outline'}
                  onClick={() => setFiltro(tipo)}
                >
                  {tipo}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => descargarCsv('matriz-de-mapeo.csv', matrizACsv(filasFiltradas))}
            >
              Exportar CSV
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {filasFiltradas.length} de {MATRIZ_MAPEO.length} filas — el vocabulario
            de relación pesa tanto como el contenido (AGENTS.md §1.1).
          </p>

          <div className="overflow-x-auto rounded-xl border border-border">
            <Table className="min-w-[1500px]">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="w-[110px]">Módulo</TableHead>
                  <TableHead scope="col" className="w-[190px]">Campo Prisma</TableHead>
                  <TableHead scope="col" className="w-[190px]">Campo Startrack</TableHead>
                  <TableHead scope="col" className="w-[150px]">Tipo de relación</TableHead>
                  <TableHead scope="col" className="w-[330px]">Transformación</TableHead>
                  <TableHead scope="col" className="w-[380px]">Evidencia</TableHead>
                  <TableHead scope="col" className="w-[100px]">Confianza</TableHead>
                  <TableHead scope="col" className="w-[80px]">Crítico</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filasFiltradas.map((fila, i) => (
                  <TableRow key={i}>
                    <TableCell className="whitespace-nowrap font-medium">{fila.modulo}</TableCell>
                    <TableCell className="max-w-64 whitespace-normal">
                      {fila.campoPrisma ?? (
                        <span className="text-muted-foreground">Sin registro</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-64 whitespace-normal">
                      {fila.campoStartrack ?? (
                        <span className="text-muted-foreground">Sin registro</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={
                          fila.tipoRelacion === 'sin equivalencia directa'
                            ? 'font-semibold'
                            : undefined
                        }
                      >
                        {fila.tipoRelacion}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-80 whitespace-normal text-xs text-muted-foreground">
                      {fila.transformacion ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-96 whitespace-normal text-xs text-muted-foreground">
                      {fila.evidencia}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="outline">{fila.confianza}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{fila.critico ? 'Sí' : 'No'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">
              Entregable 1 — inventario de términos nuevos
            </h2>
            <p className="text-sm text-muted-foreground">
              Campos que ECON NECT introduce y que no existen en ninguna de las
              dos plataformas.
            </p>
            <div className="flex flex-col gap-3">
              {TERMINOS_NUEVOS.map((termino) => (
                <div key={termino.termino} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                  <p className="font-mono text-sm font-semibold">{termino.termino}</p>
                  <p className="text-sm">{termino.definicion}</p>
                  <p className="text-xs text-muted-foreground">{termino.porQueExiste}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── RACI ─────────────────────────────────────────────────────── */}
        <TabsContent value="raci" className="flex flex-col gap-4 pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Ninguna fila está validada todavía por un mentor de proceso de
              ECON — ver columna &quot;Estado&quot; y las preguntas pendientes
              (docs/02-ROADMAP.md §3).
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => descargarCsv('raci.csv', raciACsv(RACI_PROCESO))}
            >
              Exportar CSV
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="w-[260px]">Paso del proceso</TableHead>
                  {AGENTES.map((agente) => (
                    <TableHead key={agente} scope="col" className="whitespace-normal">
                      {agente}
                    </TableHead>
                  ))}
                  <TableHead scope="col">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RACI_PROCESO.map((fila) => (
                  <TableRow key={fila.paso}>
                    <TableCell className="whitespace-normal font-medium">{fila.paso}</TableCell>
                    {AGENTES.map((agente) => (
                      <TableCell key={agente} className="text-center">
                        {fila.asignaciones[agente] ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="outline">{fila.estado}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3">
            {RACI_PROCESO.filter((fila) => fila.preguntaRelacionada).map((fila) => (
              <p key={fila.paso} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{fila.paso}:</span>{' '}
                {fila.preguntaRelacionada}
              </p>
            ))}
          </div>
        </TabsContent>

        {/* ── KPIs ─────────────────────────────────────────────────────── */}
        <TabsContent value="kpi" className="flex flex-col gap-4 pt-4">
          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => descargarCsv('catalogo-kpi.csv', catalogoKpiACsv(CATALOGO_KPI))}
            >
              Exportar CSV
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {CATALOGO_KPI.map((kpi) => (
              <div key={kpi.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6 shadow-card">
                <h3 className="text-base font-semibold">{kpi.nombre}</h3>
                <dl className="flex flex-col gap-2 text-sm">
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Qué mide</dt>
                    <dd>{kpi.queMide}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Por qué importa</dt>
                    <dd>{kpi.porQueImporta}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Fórmula</dt>
                    <dd className="font-mono text-xs">{kpi.formula}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Referencia</dt>
                    <dd>{kpi.referencia}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Acción que dispara</dt>
                    <dd>{kpi.accionQueDispara}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">
                      Por qué ninguna plataforma lo ve sola
                    </dt>
                    <dd>{kpi.porQueNingunaPlataformaLoVeSola}</dd>
                  </div>
                  {kpi.datoFaltante && (
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground">Dato faltante</dt>
                      <dd className="text-destructive">{kpi.datoFaltante}</dd>
                    </div>
                  )}
                </dl>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
