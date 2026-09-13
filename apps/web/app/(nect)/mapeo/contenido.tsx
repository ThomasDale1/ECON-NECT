'use client'

// Pantalla mínima para el Checkpoint 1: matriz de mapeo, responsabilidades y catálogo de
// KPIs, tal como los produce el carril C (lib/mapeo, lib/gobernanza, lib/kpi).
//
// Nota de propiedad de directorio (AGENTS.md §4.2): `app/(nect)/` es
// territorio del carril B. Esta página cruza esa línea por pedido explícito
// del usuario en la sesión de implementación de S-C1/S-C2, para que la matriz
// y las responsabilidades se puedan enseñar en el CP1 sin esperar a B. Es un cruce
// autorizado puntualmente, no una apropiación del directorio: B puede
// moverla, integrarla a su navegación, o reemplazarla sin pedir permiso.

import { useMemo, useState } from 'react'
import {
  ALCANCE_MATRIZ_MAPEO,
  MATRIZ_MAPEO,
  TERMINOS_NUEVOS,
  matrizACsv,
  type TipoRelacion,
} from '@/lib/mapeo/matriz'
import {
  GERENCIAS_OBLIGATORIAS,
  MATRIZ_RESPONSABILIDADES,
  responsabilidadesACsv,
} from '@/lib/gobernanza/responsabilidades'
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

const TIPOS_BARRA: TipoRelacion[] = [
  'exacta',
  'con transformación',
  'requiere parseo',
  'mismo nombre, distinto significado',
  'solo en Prisma',
  'solo en Startrack',
  'sin equivalencia directa',
]

const COLOR_TIPO: Record<TipoRelacion, string> = {
  exacta: '#059669',
  'con transformación': '#0d9488',
  'requiere parseo': '#0891b2',
  'mismo nombre, distinto significado': '#d97706',
  'solo en Prisma': '#2563eb',
  'solo en Startrack': '#ea580c',
  'sin equivalencia directa': '#7c3aed',
}

function descargarCsv(nombreArchivo: string, contenido: string) {
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  enlace.click()
  URL.revokeObjectURL(url)
}

