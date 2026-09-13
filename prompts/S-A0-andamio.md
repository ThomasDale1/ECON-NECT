# S-A0 — Andamio del repositorio

**Carril A · 17:00–17:45 · Corre SOLO. Nadie más escribe código hasta que esto
esté terminado.**

> Leé [AGENTS.md](../AGENTS.md) completo antes de empezar. Después, este prompt.
> Revisado por la sesión de planeación el 12 de septiembre de 2026 (≈16:00).

---

## Por qué esto existe

El repositorio tiene documentos y un solo commit (`first commit and setup`) en
`main`; **no hay código**. Si cuatro personas corren `create-next-app` sobre él,
el conflicto es irrecuperable y perdemos la noche.

Tu trabajo es dejar un repositorio que **compila, con todas las dependencias ya
instaladas**, para que nadie más tenga que tocar `package.json` en toda la noche.

**Objetivo secundario, igual de importante:** entregar el contrato de tipos antes
de las 17:30 para que el carril B arranque sin esperarte.

## Reglas de git para esta sesión

- Trabajás en la rama **`thomas`**, que ya existe y es la actual. No creás ramas.
- **No hacés `git commit` ni `git push` por tu cuenta. Nunca.** El usuario decide
  cuándo se commitea y cuándo se mergea; si no te lo pide, no pasa.
- `git status` antes de reportar, para listar qué quedó sin versionar y confirmar
  que **no entró ningún secreto** (`.env.local` sigue ignorado).

---

## 0. Skills — antes de cualquier código

Este paso va **primero**. No hay ninguna skill instalada en la máquina ni en el
proyecto; las built-in de Claude Code (`dataviz`, `code-review`, `simplify`,
`security-review`, `run`) ya están disponibles y no se instalan.

### 0.1 Buscar e instalar las externas

Para cada tema, buscá con la CLI de skills y **instalá el mejor resultado en el
proyecto** (`.claude/skills/`), no en el home del usuario:

```
npx skills find nextjs
npx skills find shadcn
npx skills find maplibre
```

Criterio para elegir: que su `SKILL.md` hable de **Next.js 16 / App Router**,
**shadcn/ui con Tailwind v4** y **MapLibre GL** respectivamente; preferí la del
autor oficial o la más instalada. Instalá con
`npx skills add <owner>/<repo>[/<skill>]` (agregá `--agent claude-code` si la
CLI lo pide).

- Si para algún tema **no hay resultado razonable, no instalés nada y reportalo**
  como hueco. Un hueco reportado vale más que una skill inventada.
- Anotá el identificador exacto que instalaste para cada uno: la sesión de
  planeación actualiza AGENTS.md §5 con esos nombres.

### 0.2 Escribir las dos propias

Son convenciones nuestras, no existen en ningún registro. Escribilas cortas
(< 60 líneas cada una) con frontmatter `name` y `description`:

- `.claude/skills/recover/SKILL.md` — el protocolo de [AGENTS.md §3.3](../AGENTS.md):
  ante un segundo intento fallido, **parar y diagnosticar** cuál de los tres
  tipos de falla es (puntual · sesión contaminada · base equivocada) y qué se hace
  en cada caso. Incluir los dos casos previstos (sandbox caído; lector de
  Startrack que devuelve vacío sin error → revisar `success` en el cuerpo).
- `.claude/skills/imprint/SKILL.md` — cómo registrar un componente en
  [`ui-registry.md` §6](../ui-registry.md): leer primero las entradas de su tipo,
  reusar clases del baseline §2, y al terminar agregar la entrada con el formato
  exacto de §6. Recordar la regla del color: `SIN_EVIDENCIA` es violeta, nunca rojo.

### 0.3 Versionar

`.claude/skills/` **sí se versiona** para que los otros tres carriles las tengan
al clonar. Agregá al final del `.gitignore`, en una sección nueva
`# --- Claude Code ---`, únicamente:

```
.claude/settings.local.json
```

**No toqués ninguna otra línea del `.gitignore`.**

---

## 1. Crear la aplicación

En la raíz del repositorio, crear `apps/web`:

- `npx create-next-app@latest` → **Next.js 16.3.x** (es `latest` hoy),
  TypeScript, Tailwind, App Router, ESLint, **npm**, alias `@/*`, sin `src/`.
