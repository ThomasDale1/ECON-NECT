# S-A0 — Andamio del repositorio

**Carril A · 17:00–17:45 · Corre SOLO. Nadie más escribe código hasta que esto
esté en `main`.**

> Leé [AGENTS.md](../AGENTS.md) completo antes de empezar. Después, este prompt.

---

## Por qué esto existe

El repositorio está vacío: hay documentos y un `git init` sin commits. Si cuatro
personas corren `create-next-app` sobre él, el conflicto es irrecuperable y
perdemos la noche.

Tu trabajo es dejar un repositorio que **compila, con todas las dependencias ya
instaladas**, para que nadie más tenga que tocar `package.json` en toda la noche.

**Objetivo secundario, igual de importante:** entregar el contrato de tipos antes
de las 17:30 para que el carril B arranque sin esperarte.

---

## 1. Crear la aplicación

En la raíz del repositorio, crear `apps/web`:

- Next.js 16, TypeScript, Tailwind, App Router, ESLint.
- Alias de import `@/*` apuntando a `apps/web/`.
- Nombre del proyecto: `econ-nect`.

## 2. Instalar TODO de una vez

Esta es la parte que evita conflictos toda la noche. Instalá ahora, aunque
todavía no se use:

- `zod`
- `shadcn/ui` inicializado, **con estos componentes ya agregados**:
  `button` `card` `table` `badge` `dialog` `input` `select` `tabs` `tooltip`
  `separator` `skeleton` `sheet` `dropdown-menu` `alert`
- `lucide-react`
- `maplibre-gl`
- `recharts`
- `vitest` + `@vitejs/plugin-react`, con `npm run test` configurado
- `server-only`

## 3. Scripts de `package.json`

```
dev        next dev
build      next build
lint       next lint
typecheck  tsc --noEmit
test       vitest run
leer       tsx scripts/leer.ts     # stub por ahora; lo llena S-A1
```

## 4. Estructura de carpetas — con `.gitkeep` en cada una

**Creá los directorios de los cuatro carriles**, para que nadie tenga que crear
territorio ajeno:

```
apps/web/lib/conectores/     A
apps/web/lib/canonico/       A
apps/web/lib/reglas/         A
apps/web/lib/tipos/          A
apps/web/app/api/            A
apps/web/components/         B
apps/web/app/(nect)/         B
apps/web/lib/mapeo/          C
apps/web/lib/gobernanza/     C
apps/web/lib/kpi/            C
apps/web/lib/acceso/         C
docs/entregables/            D
scripts/
```

## 5. El contrato de tipos — `lib/tipos/canonico.ts`

**Esto es lo que desbloquea al carril B. Entregalo antes de las 17:30.**

Definir los tipos, **sin implementación**:

- `Veredicto` — unión de `'COHERENTE' | 'ATENCION' | 'EN_RIESGO' | 'SIN_EVIDENCIA'`.
- `Linaje` — de dónde vino un valor: `plataforma` (`'prisma' | 'startrack'`),
  `endpoint`, `campo`, `valorCrudo`, `leidoEn` (ISO).
- `Dato<T>` — un valor con su linaje: `{ valor: T | null; linaje: Linaje }`.
- `ObjetoDescrito` — qué describe un estado: `'recurso' | 'tarea' | 'falla'`.
  **Este campo es obligatorio en todo estado.** Es lo que resuelve el Caso de
  Uso 02 de ECON: dos estados distintos pueden ser ambos correctos porque
  describen objetos distintos.
- `EstadoOrigen` — `{ valor: string; objeto: ObjetoDescrito; linaje: Linaje }`.
- `EquipoUnificado` — identidad canónica, estados de Prisma (equipo, solicitud,
  falla), estados de Startrack (vehículo, tarea), ubicación con su
  `nivelDeCascada` (`1 | 2 | 3`), el veredicto, y `identidadResuelta: boolean`.
- `ResultadoRegla` — `{ regla: string; nombre: string; veredicto: Veredicto;
  severidad; porque: string[]; accionSugerida: string; rolResponsable: string;
  camposFaltantes: string[] }`.
- `Incoherencia` — una fila de la bandeja.
- `SaludFuente` — `'ok' | 'lenta' | 'caida'` + `ultimaLecturaBuena`.

**Reglas del contrato:**
- Todo estado de origen conserva su `valorCrudo`. **Nunca se normaliza destruyendo
  el original.**
- Un campo que no se pudo leer es `null` con su linaje, **no** una cadena vacía ni
  un valor inventado.

## 6. `lib/tipos/ejemplo.ts`

Un arreglo de **3 equipos de ejemplo** que cumplen el contrato, para que B
construya contra datos reales de forma.

⚠ **Son datos fabricados por nosotros, no un volcado del sandbox**
([AGENTS.md §1.2](../AGENTS.md)). Marcalos con un comentario grande arriba:
`// DATOS FABRICADOS — no provienen del sandbox de ECON.`

Los tres casos que B necesita para diseñar:
1. Uno `COHERENTE` con identidad resuelta.
2. Uno `EN_RIESGO`: equipo con falla activa y tarea de traslado viva.
3. Uno `SIN_EVIDENCIA`: identidad no resuelta (el huérfano).

## 7. `middleware.ts`

Lo escribís **una vez** y no lo volvés a tocar. Solo delega:

```ts
import { verificarAcceso } from '@/lib/acceso/verificar'
```

Creá `lib/acceso/verificar.ts` como **stub que devuelve `true`** con un comentario
`// TODO carril C — S-C3`. **A no toca más ese archivo; C no toca `middleware.ts`.**

## 8. Cerrar

- `npm run typecheck`, `npm run lint` y `npm run build` **pasan**.
- Commit y **push a `main`**.
- **Avisá al equipo en voz alta que `main` está listo.** Recién ahí B clona.

---

## Qué NO hacer

- ❌ No escribas conectores, reglas ni UI. Eso es S-A1 y S-B1.
- ❌ No pongas credenciales en ningún archivo. `.env.local` ya existe y está
  ignorado.
- ❌ No inventes campos en el contrato que no hayas visto en la API real. Si no
  estás seguro de un campo, dejalo fuera: agregarlo después es barato,
  desmontarlo no.
- ❌ No toques `docs/`, `lib/mapeo/`, `lib/gobernanza/`, `lib/kpi/` ni
  `components/`. Solo creás los directorios vacíos.

## Terminado cuando

Otra persona puede clonar `main`, correr `npm install && npm run dev`, y ver la
app levantar — **sin instalar nada más y sin tocar `package.json`.**