function contar(tipo: TipoRelacion) {
  return MATRIZ_MAPEO.filter((fila) => fila.tipoRelacion === tipo).length
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

  const total = MATRIZ_MAPEO.length
  const porTipo = TIPOS_BARRA.map((tipo) => ({
    tipo,
    n: contar(tipo),
    pct: total === 0 ? 0 : Math.round((contar(tipo) / total) * 100),
  }))
  const seCruzan = contar('exacta') + contar('con transformación') + contar('requiere parseo')
  const mismoNombre = contar('mismo nombre, distinto significado')
  const soloUna = contar('solo en Prisma') + contar('solo en Startrack')
  const sinEquivalencia = contar('sin equivalencia directa')
  const criticos = MATRIZ_MAPEO.filter((fila) => fila.critico).length

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-base font-bold tracking-tight text-primary">
            Cómo se leen las dos plataformas
          </h2>
          <p className="font-label text-sm text-muted-foreground">
            Prisma y Startrack hablan de la misma maquinaria con palabras distintas. ECONNECT no
            las fusiona.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ConteoTile n={seCruzan} etiqueta="Se cruzan" detalle="exacta + transformación + parseo" />
          <ConteoTile
            n={mismoNombre}
            etiqueta="Mismo nombre, otro objeto"
            detalle="mismo nombre, distinto significado"
          />
          <ConteoTile n={soloUna} etiqueta="Solo una plataforma" detalle="solo Prisma + solo Startrack" />
          <ConteoTile n={sinEquivalencia} etiqueta="Sin equivalencia directa" detalle="hueco documentado" />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {porTipo.map((seg) =>
              seg.n === 0 ? null : (
                <div
                  key={seg.tipo}
                  title={`${seg.tipo}: ${seg.n} (${seg.pct}%)`}
                  style={{ width: `${(seg.n / total) * 100}%`, background: COLOR_TIPO[seg.tipo] }}
                />
              ),
            )}
          </div>
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {porTipo.map((seg) => (
              <li key={seg.tipo} className="flex items-center gap-1.5 font-label text-[11px] text-muted-foreground">
                <span className="size-2 rounded-full" style={{ background: COLOR_TIPO[seg.tipo] }} />
                <span>
                  {seg.tipo} {seg.n}/{total} ({seg.pct}%)
                </span>
              </li>
            ))}
          </ul>
          <p className="font-label text-[11px] text-muted-foreground">
            {criticos} de {total} filas son críticas para el veredicto. {total - criticos} no lo son.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <HistoriaCard
            titulo="Se cruzan"
            texto="El código de activo de Prisma y la descripción de Startrack hablan del mismo equipo. ECONNECT los cruza; no inventa un tercer inventario."
          />
          <HistoriaCard
            titulo="Mismo nombre, otro objeto"
            texto="Prisma estado describe el recurso. Startrack status 0–9 describe el estado del conductor (solo Startrack). La palabra coincide; el objeto no."
          />
          <HistoriaCard
            titulo="Sin puente"
            texto="La falla de Prisma, la solicitud y otros campos no tienen pareja. Documentar el hueco suma; inventar el cruce resta."
          />
        </div>
      </section>

      <Tabs defaultValue="matriz">
        <TabsList>
          <TabsTrigger value="matriz">Matriz de mapeo</TabsTrigger>
          <TabsTrigger value="responsabilidades">Matriz de responsabilidades</TabsTrigger>
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
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => descargarCsv('matriz-de-mapeo.csv', matrizACsv(filasFiltradas))}
              >
                Exportar CSV
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {filasFiltradas.length} de {MATRIZ_MAPEO.length} filas — el vocabulario
            de relación pesa tanto como el contenido (AGENTS.md §1.1).
          </p>

          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <p className="font-semibold">{ALCANCE_MATRIZ_MAPEO.estado}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {ALCANCE_MATRIZ_MAPEO.modulos.join(' · ')}. {ALCANCE_MATRIZ_MAPEO.limite}
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <Table className="min-w-[2350px]">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="w-[110px]">Módulo</TableHead>
                  <TableHead scope="col" className="w-[190px]">Campo Prisma</TableHead>
                  <TableHead scope="col" className="w-[150px]">Tipo Prisma</TableHead>
                  <TableHead scope="col" className="w-[220px]">Ejemplo Prisma</TableHead>
                  <TableHead scope="col" className="w-[190px]">Campo Startrack</TableHead>
                  <TableHead scope="col" className="w-[150px]">Tipo Startrack</TableHead>
                  <TableHead scope="col" className="w-[220px]">Ejemplo Startrack</TableHead>
                  <TableHead scope="col" className="w-[110px]">Cardinalidad</TableHead>
                  <TableHead scope="col" className="w-[150px]">Tipo de relación</TableHead>
                  <TableHead scope="col" className="w-[330px]">Transformación o conciliación</TableHead>
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
                    <TableCell className="whitespace-normal text-xs text-muted-foreground">
                      {fila.prisma.tipoDato}
                    </TableCell>
                    <TableCell className="whitespace-normal text-xs text-muted-foreground">
                      {fila.prisma.ejemplo}
                    </TableCell>
                    <TableCell className="max-w-64 whitespace-normal">
                      {fila.campoStartrack ?? (
                        <span className="text-muted-foreground">Sin registro</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal text-xs text-muted-foreground">
                      {fila.startrack.tipoDato}
                    </TableCell>
                    <TableCell className="whitespace-normal text-xs text-muted-foreground">
                      {fila.startrack.ejemplo}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="outline">{fila.cardinalidad}</Badge>
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
              Campos que ECONNECT introduce y que no existen en ninguna de las
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

        {/* ── Matriz de responsabilidades ─────────────────────────────── */}
        <TabsContent value="responsabilidades" className="flex flex-col gap-4 pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Quién mueve el equipo (Logística) vs quién lo pide (Proyecto) vs quién lo repara
              (Mantenimiento). Las atribuciones permanecen como propuestas hasta
              que una fuente autorizada de ECON las confirme.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                descargarCsv(
                  'matriz-de-responsabilidades.csv',
                  responsabilidadesACsv(MATRIZ_RESPONSABILIDADES),
                )
              }
            >
              Exportar CSV
            </Button>
          </div>

          <div className="rounded-xl border border-veredicto-atencion/30 bg-veredicto-atencion-fondo px-4 py-3 font-label text-[12px] text-veredicto-atencion">
            Todas las filas están en estado <span className="font-mono font-bold">propuesta</span> (no
            validadas por mentor).
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <Table className="min-w-[1900px]">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="w-[220px]">Paso del proceso</TableHead>
                  <TableHead scope="col" className="w-[280px]">Situación actual (AS-IS)</TableHead>
                  <TableHead scope="col" className="w-[300px]">Con la plataforma integrada (TO-BE)</TableHead>
                  {GERENCIAS_OBLIGATORIAS.map((gerencia) => (
                    <TableHead key={gerencia} scope="col" className="w-[300px] whitespace-normal">
                      {gerencia}
                    </TableHead>
                  ))}
                  <TableHead scope="col" className="w-[260px]">Otros actores</TableHead>
                  <TableHead scope="col">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MATRIZ_RESPONSABILIDADES.map((fila) => (
                  <TableRow key={fila.paso}>
                    <TableCell className="whitespace-normal font-medium">{fila.paso}</TableCell>
                    <TableCell className="whitespace-normal text-xs text-muted-foreground">
                      {fila.situacionActual}
                    </TableCell>
                    <TableCell className="whitespace-normal text-xs">
                      {fila.conPlataformaIntegrada}
                    </TableCell>
                    {GERENCIAS_OBLIGATORIAS.map((gerencia) => (
                      <TableCell key={gerencia} className="whitespace-normal align-top">
                        <div className="flex flex-col gap-2">
                          <Badge variant="outline" className="w-fit">
                            {fila.responsabilidades[gerencia].participacion}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {fila.responsabilidades[gerencia].detalle}
                          </span>
                        </div>
                      </TableCell>
                    ))}
                    <TableCell className="whitespace-normal text-xs text-muted-foreground">
                      {fila.otrosActores}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="outline">{fila.estado}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3">
            {MATRIZ_RESPONSABILIDADES.filter((fila) => fila.preguntaPendiente).map((fila) => (
              <p key={fila.paso} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{fila.paso}:</span>{' '}
                {fila.preguntaPendiente}
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

function ConteoTile({ n, etiqueta, detalle }: { n: number; etiqueta: string; detalle: string }) {
  return (
    <article className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 shadow-card">
      <p className="font-heading text-3xl font-extrabold tracking-tight">{n}</p>
      <p className="font-heading text-[13px] font-bold text-primary">{etiqueta}</p>
      <p className="font-label text-[11px] text-muted-foreground">{detalle}</p>
    </article>
  )
}

function HistoriaCard({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <article className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4">
      <h3 className="font-heading text-sm font-bold text-primary">{titulo}</h3>
      <p className="font-label text-[13px] leading-snug text-foreground">{texto}</p>
    </article>
  )
}