- Nombre del proyecto: `econ-nect`.
- Node 24 y npm 11 ya están instalados; no cambiés de gestor de paquetes.

Después, en la **raíz del repositorio**, un `package.json` mínimo (`"private":
true`, sin dependencias) cuyos scripts **solo delegan** a `apps/web`:

```json
{
  "name": "econ-nect-repo",
  "private": true,
  "scripts": {
    "dev":       "npm --prefix apps/web run dev",
    "build":     "npm --prefix apps/web run build",
    "lint":      "npm --prefix apps/web run lint",
    "typecheck": "npm --prefix apps/web run typecheck",
    "test":      "npm --prefix apps/web run test",
    "leer":      "npm --prefix apps/web run leer"
  }
}
```

El `package.json` real vive en `apps/web`. El de la raíz **no lleva
`node_modules`** y no se le agregan dependencias jamás.

## 2. Instalar TODO de una vez

Esta es la parte que evita conflictos toda la noche. Instalá ahora, aunque
todavía no se use. **Nada más que esto; nada menos que esto.**

- `zod`
- `server-only`
- `lucide-react`
- `maplibre-gl` — **sin deck.gl** (decidido: el mapa es deseable y se dibuja con
  GeoJSON nativo de MapLibre)
- `recharts`
- `vitest` + `@vitejs/plugin-react` (dev), con `vitest.config.ts` que resuelve el
  alias `@/` y `environment: 'node'` por defecto
- `tsx` (dev), para `npm run leer`
- **shadcn/ui** inicializado (`npx shadcn@latest init`, estilo por defecto, base
  color `slate`, CSS variables), **con estos 20 componentes ya agregados**:

  ```
  button  card  table  badge  dialog  input  select  tabs  tooltip
  separator  skeleton  sheet
  label  dropdown-menu  alert  sonner  command  scroll-area  progress
  ```

- ❌ **Ningún SDK de LLM en `apps/web`.** Ni `openai` ni `@anthropic-ai/sdk`.
  S-A6 usa Qwen local desde `services/intelligence/`; Next.js solo tendrá un
  adaptador HTTP `server-only`. Ver la decisión vigente en
  [03-ARQUITECTURA-IA-ODIN.md](../docs/03-ARQUITECTURA-IA-ODIN.md).

## 3. Scripts de `apps/web/package.json`

```
dev        next dev
build      next build
lint       eslint .          # `next lint` ya no existe en Next 16
typecheck  tsc --noEmit
test       vitest run
leer       tsx scripts/leer.ts
```

`apps/web/scripts/leer.ts` es un **stub** que imprime
`"leer: pendiente — lo implementa S-A1"` y sale con código 0.

## 4. Estructura de carpetas — con `.gitkeep` en cada una vacía

**Creá los directorios de los cuatro carriles**, para que nadie tenga que crear
territorio ajeno:

```
apps/web/lib/conectores/     A
apps/web/lib/canonico/       A
apps/web/lib/reglas/         A
apps/web/lib/tipos/          A   (no queda vacío: §5 y §6)
apps/web/app/api/            A
apps/web/scripts/            A   (no queda vacío: §3)
apps/web/components/         B   (shadcn ya crea components/ui/; agregá .gitkeep en components/)
apps/web/app/(nect)/         B   (no queda vacío: §7)
apps/web/lib/mapeo/          C
apps/web/lib/gobernanza/     C
apps/web/lib/kpi/            C
apps/web/lib/acceso/         C   (no queda vacío: §8)
docs/entregables/            D
```

## 5. El contrato de tipos — `apps/web/lib/tipos/canonico.ts`

**Esto es lo que desbloquea al carril B. Entregalo antes de las 17:30.**

Definir los tipos, **sin implementación**, en español, con un comentario de una
línea por tipo que diga qué es en lenguaje de negocio:

- `Plataforma` — `'prisma' | 'startrack'`.
- `Veredicto` — `'COHERENTE' | 'ATENCION' | 'EN_RIESGO' | 'SIN_EVIDENCIA'`.
- `Severidad` — `'alta' | 'media' | 'baja'`. Independiente del veredicto: dos
  reglas con el mismo veredicto pueden tener distinta urgencia.
