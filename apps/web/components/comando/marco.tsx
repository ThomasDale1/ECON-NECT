import { cookies } from 'next/headers'
import { BarraSuperior } from '@/components/comando/barra-superior'
import { COOKIE_ROL, esRolValido } from '@/lib/acceso/verificar'
import type { SaludFuente } from '@/lib/tipos/canonico'

const ETIQUETA_ROL: Record<string, string> = {
  PROYECTOS: 'Proyectos',
  LOGISTICA: 'Logística',
  MANTENIMIENTO: 'Mantenimiento',
  COSTOS: 'Costos',
  DIRECCION: 'Dirección',
}

/**
 * Área de trabajo de una pantalla: barra superior + contenido.
 *
 * La barra lateral no está acá sino en el layout de rutas, para que su estado
 * de contracción no se pierda al navegar.
 *
 * Si una fuente está caída lo dice arriba del contenido: un error de integración
 * degrada a "dato no disponible", nunca rompe la pantalla (ui-registry §4).
 */
export async function Marco({
  titulo,
  salud,
  leidoEn,
  children,
}: {
  titulo: string
  salud: SaludFuente[]
  leidoEn: string
  children: React.ReactNode
}) {
  const fuenteCaida = salud.find((f) => f.estado === 'caida')
  const hora = new Date(leidoEn).toLocaleTimeString('es-SV', { hour12: false })
  const rolCookie = (await cookies()).get(COOKIE_ROL)?.value
  const rol = esRolValido(rolCookie) ? rolCookie : null
  const etiqueta = rol ? ETIQUETA_ROL[rol] : 'Sala de control'
  const iniciales = rol ? rol.slice(0, 2) : 'SC'

  return (
    <div className="flex min-w-0 flex-1 flex-col">
        <BarraSuperior
          titulo={titulo}
          ultimaLectura={hora}
          datoViejo={Boolean(fuenteCaida)}
          usuario={{ nombre: etiqueta, iniciales }}
        />

        <main className="flex flex-col gap-6 p-7">
          {fuenteCaida && (
            <p
              role="status"
              className="rounded-xl border border-veredicto-atencion/30 bg-veredicto-atencion-fondo px-4 py-3 font-label text-sm text-veredicto-atencion"
            >
              {fuenteCaida.plataforma === 'prisma' ? 'Prisma' : 'Startrack'} no responde; la
              interpretación queda suspendida para los equipos afectados. Se muestra lo último que
              sí se pudo leer.
            </p>
          )}
          {children}
        </main>
    </div>
  )
}
