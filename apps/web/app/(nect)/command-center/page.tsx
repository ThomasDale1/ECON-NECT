import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { BarraSuperior } from '@/components/comando/barra-superior'
import { PanelEnCurso, PanelFueraDeGeocerca } from '@/components/comando/paneles-situacion'
import { TablaExcepciones } from '@/components/comando/tabla-excepciones'
import { ETIQUETA_ROL } from '@/lib/acceso/verificar'
import { sesionActual } from '@/lib/acceso/servidor'
import { leerFlota } from '@/lib/lectura/flota'
import { ACTIVOS_EN_CURSO, VIOLACIONES_GEOCERCA } from './datos-de-ejemplo'

export const metadata: Metadata = {
  title: 'Centro de comando operativo · ECON NECT',
  description: 'Estado unificado de la maquinaria entre Prisma y Startrack.',
}

export const dynamic = 'force-dynamic'

/**
 * Centro de comando operativo.
 *
 * La UI solo muestra: el veredicto, la confianza y las reglas vienen calculados,
 * acá no se recalcula nada.
 *
 * **De dónde sale cada cosa hoy:**
 *
 * - La tabla de excepciones lee la flota **en vivo** (`lib/lectura/flota.ts`,
 *   S-A3): ambas plataformas, reconciliadas por request. Se llama a la capa de
 *   lectura directamente y no a `GET /api/equipos` porque esto ya es servidor —
 *   un fetch a nuestra propia ruta sería un salto de red sin ninguna ganancia.
 * - Los dos carruseles todavía leen un fixture propio, porque el contrato no
 *   tiene los campos que necesitan: la tarea de traslado con origen, destino y
 *   tiempo estimado, y el resultado de evaluar la geocerca. Están pedidos al
 *   carril A; hasta entonces no se puede derivar sin inventar.
 * - Si una de las dos plataformas no responde, la pantalla no queda en blanco:
 *   aparece el aviso con la razón y los veredictos bajan a SIN_EVIDENCIA.
 */
export default async function CommandCenterPage() {
  const cabeceras = await headers()
  const [lectura, sesion] = await Promise.all([
    leerFlota(),
    sesionActual(new Request('http://local/command-center', { headers: cabeceras })),
  ])

  const horaLectura = new Intl.DateTimeFormat('es-SV', {
    timeStyle: 'medium',
    timeZone: 'America/El_Salvador',
  }).format(new Date(lectura.leidoEn))

  return (
    <>
      <BarraSuperior
        titulo="Centro de comando operativo"
        ultimaLectura={horaLectura}
        datoViejo={lectura.degradacion.degradado}
        usuario={{
          nombre: sesion ? ETIQUETA_ROL[sesion.rol] : 'Sin sesión',
          iniciales: sesion ? sesion.rol.slice(0, 2) : '—',
        }}
      />

      <main className="flex flex-col gap-6 p-7">
        {lectura.degradacion.degradado && (
          <div
            role="alert"
            className="flex flex-col gap-1 rounded-xl border border-veredicto-atencion/40 bg-veredicto-atencion-fondo p-4"
          >
            <span className="font-heading text-sm font-bold text-veredicto-atencion">
              Lectura degradada
            </span>
            {lectura.degradacion.razones.map((razon) => (
              <span key={razon} className="font-label text-[13px] text-veredicto-atencion">
                {razon}
              </span>
            ))}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <PanelEnCurso activos={ACTIVOS_EN_CURSO} />
          <PanelFueraDeGeocerca violaciones={VIOLACIONES_GEOCERCA} />
        </div>

        <TablaExcepciones equipos={lectura.equipos} />
      </main>
    </>
  )
}