- `Rol` — `'PROYECTOS' | 'LOGISTICA' | 'MANTENIMIENTO' | 'COSTOS' | 'DIRECCION'`.
  Es el vocabulario compartido entre reglas (A), RACI (C) y acceso (C).
- `Linaje` — de dónde vino un valor: `plataforma`, `endpoint`, `campo`,
  `valorCrudo: unknown`, `leidoEn` (ISO 8601).
- `Dato<T>` — un valor con su linaje: `{ valor: T | null; linaje: Linaje }`.
- `ObjetoDescrito` — qué describe un estado: `'recurso' | 'tarea' | 'falla'`.
  **Este campo es obligatorio en todo estado.** Es lo que resuelve el Caso de
  Uso 02 de ECON: dos estados distintos pueden ser ambos correctos porque
  describen objetos distintos.
- `EstadoOrigen` — `{ valor: string; objeto: ObjetoDescrito; linaje: Linaje }`.
- `NivelDeCascada` — `1 | 2 | 3` ([01 E.10](../docs/01-DEFINICION-DE-NEGOCIO.md)).
- `Ubicacion` — `{ nivel: NivelDeCascada; descripcion: Dato<string>; lat: Dato<number>; lon: Dato<number> }`.
- `EquipoUnificado` — identidad canónica (`id`, `codigoActivo: Dato<string>`,
  `nombre: Dato<string>`), `identidadResuelta: boolean`, estados de Prisma
  (`equipo`, `solicitud`, `falla`, cada uno `EstadoOrigen | null`), estados de
  Startrack (`vehiculo`, `tarea`, cada uno `EstadoOrigen | null`), `ubicacion:
  Ubicacion | null`, `veredicto: Veredicto`, `confianza: number` (**0–100**),
  `reglas: ResultadoRegla[]`, `leidoEn` (ISO).
- `ResultadoRegla` — `{ regla: string; nombre: string; veredicto: Veredicto;
  severidad: Severidad; confianza: number; porque: string[]; accionSugerida:
  string; rolResponsable: Rol; camposFaltantes: string[] }`.
- `Incoherencia` — una fila de la bandeja: `equipoId`, `codigoActivo`,
  `veredicto`, `severidad`, `confianza`, `regla`, `accionSugerida`,
  `rolResponsable`, `proyecto: Dato<string>`.
- `SaludFuente` — `{ plataforma: Plataforma; estado: 'ok' | 'lenta' | 'caida';
  ultimaLecturaBuena: string | null; latenciaMs: number | null }`.

**Reglas del contrato (escribilas como comentario al inicio del archivo):**
- Todo estado de origen conserva su `valorCrudo`. **Nunca se normaliza destruyendo
  el original.**
- Un campo que no se pudo leer es `null` con su linaje, **no** una cadena vacía ni
  un valor inventado.
- `confianza < 45` fuerza `veredicto = 'SIN_EVIDENCIA'` (umbral de
  [ui-registry §1.3](../ui-registry.md)). Es una heurística determinística,
  **no** ML.
- El contrato se congela a las **17:30**. Cambiarlo después exige avisar a B y C
  en voz alta.

## 6. `apps/web/lib/tipos/ejemplo.ts`

Un arreglo `EQUIPOS_EJEMPLO: EquipoUnificado[]` de **3 equipos** que cumplen el
contrato, para que B construya contra datos con la forma real.

⚠ **Son datos fabricados por nosotros, no un volcado del sandbox**
([AGENTS.md §1.2](../AGENTS.md)). Marcalos con un comentario grande arriba:
`// DATOS FABRICADOS — no provienen del sandbox de ECON.` Códigos, nombres,
proyectos y coordenadas **inventados y evidentemente ficticios** (p. ej.
`EQ-DEMO-001`, proyecto `Proyecto de ejemplo`, coordenadas del centro de
Ciudad de Guatemala redondeadas a dos decimales).

Los tres casos que B necesita para diseñar:
1. Uno `COHERENTE`, identidad resuelta, confianza alta, sin reglas disparadas
   salvo R1 (estados compatibles).
2. Uno `EN_RIESGO`: equipo con falla activa y tarea de traslado viva (R2),
   severidad `alta`, rol `LOGISTICA`.
3. Uno `SIN_EVIDENCIA`: identidad no resuelta (el huérfano), estados de
   Startrack en `null`, confianza `< 45`, `camposFaltantes` poblado (R5).

## 7. Página raíz

`create-next-app` genera `app/page.tsx`. Las vistas son de B en `app/(nect)/` y
un `(nect)/page.tsx` chocaría con `app/page.tsx` en `/`. Por eso:

- **Borrá `apps/web/app/page.tsx`.**
- Creá **una sola vez** `apps/web/app/(nect)/page.tsx`: un placeholder mínimo con
  el texto `ECON NECT — andamio listo` y la fecha. Es territorio de B: **B lo
  reemplaza sin pedir permiso y A no lo vuelve a tocar.**
- `app/layout.tsx` queda como lo deja `create-next-app` (idioma `lang="es"`,
  título `ECON NECT`). Es de A.
- `app/globals.css` queda **exactamente como lo deja shadcn init**. Los tokens de
  `ui-registry.md` (`--veredicto-*`, `shadow-card`, `font-heading`) los agrega B.

## 8. `apps/web/proxy.ts`

Next 16 deprecó `middleware.ts` a favor de **`proxy.ts`** (exporta `proxy`).
Donde AGENTS.md y 02 dicen "middleware.ts", se refieren a este archivo.

Lo escribís **una vez** y no lo volvés a tocar. Solo delega:

```ts
import { verificarAcceso } from '@/lib/acceso/verificar'
```

Creá `apps/web/lib/acceso/verificar.ts` como **stub que devuelve `true`** con la
firma `verificarAcceso(request: NextRequest): boolean` y un comentario
`// TODO carril C — S-C3`. **A no toca más ese archivo; C no toca `proxy.ts`.**
El `matcher` excluye `/_next`, `/api/salud` y archivos estáticos.

## 9. Cerrar

- `npm run typecheck`, `npm run lint`, `npm run test` (0 pruebas es aceptable,
  pero el comando debe salir con 0) y `npm run build` **pasan desde la raíz**.
- `npm run dev` levanta y `/` muestra el placeholder.
- `git status`: listá lo que quedó por versionar y confirmá que **no aparece
  `.env.local` ni ningún secreto**. **No commitees.**
- **Avisá al equipo en voz alta que el andamio está listo.** El usuario decide
  cuándo se mergea.

---

## Qué NO hacer

- ❌ No hagas `git commit`, `git push` ni merge. Nunca, salvo pedido explícito.
- ❌ No escribas conectores, reglas ni UI. Eso es S-A1 y S-B1.
- ❌ No instales deck.gl ni ningún SDK de LLM.
- ❌ No pongas credenciales en ningún archivo. `.env.local` ya existe y está
  ignorado.
- ❌ No inventes campos en el contrato que no estén en §5. Si dudás de uno,
  dejalo fuera: agregarlo después es barato, desmontarlo no.
- ❌ No toques `docs/`, `lib/mapeo/`, `lib/gobernanza/`, `lib/kpi/` ni
  `components/` más allá de crear los directorios y lo que shadcn genera.
- ❌ No debilites el `.gitignore`. Solo agregás la línea de §0.3.

## Reporte final — obligatorio

Nunca "listo". Reportá:

1. Skills instaladas con su identificador exacto, y cuáles quedaron como hueco.
2. Archivos creados y modificados (lista).
3. Versiones instaladas: `next`, `react`, `tailwindcss`, `shadcn`, `vitest`.
4. **Salida real** de `typecheck`, `lint`, `test`, `build`.
5. Checklist de prueba manual: `npm run dev` desde la raíz · `/` muestra el
   placeholder · `npm run leer` imprime el stub.
6. Qué no se pudo verificar.
7. Desviaciones de este prompt, con su razón.

## Terminado cuando

Otra persona puede clonar la rama, correr `npm install` en `apps/web` y luego
`npm run dev` desde la raíz, y ver la app levantar — **sin instalar nada más y sin
tocar ningún `package.json`.** El contrato de tipos y los tres equipos de ejemplo
existen y compilan.
